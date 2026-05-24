/**
 * YouDown — Тесты целостности shared-test-urls
 *
 * Проверяет, что общие наборы URL не содержат дубликатов
 * и не имеют пересечений между валидными и невалидными списками.
 *
 * Запуск:
 *   node --test 'extension/tests/*.test.js'
 *   npm test
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { VALID_YOUTUBE_URLS, INVALID_YOUTUBE_URLS } = require('./shared-test-urls');

describe('shared-test-urls целостность', () => {
  it('VALID_YOUTUBE_URLS не содержит дубликатов', () => {
    assert.strictEqual(
      new Set(VALID_YOUTUBE_URLS).size,
      VALID_YOUTUBE_URLS.length,
      'Найдены дублирующиеся URL в VALID_YOUTUBE_URLS',
    );
  });

  it('INVALID_YOUTUBE_URLS не содержит дубликатов', () => {
    assert.strictEqual(
      new Set(INVALID_YOUTUBE_URLS.map(v => String(v))).size,
      INVALID_YOUTUBE_URLS.length,
      'Найдены дублирующиеся URL в INVALID_YOUTUBE_URLS',
    );
  });

  it('нет пересечения между VALID_YOUTUBE_URLS и INVALID_YOUTUBE_URLS', () => {
    const invalidSet = new Set(INVALID_YOUTUBE_URLS.map(v => String(v)));
    const overlaps = VALID_YOUTUBE_URLS.filter(v => invalidSet.has(v));
    assert.strictEqual(
      overlaps.length,
      0,
      `Найдены URL в обоих наборах: ${overlaps.join(', ')}`,
    );
  });
});
