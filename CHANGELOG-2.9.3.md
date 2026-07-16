# Hjemleveringordre 2.9.3

- Retter PDF-parseren som feilaktig stoppet ved ordet «Sum» i tabelloverskriften og derfor kunne finne 0 varelinjer.
- Leser 11 varelinjer i testordre 1487, inkludert PLU 20032 Byggevarer, 29034 Frakt og 90646 Vinduer.
- Beholder varekommentarer etter varelinjen, blant annet «500 m med 19x173 df 60 Bas / Må bestilles evt», «Må bestilles» og «Tilbud #11465313».
- Gjør tabelloverskriftsdeteksjonen robust når EAN/PLU og Varetekst ligger i separate PDF-tekstspenn.
- Hindrer at ny tolkning med 0 funn overskriver eller skjuler eksisterende varelinjer.
