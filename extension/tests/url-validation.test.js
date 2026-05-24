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
  // ──────────────────────────────────────────────
  // Стандартные youtube.com (watch)
  // ──────────────────────────────────────────────

  // Стандартный watch, без www
  'https://youtube.com/watch?v=dQw4w9WgXcQ',

  // С www
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

  // HTTP (не HTTPS)
  'http://youtube.com/watch?v=dQw4w9WgXcQ',

  // HTTP + www
  'http://www.youtube.com/watch?v=dQw4w9WgXcQ',

  // С дополнительными query-параметрами
  'https://youtube.com/watch?v=ID&list=PLabc123',

  // Параметр feature перед v
  'https://youtube.com/watch?feature=shared&v=ID',

  // Watch с временным параметром
  'https://www.youtube.com/watch?v=abc123&t=30s',
  'https://youtube.com/watch?v=abc123&list=PLabc&index=1',

  // Разные варианты ID (цифры, буквы, дефисы, подчёркивания)
  'https://youtube.com/watch?v=abc123',
  'https://youtube.com/watch?v=ABC_DEF-123',

  // ──────────────────────────────────────────────
  // youtube.com (shorts)
  // ──────────────────────────────────────────────

  // Shorts, без www
  'https://youtube.com/shorts/abc123',

  // Shorts с www
  'https://www.youtube.com/shorts/abc123',

  // HTTP + www + shorts
  'http://www.youtube.com/shorts/abc123',

  // Shorts с query-строкой
  'https://www.youtube.com/shorts/abc123?feature=share',

  // ──────────────────────────────────────────────
  // youtu.be
  // ──────────────────────────────────────────────

  // Короткая ссылка
  'https://youtu.be/dQw4w9WgXcQ',

  // С query-параметрами
  'https://youtu.be/abc123?t=30s',
  'https://youtu.be/ABC_DEF-123?si=def456',

  // HTTP
  'http://youtu.be/dQw4w9WgXcQ',

  // ──────────────────────────────────────────────
  // m.youtube.com
  // ──────────────────────────────────────────────

  // Мобильная версия watch
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',

  // Мобильная версия с дополнительными параметрами
  'https://m.youtube.com/watch?v=ID&list=PLabc123',

  // Мобильная версия shorts
  'https://m.youtube.com/shorts/abc123',
  'https://m.youtube.com/shorts/xyz789',

  // ──────────────────────────────────────────────
  // music.youtube.com
  // ──────────────────────────────────────────────

  // YouTube Music watch
  'https://music.youtube.com/watch?v=dQw4w9WgXcQ',

  // YouTube Music с дополнительными параметрами
  'https://music.youtube.com/watch?v=ID&list=PLabc',

  // YouTube Music shorts
  'https://music.youtube.com/shorts/abc123',

  // ──────────────────────────────────────────────
  // youtube.com/embed
  // ──────────────────────────────────────────────

  // Embed без www
  'https://youtube.com/embed/dQw4w9WgXcQ',

  // Embed с query-параметрами
  'https://youtube.com/embed/abc123?autoplay=1',

  // Embed с www
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
];

// ──────────────────────────────────────────────
// Невалидные URL (должны вернуть false)
// ──────────────────────────────────────────────

const invalidUrls = [
  // ──────────────────────────────────────────────
  // Не-видео разделы YouTube
  // ──────────────────────────────────────────────

  // Главная страница
  'https://youtube.com/',
  'http://youtube.com/',

  // Trending
  'https://youtube.com/feed/trending',

  // Подписки
  'https://www.youtube.com/feed/subscriptions',

  // Каналы
  'https://www.youtube.com/channel/UCabc123',

  // Пользователи
  'https://www.youtube.com/user/username',

  // Плейлисты (не видео)
  'https://www.youtube.com/playlist?list=PLabc',

  // Результаты поиска
  'https://www.youtube.com/results?search_query=test',

  // music.youtube.com не-видео разделы
  'https://music.youtube.com/playlist?list=PLabc',

  // ──────────────────────────────────────────────
  // Недостаточно данных (без ID/пути)
  // ──────────────────────────────────────────────

  // Без пути (bare domain)
  'https://youtube.com',

  // watch без параметров
  'https://youtube.com/watch',

  // shorts без ID
  'https://youtube.com/shorts',

  // shorts с трейлинг-слешем, но без ID
  'https://www.youtube.com/shorts/',

  // watch? без значения (пустой query)
  'https://youtube.com/watch?',

  // youtu.be без ID
  'https://youtu.be/',
  'https://youtu.be',

  // m.youtube.com без пути
  'https://m.youtube.com/',
  'https://m.youtube.com',

  // music.youtube.com без пути
  'https://music.youtube.com/',
  'https://music.youtube.com',

  // embed без ID
  'https://youtube.com/embed/',
  'https://youtube.com/embed',
  'https://www.youtube.com/embed/',

  // ──────────────────────────────────────────────
  // Неизвестные поддомены
  // ──────────────────────────────────────────────

  // mm. поддомен (не поддерживается)
  'https://mm.youtube.com/watch?v=ID',

  // ──────────────────────────────────────────────
  // Внедрение новой строки после ID (SSRF-защита)
  // Без $ якоря regex матчил бы такие URL с начала строки,
  // пропуская произвольный хвост после \n ('.' не матчит \n).
  // ──────────────────────────────────────────────

  // watch с внедрённой новой строкой
  'https://youtube.com/watch?v=ID\n<script>malicious</script>',

  // youtu.be с внедрённой новой строкой
  'https://youtu.be/abc123\n<script>malicious</script>',

  // shorts с новой строкой
  'https://www.youtube.com/shorts/abc123\n<script>malicious</script>',

  // embed с новой строкой
  'https://youtube.com/embed/dQw4w9WgXcQ\n<script>malicious</script>',

  // m.youtube.com с новой строкой
  'https://m.youtube.com/watch?v=ID\n<script>malicious</script>',

  // ──────────────────────────────────────────────
  // Сторонние сайты / фишинг
  // ──────────────────────────────────────────────

  // Просто сторонний сайт
  'https://example.com',

  // Фишинговые домены
  'https://www.youtubefake.com/watch?v=abc',
  'https://www.youtube.com.evil.com/watch?v=abc',

  // ──────────────────────────────────────────────
  // Нестроковые / мусорные значения
  // ──────────────────────────────────────────────

  // Пустая строка
  '',
  // Не-URL строка
  'nope',
  // null
  null,
  // undefined
  undefined,
  // Другие протоколы
  'ftp://youtube.com/watch?v=abc123',
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
