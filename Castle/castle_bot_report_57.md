# Castle Duel v57 – botnivåer och verifiering

Utgår från Castle/castle_index_56.html i commit 16d4c337fd8d32dabc5ef110cfeb54a3382aebfe. Alla levererade filer har nya namn. Spelbar version:

[https://ulfenm-code.github.io/Games/Castle/castle_index_57.html](https://ulfenm-code.github.io/Games/Castle/castle_index_57.html)

Botens placering, sikte, minne av skottbanor, ballongförsvar och bombdetonation skiljer nivåerna åt. Placeringarna görs i två dimensioner med lagliga kast. Skottlösningen tar hänsyn till spelets diskreta gravitationssteg och maxhastigheten. Boten får bara synliga ballonger, egen ammunition och borgarnas synliga hälsa som indata. Den registrerar sina egna synliga skottbanor. Kollisionshanteringen i spelmotorn kontrollerar träffar mot de dolda objekten.

## Separat slutmätning

5 000 matcher per nivå mot en fast programmerad referensspelare. Inställningarna frystes före denna körning. Träningsfrön: 10 000–11 999; valideringsfrön: 1 000 000–1 004 999. Player 1 börjar alltid, precis som i spelet. Bot är Player 2.

| Nivå | Botvinster | Andel av alla matcher | 95 % intervall | Människan/testspelaren vann | Tidsgräns nådd |
|---|---:|---:|---:|---:|---:|
| Lätt | 1000 / 5 000 | 20.00 % | 18.91–21.13 % | 4000 | 0 |
| Medel | 2596 / 5 000 | 51.92 % | 50.53–53.30 % | 2397 | 7 |
| Svår | 3918 / 5 000 | 78.36 % | 77.20–79.48 % | 1042 | 40 |

47 av 15 000 matcher avslutades inte inom simulatorns gräns på 900 sekunder. De ingår i nämnaren och har inte räknats som botvinster. Intervallen är Wilsonintervall för simuleringsutfallen; de beskriver inte osäkerheten i modellen av en människa.

Referensspelaren har bland annat 4,5–5,7 sekunders betänketid, cirka ±4,5 % variation i utgångshastighet, 64 % chans att försöka skjuta en möjlig fiendeballong vid ett beslut, minne av tidigare sökområden och 65 % chans att planera manuell bombdetonation. Samma modell och inställningar används mot alla tre nivåer. Ingen statistik från Ulfs egna matcher används. Vinstandelarna mot en riktig spelare beror på spelarens styrka, placeringar och tempo.

## Känslighet för motspelarens styrka

Ytterligare 1 000 matcher per nivå och motspelare, med frön 2 000 000–2 000 999 respektive 3 000 000–3 000 999. Dessa motspelare använder profil easy respektive hard på Player 1-sidan. De är programmerade jämförelseprofiler, inga uppmätta grupper av människor.

| Botnivå | Mot svagare testprofil | Mot referensen | Mot starkare testprofil |
|---|---:|---:|---:|
| Lätt | 43.0 % | 20.00 % | 2.8 % |
| Medel | 73.0 % | 51.92 % | 11.5 % |
| Svår | 91.9 % | 78.36 % | 23.1 % |

## Vad som återanvänds och vad som modelleras

- Simulatorn läser skriptet ur den levererade HTML-filen och kör dess projektiler, kollisioner, ammunition, ballongbelöningar, borgskador, turbyten och vinstvillkor. Botkoden är samma JavaScript-fil som laddas av spelet.
- Projektilfysiken använder spelets 1/120-sekundssteg. Aktiva projektiler, fallande borgbomber och belöningsanimationer körs i 60 bildrutor per sekund. Vid väntan utan dessa animationer gör klockan steg på högst 250 ms. Ballongankomst och tidsutfall kan därför skilja något från en webbläsare.
- HTTP ersätts med lokala svar. Nätverksfördröjning, polling och verkliga pekgester modelleras inte. Alla nätverksanrop är blockerade i testmiljön. Highscore och riktiga matcher påverkas inte av simuleringen.
- Spelgrafikens verkliga bildproportioner används för kollisionsytorna. Dimensionerna är hämtade från PNG-filernas huvuden i repositoryt.
- 3 200 slumpade placeringar spelades upp med spelets befintliga placeringsfysik och matchade de planerade koordinaterna. Dessutom verifierades 802 skottlösningar, 150 kontroller av begränsade indata, belöningsgränserna 55/30/15 %, raketträff, bombens områdesskada samt att oskyddade ballonger kan förstöra en borg.
- Startflöde, grafik, databasflöde och highscorefunktioner är jämförda mot v56. SMS-länken pekar på v57. Botändringarna ligger i nya filer.

## Kör om

Kör från Castle-mappen med Node.js. Körningen gjordes med Node.js v24.19.0. Inga extra npm-paket behövs.

```sh
node castle_simulator_57.mjs --source castle_index_57.html --verify
node castle_simulator_57.mjs --source castle_index_57.html --count 5000 --seed 1000000 --out castle_validation_57.json
node castle_simulator_57.mjs --source castle_index_57.html --count 1000 --seed 2000000 --reference easy --out castle_validation_beginner_57.json
node castle_simulator_57.mjs --source castle_index_57.html --count 1000 --seed 3000000 --reference hard --out castle_validation_expert_57.json
```

Använd en separat arbetskopia om de sparade resultatfilerna ska bevaras när kommandona körs om.

## Källkod som mättes

- HTML SHA-256: `ec7bb2a326adab3b5a51404a057005633c851f520d18962698b5e5f7d0b3ed27`
- Bot SHA-256: `d6292b1c2f6805a6e4c842cffc834bc4e024229e61932f455fadb6bf76ef6f69`
