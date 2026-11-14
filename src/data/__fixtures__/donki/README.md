# Recorded NASA DONKI responses

Real responses from the official DONKI web service
(`https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,SEP}`, DONKI-API version 2.0),
recorded on 14 November 2026. They are used by the tests and to build the
offline archive in `src/data/spaceEventsArchive.ts`.

| File prefix | Dates requested | Why |
|---|---|---|
| `recent-` | 2026-10-15 to 2026-11-14 | A normal recent month (no SEP events) |
| `may2024-` | 2024-05-08 to 2024-05-14 | X8.7 flare and the May 2024 geomagnetic superstorm |
| `oct2024-` | 2024-10-01 to 2024-10-10 | X9.0 flare and a 2,112 km/s CME |
| `sep2017-` | 2017-09-04 to 2017-09-11 | X9.3 and X8.2 flares and a strong SEP event |

FLR and SEP files are complete. CME files keep only the fields the game reads
(IDs, times, the analyses' speed, type, half-angle and link, and the model's
predicted impacts); every value kept is exactly as NASA returned it.
