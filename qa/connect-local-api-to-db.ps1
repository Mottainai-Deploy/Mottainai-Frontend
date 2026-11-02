[CmdletBinding()]
param(
    [string]$EnvironmentFile = 'C:\Users\joaocapelli-ieg\Downloads\env',
    [switch]$RestorePreviousConfiguration,
    [switch]$RecoverUnavailableApi
)

$ErrorActionPreference = 'Stop'
$apiContainer = 'mottainai-local-qa-api-1'
$overlayFile = Join-Path $PSScriptRoot 'compose.external-db.yaml'
$stateFile = Join-Path $PSScriptRoot 'api-external-db-previous.local'
$frontendEnvironmentFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.env.local'
$localApiBase = 'http://127.0.0.1:18080/api/v1'

function Get-Container {
    $result = & docker inspect $apiContainer 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'A API local de QA não está disponível.' }
    return ($result | ConvertFrom-Json)[0]
}

function Get-ContainerEnvironment($Container) {
    $values = @{}
    foreach ($entry in $Container.Config.Env) {
        $pair = $entry -split '=', 2
        if ($pair.Count -eq 2) { $values[$pair[0]] = $pair[1] }
    }
    return $values
}

function Read-EnvironmentFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw 'O arquivo de ambiente informado não foi encontrado.'
    }

    $values = @{}
    $lineNumber = 0
    foreach ($line in [IO.File]::ReadAllLines($Path)) {
        $lineNumber++
        if ($line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $name = $Matches[1]
            if ($values.ContainsKey($name)) { throw "Chave duplicada no arquivo de ambiente, linha $lineNumber." }
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and
                (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                 ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $values[$name] = $value
        } elseif ($line.Trim() -and -not $line.Trim().StartsWith('#')) {
            throw "Formato inválido no arquivo de ambiente, linha $lineNumber."
        }
    }
    return $values
}

function Get-DatabaseLocation($Values) {
    foreach ($required in @('DB_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_SCHEMA', 'DB_USERNAME', 'DB_PASSWORD')) {
        if (-not $Values.ContainsKey($required) -or [string]::IsNullOrWhiteSpace($Values[$required])) {
            throw "A chave obrigatória $required está ausente ou vazia no arquivo de ambiente."
        }
    }

    $match = [regex]::Match($Values.DB_URL, '^(?:jdbc:)?(?:postgres|postgresql)://(?<authority>[^/?#]+)')
    if (-not $match.Success) { throw 'DB_URL não é uma URL PostgreSQL reconhecida.' }

    $server = ($match.Groups['authority'].Value -split '@')[-1]
    $serverMatch = [regex]::Match($server, '^\[(?<host>[^\]]+)\]:(?<port>\d+)$|^(?<host>[^:]+):(?<port>\d+)$')
    if (-not $serverMatch.Success) { throw 'DB_URL precisa incluir host e porta explícitos.' }

    $dbHost = $serverMatch.Groups['host'].Value
    $port = $serverMatch.Groups['port'].Value
    if (-not [string]::Equals($dbHost, $Values.DB_HOST, [StringComparison]::OrdinalIgnoreCase) -or
        -not [string]::Equals($port, $Values.DB_PORT, [StringComparison]::Ordinal)) {
        throw 'DB_URL não corresponde a DB_HOST e DB_PORT.'
    }
    $databaseMatch = [regex]::Match($Values.DB_URL, '^(?:jdbc:)?(?:postgres|postgresql)://[^/]+/(?<database>[^/?#]+)')
    if (-not $databaseMatch.Success -or
        -not [string]::Equals($databaseMatch.Groups['database'].Value, $Values.DB_NAME, [StringComparison]::Ordinal)) {
        throw 'DB_URL não corresponde a DB_NAME.'
    }
    if ($dbHost -match '^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$') {
        throw 'O arquivo aponta para um banco local, mas a conexão solicitada é remota.'
    }

    return @{ Url = $Values.DB_URL; User = $Values.DB_USERNAME; Schema = $Values.DB_SCHEMA }
}

