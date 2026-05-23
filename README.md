<p align="center">
  <img src="extension/icons/icon128.png" alt="YouDown" width="96">
</p>

<h1 align="center">YouDown</h1>

<p align="center">
  <strong>Скачивай видео с YouTube в один клик</strong>
  <br>
  Расширение для Chromium-браузеров + yt-dlp на Windows
  <br><br>
  <img src="https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/Chrome-4285F4?style=flat&logo=google-chrome&logoColor=white" alt="Chrome">
  <img src="https://img.shields.io/badge/Yandex%20Browser-FC3F1D?style=flat&logo=yandex&logoColor=white" alt="Yandex">
  <img src="https://img.shields.io/badge/yt--dlp-333?style=flat&logo=youtube&logoColor=red" alt="yt-dlp">
</p>

---

## Возможности

- ⬇️ **Один клик** — нажал на иконку расширения → выбрал качество → скачал
- 🎚️ **Выбор качества** — от 360p до 4K, а также только аудио (MP3)
- 📁 **Своя папка** — куда сохранять, решаешь сам
- 🔄 **Автообновление** — yt-dlp обновляется перед каждым скачиванием
- 🖼️ **Обложка и метаданные** — встраиваются в файл
- 🎵 **Аудиорежим** — скачивание только звука с конвертацией в MP3

## Как это работает

```
[YouTube] → [Расширение (popup)] → [ytdlp:// протокол] → [yt-dlp + ffmpeg] → [Готовое видео]
```

Расширение не встраивается в страницу YouTube и не ломает её. Просто окошко с выбором качества и кнопкой — всё остальное делает yt-dlp.

## Быстрый старт

```
winget install yt-dlp.yt-dlp
winget install ffmpeg
```

Подробная инструкция по установке — [INSTALL.md](INSTALL.md).

## Требования

- **Windows** 10 / 11
- **Chromium-браузер**: Yandex Browser, Google Chrome или любой другой
- **yt-dlp** + **ffmpeg** (устанавливаются через `winget`)

## Почему yt-dlp?

[youtube-dl](https://github.com/ytdl-org/youtube-dl) — классика, но [yt-dlp](https://github.com/yt-dlp/yt-dlp) — его форк, который обновляется в разы быстрее и поддерживает больше форматов. Он используется как движок: расширение только передаёт ему ссылку.

## Структура проекта

```
YouDown/
├── extension/           ← расширение браузера
│   ├── popup.html       ← окошко выбора качества
│   ├── popup.js         ← логика UI
│   ├── url-utils.js     ← валидация YouTube URL
│   ├── manifest.json    ← конфиг расширения
│   ├── tests/           ← unit-тесты
│   │   └── url-validation.test.js
│   └── icons/
├── windows/             ← обработчик для Windows
│   ├── handler.ps1      ← запускает yt-dlp
│   └── ytdlp-handler.bat
├── package.json         ← тесты и зависимости
└── INSTALL.md           ← инструкция по установке
```

## Лицензия

MIT
