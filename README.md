# NOLA – Space Trainer

**LEARN • EXPLORE • ACHIEVE**

An educational space-survival platform for ages 10–16. Students learn how humans stay alive in space in the **NOLA Academy**, then put each lesson to work running their own space station in **NOLA Mission**, with the robot companion **NOLA** helping along the way.

The central idea: **learning unlocks the game.** Each Academy module a student passes switches on one system of their station.

## What is in the app

| Area | What it does |
|---|---|
| **Mission Control** | Dashboard: NOLA's greeting, the student's astronaut, training progress, and which station systems are online |
| **NOLA Academy** | Eight modules. Each lesson has six stages: NOLA Introduces, Learn, Explore (a hands-on activity), Knowledge Check (quiz), Mission Challenge, Unlock |
| **NOLA Mission** | A top-down 2D space station to walk around. Nine rooms, twelve machines, eight missions, repair mini-games, solar storms, and food, water, oxygen and energy to manage |
| **Ask NOLA** | Chat with the companion. Answers come from the lesson content, with an optional AI model behind a secure backend |
| **Astronaut Profile** | Avatar editor, achievements, learning history, accessibility settings, restart options |

### How lessons unlock the station

| Academy module | Station unlock |
|---|---|
| 1. Understanding Space | Station access (the game itself, plus the Medical Bay) |
| 2. Oxygen and Breathing | Oxygen Control |
| 3. Water and Recycling | Water Recycling |
| 4. Food and Agriculture | Hydroponics Lab |
| 5. Energy and Electricity | Power Bay (solar panels and batteries) |
| 6. Radiation Protection | Radiation Shelter and solar storms |
| 7. Temperature and Life Support | Thermal Control |
| 8. Space Communication and Emergencies | Comms Room |

Modules open in order. A module is complete when its quiz is passed (4 of 5) and its mission challenge is solved. Until a system is unlocked, NOLA runs it on autopilot so it cannot hurt the crew.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill `.env.local` with the values from **Firebase console → Project settings → Your apps → Web app**, then:

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173).

The two server functions in `api/` also run under `npm run dev`. To use the AI chat locally, add `OPENROUTER_API_KEY=your-key` (or `GEMINI_API_KEY=your-key`) to `.env.local` and restart the dev server. Without a key, NOLA uses its built-in answers.

**Checking the AI set-up:** open `/api/chat?test=1` to also send the AI one tiny real question and see the answer, the model, the time it took, or the service's exact error. Open `/api/chat` in a browser (for example http://localhost:5173/api/chat, or the same path on your deployed site). It reports whether the key is set, whether Google accepts it and which model will be used. It never shows the key. The Ask NOLA page shows the app version at the bottom, so you can check the site is running the latest code. The page also shows a line under the chat saying whether the AI is connected and, if not, why.

### One-time Firebase console setup

