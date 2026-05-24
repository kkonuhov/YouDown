/**
 * YouDown — Общие наборы тестовых YouTube URL
 *
 * Содержит объединённые списки валидных (30) и невалидных (40) YouTube URL,
 * используемые во всех тестовых файлах (url-validation, consistency, shared-test-urls).
 *
 * Поддерживает dual-mode (браузер + Node.js) для единообразия.
 *
 * Режим использования:
 * - Браузер: массивы доступны глобально
 * - Node.js: const { VALID_YOUTUBE_URLS, INVALID_YOUTUBE_URLS } = require('./shared-test-urls');
 */

// ──────────────────────────────────────────────
// Валидные YouTube URL (должны вернуть true для isYouTubeUrl)
// ──────────────────────────────────────────────

const VALID_YOUTUBE_URLS = [
  // ── youtube.com/watch ──
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'http://youtube.com/watch?v=dQw4w9WgXcQ',
  'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/watch?v=ID&list=PLabc123',
  'https://youtube.com/watch?feature=shared&v=ID',
  'https://www.youtube.com/watch?v=abc123&t=30s',
  'https://youtube.com/watch?v=abc123&list=PLabc&index=1',
  'https://youtube.com/watch?v=abc123',
  'https://youtube.com/watch?v=ABC_DEF-123',

  // ── youtube.com/shorts ──
  'https://youtube.com/shorts/abc123',
  'https://www.youtube.com/shorts/abc123',
  'http://www.youtube.com/shorts/abc123',
  'https://www.youtube.com/shorts/abc123?feature=share',

  // ── youtu.be ──
  'https://youtu.be/dQw4w9WgXcQ',
  'http://youtu.be/dQw4w9WgXcQ',
  'https://youtu.be/abc123?t=30s',
  'https://youtu.be/ABC_DEF-123?si=def456',

  // ── m.youtube.com ──
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://m.youtube.com/watch?v=ID&list=PLabc123',
  'http://m.youtube.com/watch?v=ID',
  'https://m.youtube.com/shorts/abc123',
  'https://m.youtube.com/shorts/xyz789',

  // ── music.youtube.com ──
  'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://music.youtube.com/watch?v=ID&list=PLabc',
  'https://music.youtube.com/shorts/abc123',

  // ── youtube.com/embed ──
  'https://youtube.com/embed/dQw4w9WgXcQ',
  'https://youtube.com/embed/abc123?autoplay=1',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/abc123?autoplay=1',
];

// ──────────────────────────────────────────────
// Невалидные YouTube URL (должны вернуть false для isYouTubeUrl)
// ──────────────────────────────────────────────

const INVALID_YOUTUBE_URLS = [
  // ── youtube.com — не-видео страницы ──
  'https://youtube.com/',
  'http://youtube.com/',
  'https://youtube.com',
  'https://youtube.com/feed/trending',
  'https://www.youtube.com/feed/subscriptions',
  'https://www.youtube.com/channel/UCabc123',
  'https://www.youtube.com/user/username',
  'https://www.youtube.com/playlist?list=PLabc',
  'https://www.youtube.com/results?search_query=test',

  // ── music.youtube.com — не-видео ──
  'https://music.youtube.com/playlist?list=PLabc',
  'https://music.youtube.com/channel/UCabc',

  // ── Недостаточно данных (без ID/пути) ──
  'https://youtube.com/watch',
  'https://youtube.com/shorts',
  'https://www.youtube.com/shorts/',
  'https://youtube.com/watch?',
  'https://youtu.be/',
  'https://youtu.be',
  'https://m.youtube.com/',
  'https://m.youtube.com',
  'https://music.youtube.com/',
  'https://music.youtube.com',
  'https://youtube.com/embed/',
  'https://youtube.com/embed',
  'https://www.youtube.com/embed/',
  'https://m.youtube.com/embed/',
  'https://music.youtube.com/embed/',

  // ── Неизвестные поддомены ──
  'https://mm.youtube.com/watch?v=ID',

  // ── Внедрение новой строки (SSRF-защита) ──
  'https://youtube.com/watch?v=ID\n<script>malicious</script>',
  'https://youtu.be/abc123\n<script>malicious</script>',
  'https://www.youtube.com/shorts/abc123\n<script>malicious</script>',
  'https://youtube.com/embed/dQw4w9WgXcQ\n<script>malicious</script>',
  'https://m.youtube.com/watch?v=ID\n<script>malicious</script>',

  // ── Сторонние сайты / фишинг ──
  'https://example.com',
  'https://www.youtubefake.com/watch?v=abc',
  'https://www.youtube.com.evil.com/watch?v=abc',

  // ── Другие протоколы ──
  'ftp://youtube.com/watch?v=abc123',

  // ── Нестроковые / мусорные значения ──
  '',
  'nope',
  null,
  undefined,
];

// CommonJS-экспорт для тестирования в Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VALID_YOUTUBE_URLS, INVALID_YOUTUBE_URLS };
}