function Get-FrontendApiBase {
    if (-not (Test-Path -LiteralPath $frontendEnvironmentFile -PathType Leaf)) {
        throw 'O .env.local do frontend não foi encontrado.'
    }
    $apiUrlMatches = @([regex]::Matches([IO.File]::ReadAllText($frontendEnvironmentFile), '(?m)^\s*VITE_API_BASE_URL\s*=\s*(.*)$'))
    if ($apiUrlMatches.Count -ne 1) { throw 'O .env.local precisa ter exatamente uma chave VITE_API_BASE_URL.' }
    return $apiUrlMatches[0].Groups[1].Value.Trim()
}

function Set-FrontendApiBase([string]$Value) {
    $content = [IO.File]::ReadAllText($frontendEnvironmentFile)
    $pattern = '(?m)^([ \t]*VITE_API_BASE_URL[ \t]*=[ \t]*).*$'
    $apiUrlMatches = [regex]::Matches($content, $pattern)
    if ($apiUrlMatches.Count -ne 1) { throw 'Não foi possível atualizar VITE_API_BASE_URL com segurança.' }
    $match = $apiUrlMatches[0]
    $updated = $content.Substring(0, $match.Index) + $match.Groups[1].Value + $Value +
        $content.Substring($match.Index + $match.Length)
    if ([string]::Equals($content, $updated, [StringComparison]::Ordinal)) { return }
    [IO.File]::WriteAllText($frontendEnvironmentFile, $updated, [Text.UTF8Encoding]::new($false))
}

function Get-Sha256([string]$Value) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { $hash = $algorithm.ComputeHash($bytes) } finally { $algorithm.Dispose() }
    return [BitConverter]::ToString($hash).Replace('-', '')
}

