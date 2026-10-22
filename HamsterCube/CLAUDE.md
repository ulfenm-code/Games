# Regler för Hamster Cube (`HamsterCube/`)

Svara alltid på svenska. Allt som syns i spelet och i editorn ska vara på engelska.

## Vänta på "bygg"

Bygg eller ladda inte upp något förrän användaren säger "bygg". Diskutera och föreslå först.

## Skriv aldrig över befintliga filer

- **Ändra, skriv över eller ta bort aldrig en fil som redan finns i repot.** Det gäller alla filer:
  HTML, JS, CSS, bilder, ljud, modeller, banfiler, README.md och så vidare.
- Gör i stället en **ny version** genom att räkna upp versionsnumret i filnamnet.
- **Indexfilen och spelets JavaScript-fil räknas upp tillsammans** och får samma nummer
  (`hc_index_NN.html`, `hc_game_NN.js`, `hc_levels_NN.js`). CSS får nytt nummer bara när den ändras.
- **Editorn** har egna nummer: `hc_editor_NN.html`, `hc_editor_NN.js`, `hc_editor_NN.css`.
- Kolla alltid vilket som är det högsta numret som finns innan du skapar en ny version.

## Banorna

- Användaren bygger banorna själv i editorn. Varje bana är en egen fil: `hc_level_NN_VV.json`
  (bana NN, version VV). En ändrad bana blir en ny fil med nästa versionsnummer.
- Spelet letar själv upp banorna: bana 01, 02, 03 … tills en saknas, och för varje bana den högsta
  versionen. Ingen lista behövs, och spelet behöver ingen ny version när en bana läggs till.
- Topplistan (Supabase, tabellen `fpa_highscores`) har nyckeln `hc_NN_VV`, så en ändrad bana får en ny lista.

## Filstruktur

- Alla filer ligger direkt i `HamsterCube/`, utan undermappar.
- Små bokstäver, inga mellanslag eller å/ä/ö i filnamn. Alla filer börjar med `hc_`.
- `FPA/` är den gamla testbanan som spelet bygger på. Den lämnas orörd.
