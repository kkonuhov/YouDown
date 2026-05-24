<#
.SYNOPSIS
    Поиск исполняемого файла yt-dlp в системе.
    Ищет в PATH, winget, Chocolatey, Scoop, pip и типовых расположениях.
#>

function Find-yt-dlp {
    # Сначала проверяем PATH
    try {
        $cmd = Get-Command 'yt-dlp.exe' -ErrorAction Stop
        return $cmd.Source
    } catch {}

    # Поиск в winget (Microsoft.WinGet.Packages)
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

    # Поиск в Chocolatey
    $chocoPath = 'C:\ProgramData\chocolatey\bin\yt-dlp.exe'
    if (Test-Path $chocoPath) { return $chocoPath }

    # Поиск в Scoop
    $userProfile = $env:USERPROFILE
    if ($userProfile) {
        $scoopPath = "$userProfile\scoop\apps\yt-dlp\current\yt-dlp.exe"
        if (Test-Path $scoopPath) { return $scoopPath }
    }

    # Поиск в pip (установка пользователем)
    $appData = $env:APPDATA
    if ($appData) {
        $pipPath = "$appData\Python\Scripts\yt-dlp.exe"
        if (Test-Path $pipPath) { return $pipPath }
    }

    # Глобальные пути установки
    $globalPaths = @(
        'C:\Program Files\yt-dlp\yt-dlp.exe',
        'C:\Tools\yt-dlp.exe'
    )
    foreach ($p in $globalPaths) {
        if (Test-Path $p) { return $p }
    }

    # Пути в профиле пользователя
    if ($userProfile) {
        $userPaths = @(
            "$userProfile\yt-dlp.exe",
            "$userProfile\bin\yt-dlp.exe"
        )
        foreach ($p in $userPaths) {
            if (Test-Path $p) { return $p }
        }
    }

    # Финальная попытка: where.exe
    try {
        $where = & where.exe yt-dlp 2>$null
        if ($where) { return $where[0].Trim() }
    } catch {}

    return $null
}
