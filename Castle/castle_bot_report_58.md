# Castle Duel v58 – egna ballonger

Användaren rapporterade att svårboten sköt ner sina egna ballonger. Felet återskapades med v57 och spelets befintliga kollisionskod.

## Orsak och ändring

- Målvalet i v57 valde en fiendeballong men undersökte inte egna ballonger längs pilbanan.
- v58 räknar igenom pilbanan med spelets gravitation och steg på 1/120 sekund. Kontrollen använder alla nu synliga ballongers position och rörelse, och sker efter att siktesvariation och hastighetsbegränsning tillämpats.
- Kontrollen fortsätter även förbi den avsedda träffen, så att en pil som missar fiendeballongen inte riktas vidare mot en egen. Marginalen är 18 pixlar i sidled och 10 i höjdled utöver den vanliga kollisionsytan.
- Boten provar andra tillåtna bågar och andra fiendeballonger. Om ingen säker pilbana hittas väljer den ett annat vapen, eller lämnar över turen när ammunition saknas. Pilen riktas framåt från kastaren för att undvika kanten där nya egna ballonger kommer in.
- Ett botskott som redan körs på värdens enhet startas inte om när samma skott läses tillbaka från servern. Skott från en mänsklig Player 2 tas fortfarande emot normalt.

Båda spelarnas ballonger kan fortfarande träffas enligt spelets vanliga regler. Kollisionskod, grafik, placering, ammunition, vinstvillkor, startflöde och highscorefunktioner är bevarade. Botprofilernas inställningar är samma som i v57. SMS-inbjudan länkar till v58. Endast synlig spelinformation används i besluten.

## Verifiering

Samma 1 000 matchfrön (4 000 000–4 000 999) och samma fasta referensspelare används i jämförelsen:

| Svårbot | Egna ballonger träffade | Matcher med egen träff | Fiendeballonger träffade | Botens vinster | Ej avslutade inom 900 s |
|---|---:|---:|---:|---:|---:|
| v57 | 581 | 399 | 1044 | 78.4 % | 5 |
| v58 | 0 | 0 | 940 | 76.5 % | 3 |

Ytterligare 1 000 matcher vardera med lätt och medel gav också noll egna ballongträffar. Vinstandelarna blev 20,1 % respektive 51,4 %. Detta är resultat mot en programmerad referensspelare och kan skilja sig från spel mot människor. Resultatfilerna innehåller även statistiska intervall och källkodens SHA-256.

12 000 beslut testades i slumpade ballonguppställningar med båda spelarsidorna och alla tre svårighetsnivåerna. 12 990 pilförlopp kördes med den verkliga kollisionsfunktionen vid 60 fps, 25 fps samt 30 fps med en extra sekund mellan beslut och avfyrning. Resultatet blev 0 egna träffar, 12 916 fiendeträffar och 74 missar. Att avstå från en pil var också ett tillåtet beslut.

Riktade fall verifierar fri fiendeballong, egen ballong i den direkta bågen, egen ballong över avfyrningspunkten, överlappande ballonger, tom ammunition samt hantering av både botskott och mänskliga motspelares skott från servern. Det blockerade direktkastet får en alternativ båge som träffar fienden.

Den befintliga kontrollen av 3 200 placeringar, 802 skottlösningar, belöningsgränser, projektilträffar, bombskada och borgförstörelse passerade också med v58. Nätverk och riktiga highscoreändringar är blockerade i testmiljön.

Matchsimuleringen använder samma upplägg som v57: 120 Hz projektilsteg, 60 fps vid aktiva projektiler/animationer och väntesteg upp till 250 ms. Verklig nätverksfördröjning och pekgester ingår inte i matchmätningen. Serveråterläsningen och varierad avfyrningstid testas därför dessutom separat. Noll egna träffar i dessa tester är ett testresultat, inte ett bevis för alla tänkbara webbläsarförhållanden.

## Kör om

Från Castle-mappen, med Node.js (testat med v24.19.0):

```sh
node castle_simulator_58.mjs --source castle_index_58.html --arrow-checks --scenes 2000
node castle_simulator_58.mjs --source castle_index_58.html --verify
node castle_simulator_58.mjs --source castle_index_57.html --levels hard --count 1000 --seed 4000000 --out baseline_local.json
node castle_simulator_58.mjs --source castle_index_58.html --levels hard --count 1000 --seed 4000000 --out fixed_local.json
node castle_simulator_58.mjs --source castle_index_58.html --levels easy,medium --count 1000 --seed 4000000 --out levels_local.json
```

Referensspelarens ursprungliga beslutslogik behålls under profil `reference` så att jämförelsen mäter förändringen hos spelboten. Filen `castle_sprite_sizes_57.json` återanvänds för de befintliga grafikfilernas storlekar. Nya versionen finns på:

[https://ulfenm-code.github.io/Games/Castle/castle_index_58.html](https://ulfenm-code.github.io/Games/Castle/castle_index_58.html)
