<#
.SYNOPSIS
    Поиск исполняемого файла ffmpeg в системе.
    Ищет в PATH, winget, рядом с yt-dlp и через пакетные менеджеры.
.PARAMETER ytDlpPath
    Путь к yt-dlp, используется для поиска ffmpeg в той же директории.
#>

function Find-ffmpeg {
    param([string]$ytDlpPath)

    # Если путь к yt-dlp не указан — пропускаем поиск рядом с ним
    if (-not $ytDlpPath) {
        # просто не будем искать в директории yt-dlp
    }

    # Сначала проверяем PATH
    try {
        $cmd = Get-Command 'ffmpeg.exe' -ErrorAction Stop
        return $cmd.Source
    } catch {}

    # Поиск в winget (рекурсивно, с ограничением глубины)
    $localAppData = $env:LOCALAPPDATA
    if ($localAppData) {
        $wingetBase = "$localAppData\Microsoft\WinGet\Packages"
        if (Test-Path $wingetBase) {
            $results = Get-ChildItem -Path $wingetBase -Recurse -Depth 3 -Filter 'ffmpeg.exe' -ErrorAction SilentlyContinue
            if ($results) {
                return $results[0].FullName
            }
        }
    }

    # Поиск в той же папке, где найден yt-dlp
    $ytDir = Split-Path $ytDlpPath -Parent
    $localPath = "$ytDir\ffmpeg.exe"
    if (Test-Path $localPath) { return $localPath }

    # Поиск в Chocolatey
    $chocoPath = 'C:\ProgramData\chocolatey\bin\ffmpeg.exe'
    if (Test-Path $chocoPath) { return $chocoPath }

    # Поиск в Scoop
    $userProfile = $env:USERPROFILE
    if ($userProfile) {
        $scoopPath = "$userProfile\scoop\apps\ffmpeg\current\ffmpeg.exe"
        if (Test-Path $scoopPath) { return $scoopPath }
    }

    # Стандартные пути установки ffmpeg
    $paths = @(
        'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        'C:\ffmpeg\bin\ffmpeg.exe',
        "$env:ProgramFiles\ffmpeg\bin\ffmpeg.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }

    # Финальная попытка: where.exe
    try {
        $where = & where.exe ffmpeg 2>$null
        if ($where) { return $where[0].Trim() }
    } catch {}

    return $null
}
