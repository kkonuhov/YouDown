<#
.SYNOPSIS
    YouDown - yt-dlp handler for Windows
    Called by ytdlp-handler.bat via environment variable YOUTUBE_URL
.DESCRIPTION
    Parses the ytdlp:// protocol URL, extracts video URL and format,
    auto-updates yt-dlp, and downloads the video.
#>

$rawUrl = $env:YOUTUBE_URL

if (-not $rawUrl) {
    Write-Host "YouDown: no URL received (YOUTUBE_URL is empty)"
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

# Set default format if empty
if (-not $format -or $format.Trim() -eq '') {
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

# --- Find yt-dlp ---
function Find-yt-dlp {
    # Try PATH first
    try {
        $cmd = Get-Command 'yt-dlp.exe' -ErrorAction Stop
        return $cmd.Source
    } catch {}

    # winget install location
    $localAppData = $env:LOCALAPPDATA
    if ($localAppData) {
        $wingetBase = "$localAppData\Microsoft\WinGet\Packages"
        if (Test-Path $wingetBase) {
            $dirs = Get-ChildItem -Path $wingetBase -Directory -Filter 'yt-dlp*' -ErrorAction SilentlyContinue
            foreach ($d in $dirs) {
                $exe = "$($d.FullName)\yt-dlp.exe"
                if (Test-Path $exe) { return $exe }
            }
        }
    }

    # Chocolatey
    $chocoPath = 'C:\ProgramData\chocolatey\bin\yt-dlp.exe'
    if (Test-Path $chocoPath) { return $chocoPath }

    # Scoop
    $userProfile = $env:USERPROFILE
    if ($userProfile) {
        $scoopPath = "$userProfile\scoop\apps\yt-dlp\current\yt-dlp.exe"
        if (Test-Path $scoopPath) { return $scoopPath }
    }

    # pip (user)
    $appData = $env:APPDATA
    if ($appData) {
        $pipPath = "$appData\Python\Scripts\yt-dlp.exe"
        if (Test-Path $pipPath) { return $pipPath }
    }

    # Global paths
    $globalPaths = @(
        'C:\Program Files\yt-dlp\yt-dlp.exe',
        'C:\Tools\yt-dlp.exe'
    )
    foreach ($p in $globalPaths) {
        if (Test-Path $p) { return $p }
    }

    # User paths
    if ($userProfile) {
        $userPaths = @(
            "$userProfile\yt-dlp.exe",
            "$userProfile\bin\yt-dlp.exe"
        )
        foreach ($p in $userPaths) {
            if (Test-Path $p) { return $p }
        }
    }

    # pip (system) - wildcard search
    $pythonDirs = Get-ChildItem -Path 'C:\' -Directory -Filter 'Python*' -ErrorAction SilentlyContinue
    foreach ($pd in $pythonDirs) {
        $exe = "$($pd.FullName)\Scripts\yt-dlp.exe"
        if (Test-Path $exe) { return $exe }
    }

    # Last try: where.exe
    try {
        $where = & where.exe yt-dlp 2>$null
        if ($where) { return $where[0].Trim() }
    } catch {}

    return $null
}

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

# --- Find ffmpeg ---
function Find-ffmpeg {
    # Try PATH first
    try {
        $cmd = Get-Command 'ffmpeg.exe' -ErrorAction Stop
        return $cmd.Source
    } catch {}

    # winget install location - search recursively
    $localAppData = $env:LOCALAPPDATA
    if ($localAppData) {
        $wingetBase = "$localAppData\Microsoft\WinGet\Packages"
        if (Test-Path $wingetBase) {
            # Search all ffmpeg.exe recursively (no depth limit - can be nested deep)
            $results = Get-ChildItem -Path $wingetBase -Recurse -Filter 'ffmpeg.exe' -ErrorAction SilentlyContinue
            if ($results) {
                return $results[0].FullName
            }
        }
    }

    # In the same folder as yt-dlp
    $ytDir = Split-Path $ytDlpPath -Parent
    $localPath = "$ytDir\ffmpeg.exe"
    if (Test-Path $localPath) { return $localPath }

    # Chocolatey
    $chocoPath = 'C:\ProgramData\chocolatey\bin\ffmpeg.exe'
    if (Test-Path $chocoPath) { return $chocoPath }

    # Scoop
    $userProfile = $env:USERPROFILE
    if ($userProfile) {
        $scoopPath = "$userProfile\scoop\apps\ffmpeg\current\ffmpeg.exe"
        if (Test-Path $scoopPath) { return $scoopPath }
    }

    # Standard install paths
    $paths = @(
        'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        'C:\ffmpeg\bin\ffmpeg.exe',
        "$env:ProgramFiles\ffmpeg\bin\ffmpeg.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }

    # Last try: where.exe
    try {
        $where = & where.exe ffmpeg 2>$null
        if ($where) { return $where[0].Trim() }
    } catch {}

    return $null
}

$ffmpegPath = Find-ffmpeg

# --- Auto-update yt-dlp ---
Write-Host "[*] Checking for yt-dlp updates..."
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

Write-Host "[*] Starting download..."
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
} else {
    Write-Host "  [!] ffmpeg not found - video and audio will not be merged."
    Write-Host "      Install: winget install ffmpeg"
    Write-Host "      or download from https://ffmpeg.org/download.html"
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
