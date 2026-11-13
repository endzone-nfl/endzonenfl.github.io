// Holt die aktuelle NFL-Tabelle von ESPN und schreibt src/data/standings.json.
// Aufruf: node scripts/update-standings.mjs [lokale-json-datei]
// Schlägt der Abruf fehl, bleibt der zuletzt gespeicherte Stand erhalten.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const URL_ESPN = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3';
const OUT = fileURLToPath(new URL('../src/data/standings.json', import.meta.url));

async function load() {
  const file = process.argv[2];
  if (file) return JSON.parse(await readFile(file, 'utf8'));
  const res = await fetch(URL_ESPN, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`ESPN antwortet mit HTTP ${res.status}`);
  return res.json();
}

function parse(raw) {
  let season = null;
  const conferences = (raw.children ?? []).map((conf) => {
    const teams = [];
    for (const div of conf.children ?? []) {
      season ??= div.standings?.season ?? null;
      for (const entry of div.standings?.entries ?? []) {
        const s = Object.fromEntries((entry.stats ?? []).map((x) => [x.name, x]));
        const num = (k) => Number(s[k]?.value ?? s[k]?.displayValue ?? 0) || 0;
        const txt = (k) => s[k]?.displayValue ?? '';
        teams.push({
          abbr: entry.team.abbreviation,
          name: entry.team.displayName,
          division: div.name.replace(/^(AFC|NFC)\s+/, ''),
          seed: num('playoffSeed'),
          wins: num('wins'),
          losses: num('losses'),
          ties: num('ties'),
          pct: txt('winPercent'),
          divRecord: txt('vs. Div.'),
          confRecord: txt('vs. Conf.'),
          streak: txt('streak'),
          pointDiff: txt('pointDifferential'),
          clincher: txt('clincher'),
        });
      }
    }
    teams.sort((a, b) => a.seed - b.seed);
    return { abbr: conf.abbreviation, name: conf.name, teams };
  });
  return { season, updated: new Date().toISOString(), conferences };
}

try {
  const data = parse(await load());
  const ok =
    data.conferences.length === 2 &&
    data.conferences.every((c) => c.teams.length === 16 && c.teams.every((t) => t.seed > 0));
  if (!ok) throw new Error('Unerwartetes Datenformat (keine 2×16 Teams mit Seed)');
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Tabelle ${data.season} gespeichert (${data.updated}).`);
} catch (err) {
  console.warn(`WARNUNG: Tabelle nicht aktualisiert – ${err.message}. Alter Stand bleibt.`);
}
