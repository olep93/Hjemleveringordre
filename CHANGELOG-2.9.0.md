# Hjemleveringordre 2.9.0

- ÅPEN PLU-linjer fra Klikk & Hent-skanning beholdes som plukkbare varelinjer, inkludert PLU-nummer og tilbudskommentar.
- «Rediger hele ordren» er tilgjengelig for medarbeider, leder og administrator.
- Tilbakestilling og permanent bildesletting er fortsatt administratorstyrt.
- Transportørens e-postadresse styres kun fra administratorinnstillingene. Klienten kan ikke overstyre mottakeren.
- Administrator kan endre både visningsnavn og brukernavn for eksisterende brukere.
- Logg ut bruker nå full sidenavigasjon tilbake til hovedsiden for å unngå hvit side.
- Testmodus er fortsatt standard på og må slås av eksplisitt av administrator.

## Kontroll

Avhengigheter kunne ikke installeres i byggemiljøet innen tidsgrensen, så en komplett `next build` kunne ikke kjøres her. Kildeendringene er statisk kontrollert, men Vercel-build bør bekreftes før produksjonsbruk.
