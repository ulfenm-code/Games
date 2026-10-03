# Regler för det här repot

Svara alltid på svenska.

## Skriv aldrig över befintliga filer

När användaren säger "bygg" (eller något annat ska laddas upp till GitHub):

- **Ändra, skriv över eller ta bort aldrig en fil som redan finns i repot.** Det gäller alla filer:
  HTML, JS, CSS, bilder, README.md och så vidare.
- Gör i stället en **ny version** genom att räkna upp versionsnumret i filnamnet.
- **Indexfilen och JavaScript-filen räknas upp tillsammans** och får samma nummer.

Exempel i `FPA/`:

| Version | HTML | JavaScript | CSS |
|---|---|---|---|
| 01 | `fpa_index_01.html` | `fpa_game_01.js` | `fpa_style_01.css` |
| 02 | `fpa_index_02.html` | `fpa_game_02.js` | `fpa_style_02.css` |

Den nya indexfilen länkar till de nya filerna med samma nummer. Filer som inte ändrats
(t.ex. bilder) får den nya indexfilen fortsätta använda som de är.

Kolla alltid vilket som är det högsta numret som finns innan du skapar en ny version.

## Filstruktur

- HTML, JavaScript och bilder ligger i egna filer.
- Filerna ligger direkt i spelets mapp (t.ex. `FPA/`, `Castle/`), utan undermappar.
- Använd relativa sökvägar (`fpa_hamster.jpg`), små bokstäver och inga mellanslag eller å/ä/ö i nya filnamn.
