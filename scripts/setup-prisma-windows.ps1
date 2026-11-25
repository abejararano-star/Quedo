$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$enginePackage = Get-Content -LiteralPath (Join-Path $projectRoot 'node_modules\@prisma\engines-version\package.json') -Raw | ConvertFrom-Json
$engineHash = $enginePackage.prisma.enginesVersion
$engineDir = Join-Path $projectRoot 'node_modules\@prisma\engines'
$engines = @(
  @{ Remote = 'schema-engine.exe'; Local = 'schema-engine-windows.exe' },
  @{ Remote = 'query_engine.dll.node'; Local = 'query_engine-windows.dll.node' }
)
foreach ($engine in $engines) {
  $engineUrl = 'https://binaries.prisma.sh/all_commits/' + $engineHash + '/windows/' + $engine.Remote + '.gz'
  $compressedPath = Join-Path $engineDir ($engine.Local + '.gz')
  $checksumPath = $compressedPath + '.sha256'
  $checksum = Invoke-WebRequest -Uri ($engineUrl + '.sha256') -TimeoutSec 20
  $checksumText = if ($checksum.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($checksum.Content) } else { [string]$checksum.Content }
  $expectedHash = ($checksumText.Trim() -split '\s+')[0]
  $verified = $false
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try { Invoke-WebRequest -Uri $engineUrl -OutFile $compressedPath -Resume -TimeoutSec 25 }
    catch { Write-Output ('Reanudando descarga de ' + $engine.Local + ', intento ' + $attempt) }
    if (Test-Path -LiteralPath $compressedPath) {
      $actualHash = (Get-FileHash -LiteralPath $compressedPath -Algorithm SHA256).Hash
      if ($actualHash.ToLowerInvariant() -eq $expectedHash.ToLowerInvariant()) { $verified = $true; break }
    }
  }
  if (-not $verified) { throw 'No se pudo verificar la descarga oficial completa.' }
  $compressedStream = [System.IO.File]::OpenRead($compressedPath)
  $decompressStream = [System.IO.Compression.GZipStream]::new($compressedStream, [System.IO.Compression.CompressionMode]::Decompress)
  $engineStream = [System.IO.File]::Create((Join-Path $engineDir $engine.Local))
  try { $decompressStream.CopyTo($engineStream) }
  finally { $engineStream.Dispose(); $decompressStream.Dispose(); $compressedStream.Dispose() }
  Write-Output ('Motor descargado y verificado: ' + $engine.Local)
}
$envPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envPath) {
  $config = [System.IO.File]::ReadAllText($envPath)
  $forwardEngineDir = $engineDir.Replace('\', '/')
  if ($config -notmatch '(?m)^PRISMA_QUERY_ENGINE_LIBRARY=') { Add-Content -LiteralPath $envPath -Value ('PRISMA_QUERY_ENGINE_LIBRARY="' + $forwardEngineDir + '/query_engine-windows.dll.node"') }
  if ($config -notmatch '(?m)^PRISMA_SCHEMA_ENGINE_BINARY=') { Add-Content -LiteralPath $envPath -Value ('PRISMA_SCHEMA_ENGINE_BINARY="' + $forwardEngineDir + '/schema-engine-windows.exe"') }
}
