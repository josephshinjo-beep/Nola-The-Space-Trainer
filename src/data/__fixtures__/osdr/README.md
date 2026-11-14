Real answers from NASA's Open Science Data Repository (OSDR) study search API,
recorded on 14 November 2026 with:

    https://osdr.nasa.gov/osdr/data/search?term=OSD-<number>&type=cgene&size=5

Each file keeps only the matching study, cut down to the fields the app uses.
`src/data/astronautScience.ts` quotes these descriptions word for word, and a
test checks every quote still appears here.
