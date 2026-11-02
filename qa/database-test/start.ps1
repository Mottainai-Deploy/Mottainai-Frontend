param([ValidateRange(1024, 65535)][int]$Port = 15432)
$ErrorActionPreference = 'Stop'
$environmentFile = Join-Path $PSScriptRoot '.env.local'
if (-not (Test-Path -LiteralPath $environmentFile)) {
    $randomBytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
    $password = -join ($randomBytes | ForEach-Object { $_.ToString('x2') })
    [IO.File]::WriteAllText($environmentFile, "TEST_DB_PASSWORD=$password`nTEST_DB_PORT=$Port`n")
}
$composeArguments = @('compose', '--env-file', $environmentFile, '-f', (Join-Path $PSScriptRoot 'compose.yaml'))
& docker @composeArguments up -d --wait postgres
if ($LASTEXITCODE -ne 0) { throw 'Falha na instalação. Consulte os logs do serviço postgres; os dados foram preservados.' }
& docker @composeArguments run --rm seed
if ($LASTEXITCODE -ne 0) { throw 'Carga ou verificação falhou. Consulte a mensagem SQL acima; não remova o volume para tentar novamente.' }
Write-Host 'Banco de testes pronto. Consulte README.md para conexão e verificação.'
