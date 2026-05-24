<#
.SYNOPSIS
    YouDown - yt-dlp handler for Windows
    Called by ytdlp-handler.bat via environment variable YOUTUBE_URL
.DESCRIPTION
    Parses the ytdlp:// protocol URL, extracts video URL and format,
    auto-updates yt-dlp, and downloads the video.
#>

# Dot-source функций поиска yt-dlp и ffmpeg
. "$PSScriptRoot\find-yt-dlp.ps1"
. "$PSScriptRoot\find-ffmpeg.ps1"

$rawUrl = $env:YOUTUBE_URL

if (-not $rawUrl) {
    Write-Host "YouDown: no URL received (YOUTUBE_URL is empty)"
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# --- Проверка схемы ---
if ($rawUrl -notmatch '^ytdlp://') {
    Write-Host "[!] Ошибка: ожидается протокол ytdlp://"
    Write-Host "    Получено: $rawUrl"
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Write-Host "Raw URL received: $rawUrl"

# --- Parse URL ---

# Extract query string (everything after first ?)
# Do NOT decode the entire URL - this breaks + and %2B and causes errors
$questionMark = $rawUrl.IndexOf('?')
if ($questionMark -ge 0) {
    $queryString = $rawUrl.Substring($questionMark + 1)
} else {
    $queryString = $rawUrl
}

Write-Host "Query string: $queryString"

# Parse query params (correctly handles %2B -> +, %2F -> /, etc.)
Add-Type -AssemblyName System.Web
$params = [System.Web.HttpUtility]::ParseQueryString($queryString)

$videoUrl = $params['url']
$format   = $params['f']

# If url not found - try fallback parsing
if (-not $videoUrl) {
    Write-Host "[!] Trying fallback parsing..."
    $decoded = [System.Uri]::UnescapeDataString($rawUrl)
    $decoded = $decoded -replace '^ytdlp://download/?\?', ''
    $params2 = [System.Web.HttpUtility]::ParseQueryString($decoded)
    $videoUrl = $params2['url']
    $format   = $params2['f']
}

if (-not $videoUrl) {
    Write-Host "[!] No video URL found in the request."
    Write-Host "    Query parameters:"
    foreach ($key in $params.AllKeys) {
        Write-Host "      $key = $($params[$key])"
    }
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# --- Validate YouTube URL ---
# ВНИМАНИЕ: Этот regex дублирован в extension/url-utils.js
# При изменении — обновлять оба файла! (форматы расширены: embed, youtu.be, m., music.)
function Test-YouTubeUrl {
    param([string]$url)
    $pattern = '^https?://((www\.|m\.|music\.)?youtube\.com/(watch\?.+|shorts/.+|embed/.+)|youtu\.be/.+)$'
    return ($url.Trim() -match $pattern)
}

if (-not (Test-YouTubeUrl $videoUrl)) {
    Write-Host "[!] Ошибка: невалидный YouTube URL."
    Write-Host "    Разрешены youtube.com (watch, shorts, embed), youtu.be, m.youtube.com, music.youtube.com."
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Установить формат по умолчанию, если не указан
if ([string]::IsNullOrWhiteSpace($format)) {
    $format = 'bestvideo+bestaudio/best'
}

# --- Validate format ---
# ВНИМАНИЕ: Этот список должен совпадать с QUALITY_LABELS в extension/popup.js
# При изменении — обновлять оба файла!
$allowedFormats = @(
    'bestvideo+bestaudio/best',
    'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    'bestvideo[height<=720]+bestaudio/best[height<=720]',
    'bestvideo[height<=480]+bestaudio/best[height<=480]',
    'bestvideo[height<=360]+bestaudio/best[height<=360]',
    'bestaudio/best'
)

if ($format -and $format -notin $allowedFormats) {
    Write-Host "[!] Внимание: неизвестный формат '$format'."
    Write-Host "    Используется формат по умолчанию (bestvideo+bestaudio/best)."
    $format = 'bestvideo+bestaudio/best'
}

# Determine output directory from params or default
$customDir = $params['dir']
if ($customDir) {
    # Expand environment variables like %USERPROFILE%
    $outputDir = [System.Environment]::ExpandEnvironmentVariables($customDir)
} else {
    $outputDir = Join-Path $env:USERPROFILE 'Downloads\YouDown'
}
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory $outputDir | Out-Null }

Write-Host ""
Write-Host "============================================"
Write-Host "  YouDown"
Write-Host "============================================"
Write-Host "  Video: $videoUrl"
Write-Host "  Format: $format"
Write-Host "  Output: $outputDir"
Write-Host "============================================"
Write-Host ""

# --- Find yt-dlp (вынесено в find-yt-dlp.ps1) ---

$ytDlpPath = Find-yt-dlp
if (-not $ytDlpPath) {
    Write-Host "[!] yt-dlp not found."
    Write-Host "    Make sure yt-dlp is installed:"
    Write-Host "      winget install yt-dlp.yt-dlp"
    Write-Host "      or place yt-dlp.exe in C:\Windows\System32"
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Write-Host "  yt-dlp path: $ytDlpPath"
Write-Host ""

# --- Find ffmpeg (вынесено в find-ffmpeg.ps1) ---

$ffmpegPath = Find-ffmpeg -ytDlpPath $ytDlpPath

# --- Check ffmpeg for merge formats ---
# Форматы с '+' требуют ffmpeg для слияния дорожек.
# Если ffmpeg не найден — сразу прерываем, чтобы избежать битого файла.
if (-not $ffmpegPath -and $format -match '\+') {
    Write-Host ""
    Write-Host "[!] Ошибка: выбранный формат требует ffmpeg для слияния видео и аудио."
    Write-Host "    Установите ffmpeg: winget install ffmpeg"
    Write-Host "    или скачайте с https://ffmpeg.org/download.html"
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# --- Auto-update yt-dlp ---
Write-Host '[*] Checking for yt-dlp updates...'
try {
    $null = & $ytDlpPath -U --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] yt-dlp update check failed (exit code: $LASTEXITCODE)"
        Write-Host "    Continuing with current version..."
    }
}
catch {
    Write-Host "[!] yt-dlp update check failed: $($_.Exception.Message)"
}

Write-Host '[*] Starting download...'
Write-Host ""

# --- Build yt-dlp arguments ---
$ytArgs = @(
    $videoUrl,
    "-f", $format,
    "-o", "$outputDir\%(title)s.%(ext)s",
    "--embed-thumbnail",
    "--embed-metadata",
    "--console-title",
    "--progress"
)

if ($ffmpegPath) {
    Write-Host "  ffmpeg found: $ffmpegPath"
    $ytArgs += "--ffmpeg-location", $ffmpegPath
}

if ($format -eq 'bestaudio/best') {
    $ytArgs += "--extract-audio", "--audio-format", "mp3"
}

# --- Run yt-dlp ---
& $ytDlpPath @ytArgs

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "[v] Download complete!"
    Start-Process $outputDir
}
else {
    Write-Host "[x] Download failed (error code: $LASTEXITCODE)"
    Write-Host ""
    Write-Host "Tips:"
    Write-Host "  1. Try a different format/quality"
    Write-Host "  2. Check that yt-dlp is up to date"
    Write-Host "  3. The video might be age-restricted or private"
}

Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