1. **Authentication → Sign-in method →** enable **Email/Password**.
2. **Firestore Database → Create database** (production mode).
3. **Firestore Database → Rules →** paste the contents of [`firestore.rules`](firestore.rules) and click **Publish**.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run build` | Type-check and build the production site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Check TypeScript types only |
| `npm test` | Run the unit tests |

## Deploying to Vercel

Vercel hosts the website and runs the two small server functions in `api/`.

1. Push this repository to GitHub and import it at [vercel.com/new](https://vercel.com/new). Vercel detects Vite automatically.
2. Under **Settings → Environment Variables**, add:

| Variable | Needed for | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` and the other five `VITE_FIREBASE_*` values | The app | Same values as `.env.local` |
| `FIREBASE_PROJECT_ID` | AI chat (optional) | Only needed if it differs from `VITE_FIREBASE_PROJECT_ID`, which is used by default |
| `OPENROUTER_API_KEY` | AI chat | Secret. Create one at [openrouter.ai/keys](https://openrouter.ai/keys). NOLA then uses OpenRouter's **free** models only. Takes priority over a Gemini key |
| `OPENROUTER_MODEL` | AI chat (optional) | One free model id, or several separated by commas, to try first. Otherwise a few quiet free models are tried in turn (see `api/chat.ts`), and if those are gone the server picks quiet free models from OpenRouter's current list |
| `GEMINI_API_KEY` | AI chat (alternative) | Secret, from [Google AI Studio](https://aistudio.google.com/apikey). Used only when no OpenRouter key is set |
| `AI_MODEL` | AI chat (optional) | A Gemini model name to try first when using Gemini |
| `VITE_SPACE_DATA_SOURCE` | Real NASA data (optional) | Set to `nasa` to use NASA data; leave unset for simulated data |
| `NASA_API_KEY` | Real NASA data (optional) | Secret. Free from [api.nasa.gov](https://api.nasa.gov). Radiation storms try api.nasa.gov first with it, and work without it through NASA's keyless DONKI web service. The space-weather summary uses NASA's low-limit `DEMO_KEY` without it |

3. Deploy.
4. In **Firebase console → Authentication → Settings → Authorized domains**, add your Vercel domain.

Variables that start with `VITE_` are built into the website and are visible to anyone. The others stay on the server. Never put a secret in a `VITE_` variable.

After changing a variable in Vercel you must **redeploy**: existing deployments keep the old values.

## How it is built

### Technology

- **React + TypeScript + Vite** – the website. TypeScript catches many mistakes before the code runs.
- **Tailwind CSS** – styling, with NOLA's colours and fonts defined once in `src/index.css`.
- **Phaser 3** – the 2D game. Downloaded only when the Mission page is opened.
- **Firebase Authentication + Cloud Firestore** – accounts and each student's data.
- **Vercel functions** – two small server programs: the AI chat and the NASA data fetch.
- **OpenRouter (free models) or Google Gemini** – the optional AI model behind NOLA's chat, called only from the server.
- **Vitest** – unit tests.
- **Self-hosted fonts** (Fredoka, Nunito, Lexend) and the **browser's own speech voice** for read-aloud, so a children's app sends nothing to font or speech services.

### The four parts that are kept apart

```
            ┌────────────────────────────── React (website, HUD, panels) ─────────────────────────────┐
            │                                                                                          │
 Academy ──▶ Lesson Unlock Manager ──▶ unlocked systems ──┐                                            │
 progress                                                 ▼                                            │
                                              ┌──────────────────────┐   state    ┌───────────────┐   │
 Space data provider ──▶ validation ──▶ model │  Simulation engine   │──────────▶ │  GameBridge   │──▶ Phaser (draws,
 (mock or NASA)                        inputs │  (pure TypeScript)   │◀────────── │               │◀── moves the astronaut)
                                              └──────────────────────┘  actions   └───────────────┘
                                                         │ read-only summary
                                                         ▼
                                   Ask NOLA: knowledge search ──▶ built-in answer, or AI backend (text only)
```

1. **Simulation engine** (`src/simulation/`). Plain TypeScript with no screen code. It holds the station's state and the rules. The same inputs always give the same result, which is why it can be unit-tested and saved to the database as-is. Every balance number lives in `config.ts`.
2. **The game** (`src/game/`). Phaser draws the station and moves the astronaut. It never calculates anything about the simulation. React and Phaser talk only through `GameBridge`.
3. **Space data** (`src/data/`). Providers fetch data, `validation.ts` checks it, and `spaceWeatherModel.ts` converts it into two game inputs (how often solar storms start and how strong they are). The engine never sees raw data.
4. **The companion** (`src/features/companion/` and `api/chat.ts`). It can read a summary of the student's situation and it can write text. It has no way to change the station: the AI is given no tools, and the chat code has no connection to the engine's actions.

### Lesson Unlock Manager

`src/features/unlocks/unlockManager.ts` answers "which systems has this student earned?" purely from the curriculum table in `src/features/academy/curriculum.ts`. Rooms, missions and machines each name the system they need. To add a lesson with a new unlock: add the module to the curriculum, add its lesson file to `src/features/academy/content/`, and give a room or mission its `system` id. No unlock logic needs editing.

### Project structure

```
api/
├── chat.ts            AI backend for Ask NOLA (server only)
├── space-events.ts    Real solar events from NASA DONKI for radiation storms (server only)
└── space-weather.ts   NASA DONKI fetch and conversion (server only)
src/
├── app/               Route map, page frame, route guards
├── pages/             One file per page
├── components/        Shared UI (Button, TextField, OptionGroup, dialogs, Logo)
├── features/
│   ├── auth/            Sign-in state, forms, validation
│   ├── academy/         Curriculum, progress rules, achievements
│   │   ├── content/       One lesson file per module
│   │   └── lesson/        The six-stage lesson player
│   ├── unlocks/         Lesson Unlock Manager
│   ├── companion/       NOLA mascot, knowledge search, built-in replies, chat service
│   ├── profile/         Avatar and progress panels
│   └── accessibility/   Settings and read-aloud
├── simulation/        The engine: types, config, rules, missions
├── game/              Phaser scene, station map, GameBridge, simulation clock
│   └── hud/             Resource bars, mission list, machine panels, mini-games, map
├── data/              Space data providers, validation, space-weather model
├── services/          Firebase start-up and Firestore repositories
└── types/
firestore.rules        Database access rules
docs/reference/        Design reference artwork (not shipped)
```

### Each student's data

```
users/{uid}                       profile: nickname, avatar, accessibility settings
users/{uid}/academy/{moduleId}    lesson stage, quiz scores, attempts, completion
users/{uid}/simulation/current    the saved station game
```

Achievements are worked out from these records each time, not stored separately, so a badge can never disagree with the real record. Chat messages are not saved.

## Science and honesty

- **Lesson content** uses established facts in simple language. Cards label claims as **Used today**, **Being researched** or **Future idea**.
- **Explore activities** each carry a note saying how the model is simplified. Two use real physics exactly: solar panel output against tilt (cosine law) and radio signal delay (distance ÷ speed of light).
- **The station game** copies how real systems depend on each other, but its numbers are game values, resources are shown as percentages, and time is sped up (a station day takes about 12 minutes). Machine panels label each note **Real science** or **Game simplification**. "Radiation level" is a game variable, not a real unit.
- **Space weather** shown in the game is labelled with its source. Simulated data always says "Simulated data (not real measurements)".

## Sol engine

`src/sol/` is a turn-based game-state engine with no screen code. The station game uses it for the daily plan (decision cards at the Command Console, urgent jobs at machines) and for radiation storms.

- **Seven resources:** oxygen (kg), water (kg), food (kg), power (kWh), shielding (%), crew health (%) and research points.
- **Each sol has three phases:** a decision phase (up to 2 decisions), an action phase played in the 3D game (which reports which tasks succeeded), and an automatic night (power, life support, food, radiation, recovery).
- **No decision is free.** Every decision costs at least one resource other than the ones it gives, and `validateDecision` enforces this; the engine refuses to start if any decision breaks the rule. Some costs land tonight, such as a cold night after diverting heating power to the shield.
- **Ledger.** Every change to every resource is recorded with what it gave and what it cost, including automatic night effects. The ledger always adds up to the current totals, which the tests check over a 24-sol mission.
- **One config file.** Every number is in `src/sol/config.ts`, labelled `NASA_BASED` (with its source, for example oxygen use from NASA's BVAD or the surface dose measured by Curiosity) or `SIMPLIFIED` (a game value).

Run its tests with `npx vitest run src/sol`.

## Talking to Earth: the signal delay

At the **Antenna Console** (or the first time a problem needs help) the player chooses where the base is:

- **Moon Base:** 1.3 seconds each way (384,400 km ÷ the speed of light).
- **Mars Base:** today's real value, between about 3 and 22 minutes each way. It is calculated from where Earth and Mars are in their orbits, using JPL's published formulas for approximate planet positions (`src/game/comms/delay.ts`). Tests check it against NASA's recorded closest approaches (55.76 million km on 27 Aug 2003, and others) and that it stays within 3–22.3 minutes every day from 2000 to 2050.

When a machine breaks, its panel offers two choices:

- **Ask Mission Control.** The panel shows the real one-way delay, the real time until the reply (there and back), and how long the wait takes in the game. The countdown in the HUD shows the **real** delay ticking down, and what the problem has drained so far ("Lost while waiting: water −1.3%"). When the reply arrives, Mission Control's advice is highlighted.
- **Act now on your training.** A question from the matching Academy module, with no waiting. A wrong step wastes 5% of the store it affects (a game value) and explains why it was wrong.

If the antenna is broken, nobody can hear the crew, so they must use their training (and replies already on their way wait until it is fixed).

**What is real and what is sped up.** The delays shown are always the real numbers. Only the wait is sped up: it runs on the station clock (one real minute of delay passes in one station minute, half a real second), so a 22-minute Mars round trip takes 11 seconds of play, 120× faster than real life. Very short delays, like the Moon's 2.6-second round trip, play in real time so the player still sees them. The station keeps running during the wait, so the problem keeps draining the station.

## Radiation storms from real solar events

Every third sol (once the Radiation Protection module is passed) a **Radiation Storm** warning appears during the day, based on a **real** solar event from NASA's DONKI database. The banner shows the event's real date and type ("Based on a real solar event from 17 October 2026: a coronal mass ejection…"), whether it came from live or saved NASA data, a link to the event on NASA's site, and the label "Game mechanic, not a radiation forecast". A countdown runs on the station clock (about 2 real minutes, paused with the game). The player chooses:

- **Reinforce shielding:** costs power and water (water is a good radiation shield). The crew still takes a little harm.
- **Shelter the crew:** costs research time. The crew is safe.
- **Do nothing:** the crew loses health when the storm arrives.

Costs and harm grow with the storm's severity. All the numbers are in `SOL_CONFIG.storm` and labelled as game values. Each real event is used only once; the strongest unused event is picked first.

**Where the events come from.** `api/space-events.ts` fetches solar flares (`FLR`), coronal mass ejections (`CME`) and solar energetic particle events (`SEP`) for the last 30 days, checked against DONKI's [OpenAPI document](https://ccmc.gsfc.nasa.gov/DONKI/api/openapi/):

1. `https://api.nasa.gov/DONKI/{FLR,CME,SEP}?startDate=…&endDate=…&api_key=…`, if `NASA_API_KEY` is set (the key never leaves the server);
2. `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,SEP}?startDate=…&endDate=…` (DONKI-API 2.0, NASA's official web service, no key; CMEs with `mostAccurateOnly=true`);
3. the last good answer in the server's memory (fresh for 30 minutes, used for up to 24 hours if NASA is down). Vercel's CDN also caches the answer for 30 minutes.

If all of that fails, the app uses `src/data/spaceEventsArchive.ts`: 84 real past events (September 2017, May 2024, October 2024) recorded from DONKI and kept in `src/data/__fixtures__/donki/`. A test checks the archive matches those recordings exactly, so the game always has real events, even offline.

**Which events count (game rules, in `EVENT_RULES`):** flares of class M5 and above (X1+ severe, X10+ extreme, following the NOAA R scale); CMEs DONKI types as O, R or ER (1,000 km/s and faster), using the analysis DONKI marks as most accurate; every SEP event (extreme). Entries that cannot be read are skipped, never guessed.

**Status:** the DONKI-API 2.0 path was checked live (real events arrived in the game). The api.nasa.gov path is covered by tests but was not run live, because no NASA key was available while building; NASA's shared `DEMO_KEY` was rate-limited.

The station game's own random storms (from the space-weather summary) still exist separately for now.

## NASA data

Phase 1 (now): `MockSpaceDataProvider` supplies illustrative values, always labelled as simulated.

Phase 2 (ready to switch on): `NasaDonkiProvider` reads real events from NASA's [DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) space-weather database through `api/space-weather.ts`: the strongest recent solar flare, the highest Kp index and the number of solar particle events over the past seven days. Set `VITE_SPACE_DATA_SOURCE=nasa` to use it. If NASA cannot be reached or returns something unexpected, the app falls back to simulated data and says so.

- **Real:** the NOAA R scale (from flare X-ray class) and G scale (from Kp) used in `spaceWeatherModel.ts`.
- **Ours:** how those scales change the game. More solar activity makes storms more frequent and stronger. This is a game mechanic, not a radiation forecast.
- **Not provided by NASA, and not invented:** food, water, oxygen or battery levels. Those come only from the simulation.

**Status:** the NASA adapter is covered by unit tests using sample responses in DONKI's documented format. It has not been run against the live NASA service, because the build environment could not reach it. Check it once on your deployment before relying on it.

To add another dataset during the hackathon: write a provider that returns `EnvironmentalData` (extend that type if you need new fields), validate it, and extend `summarizeSpaceWeather` to turn the new measurements into engine inputs.

## Ask NOLA and the AI

**Calculator.** Maths questions are answered exactly by NOLA's own calculator (`calculator.ts`) before anything else, and are never sent to the AI, which can get arithmetic wrong. It shows its working and handles plain sums ("what is 12 × 7"), crew supplies from NASA values ("how much oxygen do 4 astronauts need for 30 days"), light and message delay, weight and age on other planets, travel times and sols. It uses a small strict parser, never `eval`.

Every other question goes through the same steps:

1. **Search.** `knowledge.ts` finds the most relevant passages in NOLA's knowledge base: the Academy's lesson cards, NOLA's space notes (`spaceFacts.ts`), help about the app, and a 541-entry space general-knowledge corpus (`src/features/companion/corpus/space-gk.json`). Hand-written, child-friendly passages are preferred when they fit as well as a corpus entry. This is the retrieval step of RAG (retrieval-augmented generation). It is a keyword search that runs in the browser.
2. **Answer.** If the AI backend is available, the question, the passages and a short situation summary are sent to `api/chat.ts`, which asks the AI model to answer using that material. Otherwise NOLA replies with the best passage directly.
3. **Cite.** Replies link to the lesson they came from. AI replies are labelled "AI answer".

Safety measures:

- The AI key exists only on the server. The browser never sees it.
- Only signed-in students can use the AI; the server verifies their Firebase login.
- NOLA's rules (age-appropriate, never ask for personal details) are fixed on the server.
- **Space only.** NOLA answers questions about space, NASA, the Academy modules and this app. Anything else gets one fixed reply asking for a space question. The model signals an off-topic question with a marker word and the server substitutes the fixed reply, so the wording is always the same.
- With Gemini, Google's safety filters are set to their strictest level. OpenRouter's free models have no equivalent setting, so with OpenRouter the protection is NOLA's server-side rules, the space-only marker and the size limits.
- **Free models only, and not the busiest ones.** With OpenRouter, NOLA uses only models marked free, and avoids the big-brand free models and OpenRouter's own free router, which are heavily used and often rate-limited. Free models come and go; if the listed ones disappear, the server picks quiet free models from OpenRouter's live list.
- **OpenRouter privacy setting.** Many free models are only available if your OpenRouter account allows providers that may store or train on prompts (openrouter.ai/settings/privacy). If that is off, the chat shows a message saying so. For a children's app, weigh this: NOLA never sends messages that look like personal details, but questions themselves are sent.
- The AI has no tools. It can only return text.
- Messages that look like personal details, and questions about the student's own station ("what should I do next?"), are answered by the built-in brain and never sent to the AI.
- Size limits on every field, and a per-student rate limit.
- If the AI is off, slow, fails or declines, the built-in answer is used.

Known limits: the rate limit is kept in server memory, so it is a first defence, not a guarantee; set a quota or budget on the key in your Google account. The lesson passages are chosen in the browser and sent with the question; a student who tampers with them can only affect their own answer. Moving the search to the server with a vector database is the natural upgrade if the knowledge base grows beyond the lessons.

**Status:** the request checks, the sign-in check, the request sent to Gemini, the off-topic handling and every fallback path are unit-tested against simulated Gemini and OpenRouter responses. The call to the real Gemini service has not been run, because no API key was available during the build. Test it once after adding `GEMINI_API_KEY`.

## Accessibility

- Text size (three steps), high contrast, an easy-reading font (Lexend) and reduced motion. Settings work before login and follow the account across devices.
- Read-aloud "Listen" buttons on NOLA's speech, lesson cards and chat replies, with speed and volume.
- Everything NOLA says is shown as text, so nothing depends on sound. The game has no audio.
- Full keyboard use: a skip link, visible focus, real buttons and radio controls, dialogs that trap focus and close with Escape.
- The game can be played without steering: the Map lists every machine and takes the astronaut straight to it.
- Everything in the game canvas is also described in ordinary page content: current room, nearby machine, mission tasks, resources and warnings.
- Repair mini-games have no time limit, except the alignment game, which becomes a no-rush dial when reduced motion is on.
- Status is never shown by colour alone: there is always a word or an icon as well ("LOW", "Locked", ticks and crosses).

Not yet done: testing with real screen-reader users and on a range of real phones.

## Privacy

The app stores a nickname (the sign-up form asks students not to use their real name), avatar choices, settings, lesson progress and the saved game. The login email is held by Firebase Authentication. Chat messages are not stored by the app; when the AI is on they are sent to the AI provider to be answered.

If this goes beyond a hackathon demo to real children, get proper advice on children's privacy law (for example COPPA and GDPR) and parental consent first.

## Testing

`npm test` runs the unit tests, which cover:

- The simulation engine: every resource rule, missions, faults, storms, failure and recovery, save and load, and a long randomised run checking all values stay in range.
- The Lesson Unlock Manager and the Academy progress rules.
- All eight lessons' content (well-formed, exactly one right answer per question, every slider activity starts unsolved and can be solved).
- The knowledge search and NOLA's built-in replies, including the personal-information guard.
- Space data validation, the NOAA scale thresholds, the NASA conversion and the fallback to simulated data.
- Earth communication: Mars distances against NASA's recorded closest approaches, the Moon delay, how the wait is sped up, replies blocked by a broken antenna, training mistakes, and the training questions.
- The DONKI events route on real recorded NASA data (which events count, host order with and without a key, caching, the 502 answer), the offline archive, and the radiation storm rules (costs, harm, one storm at a time, old saves).
- The AI backend's request checks and sign-in check.
- The station map (every machine reachable, locked doors block).

## Adding content

- **A lesson:** copy a file in `src/features/academy/content/`, register it in `content/index.ts`, and add the module to `curriculum.ts`.
- **A mission:** add an entry to `src/simulation/missions.ts`. Task ids match engine actions (see `completeTask` calls in `engine.ts`).
- **A machine:** add it to `EQUIPMENT` in `src/game/stationMap.ts` and give it a panel in `src/game/hud/EquipmentPanel.tsx`.
- **Game balance:** change numbers in `src/simulation/config.ts`, then run the tests.
