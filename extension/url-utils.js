/**
 * YouDown — URL utilities
 * Проверка URL на принадлежность к YouTube видео.
 *
 * Режим использования:
 * - Браузер: функция доступна глобально (window.isYouTubeUrl)
 * - Node.js: const { isYouTubeUrl } = require('./url-utils');
 */

/**
 * Проверяет, является ли URL страницей с YouTube видео (watch или shorts).
 * @param {string} url — полный URL страницы
 * @returns {boolean} true если это YouTube видео
 *
 * ВНИМАНИЕ: Этот regex дублирован в windows/handler.ps1 (функция Test-YouTubeUrl)
 * При изменении — обновлять оба файла!
 */
function isYouTubeUrl(url) {
  // Защита от не-строковых значений
  if (typeof url !== 'string') return false;
  return /^https?:\/\/(www\.)?youtube\.com\/(watch\?.+|shorts\/.+)/.test(url);
}

// CommonJS-экспорт для тестирования в Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isYouTubeUrl };
}
