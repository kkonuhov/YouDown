/**
 * YouDown — Unit-тесты для isYouTubeUrl()
 *
 * Запуск:
 *   node --test 'extension/tests/*.test.js'
 *   npm test
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

// Импортируем production-код через CommonJS
const { isYouTubeUrl } = require('../url-utils');

// ──────────────────────────────────────────────
// Валидные YouTube URL (должны вернуть true)
// ──────────────────────────────────────────────

const validUrls = [
  // 1 — Стандартный watch, без www
  'https://youtube.com/watch?v=dQw4w9WgXcQ',

  // 2 — Shorts, без www
  'https://youtube.com/shorts/abc123',

  // 3 — С www
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

  // 4 — HTTP (не HTTPS)
  'http://youtube.com/watch?v=dQw4w9WgXcQ',

  // 5 — Shorts с www
  'https://www.youtube.com/shorts/abc123',

  // 6 — С дополнительными query-параметрами
  'https://youtube.com/watch?v=ID&list=PLabc123',

  // 7 — Параметр feature перед v
  'https://youtube.com/watch?feature=shared&v=ID',

  // ── Дополнительные кейсы ──

  // HTTP + www
  'http://www.youtube.com/watch?v=dQw4w9WgXcQ',

  // HTTP + www + shorts
  'http://www.youtube.com/shorts/abc123',

  // NOTE: m. (mobile) поддомен не поддерживается (см. задачу C-expand-url-formats)

  // Shorts с query-строкой
  'https://www.youtube.com/shorts/abc123?feature=share',

  // Watch с временнЫм параметром
  'https://www.youtube.com/watch?v=abc123&t=30s',
  'https://youtube.com/watch?v=abc123&list=PLabc&index=1',

  // Разные варианты ID (цифры, буквы, дефисы, подчёркивания)
  'https://youtube.com/watch?v=abc123',
  'https://youtube.com/watch?v=ABC_DEF-123',
  'https://youtube.com/shorts/abc123',
];

// ──────────────────────────────────────────────
// Невалидные URL (должны вернуть false)
// ──────────────────────────────────────────────

const invalidUrls = [
  // 8 — Главная страница
  'https://youtube.com/',

  // 9 — Trending
  'https://youtube.com/feed/trending',

  // 10 — Сторонний сайт
  'https://example.com',

  // 11 — Короткая ссылка youtu.be (не поддерживается)
  'https://youtu.be/dQw4w9WgXcQ',

  // 12 — Без пути (bare domain)
  'https://youtube.com',

  // 13 — watch без параметров
  'https://youtube.com/watch',

  // 14 — shorts без ID
  'https://youtube.com/shorts',

  // 15 — HTTP + главная
  'http://youtube.com/',

  // ── Дополнительные кейсы ──

  // shorts/ с трейлинг-слешем, но без ID
  'https://www.youtube.com/shorts/',

  // Другие разделы YouTube
  'https://www.youtube.com/feed/subscriptions',
  'https://www.youtube.com/channel/UCabc123',
  'https://www.youtube.com/user/username',
  'https://www.youtube.com/playlist?list=PLabc',
  'https://www.youtube.com/results?search_query=test',

  // m. (mobile) поддомен не поддерживается (см. задачу C-expand-url-formats)
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://m.youtube.com/shorts/abc123',

  // Фишинговые домены
  'https://www.youtubefake.com/watch?v=abc',
  'https://www.youtube.com.evil.com/watch?v=abc',

  // watch? без значения (пустой query)
  'https://youtube.com/watch?',

  // Другие протоколы
  'ftp://youtube.com/watch?v=abc123',

  // Нестроковые / мусорные значения
  '',
  'nope',
  null,
  undefined,
];

// ══════════════════════════════════════════════
// Тесты
// ══════════════════════════════════════════════

describe('isYouTubeUrl', () => {
  describe('должна принимать валидные YouTube URL (true)', () => {
    for (const url of validUrls) {
      it(`принимает: ${url}`, () => {
        assert.ok(isYouTubeUrl(url), `Ожидалось true, получено false: ${url}`);
      });
    }
  });

  describe('должна отклонять не-видео и сторонние URL (false)', () => {
    for (const url of invalidUrls) {
      it(`отклоняет: ${url == null ? String(url) : url}`, () => {
        assert.ok(!isYouTubeUrl(url), `Ожидалось false, получено true: ${url}`);
      });
    }
  });
});
