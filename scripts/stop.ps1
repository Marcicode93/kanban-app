$ErrorActionPreference = "SilentlyContinue"

$ContainerName = "pm-kanban"

docker stop $ContainerName
docker rm $ContainerName

Write-Host "Stopped."
