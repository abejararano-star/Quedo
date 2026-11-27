param([string]$Destino='C:\xampp\quedo-laravel-local')
$ErrorActionPreference='Stop'
if (!(Test-Path "$Destino\iniciar-apache.ps1") -or !(Test-Path "$Destino\.env")) { throw 'No se reconoce la instalación local de Quedo.' }
foreach ($folder in 'app','config','routes','resources','public','database','tests') {
    robocopy "$PSScriptRoot\$folder" "$Destino\$folder" /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "No se pudo copiar $folder." }
}
Copy-Item "$PSScriptRoot\bootstrap\app.php","$PSScriptRoot\bootstrap\providers.php" "$Destino\bootstrap" -Force
foreach ($file in 'artisan','iniciar-apache.ps1','composer.json','composer.lock') { Copy-Item "$PSScriptRoot\$file" "$Destino\$file" -Force }
Push-Location $Destino
try {
    $php = 'C:/xampp/quedo-php-8.5.13/php.exe'
    $phpOptions = @()
    if (!(Test-Path $php)) {
        $php = 'C:/xampp/php/php.exe'
        $phpOptions = @('-d', 'extension=sodium')
    }
    & $php @phpOptions artisan config:cache
    if ($LASTEXITCODE) { throw 'No se pudo actualizar la configuración.' }
    & $php @phpOptions artisan view:cache
    if ($LASTEXITCODE) { throw 'No se pudieron compilar las vistas.' }
} finally { Pop-Location }
