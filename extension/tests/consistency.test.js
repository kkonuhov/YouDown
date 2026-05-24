/**
 * YouDown — Тесты консистентности между JS и PowerShell
 *
 * Проверяет, что дублированные regex и списки форматов
 * в extension/url-utils.js, extension/popup.js и windows/handler.ps1
 * не расходятся.
 *
 * Запуск:
 *   node --test 'extension/tests/*.test.js'
 *   npm test
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { isYouTubeUrl } = require('../url-utils');

// Импортируем общие наборы тестовых URL
const { VALID_YOUTUBE_URLS: validUrls, INVALID_YOUTUBE_URLS: invalidUrls } = require('./shared-test-urls');

// ──────────────────────────────────────────────
// Вспомогательные функции
// ──────────────────────────────────────────────

/** Прочитать файл как строку */
function readFile(filename) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', filename), 'utf-8');
}

/**
 * Извлечь regex-паттерн из handler.ps1 ($pattern = '...')
 * @returns {string}
 */
function extractPsPattern(content) {
  const match = content.match(/\$pattern\s*=\s*'([^']+)'/);
  if (!match) throw new Error('Pattern not found in handler.ps1');
  return match[1];
}

/**
 * Извлечь список разрешённых форматов из handler.ps1
 * @returns {string[]}
 */
function extractPsFormats(content) {
  const match = content.match(/\$allowedFormats\s*=\s*@\(([\s\S]*?)\)/);
  if (!match) throw new Error('allowedFormats not found in handler.ps1');

  // Извлечь содержимое между скобками, найти все строки в кавычках
  const block = match[1];
  const formats = [];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    formats.push(m[1]);
  }
  return formats;
}

/**
 * Извлечь ключи QUALITY_LABELS из popup.js
 * @returns {string[]}
 */
function extractJsFormats(content) {
  const match = content.match(/const QUALITY_LABELS\s*=\s*\{([\s\S]*?)\};/);
  if (!match) throw new Error('QUALITY_LABELS not found in popup.js');

  const block = match[1];
  const keys = [];
  const re = /'([^']+)'\s*:/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

// ──────────────────────────────────────────────
// Тесты
// ──────────────────────────────────────────────

describe('Консистентность URL-валидации (JS / PS1)', () => {
  const psContent = readFile('windows/handler.ps1');
  const psPattern = extractPsPattern(psContent);

  // Собираем RegExp из паттерна PS1 — паттерн уже содержит ^
  // Примечание: PS1 -match регистронезависим по умолчанию, JS RegExp.test() —
  // регистрозависим. Для набора тестовых URL (все строчные) разница не проявляется.
  const psRegex = new RegExp(psPattern);

  it('regex паттерн в handler.ps1 совпадает с url-utils.js', () => {
    // Проверяем идентичность для всех тестовых URL
    for (const url of validUrls) {
      const jsResult = isYouTubeUrl(url);
      const psResult = psRegex.test(url);
      assert.strictEqual(
        psResult, jsResult,
        `URL: ${url} — JS: ${jsResult}, PS1: ${psResult}`
      );
    }

    for (const url of invalidUrls) {
      const jsResult = isYouTubeUrl(url);
      const psResult = psRegex.test(url);
      assert.strictEqual(
        psResult, jsResult,
        `URL: ${String(url)} — JS: ${jsResult}, PS1: ${psResult}`
      );
    }
  });

  it('PS1 regex корректно обрабатывает URL с пробелами (как .Trim())', () => {
    // PS1 делает .Trim() перед проверкой
    assert.ok(psRegex.test('https://youtube.com/watch?v=ID'));
    assert.ok(psRegex.test('  https://youtube.com/watch?v=ID  '.trim()));
  });

  it('PS1 regex отклоняет shorts/ без ID', () => {
    assert.ok(!psRegex.test('https://youtube.com/shorts'));
    assert.ok(!psRegex.test('https://youtube.com/shorts/'));
  });

  it('все поддерживаемые форматы явно считаются валидными', () => {
    // Предотвращает случайное возвращение новых форматов в invalidUrls
    // Проверяем и JS, и PS1 — страхует от рассинхронизации
    const essentialUrls = [
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/shorts/abc123',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=ID',
      'https://music.youtube.com/watch?v=ID',
      'https://youtube.com/embed/dQw4w9WgXcQ',
    ];
    for (const url of essentialUrls) {
      assert.ok(isYouTubeUrl(url), `JS должен считать валидным: ${url}`);
      assert.ok(psRegex.test(url), `PS1 должен считать валидным: ${url}`);
    }
  });
});

