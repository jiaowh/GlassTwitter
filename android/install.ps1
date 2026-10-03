$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:LOCALAPPDATA 'GlassXBuild/sdk/platform-tools/adb.exe'
$apk = Join-Path $PSScriptRoot 'app/build/outputs/apk/debug/app-debug.apk'
if (!(Test-Path $apk)) { throw 'Build the APK first with build.ps1' }
& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw 'Install failed. Connect one Android phone and authorize USB debugging.' }
& $adb shell am start -n com.glassx.app/.MainActivity
