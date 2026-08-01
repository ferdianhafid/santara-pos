$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidStudioJava = 'C:\Program Files\Android\Android Studio\jbr'
$androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$gradleRoot = Join-Path $env:LOCALAPPDATA 'SantaraPOS\gradle'
$projectCache = Join-Path $gradleRoot 'project-cache'
$externalBuildRoot = Join-Path $gradleRoot 'build'
$artifactDirectory = Join-Path $projectRoot 'artifacts\android'
$artifactPath = Join-Path $artifactDirectory 'cafe-pos-debug.apk'

if (-not $env:JAVA_HOME) {
  if (-not (Test-Path -LiteralPath $androidStudioJava)) {
    throw 'JAVA_HOME belum diatur dan Java bawaan Android Studio tidak ditemukan.'
  }

  $env:JAVA_HOME = $androidStudioJava
}

if (-not $env:ANDROID_HOME) {
  if (-not (Test-Path -LiteralPath $androidSdk)) {
    throw 'ANDROID_HOME belum diatur dan Android SDK standar tidak ditemukan.'
  }

  $env:ANDROID_HOME = $androidSdk
}

$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
$env:CAFE_POS_ANDROID_BUILD_DIR = $externalBuildRoot

Push-Location $projectRoot
try {
  & npm.cmd run android:sync

  $buildDrive = @('Z:', 'Y:', 'X:', 'W:') |
    Where-Object { -not (Test-Path -LiteralPath "$_\") } |
    Select-Object -First 1

  if (-not $buildDrive) {
    throw 'Tidak ada drive sementara yang tersedia untuk build Android.'
  }

  & subst.exe $buildDrive $projectRoot
  try {
    Push-Location "$buildDrive\android"
    try {
      & .\gradlew.bat --project-cache-dir $projectCache assembleDebug
    }
    finally {
      Pop-Location
    }

    $generatedApk = Join-Path $externalBuildRoot 'app\outputs\apk\debug\app-debug.apk'
    if (-not (Test-Path -LiteralPath $generatedApk)) {
      throw "APK debug tidak ditemukan di $generatedApk"
    }

    New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
    Copy-Item -LiteralPath $generatedApk -Destination $artifactPath -Force
    Write-Output "APK debug: $artifactPath"
  }
  finally {
    & subst.exe $buildDrive /D
  }
}
finally {
  Pop-Location
}