describe('Консистентность списка форматов (JS / PS1)', () => {
  const psContent = readFile('windows/handler.ps1');
  const psFormats = extractPsFormats(psContent);

  const jsContent = readFile('extension/popup.js');
  const jsFormats = extractJsFormats(jsContent);

  it('набор форматов в handler.ps1 совпадает с QUALITY_LABELS в popup.js', () => {
    assert.deepStrictEqual(psFormats, jsFormats);
  });

  it('количество форматов в PS1 совпадает с JS', () => {
    assert.strictEqual(psFormats.length, jsFormats.length,
      'Число форматов в handler.ps1 не совпадает с QUALITY_LABELS в popup.js');
    for (const f of psFormats) {
      assert.ok(typeof f === 'string' && f.length > 0, `Формат пустой: ${f}`);
    }
  });
});

/**
 * Структурная проверка форматов в handler.ps1.
 *
 * ВАЖНО: Это структурные тесты — они проверяют наличие паттернов
 * в исходном коде handler.ps1, а не поведение под PowerShell.
 * Они не гарантируют корректность логики — только её присутствие.
 * Полное поведенческое тестирование требует Pester (Windows/PowerShell).
 */
describe('Формат-валидация PS1 (структурная проверка)', () => {
  const psContent = readFile('windows/handler.ps1');
  const psFormats = extractPsFormats(psContent);
  // Первый элемент allowedFormats — формат по умолчанию (см. PS1: $format при пустом/невалидном)
  const defaultFormat = psFormats[0];

  it('PS1: защита от пустого формата через IsNullOrWhiteSpace', () => {
    assert.ok(
      /if\s*\(\[string\]::IsNullOrWhiteSpace\(\$format\)\)/.test(psContent),
      'Должен быть if ([string]::IsNullOrWhiteSpace($format))'
    );
    // Проверяем, что внутри блока IsNullOrWhiteSpace присваивается defaultFormat
    // Regex: IsNullOrWhiteSpace($format)){...$format = '...'
    // \\\$format → в RegExp это \$format → совпадение с литералом $format в PS1
    const escapedDefault = defaultFormat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const defaultInBlock = new RegExp(
      `IsNullOrWhiteSpace\\(\\\$format\\)\\)\\s*\\{[\\s\\S]*?\\\$format\\s*=\\s*'${escapedDefault}'`
    );
    assert.ok(
      defaultInBlock.test(psContent),
      `В блоке IsNullOrWhiteSpace должно быть присваивание $format = '${defaultFormat}'`
    );
  });

  it('PS1: валидация формата через if ($format -and $format -notin $allowedFormats)', () => {
    assert.ok(
      /if\s*\(\s*\$format\s+-and\s+\$format\s+-notin\s+\$allowedFormats\s*\)/.test(psContent),
      'Должно быть условие if ($format -and $format -notin $allowedFormats)'
    );
  });

  it('PS1: присваивает default при невалидном формате', () => {
    const assignments = psContent.match(/\$format\s*=\s*'[^']+'/g) || [];
    const defaultAssignments = assignments.filter(
      a => a.includes(defaultFormat)
    );
    assert.ok(
      defaultAssignments.length >= 2,
      `Должно быть минимум 2 присваивания '${defaultFormat}' ` +
      `(для пустого и невалидного формата), найдено: ${defaultAssignments.length}`
    );
  });
});

/**
 * Регрессия: D-remove-python-search
 *
 * Проверяет, что удалённый блок поиска Python* в handler.ps1
 * не был случайно восстановлен при слияниях/правках.
 *
 * Задача: D-remove-python-search
 */
describe('Регрессия: D-remove-python-search', () => {
  const psContent = readFile('windows/handler.ps1');

  it('handler.ps1 больше не ищет Python* на C:\\', () => {
    assert.ok(
      !/Get-ChildItem\s+-Path\s+'C:\\'\s+-Directory\s+-Filter\s+'Python\*'/.test(psContent),
      'handler.ps1 не должен содержать Get-ChildItem -Path \'C:\\\' -Filter \'Python*\''
    );
  });

  it('handler.ps1 больше не ищет Python* в Program Files', () => {
    assert.ok(
      !/Get-ChildItem\s+-Path\s+\$pf\s+-Directory\s+-Filter\s+'Python\*'/.test(psContent),
      'handler.ps1 не должен содержать поиск Python* в Program Files'
    );
  });
});

/**
 * Регрессия: синтаксис PowerShell (кавычки с [*])
 *
 * Проверяет, что в .ps1 файлах нет конструкции "[*]" внутри двойных кавычек.
 * В PowerShell expandable string (двойные кавычки) "[*]" интерпретируется
 * как попытка индексирования массива с символом *, что вызывает ошибку
 * "Missing array index expression". Необходимо использовать одинарные кавычки.
 *
 * Баг: строки 172 и 184 handler.ps1 были исправлены с "[*]" на '[*]'
 */
