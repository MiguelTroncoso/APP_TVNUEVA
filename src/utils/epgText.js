// Helpers de EPG compartidos (el panel entrega títulos en base64).
const decodeBase64Utf8 = (encoded) => {
  const decoded = global.atob(encoded);
  return decodeURIComponent(Array.from(decoded).map(ch =>
    `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`
  ).join(''));
};

export const safeDecode = (value = '') => {
  try {
    const s = String(value || '');
    if (s && typeof global.atob === 'function' && /^[A-Za-z0-9+/=]+$/.test(s) && s.length % 4 === 0) {
      return decodeBase64Utf8(s);
    }
    return s;
  } catch (_) { return String(value || ''); }
};

const toMillis = (ts, str) => {
  if (ts) return Number(ts) * 1000;
  const d = str ? new Date(String(str).replace(' ', 'T')) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
};

/** Devuelve { title, progress (0-1) } del programa en emisión, o null. */
export const pickCurrentProgram = (listings, now = Date.now()) => {
  for (const p of listings || []) {
    const start = toMillis(p.start_timestamp, p.start);
    const end = toMillis(p.stop_timestamp, p.end);
    if (start && end && now >= start && now < end) {
      return { title: safeDecode(p.title), progress: (now - start) / (end - start) };
    }
  }
  return null;
};
