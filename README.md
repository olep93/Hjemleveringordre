# Hjemleveringordre V1.5 – ny plukkeflyt

Dette er en komplett pakke som inkluderer alt fra V1.4, pluss en helt ny
plukkeopplevelse.

## Ny plukkeflyt

Når en ordre åpnes er den låst og ryddig:

- varelinjene vises, men kan ikke hukes av
- plassering og plukkekommentar er skjult
- bildeopplasting er skjult
- bare relevante hovedvalg vises

Når brukeren trykker «Start plukking» eller «Fortsett plukking»:

- avhuking åpnes
- leveringsdato og plassering kan endres
- kommentar kan registreres
- bilde av ferdig ordre kan lastes opp

Brukeren avslutter med:

- «Lagre og avslutt»:
  lagrer fremdriften og låser ordren igjen
- «Ferdigstill ordre»:
  krever alle varelinjer, plassering og minst ett bilde, og flytter ordren til
  «Til utkjøring»

Knappen heter ikke lenger «Klar for lasting» i selve plukkeflyten.

## E-postvarsler

Både varsel om ny ordre og varsel om ferdig plukket ordre inneholder nå en
oversikt med:

- produktnavn / ordretekst
- EAN når tilgjengelig
- antall
- enhet

Varsler for «Lastet på bil» og «Levert» inneholder også vareoversikten.

## Alt fra V1.4 er med

- moderne Obs BYGG-design og faner
- produktnavn og produktbilder fra Obsbygg.no
- Vercel Blob
- PDF-tolking med MuPDF
- brukeradministrasjon
- roller og passordreset
- redigerbare varslingsmottakere
- testknapper for varsling
- beskyttelse mot duplikate innkommende e-poster
- Dashboard, Ordre, Til utkjøring, Ferdige ordre og Historikk

## Opplasting

1. Slett alt innhold i GitHub-repositoryet.
2. Pakk ut ZIP-filen.
3. Last opp hele innholdet til roten av repositoryet.
4. Commit.
5. Vent på automatisk Vercel-deploy.

Behold Vercel-prosjekt, Environment Variables, Blob Store, Firebase og Resend.