describe('Регрессия: синтаксис PowerShell (кавычки с [*])', () => {
  const psFiles = ['windows/handler.ps1', 'windows/find-yt-dlp.ps1', 'windows/find-ffmpeg.ps1'];

  for (const psFile of psFiles) {
    const content = readFile(psFile);

    it(`${psFile} не содержит "[*]" в двойных кавычках`, () => {
      // Ищем "[*]" — последовательность внутри double-quoted строки
      // В PowerShell это ломает парсинг (попытка индексации массива)
      // Используем regex, чтобы отличить "[*]" (двойные кавычки, опасно) от '[*]' (одинарные, безопасно)
      assert.ok(
        !/"\[\*\]"/.test(content),
        `${psFile} не должен содержать "[*]" в двойных кавычках. Используйте одинарные: '[*]'`
      );
    });
  }
});

/**
 * Рефакторинг: вынос Find-yt-dlp и Find-ffmpeg в отдельные модули
 *
 * Проверяет, что функции успешно вынесены в find-yt-dlp.ps1 и find-ffmpeg.ps1,
 * handler.ps1 подключает их через dot-source, а сигнатуры соответствуют
 * новым требованиям (Find-ffmpeg принимает $ytDlpPath параметром).
 *
 * Задача: C-refactor-handler-split
 */
describe('Рефакторинг: вынос Find-yt-dlp и Find-ffmpeg', () => {
  const handlerContent = readFile('windows/handler.ps1');
  const findYtDlpContent = readFile('windows/find-yt-dlp.ps1');
  const findFfmpegContent = readFile('windows/find-ffmpeg.ps1');

  // ── handler.ps1 больше не содержит функции поиска ──

  it('handler.ps1 не содержит function Find-yt-dlp', () => {
    assert.ok(
      !handlerContent.includes('function Find-yt-dlp'),
      'handler.ps1 не должен содержать function Find-yt-dlp'
    );
  });

  it('handler.ps1 не содержит function Find-ffmpeg', () => {
    assert.ok(
      !handlerContent.includes('function Find-ffmpeg'),
      'handler.ps1 не должен содержать function Find-ffmpeg'
    );
  });

  // ── handler.ps1 подключает модули через dot-source ──

  it('handler.ps1 подключает find-yt-dlp.ps1 через dot-source', () => {
    assert.ok(
      handlerContent.includes('. "$PSScriptRoot\\find-yt-dlp.ps1"'),
      'handler.ps1 должен содержать . "$PSScriptRoot\\find-yt-dlp.ps1"'
    );
  });

  it('handler.ps1 подключает find-ffmpeg.ps1 через dot-source', () => {
    assert.ok(
      handlerContent.includes('. "$PSScriptRoot\\find-ffmpeg.ps1"'),
      'handler.ps1 должен содержать . "$PSScriptRoot\\find-ffmpeg.ps1"'
    );
  });

  // ── find-yt-dlp.ps1 ──

  it('find-yt-dlp.ps1 содержит function Find-yt-dlp с where.exe fallback', () => {
    assert.ok(
      findYtDlpContent.includes('function Find-yt-dlp'),
      'find-yt-dlp.ps1 должен содержать function Find-yt-dlp'
    );
    assert.ok(
      findYtDlpContent.includes('where.exe yt-dlp'),
      'Find-yt-dlp должна завершаться where.exe yt-dlp'
    );
  });

  // ── find-ffmpeg.ps1 ──

  it('find-ffmpeg.ps1 содержит function Find-ffmpeg с параметром $ytDlpPath', () => {
    assert.ok(
      findFfmpegContent.includes('function Find-ffmpeg'),
      'find-ffmpeg.ps1 должен содержать function Find-ffmpeg'
    );
    assert.ok(
      findFfmpegContent.includes('param([string]$ytDlpPath)') ||
      findFfmpegContent.includes('param( [string]$ytDlpPath )'),
      'Find-ffmpeg должен иметь param([string]$ytDlpPath)'
    );
  });

  it('Find-ffmpeg использует Split-Path $ytDlpPath -Parent', () => {
    assert.ok(
      findFfmpegContent.includes('Split-Path $ytDlpPath -Parent'),
      'Find-ffmpeg должен использовать Split-Path $ytDlpPath -Parent'
    );
  });

  // ── Вызов в handler.ps1 ──

  it('handler.ps1 вызывает Find-ffmpeg с параметром -ytDlpPath', () => {
    assert.ok(
      handlerContent.includes('Find-ffmpeg -ytDlpPath $ytDlpPath'),
      'handler.ps1 должен вызывать Find-ffmpeg -ytDlpPath $ytDlpPath'
    );
  });
});
