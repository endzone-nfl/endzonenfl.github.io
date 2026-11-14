// Holt den Cap Space aller Teams von Over The Cap und schreibt src/data/capspace.json.
// Aufruf: node scripts/update-capspace.mjs
// Over The Cap veröffentlicht Cap Space nur für die Jahre mit Cap-Prognose (aktuell + 2).
// Für das vierte Jahr gibt es nur die bereits gebundenen Summen; die stehen auf den Team-Seiten.
// Schlägt der Abruf fehl, bleibt der zuletzt gespeicherte Stand erhalten.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = 'https://overthecap.com';
const OUT = fileURLToPath(new URL('../src/data/capspace.json', import.meta.url));
const UA = 'Mozilla/5.0 (compatible; nfl-fansite-cap-tracker/1.0; weekly)';
const JAHRE = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const res = await fetch(BASE + path, { headers: { 'user-agent': UA, accept: 'text/html' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

// "$40,399,337" -> 40399337, "($48,857,631)" -> -48857631
function dollar(text) {
  const t = text.replace(/<[^>]+>/g, '').trim();
  const n = Number(t.replace(/[^0-9.]/g, ''));
  if (!t || Number.isNaN(n)) return null;
  return t.includes('(') || t.includes('-') ? -n : n;
}

const titel = (slug) =>
  slug
    .split('-')
    .map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');

function parseUebersicht(html) {
  const teams = new Map();
  const caps = {};
  const jahre = [];
  const teil = html.split(/<div class="salary-cap-space-container" id="season-/).slice(1);
  for (const block of teil) {
    const jahr = Number(block.slice(0, 4));
    jahre.push(jahr);
    caps[jahr] = dollar(block.match(/Base Salary Cap:\s*([^<]+)</)?.[1] ?? '');
    const body = block.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '';
    for (const row of body.split(/<tr[^>]*>/).slice(1)) {
      const link = row.match(/class="team-link ([A-Z0-9]+)" href="\/salary-cap\/([a-z0-9-]+)\/?"/);
      const zellen = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
      if (!link || zellen.length < 6) continue;
      const [, abbr, slug] = link;
      const t = teams.get(abbr) ?? { abbr, slug, name: titel(slug), space: {}, effective: {}, dead: {}, committed: {} };
      t.space[jahr] = dollar(zellen[1]);
      t.effective[jahr] = dollar(zellen[2]);
      t.dead[jahr] = dollar(zellen[5]);
      teams.set(abbr, t);
    }
  }
  return { jahre, caps, teams: [...teams.values()] };
}

// Gebundene Summe ("Total Cap Liabilities") eines Jahres von der Team-Seite
function parseTeamJahr(html, jahr) {
  const start = html.indexOf(`id="y${jahr}"`);
  if (start < 0) return null;
  const m = html.slice(start, start + 20000).match(/Total Cap Liabilities:\s*([^<]+)</);
  return m ? dollar(m[1]) : null;
}

try {
  const { jahre, caps, teams } = parseUebersicht(await get('/salary-cap-space'));
  const ok =
    jahre.length >= 2 &&
    teams.length === 32 &&
    teams.every((t) => jahre.every((j) => typeof t.space[j] === 'number'));
  if (!ok) throw new Error('Unerwartetes Format der Übersichtsseite');

  let alt = null;
  try {
    alt = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {}

  const alle = Array.from({ length: JAHRE }, (_, i) => jahre[0] + i);
  const ohneCap = alle.filter((j) => !jahre.includes(j));
  let fehler = 0;
  for (const t of teams) {
    let html = null;
    if (ohneCap.length) {
      try {
        html = await get(`/salary-cap/${t.slug}`);
      } catch (err) {
        fehler++;
        console.warn(`WARNUNG: ${t.name} – ${err.message}`);
      }
      await sleep(400);
    }
    for (const j of ohneCap) {
      const wert = html ? parseTeamJahr(html, j) : null;
      t.committed[j] = wert ?? alt?.teams?.find((a) => a.abbr === t.abbr)?.committed?.[j] ?? null;
    }
  }

  const data = {
    updated: new Date().toISOString(),
    years: alle,
    capYears: jahre.filter((j) => alle.includes(j)),
    caps,
    teams: teams.sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Cap Space ${alle[0]}–${alle.at(-1)} gespeichert (${fehler} Team-Seiten fehlgeschlagen).`);
} catch (err) {
  console.warn(`WARNUNG: Cap Space nicht aktualisiert – ${err.message}. Alter Stand bleibt.`);
}
