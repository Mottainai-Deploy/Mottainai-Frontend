param([switch]$RestorePreviousDatabase)
$ErrorActionPreference = 'Stop'
$apiContainer = 'mottainai-local-qa-api-1'
$targetContainer = 'mottainai-database-test-postgres-1'
$sourceContainer = 'mottainai-local-qa-postgres-1'
$stateFile = Join-Path $PSScriptRoot 'api-previous-state.json.local'
$connectionFile = Join-Path $PSScriptRoot 'api-connection.env.local'
$overlayFile = Join-Path $PSScriptRoot 'compose.api.yaml'

function Read-Container([string]$Name) {
    $result = & docker inspect $Name | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Container indisponivel: $Name" }
    return $result[0]
}
function Invoke-TargetSql([string]$Sql) {
    $Sql | & docker exec -i $targetContainer psql -X -q -v ON_ERROR_STOP=1 -U seed_admin -d mottainai_seed_test
    if ($LASTEXITCODE -ne 0) { throw 'Preparacao SQL falhou; a API ainda nao foi reconfigurada.' }
}

$api = Read-Container $apiContainer
$apiEnvironment = @{}
foreach ($entry in $api.Config.Env) { $pair = $entry -split '=', 2; $apiEnvironment[$pair[0]] = $pair[1] }
if ($api.Config.Labels.'com.docker.compose.project' -ne 'mottainai-local-qa' -or
    $apiEnvironment.DB_USER -ne 'mottainai_qa_app') { throw 'API diferente do ambiente local esperado' }
if (-not (Test-Path -LiteralPath $stateFile)) {
    if ($RestorePreviousDatabase) { throw 'Configuracao anterior nao foi salva' }
    if ($apiEnvironment.DB_URL -ne 'jdbc:postgresql://postgres:5432/mottainai_qa') { throw 'Conexao original inesperada' }
    $state = @{
        project = $api.Config.Labels.'com.docker.compose.project'
        directory = $api.Config.Labels.'com.docker.compose.project.working_dir'
        environmentFile = $api.Config.Labels.'com.docker.compose.project.environment_file'
        configFiles = @($api.Config.Labels.'com.docker.compose.project.config_files' -split ',')
        databaseUrl = $apiEnvironment.DB_URL
    }
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding utf8
}
$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$composeArguments = @('compose', '-p', $state.project, '--project-directory', $state.directory,
                      '--env-file', $state.environmentFile)
foreach ($file in $state.configFiles) {
    if (-not (Test-Path -LiteralPath $file)) { throw "Configuracao original ausente: $file" }
    $composeArguments += @('-f', $file)
}
if (-not $RestorePreviousDatabase) {
    $target = Read-Container $targetContainer
    if ($target.State.Health.Status -ne 'healthy') { throw 'Banco de testes ainda nao esta pronto' }
    if ([string]::IsNullOrEmpty($apiEnvironment.DB_PASSWORD)) { throw 'Senha da API nao configurada' }
    # Nunca imprimir ou gravar senhas, hashes, dados criptografados ou o payload.
    $rolePassword = $apiEnvironment.DB_PASSWORD.Replace("'", "''")
    $roleSql = @'
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'mottainai_seed_test' THEN RAISE EXCEPTION 'Banco inesperado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mottainai_qa_app') THEN
    CREATE ROLE mottainai_qa_app LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mottainai_qa_app' AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole)) THEN
    RAISE EXCEPTION 'Role da API com privilegios inesperados';
  END IF;
END $$;
ALTER ROLE mottainai_qa_app PASSWORD '__ROLE_PASSWORD__';
GRANT mottainai_api TO mottainai_qa_app;
GRANT EXECUTE ON FUNCTION mottainai.fn_is_bcrypt_hash(TEXT) TO mottainai_qa_app;
COMMIT;
'@
    Invoke-TargetSql ($roleSql.Replace('__ROLE_PASSWORD__', $rolePassword))
    $auditFix = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\fix-local-audit.sql') -Raw
    Invoke-TargetSql ($auditFix.Replace("'mottainai_qa'", "'mottainai_seed_test'"))
    $sourceQuery = @'
SELECT coalesce(jsonb_agg(jsonb_build_object('user', to_jsonb(u), 'employee', to_jsonb(e),
       'private', to_jsonb(p), 'role_name', r.name) ORDER BY u.user_id), '[]'::jsonb)
FROM mottainai.app_user u JOIN mottainai.employee e USING(employee_id)
JOIN mottainai.employee_role r USING(role_id)
JOIN mottainai.employee_private_data p USING(employee_id)
WHERE u.active AND u.password_set AND u.deleted_at IS NULL AND e.active AND e.deleted_at IS NULL;
'@
    $accessPayload = & docker exec $sourceContainer psql -X -At -v ON_ERROR_STOP=1 -U qa_admin -d mottainai_qa -c $sourceQuery
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel ler as contas locais de origem' }
    if (@($accessPayload | ConvertFrom-Json).Count -eq 0) { throw 'Nenhuma conta local ativa para migrar' }
    $payloadBytes = [Text.Encoding]::UTF8.GetBytes(($accessPayload -join "`n"))
    $payloadHex = [BitConverter]::ToString($payloadBytes).Replace('-', '')
    $importSql = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'import-api-users.sql') -Raw
    Invoke-TargetSql (("\set access_payload_hex '$payloadHex'`n") + $importSql)
    [IO.File]::WriteAllText($connectionFile, "TEST_API_DB_URL=jdbc:postgresql://mottainai-database-test-postgres-1:5432/mottainai_seed_test`nTEST_API_BASE_URL=http://127.0.0.1:18080/api/v1`n")
    $composeArguments += @('--env-file', $connectionFile, '-f', $overlayFile)
}
& docker @composeArguments up -d --no-deps --no-build --wait api
if ($LASTEXITCODE -ne 0) { throw 'API nao ficou saudavel. Consulte os logs ou use -RestorePreviousDatabase.' }
$updatedApi = Read-Container $apiContainer
$configuredUrl = @($updatedApi.Config.Env | Where-Object { $_.StartsWith('DB_URL=') })[0].Substring(7)
$expectedUrl = if ($RestorePreviousDatabase) { $state.databaseUrl } else { 'jdbc:postgresql://mottainai-database-test-postgres-1:5432/mottainai_seed_test' }
if ($configuredUrl -ne $expectedUrl) { throw 'API iniciou com conexao diferente da solicitada' }
Write-Output 'API saudavel e conexao conferida. Entre novamente no site para iniciar uma sessao neste banco.'
