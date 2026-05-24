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

// Импортируем общие наборы тестовых URL
const { VALID_YOUTUBE_URLS: validUrls, INVALID_YOUTUBE_URLS: invalidUrls } = require('./shared-test-urls');

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
