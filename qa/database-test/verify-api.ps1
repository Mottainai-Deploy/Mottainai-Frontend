$ErrorActionPreference = 'Stop'
$apiContainer = 'mottainai-local-qa-api-1'
$databaseContainer = 'mottainai-database-test-postgres-1'
$api = (& docker inspect $apiContainer | ConvertFrom-Json)[0]
if ($LASTEXITCODE -ne 0) { throw 'API local indisponivel' }
$apiEnvironment = @{}
foreach ($entry in $api.Config.Env) { $pair = $entry -split '=',2; $apiEnvironment[$pair[0]] = $pair[1] }
if ($apiEnvironment.DB_URL -ne 'jdbc:postgresql://mottainai-database-test-postgres-1:5432/mottainai_seed_test') {
    throw 'Verificacao permitida somente na API conectada ao banco de testes'
}
$connection = @{}
Get-Content -LiteralPath (Join-Path $PSScriptRoot 'api-connection.env.local') | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') { $connection[$Matches[1]] = $Matches[2] }
}
$baseUrl = $connection.TEST_API_BASE_URL
if ([string]::IsNullOrWhiteSpace($baseUrl)) { throw 'TEST_API_BASE_URL nao configurada' }

function Invoke-LocalSql([string]$Sql) {
    $result = $Sql | & docker exec -i $databaseContainer psql -X -qAt -v ON_ERROR_STOP=1 -U seed_admin -d mottainai_seed_test
    if ($LASTEXITCODE -ne 0) { throw 'Falha na preparacao ou limpeza da verificacao local' }
    return $result
}
function Convert-Base64Url([byte[]]$Bytes) {
    return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}
function Get-Items($Response) {
    if ($null -ne $Response.content) { return @($Response.content) }
    return @($Response)
}

$userQuery = @'
SELECT json_build_object('id', u.user_id, 'uid', u.firebase_uid, 'store', e.store_id)
FROM mottainai.app_user u JOIN mottainai.employee e USING(employee_id)
JOIN mottainai.employee_role r USING(role_id)
WHERE u.active AND e.active AND u.deleted_at IS NULL AND r.permission_level=100 LIMIT 1;
'@
$user = (Invoke-LocalSql $userQuery) | ConvertFrom-Json
if (-not $user) { throw 'Conta administrativa local ausente' }
$sessionId = [guid]::NewGuid().ToString()
# Sessão técnica temporária testa HTTP e RLS, sem simular login Firebase/senha.
$sessionSql = @"
INSERT INTO mottainai.staff_session(session_id,user_id,refresh_token_hash,refresh_expires_at,user_agent)
VALUES ('$sessionId',$($user.id),encode(public.gen_random_bytes(32),'hex'),now()+interval '5 minutes','QA connection verification');
"@
Invoke-LocalSql $sessionSql | Out-Null
try {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $header = Convert-Base64Url ([Text.Encoding]::UTF8.GetBytes('{"alg":"HS256","typ":"JWT"}'))
    $claims = @{ iss='https://mottainai.local'; sub=$user.uid; iat=$now; exp=$now+300;
                 roles=@('ADMINISTRATOR','MANAGER'); sid=$sessionId; use='access'; jti=[guid]::NewGuid().ToString() }
    $payload = Convert-Base64Url ([Text.Encoding]::UTF8.GetBytes(($claims | ConvertTo-Json -Compress)))
    $signatureKey = [Convert]::FromBase64String($apiEnvironment.JWT_SECRET)
    $hmac = [Security.Cryptography.HMACSHA256]::new($signatureKey)
    try { $signature = Convert-Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$header.$payload"))) }
    finally { $hmac.Dispose() }
    $headers = @{ Authorization="Bearer $header.$payload.$signature" }
    $profile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Headers $headers -TimeoutSec 30
    if ($profile.storeId -ne $user.store) { throw 'Perfil retornou loja diferente do banco de testes' }
    $referenceDate = Invoke-LocalSql 'SELECT reference_date FROM qa_fixture.seed_version WHERE version=1;'
    $from = [datetime]::Parse($referenceDate).AddDays(-1).ToString('yyyy-MM-ddTHH:mm:ss')
    $to = [datetime]::Parse($referenceDate).AddDays(1).ToString('yyyy-MM-ddTHH:mm:ss')
    $checks = @(
        @{path='/products?page=0&size=200'; expected=120},
        @{path="/inventory?storeId=$($user.store)"; expected=120},
        @{path="/alerts?storeId=$($user.store)"; expected=120},
        @{path="/purchase-orders?storeId=$($user.store)&from=$from&to=$to"; expected=8}
    )
    foreach ($check in $checks) {
        $response = Invoke-RestMethod -Uri ($baseUrl + $check.path) -Headers $headers -TimeoutSec 30
        $items = @(Get-Items $response)
        if ($items.Count -ne $check.expected) { throw "Contagem HTTP divergente em $($check.path): $($items.Count)" }
        Write-Output "OK HTTP: $($check.path) -> $($items.Count) registros"
    }
    $unauthenticatedStatus = $null
    try { Invoke-RestMethod -Uri "$baseUrl/products" -TimeoutSec 10 | Out-Null }
    catch { $unauthenticatedStatus = [int]$_.Exception.Response.StatusCode }
    if ($unauthenticatedStatus -ne 401) { throw 'Consulta sem autenticacao nao foi bloqueada como esperado' }
    Write-Output 'OK: perfil descriptografado, consultas autenticadas e bloqueio sem token. Login Firebase/senha nao executado.'
} finally {
    Invoke-LocalSql "UPDATE mottainai.staff_session SET revoked_at=now(),revoked_reason='QA verification completed' WHERE session_id='$sessionId';" | Out-Null
}
