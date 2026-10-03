$ErrorActionPreference = 'Stop'
$toolRoot = Join-Path $env:LOCALAPPDATA 'GlassXBuild'
if (!$env:JAVA_HOME) {
    $javaDir = Get-ChildItem (Join-Path $toolRoot 'java') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($javaDir) { $env:JAVA_HOME = $javaDir.FullName }
}
if (!$env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $toolRoot 'sdk' }
if (!(Test-Path "$env:ANDROID_HOME/platforms/android-35/android.jar")) { throw 'Run setup-tools.ps1 first to install Android SDK 35.' }
& (Join-Path $PSScriptRoot 'sync-assets.ps1')
Push-Location $PSScriptRoot
try {
    & .\gradlew.bat --no-daemon assembleDebug lintDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android build or lint failed' }
    Write-Output "APK: $PSScriptRoot/app/build/outputs/apk/debug/app-debug.apk"
} finally { Pop-Location }
