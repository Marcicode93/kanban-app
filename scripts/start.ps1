$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ContainerName = "pm-kanban"
$ImageName = "pm-kanban"
$Port = if ($env:PORT) { $env:PORT } else { "8000" }

Set-Location $ProjectDir

Write-Host "Building image..."
docker build -t $ImageName .

docker rm -f $ContainerName 2>$null

$envArgs = @()
if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
}

Write-Host "Starting container..."
docker run -d `
    --name $ContainerName `
    -p "${Port}:8000" `
    @envArgs `
    $ImageName

Write-Host "Running at http://localhost:$Port"
