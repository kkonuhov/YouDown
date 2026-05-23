/**
 * YouDown — popup script
 * Получает URL текущей вкладки YouTube и отправляет в yt-dlp.
 */

const QUALITY_LABELS = {
  'bestvideo+bestaudio/best': 'Наилучшее видео',
  'bestvideo[height<=1080]+bestaudio/best[height<=1080]': '1080p Full HD',
  'bestvideo[height<=720]+bestaudio/best[height<=720]': '720p HD',
  'bestvideo[height<=480]+bestaudio/best[height<=480]': '480p',
  'bestvideo[height<=360]+bestaudio/best[height<=360]': '360p',
  'bestaudio/best': 'Только аудио (MP3)',
};

const DEFAULT_DIR = '%USERPROFILE%\\Downloads\\YouDown';

const $ = id => document.getElementById(id);

let currentTabUrl = '';
let customDir = '';
let reenableTimer = null;

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
    $('outputDir').value = customDir || DEFAULT_DIR;
  } catch (e) {
    $('outputDir').value = DEFAULT_DIR;
  }
}

// ──────────────────────────────────────────────
// Сохранить настройки
// ──────────────────────────────────────────────
async function saveSettings() {
  const val = $('outputDir').value.trim();
  customDir = val;
  try {
    await chrome.storage.local.set({ outputDir: val });
  } catch (e) {
    // Silent fail — настройка не критична
  }
}

// ──────────────────────────────────────────────
// Инициализация
// ──────────────────────────────────────────────
async function init() {
  const tab = await getActiveTab();

  if (!tab) {
    $('videoTitle').textContent = 'Не удалось получить вкладку';
    $('downloadBtn').disabled = true;
    setStatus('Попробуй перезагрузить расширение', 'error');
    return;
  }

  currentTabUrl = tab.url || '';

  // Проверяем YouTube
  if (!isYouTubeUrl(currentTabUrl)) {
    $('videoTitle').textContent = '❌ Открой видео на YouTube';
    $('downloadBtn').disabled = true;
    setStatus('Расширение работает только на страницах YouTube', 'error');
    return;
  }

  // Показываем название видео
  const title = (tab.title || 'YouTube видео').replace(/\s*-\s*YouTube\s*$/, '');
  $('videoTitle').textContent = title;

  // Загружаем настройки
  await loadSettings();

  $('downloadBtn').disabled = false;
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
  const dir = $('outputDir').value.trim() || DEFAULT_DIR;
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
  $('downloadBtn').addEventListener('click', handleDownload);
  $('outputDir').addEventListener('change', saveSettings);
  init();
});
