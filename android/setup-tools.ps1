param([switch]$AcceptAndroidSdkLicense)
$ErrorActionPreference = 'Stop'
$toolRoot = Join-Path $env:LOCALAPPDATA 'GlassXBuild'
New-Item -ItemType Directory -Force $toolRoot | Out-Null
$javaDir = Get-ChildItem (Join-Path $toolRoot 'java') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if (!$javaDir) {
    $package = (Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows')[0].binary.package
    $zip = Join-Path $toolRoot 'jdk.zip'
    Invoke-WebRequest $package.link -OutFile $zip
    if ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $package.checksum) { throw 'JDK checksum mismatch' }
    Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $toolRoot 'java') -Force
    $javaDir = Get-ChildItem (Join-Path $toolRoot 'java') -Directory | Select-Object -First 1
}
$env:JAVA_HOME = $javaDir.FullName
$sdkRoot = Join-Path $toolRoot 'sdk'
$manager = Join-Path $sdkRoot 'cmdline-tools/16.0/bin/sdkmanager.bat'
if (!(Test-Path $manager)) {
    if (!$AcceptAndroidSdkLicense) { throw 'Read https://developer.android.com/studio/terms then rerun with -AcceptAndroidSdkLicense if you agree.' }
    $zip = Join-Path $toolRoot 'sdk-tools.zip'
    Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-12266719_latest.zip' -OutFile $zip
    if ((Get-FileHash $zip -Algorithm SHA1).Hash.ToLowerInvariant() -ne '32787c10f55911fd109848906b1275723e79f659') { throw 'SDK checksum mismatch' }
    $unpack = Join-Path $toolRoot 'sdk-unpack'
    Expand-Archive -LiteralPath $zip -DestinationPath $unpack -Force
    New-Item -ItemType Directory -Force (Join-Path $sdkRoot 'cmdline-tools/16.0') | Out-Null
    Copy-Item "$unpack/cmdline-tools/*" (Join-Path $sdkRoot 'cmdline-tools/16.0') -Recurse -Force
}
if ($AcceptAndroidSdkLicense) {
    # Accept only licenses required by these packages, not all SDK add-ons.
    1..10 | ForEach-Object { 'y' } | & $manager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'
} else {
    & $manager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'
}
if ($LASTEXITCODE -ne 0) { throw 'SDK installation failed' }
Write-Output "Command-line toolchain ready at $toolRoot"
