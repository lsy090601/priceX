$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$env:PYTHONIOENCODING = "utf-8"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Error ".env file is missing. Copy .env.example and enter your service key."
}

$configured = Select-String -LiteralPath $envPath -Pattern '^DATA_GO_KR_SERVICE_KEY=.+$' -Quiet
if (-not $configured) {
    Write-Error "Set DATA_GO_KR_SERVICE_KEY in .env."
}

Write-Host "[1/2] Running local tests"
python -m unittest discover -s (Join-Path $projectRoot "tests") -v
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$cabbage = ([string][char]0xBC30) + ([string][char]0xCD94)
Write-Host "`n[2/2] Querying Chamgage API"
python (Join-Path $PSScriptRoot "chamgage.py") search $cabbage --limit 10
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nChamgage API connection test passed."