function Get-BaseState($Container) {
    $labels = $Container.Config.Labels
    if ($labels.'com.docker.compose.project' -ne 'mottainai-local-qa' -or
        $labels.'com.docker.compose.service' -ne 'api') {
        throw 'O container encontrado não corresponde à API local de QA esperada.'
    }
    $files = @($labels.'com.docker.compose.project.config_files' -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $environmentFiles = @($labels.'com.docker.compose.project.environment_file' -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($files.Count -eq 0) { throw 'Não foi possível identificar a configuração Compose atual da API.' }
    return @{
        project = $labels.'com.docker.compose.project'
        projectDirectory = $labels.'com.docker.compose.project.working_dir'
        environmentFiles = $environmentFiles
        configFiles = $files
        previousDatabaseUrlHash = Get-Sha256 ((Get-ContainerEnvironment $Container).DB_URL)
        previousFrontendApiBase = Get-FrontendApiBase
    }
}

function Read-BaseState {
    if (-not (Test-Path -LiteralPath $stateFile -PathType Leaf)) {
        throw 'Não há configuração anterior salva para restaurar.'
    }
    return Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
}

function New-ComposeArguments($State, [string]$AdditionalEnvironmentFile = '') {
    $arguments = @('compose', '-p', $State.project, '--project-directory', $State.projectDirectory)
    foreach ($file in $State.environmentFiles) { $arguments += @('--env-file', $file) }
    foreach ($file in $State.configFiles) { $arguments += @('-f', $file) }
    if ($AdditionalEnvironmentFile) { $arguments += @('--env-file', $AdditionalEnvironmentFile) }
    return $arguments
}

function Invoke-ComposeQuiet([string[]]$Arguments) {
    & docker @Arguments 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { return $false }
    return $true
}

function Restore-BaseConfiguration($State) {
    $arguments = New-ComposeArguments $State
    if (-not (Invoke-ComposeQuiet ($arguments + @('up', '-d', '--no-deps', '--no-build', '--wait', 'api')))) {
        throw 'A configuração anterior da API não pôde ser restaurada.'
    }
    $restored = Get-Container
    if ($restored.State.Status -ne 'running' -or $restored.State.Health.Status -ne 'healthy') {
        throw 'A API restaurada não ficou saudável.'
    }
    $restoredEnvironment = Get-ContainerEnvironment $restored
    if ((Get-Sha256 $restoredEnvironment.DB_URL) -ne $State.previousDatabaseUrlHash) {
        throw 'A API restaurada não está usando a conexão anterior esperada.'
    }
    Set-FrontendApiBase $State.previousFrontendApiBase
}

if ($RestorePreviousConfiguration) {
    $savedState = Read-BaseState
    Restore-BaseConfiguration $savedState
    Write-Output 'API local restaurada à conexão anterior; a URL do frontend também foi restaurada.'
    exit 0
}

$database = Read-EnvironmentFile $EnvironmentFile
$databaseLocation = Get-DatabaseLocation $database
$current = Get-Container
if ($current.Config.Labels.'com.docker.compose.project' -ne 'mottainai-local-qa' -or
    $current.Config.Labels.'com.docker.compose.service' -ne 'api') {
    throw 'O container não corresponde à API local de QA esperada.'
}
if ($RecoverUnavailableApi) {
    if (-not (Test-Path -LiteralPath $stateFile -PathType Leaf) -or
        (Get-ContainerEnvironment $current).DB_URL -ne $databaseLocation.Url) {
        throw 'A recuperação exige um estado salvo e o mesmo banco remoto já configurado.'
    }
} elseif ($current.State.Status -ne 'running' -or $current.State.Health.Status -ne 'healthy') {
    throw 'A API local precisa estar ativa e saudável antes da troca.'
}

$state = if (Test-Path -LiteralPath $stateFile -PathType Leaf) { Read-BaseState } else { Get-BaseState $current }
$composeArguments = New-ComposeArguments $state $EnvironmentFile
$composeArguments += @('-f', $overlayFile)
if (-not (Invoke-ComposeQuiet ($composeArguments + @('config', '--quiet')))) {
    throw 'A configuração Compose não passou na validação; a API não foi alterada.'
}

if (-not (Test-Path -LiteralPath $stateFile -PathType Leaf)) {
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding utf8
}

try {
    if (-not (Invoke-ComposeQuiet ($composeArguments + @('up', '-d', '--no-deps', '--no-build', '--wait', '--wait-timeout', '180', 'api')))) {
        throw 'O container da API não iniciou com a nova conexão.'
    }
    $updated = Get-Container
    $updatedEnvironment = Get-ContainerEnvironment $updated
    $connectionMatches = $updated.State.Status -eq 'running' -and
        $updated.State.Health.Status -eq 'healthy' -and
        [string]::Equals($updatedEnvironment.DB_URL, $databaseLocation.Url, [StringComparison]::Ordinal) -and
        [string]::Equals($updatedEnvironment.DB_USER, $databaseLocation.User, [StringComparison]::Ordinal) -and
        [string]::Equals($updatedEnvironment.DB_SCHEMA, $databaseLocation.Schema, [StringComparison]::Ordinal) -and
        -not [string]::IsNullOrWhiteSpace($updatedEnvironment.DB_PASSWORD)
    if (-not $connectionMatches) { throw 'O container não confirmou a conexão solicitada.' }

    Set-FrontendApiBase $localApiBase
    Write-Output 'API local saudável e configurada com o banco remoto; o frontend local aponta para essa API.'
} catch {
    if ($RecoverUnavailableApi) {
        throw 'A API não ficou saudável durante a recuperação. O destino remoto foi mantido; nenhum banco alternativo foi selecionado.'
    }
    try { Restore-BaseConfiguration $state } catch { throw 'A nova conexão falhou e a restauração automática também falhou. O estado da API precisa de atenção.' }
    throw 'A nova conexão falhou; a API e a URL do frontend foram restauradas à configuração anterior.'
}
