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
// Тестовые URL (общие для JS и PS1 валидации)
// ──────────────────────────────────────────────

const validUrls = [
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/shorts/abc123',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'http://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/abc123',
  'https://youtube.com/watch?v=ID&list=PLabc123',
  'https://youtube.com/watch?feature=shared&v=ID',
  'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'http://www.youtube.com/shorts/abc123',
  'https://www.youtube.com/shorts/abc123?feature=share',
  'https://www.youtube.com/watch?v=abc123&t=30s',
  'https://youtube.com/watch?v=abc123&list=PLabc&index=1',
  'https://youtube.com/watch?v=abc123',
  'https://youtube.com/watch?v=ABC_DEF-123',
  'https://youtube.com/shorts/abc123',
];

const invalidUrls = [
  'https://youtube.com/',
  'https://youtube.com/feed/trending',
  'https://example.com',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://youtube.com',
  'https://youtube.com/watch',
  'https://youtube.com/shorts',
  'http://youtube.com/',
  'https://www.youtube.com/shorts/',
  'https://www.youtube.com/feed/subscriptions',
  'https://www.youtube.com/channel/UCabc123',
  'https://www.youtube.com/user/username',
  'https://www.youtube.com/playlist?list=PLabc',
  'https://www.youtube.com/results?search_query=test',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://m.youtube.com/shorts/abc123',
  'https://www.youtubefake.com/watch?v=abc',
  'https://www.youtube.com.evil.com/watch?v=abc',
  'https://youtube.com/watch?',
  'ftp://youtube.com/watch?v=abc123',
  '',
  'nope',
  null,
  undefined,
];

// ══════════════════════════════════════════════
// Тесты
// ══════════════════════════════════════════════

describe('Консистентность URL-валидации (JS / PS1)', () => {
  const psContent = readFile('windows/handler.ps1');
  const psPattern = extractPsPattern(psContent);

  // Собираем RegExp из паттерна PS1 (экранирование не нужно — паттерн валидный regex)
  const psRegex = new RegExp(`^${psPattern}$`);

  it('regex паттерн в handler.ps1 совпадает с url-utils.js', () => {
    // Проверяем идентичность для всех 39 тестовых URL
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
});

describe('Консистентность списка форматов (JS / PS1)', () => {
  const psContent = readFile('windows/handler.ps1');
  const psFormats = extractPsFormats(psContent);

  const jsContent = readFile('extension/popup.js');
  const jsFormats = extractJsFormats(jsContent);

  it('набор форматов в handler.ps1 совпадает с QUALITY_LABELS в popup.js', () => {
    assert.deepStrictEqual(psFormats, jsFormats);
  });

  it('в PS1 ровно 6 разрешённых форматов', () => {
    assert.strictEqual(psFormats.length, 6);
    for (const f of psFormats) {
      assert.ok(typeof f === 'string' && f.length > 0, `Формат пустой: ${f}`);
    }
  });
});

describe('Формат-валидация (логика PS1)', () => {
  const allowedFormats = [
    'bestvideo+bestaudio/best',
    'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    'bestvideo[height<=720]+bestaudio/best[height<=720]',
    'bestvideo[height<=480]+bestaudio/best[height<=480]',
    'bestvideo[height<=360]+bestaudio/best[height<=360]',
    'bestaudio/best',
  ];

  it('неизвестный формат заменяется на bestvideo+bestaudio/best', () => {
    // Эмулируем логику из handler.ps1
    function validateFormat(format) {
      if (!format || format === '') {
        return 'bestvideo+bestaudio/best';
      }
      if (!allowedFormats.includes(format)) {
        return 'bestvideo+bestaudio/best';
      }
      return format;
    }

    assert.strictEqual(validateFormat(null), 'bestvideo+bestaudio/best');
    assert.strictEqual(validateFormat(''), 'bestvideo+bestaudio/best');
    assert.strictEqual(validateFormat('unknown/format'), 'bestvideo+bestaudio/best');
    assert.strictEqual(validateFormat('bestvideo+bestaudio/best'), 'bestvideo+bestaudio/best');
    assert.strictEqual(validateFormat('bestaudio/best'), 'bestaudio/best');
  });
});
