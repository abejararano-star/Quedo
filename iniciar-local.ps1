param([string]$Instalacion='C:\xampp\quedo-laravel-local')
$ErrorActionPreference='Stop'
$data="$Instalacion/storage/mariadb"
if (!(Test-Path "$data/my.ini")) { throw 'No se encontró la copia local de MariaDB.' }
if (!(Get-NetTCPConnection -LocalPort 3311 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process C:/xampp/mysql/bin/mysqld.exe -WindowStyle Hidden -ArgumentList "--defaults-file=$data/my.ini","--basedir=C:/xampp/mysql","--bind-address=127.0.0.1","--port=3311","--log-error=$Instalacion/storage/mariadb.log"
}
if (!(Get-NetTCPConnection -LocalPort 8089 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process (Get-Process -Id $PID).Path -WindowStyle Hidden -ArgumentList '-NoProfile','-File',"$Instalacion/iniciar-apache.ps1"
}
for ($attempt=0;$attempt -lt 15;$attempt++) {
    try {
        $page=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8089/' -TimeoutSec 3
        if ($page.Content.Contains('Sentirte en casa')) { Write-Output 'Quedo disponible en http://127.0.0.1:8089/'; return }
    } catch { Start-Sleep -Seconds 1 }
}
throw 'La portada aún no responde. Revisa los registros de la instalación local.'
