# Hamsterkuben – spelidé

Senast uppdaterad med version 08 (`fpa_index_08.html`).

## Grundidé

En hamster är fångad inne i en genomskinlig plastkub. Inne i kuben går gångar av glas
kors och tvärs i alla tre riktningar. Spelaren styr hamstern i first person-vy och
tar sig vidare genom att tippa hela kuben. Målet är en utgång på någon av kubens sex sidor.

## Hamstern

- Hamstern är själva kulan. Den slår kullerbyttor framåt när den rullar, så ansiktet
  kommer upp med jämna mellanrum.
- Kameran ligger bakom och lite ovanför hamstern (first person-vy).
- Vid en sväng tar kameran en sekund på sig att komma bakom hamstern. Under tiden
  vickar hamstern fram och tillbaka och vrider sig lite i taget så att ansiktet
  pekar framåt när svängen är klar.
- Ju mer man lutar telefonen, desto fortare rullar hamstern.

## Gångar, golv och tyngdkraft

- **Varje gång har ett bestämt golv.** Golvet ser ut som golv (randigt). Väggar och tak
  är frostat glas. Rutor som inte hör till någon gång är tomma.
- **Tyngdkraften drar alltid rakt nedåt.** Hamstern rullar bara när kuben ligger så att
  gångens golv är nedåt.
- **Hamstern klättrar aldrig och rullar aldrig på väggar eller i taket.**
- **Hamstern hänger aldrig i luften.**

## Hål i golvet

- Rullar hamstern in i en ruta med hål i golvet faller den ner **halvvägs** och sitter fast.
- **Det går inte att ångra sig** när hamstern har börjat åka ner i ett hål.
- Kubknappen pumpar och blinkar. Spelaren zoomar ut och tippar kuben.

## Schakt i taket

- Kommer hamstern under ett schakt stannar den en kort stund. Sedan kan den rulla vidare.
- Står den kvar börjar kubknappen pumpa och blinka. Zoomar man ut kan man vända kuben
  **180°**, så att schaktet blir ett hål. Hamstern faller ner i det och fastnar halvvägs.
- Därefter är det som vid ett vanligt hål.

## Tippa kuben

- Man tippar kuben i **utzoomat läge**. Kuben visas snett ovanifrån, som en tärning på ett
  bord. (Ingen kartvy rakt uppifrån och inga kugghjul.)
- Man **sveper** på skärmen: åt höger rullar kuben åt höger, uppåt rullar den bort från en.
  Kuben följer fingret och fjädrar tillbaka om man släpper före halva vägen.
- Ett hål: ett kvarts varv (90°) per svep. Under ett schakt: en vändning 180°.
- **Det finns alltid bara ett rätt läge:** golvet i gången som hålet leder till ska vara nedåt.
- När kuben hamnar i rätt läge lyser golvet i nästa gång upp, texten säger *Rätt!*, och efter
  en kort stund zoomar kameran automatiskt in bakom hamstern. Man kan också trycka på
  kubknappen för att zooma in direkt.
- **Det ska aldrig gå att hamna fel.** Två lägen som går att växla mellan:
  - **Spärr:** kuben går bara att tippa åt rätt håll. Fel håll gungar och fjädrar tillbaka.
  - **Markering:** man tippar fritt, hur många gånger man vill, tills rätt läge lyser upp.
    Man stannar kvar i utzoomat läge tills det är rätt.
- **Hjälp på/av:** en pil visar åt vilket håll man ska svepa. Senare ska det gå att spela
  utan hjälp, så att det är upp till spelaren att lista ut hållet.
- **Visa allt / bara nära:** utifrån visas normalt bara gångarna nära hamstern.
  Kanske visas allt igen senare.

## Glasrör

- Böjda, inramade glasrör är en rolig del av spelet, till exempel som genvägar eller ner
  flera våningar.
- I röret rullar hamstern av sig själv (fortare om man lutar framåt) och lutar sig
  inåt i kurvorna. Kameran åker med inne i röret.

## Banor

- Banorna byggs för hand (inte slumpade), med **långa gångar**, inte en ruta och sedan en vägg.
- Få hål till att börja med. Övningsbanan har tre hål, ett schakt, ett glasrör och utgången.

## Senare

- Fler och svårare banor, med större öppna ytor.
- Spela utan hjälp-pilen.
- Databas (Supabase), till exempel för topplista.

## Arbetssätt

- Inga filer byggs eller laddas upp förrän användaren säger **bygg**.
- Befintliga filer ändras aldrig. Varje version får nya filer med nästa nummer,
  och index- och JavaScript-filen får samma nummer (se `CLAUDE.md`).
