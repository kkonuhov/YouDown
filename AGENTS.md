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
│   ├── manifest.json          ← MV3, activeTab + storage
│   ├── tests/                 ← unit-тесты (node:test)
│   │   ├── url-validation.test.js  ← 39 тестов для isYouTubeUrl
│   │   ├── popup.test.js           ← тесты UI-логики
│   │   └── consistency.test.js     ← тесты консистентности JS↔PS1
│   └── icons/
├── windows/                   ← Windows-обработчик
│   ├── handler.ps1            ← PowerShell-обработчик (парсинг URL, запуск yt-dlp)
│   ├── ytdlp-handler.bat      ← входная точка (вызывается браузером)
│   └── register-protocol.reg  ← регистрация протокола ytdlp://
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
| `extension/tests/url-validation.test.js` | 39 тестов для isYouTubeUrl |
| `windows/handler.ps1` | PowerShell-скрипт, который получает URL и запускает yt-dlp |

## Тесты

**Запуск:**
```bash
npm test
# или напрямую:
node --test extension/tests/*.test.js
```

- Используют встроенный `node:test` + `node:assert` (zero зависимостей)
- Node.js >= 18
- 39 тестов: 15 валидных URL, 24 невалидных

## Режим dual-mode (url-utils.js)

Функция `isYouTubeUrl` работает и в браузере (глобальный скоуп), и в Node.js (CommonJS):

```js
function isYouTubeUrl(url) { ... }
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isYouTubeUrl };
}
```

## Правила работы

- **Не менять поведение regex без задачи** — расширение форматов URL (youtu.be, m.youtube.com, embed) вынесено в задачу C-expand-url-formats
- **Тесты пишутся через `node:test`** — никаких внешних test runner-ов
- **Комментарии на русском** — проект российский
- **После изменений** запускать `npm test`, обновлять документацию
