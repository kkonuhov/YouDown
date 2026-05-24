/**
 * YouDown — popup script
 * Получает URL текущей вкладки YouTube и отправляет в yt-dlp.
 */

const QUALITY_LABELS = {
  'bestvideo+bestaudio/best': '🎥 Наилучшее видео',
  'bestvideo[height<=1080]+bestaudio/best[height<=1080]': '📺 1080p Full HD',
  'bestvideo[height<=720]+bestaudio/best[height<=720]': '📺 720p HD',
  'bestvideo[height<=480]+bestaudio/best[height<=480]': '📺 480p',
  'bestvideo[height<=360]+bestaudio/best[height<=360]': '📺 360p',
  'bestaudio/best': '🎵 Только аудио (MP3)',
};

const DEFAULT_DIR = '%USERPROFILE%\\Downloads\\YouDown';

const $ = id => document.getElementById(id);

let currentTabUrl = '';
let customDir = '';
let reenableTimer = null;

// ──────────────────────────────────────────────
// Заполнить <select id="quality"> из QUALITY_LABELS
// ──────────────────────────────────────────────
function populateQualityOptions() {
  const select = $('quality');
  if (!select) return;
  select.innerHTML = '';
  for (const [value, label] of Object.entries(QUALITY_LABELS)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
}

// ──────────────────────────────────────────────
// Получить активную вкладку
// ──────────────────────────────────────────────
async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs?.[0] || null;
  } catch (e) {
    console.error('YouDown: tabs.query error:', e);
    return null;
  }
}

// ──────────────────────────────────────────────
// Статус
// ──────────────────────────────────────────────
function setStatus(text, type) {
  const el = $('status');
  if (el) {
    el.textContent = text;
    el.className = 'status ' + (type || 'info');
  }
}

// ──────────────────────────────────────────────
// Загрузить настройки
// ──────────────────────────────────────────────
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('outputDir');
    customDir = result.outputDir || '';
    const el = $('outputDir');
    if (el) el.value = customDir || DEFAULT_DIR;
  } catch (e) {
    const el = $('outputDir');
    if (el) el.value = DEFAULT_DIR;
  }
}

// ──────────────────────────────────────────────
// Сохранить настройки
// ──────────────────────────────────────────────
async function saveSettings() {
  const el = $('outputDir');
  if (!el) { customDir = ''; return; }
  const val = el.value.trim();
  customDir = val;
  try {
    await chrome.storage.local.set({ outputDir: val });
  } catch (e) {
    console.warn('YouDown: saveSettings failed:', e);
  }
}

// ──────────────────────────────────────────────
// Инициализация
// ──────────────────────────────────────────────
async function init() {
  const titleEl = $('videoTitle');
  const btnEl = $('downloadBtn');

  // Если DOM-элементы отсутствуют — не продолжаем
  if (!titleEl || !btnEl) {
    setStatus('Ошибка инициализации: элементы управления не найдены', 'error');
    return;
  }

  populateQualityOptions();
  const tab = await getActiveTab();

  if (!tab) {
    titleEl.textContent = 'Не удалось получить вкладку';
    btnEl.disabled = true;
    setStatus('Попробуй перезагрузить расширение', 'error');
    return;
  }

  currentTabUrl = tab.url || '';

  // Проверяем YouTube
  if (!isYouTubeUrl(currentTabUrl)) {
    titleEl.textContent = '❌ Открой видео на YouTube';
    btnEl.disabled = true;
    setStatus('Расширение работает только на страницах YouTube', 'error');
    return;
  }

  // Показываем название видео
  const title = (tab.title || 'YouTube видео').replace(/\s*-\s*YouTube\s*$/, '');
  titleEl.textContent = title;

  // Загружаем настройки
  await loadSettings();

  btnEl.disabled = false;
  setStatus('Готов к скачиванию', 'info');
}

// ──────────────────────────────────────────────
// Скачивание
// ──────────────────────────────────────────────
async function handleDownload() {
  if (!currentTabUrl) {
    setStatus('Нет URL видео. Обнови страницу и попробуй снова.', 'error');
    return;
  }

  // Очищаем предыдущий таймер разблокировки кнопки
  clearTimeout(reenableTimer);

  const format = $('quality').value;
  const qualityLabel = QUALITY_LABELS[format] || format;

  // Сохраняем папку перед отправкой
  await saveSettings();

  // Формируем URL протокола
  const params = new URLSearchParams({ url: currentTabUrl, f: format });
  const dir = customDir || DEFAULT_DIR;
  params.append('dir', dir);

  const protocolUrl = `ytdlp://download?${params.toString()}`;

  setStatus(`⏳ Отправляю запрос: ${qualityLabel}...`, 'info');
  $('downloadBtn').disabled = true;

  // Отправляем через скрытую ссылку (работает с custom protocol)
  try {
    const link = document.createElement('a');
    link.href = protocolUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus(`✅ Запрос отправлен! Видео в: ${dir}`, 'success');

    reenableTimer = setTimeout(() => {
      $('downloadBtn').disabled = false;
    }, 3000);
  } catch (e) {
    setStatus(`❌ Ошибка: ${e.message}`, 'error');
    $('downloadBtn').disabled = false;
  }
}

// ──────────────────────────────────────────────
// События — привязываем только после загрузки DOM
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btnEl = $('downloadBtn');
  const dirEl = $('outputDir');
  if (btnEl) btnEl.addEventListener('click', handleDownload);
  if (dirEl) dirEl.addEventListener('change', saveSettings);
  init();
});

// CommonJS-экспорт для тестирования в Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    populateQualityOptions, getActiveTab, setStatus, loadSettings, saveSettings, init, handleDownload,
  };
}
