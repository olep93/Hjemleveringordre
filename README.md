# Hjemleveringordre V1.7 – grafisk validering ved ferdigstilling

Dette er en komplett pakke som inkluderer alt fra V1.6.

## Ny grafisk bekreftelse ved mangler

Når brukeren trykker **Ferdigstill ordre**, kontrollerer appen:

- at alle plukkbare varelinjer er huket av
- at plassering er valgt
- at minst ett bilde er lastet opp

Dersom noe mangler:

1. en tydelig rød feilmelding vises øverst på skjermen
2. meldingen forsvinner automatisk etter fem sekunder
3. appen ruller til første felt som mangler
4. manglende plassering får rødt felt
5. bildeområdet får rød ramme dersom bilde mangler
6. hver varelinje som ikke er huket av får rød bakgrunn og merket
   **Mangler avhuking**

Den røde markeringen fjernes fortløpende når brukeren retter mangelen.

## Alt fra V1.6 er inkludert

- telefonnummer fra PDF
- leveringsadresse fra PDF
- automatisk opplasting når bilde velges
- plukkemodus med Lagre og avslutt / Ferdigstill ordre
- varelinjer og antall i e-postvarsler
- produktbilder og produktnavn
- brukeradministrasjon og roller
- varslingsmottakere og testvarsler
- faner, historikk og duplikatbeskyttelse

## Opplasting

1. Slett alt innhold i GitHub-repositoryet.
2. Pakk ut ZIP-filen.
3. Last opp hele innholdet til roten.
4. Commit.
5. Vent på automatisk Vercel-deploy.

Behold Vercel-prosjekt, miljøvariabler, Blob Store, Firebase og Resend.
