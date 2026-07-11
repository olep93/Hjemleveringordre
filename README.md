# Hjemleveringordre V1.3

Komplett prosjektpakke med:

- moderne Obs BYGG-inspirert design
- korrekt `OBS BYGG`-ordmerke i toppfeltet
- produktbilder foran varelinjene
- oppdatert produktnavn fra Obsbygg.no
- produktlenke til Obsbygg.no
- PDF-ordretekst beholdes som kontrolltekst
- EAN og bestillingsnummer vises som etiketter
- produktoppslag skjer kun:
  - når ordren opprettes
  - når «Tolk og oppdater produktinfo» trykkes
- ingen nettskraping når en bruker bare åpner ordren
- produktbildet kopieres til privat Vercel Blob
- ordreimporten fortsetter selv om ett produktoppslag feiler

## Opplasting til GitHub

Dette er en komplett pakke.

1. Slett alt innhold i GitHub-repositoryet.
2. Pakk ut ZIP-filen.
3. Last opp alt innholdet til roten av repositoryet.
4. Commit.
5. Vent på automatisk Vercel-deploy.

Behold eksisterende:

- Vercel-prosjekt
- Environment Variables
- Vercel Blob Store
- Firebase/Firestore
- Resend-webhook

## Test

For eksisterende ordre:

1. Åpne ordren som Admin.
2. Trykk «Tolk og oppdater produktinfo».
3. Appen leser PDF-en på nytt og henter navn/bilde fra Obsbygg.no.

For nye ordre skjer begge deler automatisk ved opprettelse.
