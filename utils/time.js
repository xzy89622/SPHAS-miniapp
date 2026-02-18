// utils/time.js
// 作用：将后端时间字符串/时间戳转成更好看的格式

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

/**
 * @param {string|number|Date} input
 * 支持：'2026-02-13T15:04:05'、'2026-02-13 15:04:05'、时间戳
 */
function formatDateTime(input) {
  if (!input) return '';
  let d;

  if (input instanceof Date) d = input;
  else if (typeof input === 'number') d = new Date(input);
  else {
    // 兼容 '2026-02-13T15:04:05'
    const s = String(input).replace('T', ' ').replace(/\.000Z$/, '');
    // iOS 对 'YYYY-MM-DD HH:mm:ss' 有时不友好，换成 '/'
    const safe = s.replace(/-/g, '/');
    d = new Date(safe);
  }

  if (isNaN(d.getTime())) return String(input);

  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  return `${Y}-${M}-${D} ${h}:${m}`;
}

module.exports = { formatDateTime };
