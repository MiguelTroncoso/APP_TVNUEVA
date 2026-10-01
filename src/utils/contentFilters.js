const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const RECENTLY_ADDED_MS = 14 * 24 * 60 * 60 * 1000;

export const SORT_OPTIONS = [
  { key: 'server', label: 'Servidor' },
  { key: 'recent', label: 'Recientes' },
  { key: 'rating', label: 'Rating' },
  { key: 'az', label: 'A-Z' },
  { key: 'za', label: 'Z-A' },
  { key: 'year', label: 'Año' },
];

export const getRaw = (item) => item?.raw || item || {};

export const getTitle = (item) => String(getRaw(item).name || getRaw(item).title || '').trim();

export const getRating = (item) => {
  const raw = getRaw(item);
  const value = parseFloat(raw.rating || raw.info?.rating || 0);
  return Number.isFinite(value) ? value : 0;
};

export const getYear = (item) => {
  const raw = getRaw(item);
  const candidates = [
    raw.year,
    raw.releaseDate,
    raw.release_date,
    raw.releasedate,
    raw.info?.year,
    raw.info?.releaseDate,
    raw.info?.release_date,
    raw.info?.releasedate,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      const match = String(candidate).match(/\b(19|20)\d{2}\b/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        if (Number.isFinite(parsed) && parsed >= 1900 && parsed <= new Date().getFullYear() + 2) {
          return parsed;
        }
      }
    }
  }

  // Fallback seguro: extraer año del título SOLO si tiene formato entre paréntesis o delimitado al final (ej: "Dune: Part Two (2024)")
  const title = String(raw.name || raw.title || '');
  const titleMatch = title.match(/\((19|20)\d{2}\)/) || title.match(/[\s\-_](19|20)\d{2}$/);
  if (titleMatch) {
    const yearMatch = titleMatch[0].match(/(19|20)\d{2}/);
    if (yearMatch) {
      const parsed = parseInt(yearMatch[0], 10);
      if (Number.isFinite(parsed) && parsed >= 1900 && parsed <= new Date().getFullYear() + 2) {
        return parsed;
      }
    }
  }

  return 0;
};

export const getAddedTimestamp = (item) => {
  const raw = getRaw(item);
  const added = parseInt(raw.added || raw.info?.added || 0, 10);
  return Number.isFinite(added) ? added : 0;
};

export const isNewRelease = (item) => {
  const year = getYear(item);
  const currentYear = new Date().getFullYear();
  // Estrenos reales del año actual cinematográfico (sin recurrir a added)
  return year === currentYear;
};

export const isRecentlyAdded = (item, days = 14) => {
  const added = getAddedTimestamp(item);
  if (added <= 0) return false;
  return (Date.now() - added * 1000) < days * 24 * 60 * 60 * 1000;
};

export const sortContent = (items = [], sortKey = 'server') => {
  const arr = [...(items || [])];
  switch (sortKey) {
    case 'az':
      return arr.sort((a, b) => getTitle(a).localeCompare(getTitle(b), 'es', { sensitivity: 'base' }));
    case 'za':
      return arr.sort((a, b) => getTitle(b).localeCompare(getTitle(a), 'es', { sensitivity: 'base' }));
    case 'rating':
      return arr.sort((a, b) => getRating(b) - getRating(a));
    case 'year':
      return arr.sort((a, b) => getYear(b) - getYear(a));
    case 'recent':
      return arr.sort((a, b) => getAddedTimestamp(b) - getAddedTimestamp(a));
    case 'server':
    default:
      return arr;
  }
};

export const getRecentlyAdded = (items = [], limit = 20, days = 14) => {
  const recents = (items || []).filter((item) => isRecentlyAdded(item, days));
  const sorted = sortContent(recents, 'recent');
  if (sorted.length >= Math.min(limit, 6)) return sorted.slice(0, limit);
  // Fallback: si el servidor no trae suficientes timestamps nuevos, mostrar los más nuevos por added.
  return sortContent(items || [], 'recent').filter(item => getAddedTimestamp(item) > 0).slice(0, limit);
};
