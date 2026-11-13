// Baut interne Links so, dass sie auch unter einem Unterpfad (GitHub Pages) funktionieren.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path = '/') => `${base}${path.startsWith('/') ? path : `/${path}`}`;
