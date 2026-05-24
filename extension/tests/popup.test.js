/**
 * YouDown — Unit-тесты для popup.js
 *
 * Проверяет UI-логику: getActiveTab, setStatus, loadSettings, saveSettings,
 * handleDownload, init.
 *
 * Запуск:
 *   node --test 'extension/tests/*.test.js'
 *   npm test
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// ══════════════════════════════════════════════
// Моки chrome.* API, DOM, таймеров
// ══════════════════════════════════════════════

// Хранилище DOM-элементов (симулирует живую DOM)
const domElements = {};

// Spy-переменные для chrome API
let chromeTabsQueryResult = null;
let chromeStorageGetResult = null;
let chromeStorageSetArgs = null;

// Spy-переменные для таймеров
let setTimeoutCalls = [];
let clearTimeoutCalls = [];

// Mock-ссылка (создаётся через document.createElement('a'))
const createdLink = { href: '', style: {}, click() {}, remove() {} };

/**
 * Сбрасывает все моки в исходное состояние.
 * Вызывается в beforeEach перед каждым тестом.
 */
function resetMocks() {
  // DOM-элементы, которые использует popup.js
  domElements.status = { textContent: '', className: '' };
  domElements.outputDir = { value: '' };
  domElements.videoTitle = { textContent: '' };
  domElements.downloadBtn = { disabled: false, addEventListener() {} };
  domElements.quality = { value: 'bestvideo+bestaudio/best' };

  // Chrome tabs — по умолчанию валидная YouTube-вкладка
  chromeTabsQueryResult = [
    { id: 1, url: 'https://youtube.com/watch?v=test', title: 'Test Video - YouTube' },
  ];

  // Chrome storage — по умолчанию пусто
  chromeStorageGetResult = {};
  chromeStorageSetArgs = null;

  // Таймеры
  setTimeoutCalls = [];
  clearTimeoutCalls = [];

  // Сброс ссылки
  createdLink.href = '';
  createdLink.style = {};

  // ── Устанавливаем глобальные моки ──

  global.chrome = {
    tabs: {
      query: async () => chromeTabsQueryResult,
    },
    storage: {
      local: {
        get: async () => chromeStorageGetResult,
        set: async (args) => { chromeStorageSetArgs = args; },
      },
    },
  };

  global.document = {
    getElementById: (id) => domElements[id] || null,
    addEventListener: () => {},
    createElement: () => createdLink,
    body: { appendChild: () => {} },
  };

  global.clearTimeout = (id) => { clearTimeoutCalls.push(id); };
  global.setTimeout = (fn, ms) => {
    const entry = { fn, ms };
    setTimeoutCalls.push(entry);
    return setTimeoutCalls.length;
  };
}

// Подмешиваем isYouTubeUrl как глобальную функцию (как в браузере)
global.isYouTubeUrl = require('../url-utils').isYouTubeUrl;

// ══════════════════════════════════════════════
// Тесты
// ══════════════════════════════════════════════

