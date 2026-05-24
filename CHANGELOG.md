# Changelog

## 1.2.3 (2026-05-24)

- Выделены общие наборы тестовых YouTube URL в shared-test-urls.js (C-extract-shared-urls)
  — 30 валидных и 40 невалидных URL, dual-mode
- url-validation.test.js и consistency.test.js переведены на импорт из shared-test-urls
- Добавлены тесты целостности shared-test-urls.test.js (3 теста: дубликаты, пересечение)
- Скачивание форматов с `bestvideo+bestaudio` прерывается с ошибкой, если ffmpeg не найден (предотвращает битые файлы)
- `bestaudio/best` работает без ffmpeg, как и раньше
- `saveSettings()` больше не падает если `#outputDir` отсутствует в DOM
- `loadSettings()` не падает если `#outputDir` отсутствует в DOM
- `handleDownload()` использует `customDir` вместо прямого чтения DOM
- Добавлены тесты на сценарии отсутствия `#outputDir` (+8 тестов)
- Добавлен `role="status"` и `aria-live="polite"` для `#status` в popup.html (доступность для скринридеров)
- Добавлено логирование (`console.warn`) при ошибке сохранения настроек в `saveSettings()` (был пустой catch)
- Добавлена `content_security_policy` в `manifest.json`: `style-src 'self' 'unsafe-inline'` для поддержки встроенных `<style>` блоков в popup.html
- Вынесены функции Find-yt-dlp и Find-ffmpeg из handler.ps1 в отдельные модули find-yt-dlp.ps1 / find-ffmpeg.ps1
  с dot-source подключением (C-refactor-handler-split); Find-ffmpeg теперь принимает `-ytDlpPath`
- Добавлена проверка схемы `ytdlp://` в handler.ps1 (защита от неверной регистрации протокола)
- Вынесено заполнение `<select id="quality">` из HTML в JS — функция `populateQualityOptions()`
- `init()` теперь проверяет наличие критических DOM-элементов (`#videoTitle`, `#downloadBtn`)
  при инициализации с выводом ошибки при их отсутствии
- В `DOMContentLoaded` добавлены null-guard'ы для привязки событий к `#downloadBtn` и `#outputDir`
- Добавлены тесты на `populateQualityOptions()` (+5), на отсутствие `#videoTitle`/`#downloadBtn` в `init()` (+2),
  на рефакторинг выноса Find-* (+7 тестов в consistency.test.js)

## 1.2.2 (2026-05-24)

- Удалён поиск Python* в Program Files из `handler.ps1` (D-remove-python-search).
  `pip (user)` + `where.exe` покрывают все сценарии без обхода диска.
- Добавлен `$`-якорь в regex URL-валидации `handler.ps1` (синхронизация с JS).
- Добавлены регрессионные тесты на удаление Python-поиска в `consistency.test.js`.
- Обновлён PERF_AUDIT.md: секция поиска Python* помечена как REMOVED.

## 1.2.1 (2026-05-24)

- Удалена no-op строка в `ytdlp-handler.bat` (повторное присваивание переменной)
- `saveSettings()` теперь вызывается с `await` (гарантированное сохранение перед скачиванием)
- `setTimeout` для разблокировки кнопки теперь корректно очищается при повторном клике
- Ограничена глубина рекурсивного поиска ffmpeg в `handler.ps1` (`-Depth 3`)

## 1.2.0 (2026-05-23)

- Исправлена регрессия: URL `/watch?v=...` не распознавались из-за regex
- Выделена функция `isYouTubeUrl()` в `url-utils.js` с dual-mode
- Добавлены unit-тесты на валидацию URL (39 тестов, node:test)
- Добавлена валидация YouTube URL в `handler.ps1` (защита от SSRF)
- Добавлена валидация форматов (whitelist) в `handler.ps1`
- Добавлены тесты консистентности между JS и PowerShell (6 тестов)

## 1.1.0 (2026-05-23)

- Поддержка YouTube Shorts

## 1.0.0 (2026-05-23)

- Первый релиз
- Popup расширения с выбором качества (6 вариантов)
- Скачивание через yt-dlp + ffmpeg (custom protocol)
- Настройка папки для сохранения
- Автообновление yt-dlp перед скачиванием
