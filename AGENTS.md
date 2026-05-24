# YouDown — для агентов

## Что это

YouDown — Chrome-расширение (Manifest V3) для скачивания видео с YouTube через yt-dlp. Пользователь нажимает на иконку расширения, выбирает качество, и URL отправляется в yt-dlp через custom protocol `ytdlp://`.

## Структура проекта

```
YouDown/
├── extension/                 ← расширение браузера
│   ├── popup.html             ← окошко с выбором качества
│   ├── popup.js               ← логика UI, события
│   ├── url-utils.js           ← isYouTubeUrl() — dual-mode (global + CommonJS)
│   ├── manifest.json          ← MV3, activeTab + storage, CSP (style-src 'unsafe-inline')
│   ├── tests/                 ← unit-тесты (node:test)
│   │   ├── shared-test-urls.js     ← общие наборы URL (dual-mode)
│   │   ├── shared-test-urls.test.js← тесты целостности наборов
│   │   ├── url-validation.test.js  ← 70 тестов для isYouTubeUrl
│   │   ├── popup.test.js           ← тесты UI-логики
│   │   └── consistency.test.js     ← тесты консистентности JS↔PS1
│   └── icons/
├── windows/                   ← Windows-обработчик
│   ├── handler.ps1            ← PowerShell-обработчик (парсинг URL, вызов yt-dlp, dot-source функций поиска)
│   ├── find-yt-dlp.ps1        ← Поиск yt-dlp: PATH, winget, Chocolatey, Scoop, pip и типовые пути
│   ├── find-ffmpeg.ps1        ← Поиск ffmpeg: PATH, winget, рядом с yt-dlp, пакетные менеджеры
│   ├── ytdlp-handler.bat      ← входная точка (вызывается браузером)
│   ├── register-protocol.reg  ← регистрация протокола ytdlp://
│   └── tests/                 ← Pester-тесты для handler.ps1
├── docs/                      ← документация и трекинг задач
│   ├── PERF_AUDIT.md          ← отчёт по производительности
│   └── tasks/                 ← трекинг задач
│       ├── B-add-license/
│       ├── D-remove-python-search/
│       └── project-audit/
├── package.json               ← тесты и скрипты (node:test)
├── AGENTS.md                  ← описание для агентов
├── CHANGELOG.md               ← история изменений
├── INSTALL.md                 ← инструкция по установке
└── README.md                  ← главное описание
```

## Ключевые файлы

| Файл | Назначение |
|---|---|
| `extension/popup.js` | Вся логика расширения: получение вкладки, валидация URL, отправка протокола |
| `extension/url-utils.js` | `isYouTubeUrl(url)` — проверяет, является ли URL видео на YouTube |
| `extension/tests/shared-test-urls.js` | Общие наборы YouTube URL (30 valid + 40 invalid), dual-mode |
| `extension/tests/url-validation.test.js` | 70 тестов для isYouTubeUrl (из shared) |
| `extension/tests/consistency.test.js` | 12 тестов консистентности JS↔PS1 + регрессия |
| `windows/handler.ps1` | PowerShell-скрипт: получает URL, парсит параметры, запускает yt-dlp. Использует dot-source функций из find-*.ps1 |
| `windows/find-yt-dlp.ps1` | Поиск yt-dlp в системе (PATH, winget, Chocolatey, Scoop, pip, типовые пути) |
| `windows/find-ffmpeg.ps1` | Поиск ffmpeg в системе (PATH, winget, рядом с yt-dlp, пакетные менеджеры) |
| `windows/tests/handler.Tests.ps1` | Pester-тесты для handler.ps1 (проверка схемы ytdlp://) |

## Тесты

**Запуск:**
```bash
npm test
# или напрямую:
node --test extension/tests/*.test.js
```

- Node.js-тесты используют встроенный `node:test` + `node:assert` (zero зависимостей)
- Node.js >= 18
- 130 тестов: 70 URL-валидации + 20 консистентности JS↔PS1 + 36 UI + 3 целостности наборов + 1 структурный регрессии

**Pester-тесты (Windows):**
```powershell
# Требует Pester: Install-Module -Name Pester -Force
Invoke-Pester -Path windows/tests/
```

- `windows/tests/handler.Tests.ps1` — 11 тестов проверки схемы `ytdlp://`

## Режим dual-mode

Функция `isYouTubeUrl` и наборы тестовых URL работают в браузере (глобальный скоуп) и в Node.js (CommonJS):

**url-utils.js:**
```js
function isYouTubeUrl(url) { ... }
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isYouTubeUrl };
}
```

**shared-test-urls.js:**
```js
const VALID_YOUTUBE_URLS = [ ... ];
const INVALID_YOUTUBE_URLS = [ ... ];
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VALID_YOUTUBE_URLS, INVALID_YOUTUBE_URLS };
}
```

## Правила работы

- **Не менять поведение regex без задачи** — расширение форматов URL (youtu.be, m.youtube.com, embed) вынесено в задачу C-expand-url-formats
- **Тесты пишутся через `node:test`** — никаких внешних test runner-ов
- **Комментарии на русском** — проект российский
- **После изменений** запускать `npm test`, обновлять документацию
