# Hjemleveringordre V1.2 – komplett prosjekt

Dette er en komplett erstatningspakke. Den bruker:

- Firestore til ordredata, brukere, status og historikk
- Vercel Blob Private til PDF-er og bilder
- Resend til mottak av e-post og varslinger
- MuPDF til lesing av Obs Bygg-kundeordre
- Vercel til drift

Firebase Storage brukes ikke.

## Viktig før opplasting til GitHub

Slett alt innhold i repositoryet først, bortsett fra selve repositoryet.

Du kan beholde `.gitignore`, men det er enklest å slette alle filer og laste opp hele innholdet fra denne pakken.

Last opp innholdet i den utpakkede mappen til roten av repositoryet. GitHub skal vise blant annet:

- `src/`
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `README.md`

Det skal ikke finnes gamle filer som:

- `next.config.js`
- `next.config.mjs`
- `next.config.cjs`
- gamle parserfiler
- `package-lock.json` fra tidligere forsøk

## Vercel

Behold det eksisterende Vercel-prosjektet og disse miljøvariablene:

- `FIREBASE_SERVICE_ACCOUNT`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `SESSION_SECRET`
- `BLOB_STORE_ID`
- `BLOB_WEBHOOK_PUBLIC_KEY`

Denne kan slettes:

- `FIREBASE_STORAGE_BUCKET`

Vercel Blob Store skal fortsatt være koblet til prosjektet.

## Etter opplasting

1. Commit hele prosjektet.
2. Vent på Vercel-deploy.
3. Ikke bruk gammel build-cache ved manuell redeploy.
4. Åpne `/api/resend/inbound`.
5. Kontroller at svaret viser:
   - `"configured": true`
   - `"storage": "Vercel Blob private"`

## Testing

Gamle ordre som peker til Firebase Storage bør slettes.

Send deretter kundeordre-PDF-en på nytt til:

`ordre@hjemlevering.jobbverktoy.no`

For kundeordre 1549 forventes:

- Kundeordre 1549 – Transportordre Ordresen
- 500 M – 48X98 IMP K-VIRKE
- 15 Stk – INFRA STØP B20 20KG
- 200 M – 28X120 IMP TERRASSEB

## Innlogging

Testbruker:

- Brukernavn: `Admin`
- Passord: `midlertidigpassord`

Innloggingsopplysningene vises ikke i appen.
