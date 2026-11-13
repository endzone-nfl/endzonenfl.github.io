# Endzone

Deutschsprachige Website rund um NFL und Fantasy Football, gebaut mit [Astro](https://astro.build).

## Seiten

| Seite | Inhalt | Daten |
| --- | --- | --- |
| Regeln | Durchsuchbares Regel-Glossar | `src/data/regeln.js` |
| Positionen | Alle Positionen mit Aufstellungsgrafik | `src/data/positionen.js` |
| Schemes | Formationen, Systeme, Coverages | `src/data/schemes.js` |
| Playoff Picture | Seeds beider Conferences | `src/data/standings.json` (automatisch) |
| Hall of Fame | Fantasy-Champions | `src/data/hall-of-fame.json` |

## Name ändern

Der Seitenname steht nur in `src/config.js` (`name`, optional `nameAkzent` für den roten Teil im Logo).

## Lokal starten

```bash
npm install
npm run dev
```

## Hall of Fame pflegen

Einträge in `src/data/hall-of-fame.json` ergänzen. Pflicht sind nur `saison` und `manager`:

```json
[
  { "saison": 2024, "manager": "Name", "team": "Teamname", "bilanz": "10-4", "finale": "132,4 : 118,9 gegen …", "notiz": "freier Text" }
]
```

## Playoff Picture

`npm run update-standings` holt die aktuelle Tabelle von ESPN. Der Workflow
`.github/workflows/deploy.yml` macht das jeden Dienstagmorgen (nach dem Monday Night Game)
automatisch und veröffentlicht die Seite neu auf GitHub Pages.
