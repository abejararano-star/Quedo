param([string]$Xampp = 'C:\xampp', [int]$Port = 8089)
$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot.Replace('\','/')
$install = $Xampp.Replace('\','/')
$runtime = "$project/storage/apache"
New-Item -ItemType Directory -Path "$runtime/ini" -Force | Out-Null
[IO.File]::WriteAllText("$runtime/ini/quedo.ini","extension=sodium")
$env:PHP_INI_SCAN_DIR = "$runtime/ini"
$env:Path = "$Xampp/php;$Xampp/apache/bin;" + $env:Path
$config = @"
ServerRoot "$install/apache"
ServerName 127.0.0.1
Listen 127.0.0.1:$Port
PidFile "$runtime/httpd.pid"
ErrorLog "$runtime/apache-error.log"
LoadModule authz_core_module modules/mod_authz_core.so
LoadModule authz_host_module modules/mod_authz_host.so
LoadModule mime_module modules/mod_mime.so
LoadModule dir_module modules/mod_dir.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadFile "$install/php/php8ts.dll"
LoadFile "$install/php/libsqlite3.dll"
LoadModule php_module "$install/php/php8apache2_4.dll"
PHPIniDir "$install/php"
TypesConfig "$install/apache/conf/mime.types"
DocumentRoot "$project/public"
<Directory />
    Require all denied
</Directory>
<Directory "$project/public">
    AllowOverride All
    Require local
    <FilesMatch "\.php$">
        SetHandler application/x-httpd-php
    </FilesMatch>
</Directory>
"@
[IO.File]::WriteAllText("$runtime/httpd.conf",$config)
& "$Xampp/apache/bin/httpd.exe" -t -f "$runtime/httpd.conf"
if ($LASTEXITCODE) { throw 'Apache rechazó la configuración.' }
& "$Xampp/apache/bin/httpd.exe" -f "$runtime/httpd.conf" -X