describe('popup.js', () => {
  let popup;

  beforeEach(() => {
    resetMocks();
    // Сбрасываем кеш require — модуль перезагрузится с нулевым состоянием
    delete require.cache[require.resolve('../popup')];
    popup = require('../popup');
  });

  // ──────────────────────────────────────────────
  // setStatus
  // ──────────────────────────────────────────────

  describe('setStatus', () => {
    it('устанавливает textContent и className', () => {
      popup.setStatus('Готов', 'info');
      assert.strictEqual(domElements.status.textContent, 'Готов');
      assert.strictEqual(domElements.status.className, 'status info');
    });

    it('использует "info" по умолчанию', () => {
      popup.setStatus('Загружено');
      assert.strictEqual(domElements.status.className, 'status info');
    });

    it('не падает если элемент #status отсутствует', () => {
      delete domElements.status;
      popup.setStatus('тест', 'error'); // не должно бросить исключение
      assert.ok(true);
    });
  });

  // ──────────────────────────────────────────────
  // getActiveTab
  // ──────────────────────────────────────────────

  describe('getActiveTab', () => {
    it('возвращает активную вкладку', async () => {
      const tab = await popup.getActiveTab();
      assert.ok(tab);
      assert.strictEqual(tab.url, 'https://youtube.com/watch?v=test');
      assert.strictEqual(tab.title, 'Test Video - YouTube');
    });

    it('возвращает null если вкладок нет', async () => {
      chromeTabsQueryResult = [];
      const tab = await popup.getActiveTab();
      assert.strictEqual(tab, null);
    });

    it('возвращает null при ошибке API', async () => {
      global.chrome.tabs.query = async () => { throw new Error('API error'); };
      const tab = await popup.getActiveTab();
      assert.strictEqual(tab, null);
    });
  });

  // ──────────────────────────────────────────────
  // loadSettings
  // ──────────────────────────────────────────────

  describe('loadSettings', () => {
    it('загружает outputDir из storage', async () => {
      chromeStorageGetResult = { outputDir: '/my/path' };
      await popup.loadSettings();
      assert.strictEqual(domElements.outputDir.value, '/my/path');
    });

    it('использует DEFAULT_DIR если storage пуст', async () => {
      chromeStorageGetResult = {};
      await popup.loadSettings();
      assert.strictEqual(
        domElements.outputDir.value,
        '%USERPROFILE%\\Downloads\\YouDown',
      );
    });

    it('использует DEFAULT_DIR при ошибке storage', async () => {
      global.chrome.storage.local.get = async () => { throw new Error('Storage fail'); };
      await popup.loadSettings();
      assert.strictEqual(
        domElements.outputDir.value,
        '%USERPROFILE%\\Downloads\\YouDown',
      );
    });
  });

  // ──────────────────────────────────────────────
  // saveSettings
  // ──────────────────────────────────────────────

  describe('saveSettings', () => {
    it('сохраняет outputDir в storage', async () => {
      domElements.outputDir.value = '/my/path';
      await popup.saveSettings();
      assert.deepStrictEqual(chromeStorageSetArgs, { outputDir: '/my/path' });
    });

    it('сохраняет обрезанное значение (trim)', async () => {
      domElements.outputDir.value = '  /my/path  ';
      await popup.saveSettings();
      assert.deepStrictEqual(chromeStorageSetArgs, { outputDir: '/my/path' });
    });

    it('не падает при ошибке storage.set', async () => {
      global.chrome.storage.local.set = async () => { throw new Error('fail'); };
      domElements.outputDir.value = '/path';
      await popup.saveSettings(); // не должно бросить исключение
      assert.ok(true);
    });
  });

  // ──────────────────────────────────────────────
  // handleDownload
  // ──────────────────────────────────────────────

  describe('handleDownload', () => {
    it('показывает ошибку если currentTabUrl пустой', async () => {
      // Перед вызовом handleDownload устанавливаем currentTabUrl в ''
      // Это делаем через init с невалидным сценарием, либо напрямую.
      // Проще: вызываем handleDownload когда URL не установлен.
      // По умолчанию currentTabUrl = '' после загрузки модуля.
      await popup.handleDownload();
      assert.strictEqual(
        domElements.status.textContent,
        'Нет URL видео. Обнови страницу и попробуй снова.',
      );
    });

    it('формирует корректный ytdlp:// URL и вызывает saveSettings', async () => {
      // Сначала init, чтобы установился currentTabUrl
      await popup.init();

      domElements.outputDir.value = 'C:\\Downloads\\YouDown';
      await popup.handleDownload();

      // Проверяем, что сохранили настройки
      assert.ok(chromeStorageSetArgs, 'saveSettings должен быть вызван');
      assert.deepStrictEqual(chromeStorageSetArgs, { outputDir: 'C:\\Downloads\\YouDown' });

      // Проверяем протокол URL
      const url = new URL(createdLink.href);
      assert.strictEqual(url.protocol, 'ytdlp:');
      assert.strictEqual(url.hostname, 'download');
      assert.ok(url.searchParams.has('url'));
      assert.strictEqual(url.searchParams.get('url'), 'https://youtube.com/watch?v=test');
      assert.strictEqual(url.searchParams.get('f'), 'bestvideo+bestaudio/best');
      assert.strictEqual(url.searchParams.get('dir'), 'C:\\Downloads\\YouDown');
    });

    it('блокирует кнопку и устанавливает таймер разблокировки', async () => {
      await popup.init();
      await popup.handleDownload();

      // Кнопка должна быть заблокирована (таймер ещё не сработал)
      assert.strictEqual(domElements.downloadBtn.disabled, true);

      // Проверяем, что setTimeout был вызван с 3000ms
      assert.strictEqual(setTimeoutCalls.length, 1);
      assert.strictEqual(setTimeoutCalls[0].ms, 3000);

      // Вручную запускаем колбэк таймера
      setTimeoutCalls[0].fn();
      assert.strictEqual(domElements.downloadBtn.disabled, false);
    });

    it('очищает предыдущий таймер перед установкой нового', async () => {
      await popup.init();

      // Первый вызов — reenableTimer = null, clearTimeout(null) — без ошибок
      await popup.handleDownload();
      assert.strictEqual(clearTimeoutCalls.length, 1);
      assert.strictEqual(clearTimeoutCalls[0], null);

      // Второй вызов — очищает предыдущий таймер (id=1)
      await popup.handleDownload();
      assert.strictEqual(clearTimeoutCalls.length, 2);
      assert.strictEqual(clearTimeoutCalls[1], 1);
    });

    it('восстанавливает кнопку при ошибке создания ссылки', async () => {
      await popup.init();

      // Симулируем ошибку при click
      createdLink.click = () => { throw new Error('Click failed'); };
      await popup.handleDownload();

      // Кнопка должна быть разблокирована
      assert.strictEqual(domElements.downloadBtn.disabled, false);
      // Должно быть сообщение об ошибке
      assert.ok(domElements.status.textContent.includes('Click failed'));
    });

    it('использует DEFAULT_DIR если outputDir пуст', async () => {
      await popup.init();
      domElements.outputDir.value = '';
      await popup.handleDownload();

      const url = new URL(createdLink.href);
      assert.strictEqual(url.searchParams.get('dir'), '%USERPROFILE%\\Downloads\\YouDown');
    });
  });

  // ──────────────────────────────────────────────
  // init
  // ──────────────────────────────────────────────

  describe('init', () => {
    it('показывает ошибку если вкладка не получена', async () => {
      chromeTabsQueryResult = [];
      await popup.init();

      assert.strictEqual(
        domElements.videoTitle.textContent,
        'Не удалось получить вкладку',
      );
      assert.strictEqual(domElements.downloadBtn.disabled, true);
      assert.strictEqual(domElements.status.className, 'status error');
    });

    it('показывает "Открой видео на YouTube" для не-YouTube URL', async () => {
      chromeTabsQueryResult = [
        { id: 1, url: 'https://example.com', title: 'Example' },
      ];
      await popup.init();

      assert.ok(domElements.videoTitle.textContent.includes('Открой видео на YouTube'));
      assert.strictEqual(domElements.downloadBtn.disabled, true);
    });

    it('разрешает кнопку и загружает настройки для YouTube URL', async () => {
      chromeStorageGetResult = { outputDir: '/custom/path' };
      await popup.init();

      assert.strictEqual(domElements.downloadBtn.disabled, false);
      assert.strictEqual(domElements.status.textContent, 'Готов к скачиванию');
      // Настройки загружены
      assert.strictEqual(domElements.outputDir.value, '/custom/path');
    });

    it('обрезает суффикс "- YouTube" из заголовка вкладки', async () => {
      chromeTabsQueryResult = [
        { id: 1, url: 'https://youtube.com/watch?v=test', title: 'Cool Clip - YouTube' },
      ];
      await popup.init();

      assert.strictEqual(domElements.videoTitle.textContent, 'Cool Clip');
    });

    it('использует "YouTube видео" если tab.title отсутствует', async () => {
      chromeTabsQueryResult = [
        { id: 1, url: 'https://youtube.com/watch?v=test' },
      ];
      await popup.init();

      assert.strictEqual(domElements.videoTitle.textContent, 'YouTube видео');
    });
  });
});
