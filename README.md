# NOLA – Space Trainer

**LEARN • EXPLORE • ACHIEVE**

An educational space-survival game for ages 10–16. Students learn how humans stay alive in space in the **NOLA Academy**, then run their own Mars base in **NOLA Mission**, with the robot companion **NOLA** helping along the way.

The central idea: **learning unlocks the game.** Each Academy module a student passes switches on one system of their base. Every day on the base is a trade-off, decided with real NASA data: real solar storms, real radio delays to Earth, and real astronaut-health research.

## 60-second demo script

**Before you start:** sign in with a demo account whose eight Academy modules are passed (or pass them; each takes a few minutes). Play the tutorial sol and one more sol, so the next sol (sol 3) brings a radiation storm. Have `/data-sources` open in a second tab.

| Time | Do this | Say this |
|---|---|---|
| 0:00 | **Mission Control** (the home page). | "NOLA teaches kids how astronauts stay alive. Every lesson they pass switches on a system of their space base." |
| 0:07 | **NOLA Academy** → open a module, scroll the six stages. | "Each lesson: NOLA introduces it, cards, a hands-on activity, a quiz and a mission challenge. Pass it, and the station gets a new room." |
| 0:14 | **NOLA Mission** → press **Map** → **Command Console** → **Use**. | "Each sol on Mars starts with a plan. Every plan gives something and costs something. No choice is free." |
| 0:20 | Press the **?** next to any resource on a card. | "Every resource has an explainer that reads aloud, with a real-science fact and a button to ask NOLA more." Close it, press **Choose this plan**, then **Go and do it**. |
| 0:27 | The **Radiation Storm** banner appears. Point at the date. | "This storm is based on a real solar event, pulled live from NASA's DONKI database. The countdown runs. Reinforce the shield with power and water, or shelter and lose science time?" Press **Shelter the crew**. |
| 0:36 | **Map** → **Antenna Console** → **Use**. | "Where's your base? The Moon is 1.3 light-seconds from Earth. Mars is 3 to 22 light-minutes away; today's value is calculated from where the planets really are. When something breaks, you can ask Mission Control and wait, while the leak keeps draining your water, or act on your training." |
| 0:45 | **Map** → the urgent job's machine → **Do the urgent job**, then **Command Console** → **End the sol**. | "End of the day: what your plan gave, what it cost, and how every store changed overnight. When crew health changes, an Astronaut Science card cites a real NASA study, here from NASA's Open Science Data Repository." |
| 0:54 | Switch to the **Data sources** tab. | "Every NASA dataset is listed, and every number is marked real or game value. At the end of a mission, the debrief scores survival and good reasoning, not just what's left in the tanks." |

If the storm has already passed, skip that row and show the storm text on the Data sources page instead.

## What is in the app

| Area | What it does |
|---|---|
| **Mission Control** | Dashboard: NOLA's greeting, the student's astronaut, training progress, and which station systems are online |
| **NOLA Academy** | Eight modules. Each lesson has six stages: NOLA Introduces, Learn, Explore (a hands-on activity), Knowledge Check (quiz), Mission Challenge, Unlock |
| **NOLA Mission** | A top-down 2D Mars base. A 30-sol mission: a plan each morning at the Command Console, urgent jobs at the machines, and a night that uses up air, water, food and power. Radiation storms from real NASA solar events, radio delays to Earth, crew muscles and rest, repair mini-games, a tutorial sol, a summary each evening and a debrief at the end |
| **Ask NOLA** | Chat with the companion. A calculator for space maths, answers from the lessons and a 541-entry space corpus, and an optional AI model behind a secure backend, limited to space topics |
| **Astronaut Profile** | Avatar editor, rank (Cadet to Commander), concept badges, achievements, learning history, accessibility settings, restart options |
| **Data sources** | Every NASA dataset used, and every game number marked real or simplified (open to everyone at `/data-sources`) |

### How lessons unlock the station

| Academy module | Station unlock |
|---|---|
| 1. Understanding Space | Station access (the game itself, plus the Medical Bay) |
| 2. Oxygen and Breathing | Oxygen Control |
| 3. Water and Recycling | Water Recycling |
| 4. Food and Agriculture | Hydroponics Lab |
| 5. Energy and Electricity | Power Bay (solar panels and batteries) |
| 6. Radiation Protection | Radiation Shelter, solar storms and real-event radiation storms |
| 7. Temperature and Life Support | Thermal Control |
| 8. Space Communication and Emergencies | Comms Room |

Modules open in order. A module is complete when its quiz is passed (4 of 5) and its mission challenge is solved. Until a system is unlocked, NOLA runs it on autopilot so it cannot hurt the crew.

## Real NASA data at a glance

| NASA source | Used for | How |
|---|---|---|
| **DONKI** (solar flares, CMEs, solar particle events) | Radiation Storm warnings with the real event's date and type | Live from `api.nasa.gov` (with `NASA_API_KEY`) or NASA's keyless DONKI-API 2.0; 84 recorded real events bundled for offline use |
| **DONKI** space-weather summary | The Radiation Monitor reading and how often station storms happen | Optional (`VITE_SPACE_DATA_SOURCE=nasa`); clearly labelled simulated data otherwise |
| **OSDR** (Open Science Data Repository) | Astronaut Science cards: muscle and bone, exercise, body clock, radiation (8 studies, each cited) | Checked live against OSDR's study search API; saved copy with citations as backup |
| **JPL** approximate planet positions | Today's real Earth–Mars radio delay (3–22 minutes each way) | Calculated in the browser; tested against NASA's recorded closest approaches |
| **BVAD**, Mars and Planetary Fact Sheets, Curiosity RAD, NASA-STD-3001 | Daily oxygen, water and food use, the length of a sol, the Mars radiation dose, the career radiation limit, the calculator | Built-in reference values, each with its source in `src/sol/config.ts` |

The **Data sources** page (`/data-sources`) lists every source with its exact API calls, and all 95 numbers in the Mars mission: 7 real NASA values and 88 game values, read straight from the config so the page can never drift from the game. Anything simulated is labelled "Simulated data (not real measurements)", and storms based on real events always say "Game mechanic, not a radiation forecast".

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

The server functions in `api/` also run under `npm run dev`. To use the AI chat locally, add `OPENROUTER_API_KEY=your-key` (or `GEMINI_API_KEY=your-key`) to `.env.local` and restart the dev server. Without a key, NOLA uses its built-in answers. NASA data needs no key (see `NASA_API_KEY` below).

**Checking the AI set-up:** open `/api/chat` in a browser (for example http://localhost:5173/api/chat, or the same path on your deployed site). It reports whether a key is set, whether the AI service accepts it and which model will be used. It never shows the key. Open `/api/chat?test=1` to also send one tiny real question and see the answer, the model, the time it took, or the service's exact error. The Ask NOLA page shows the app version at the bottom, so you can check the site is running the latest code.

### One-time Firebase console setup

1. **Authentication → Sign-in method →** enable **Email/Password**.
2. **Firestore Database → Create database** (production mode).
3. **Firestore Database → Rules →** paste the contents of [`firestore.rules`](firestore.rules) and click **Publish**.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload (also runs the `api/` functions) |
| `npm run build` | Type-check and build the production site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with [oxlint](https://oxc.rs) (TypeScript, React hooks, accessibility and test rules); any warning fails |
| `npm run typecheck` | Check TypeScript types only |
| `npm test` | Run the unit tests (Vitest) |

Before a pull request, run all three checks:

```bash
npm run lint && npm test && npm run build
```

Lint uses oxlint rather than ESLint because `typescript-eslint` does not support TypeScript 7 yet. The rules switched off, and why, are listed at the top of [`.oxlintrc.json`](.oxlintrc.json).

## Deploying to Vercel

Vercel hosts the website and runs the server functions in `api/`.

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
| `VITE_SPACE_DATA_SOURCE` | Real NASA data (optional) | Set to `nasa` to use NASA data for the space-weather summary; leave unset for simulated data |
| `NASA_API_KEY` | Real NASA data (optional) | Secret. Free from [api.nasa.gov](https://api.nasa.gov). Radiation storms try api.nasa.gov first with it, and work without it through NASA's keyless DONKI web service. The space-weather summary uses NASA's low-limit `DEMO_KEY` without it |

3. Deploy.
4. In **Firebase console → Authentication → Settings → Authorized domains**, add your Vercel domain.

Variables that start with `VITE_` are built into the website and are visible to anyone. The others stay on the server. Never put a secret in a `VITE_` variable.

After changing a variable in Vercel you must **redeploy**: existing deployments keep the old values.

## Performance

Measured on the production build in headless Chrome:

- **First load is small.** Every page except Mission Control and the sign-in pages is downloaded the first time it is visited. The app's own main file is 46 kB (it was 901 kB before the pages were split), and the login page downloads about 900 kB of JavaScript and CSS in total, most of it Firebase.
- **Libraries are cached separately.** Firebase (646 kB), React (256 kB) and Phaser (1.2 MB) are in their own files. They change much less often than the app's code, so after an update returning players download only the small app files again. Phaser loads only when the game is opened.
- **The game rests when it is hidden.** While a panel or menu covers the game, the Phaser loop sleeps and wakes when the panel closes. Main-thread work with a panel open fell from about 4.5 seconds to 0.15 seconds per 10 seconds.
- **The station's own code is light.** With the game running, the app's JavaScript uses about 5% of the main thread; the rest is the browser drawing the full-screen canvas, which a real device's graphics chip handles far more cheaply than the headless test.
- NASA and OSDR answers are cached on the server (30 minutes and 24 hours) and by Vercel's CDN, so a busy classroom does not send one request per student.

## How it is built

### Technology

- **React + TypeScript + Vite** – the website. TypeScript catches many mistakes before the code runs.
- **Tailwind CSS** – styling, with NOLA's colours and fonts defined once in `src/index.css`.
- **Phaser 3** – the 2D game. Downloaded only when the Mission page is opened.
- **Firebase Authentication + Cloud Firestore** – accounts and each student's data.
- **Vercel functions** – four small server programs: the AI chat, the NASA space-weather summary, real solar events for radiation storms, and the live check of the OSDR studies.
- **OpenRouter (free models) or Google Gemini** – the optional AI model behind NOLA's chat, called only from the server.
- **Vitest** – unit tests. **oxlint** – linting.
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
├── chat.ts               AI backend for Ask NOLA (server only)
├── astronaut-science.ts  Live check of the NASA OSDR studies behind the Astronaut Science cards
├── space-events.ts       Real solar events from NASA DONKI for radiation storms
└── space-weather.ts      NASA DONKI space-weather summary
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
│   ├── science/         Astronaut Science card
│   └── accessibility/   Settings and read-aloud
├── simulation/        The station engine: types, config, rules, missions
├── sol/               The sol engine: 7 resources, decisions, ledger, storms, crew body (one config file)
├── game/              Phaser scene, station map, GameBridge, simulation clock
│   ├── hud/             Resource bars, mission list, machine panels, mini-games, map
│   ├── sol/             Decision cards, sol flow, storm banner, tutorial, explainers
│   ├── comms/           Moon and Mars signal delay, Mission Control, training questions
│   └── progress/        Score, debrief, badges, ranks
├── data/              NASA data (DONKI, OSDR), saved copies, validation, Data sources list
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
users/{uid}/simulation/sol        the saved Mars mission (sols, decisions, ledger)
users/{uid}/simulation/record     earned concept badges, best score, missions completed
```

Achievements are worked out from these records each time, so they never disagree with the real record. Concept badges and the best score are also kept in `record`, so restarting the station does not take them away (restarting the whole course does). Chat messages are not saved.

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

## Ranks, badges, tutorial and debrief

- **Tutorial sol.** The first sol of every mission is guided by NOLA in five steps: walk to the Command Console, choose a plan, do the urgent job, end the sol, read the summary. The steps come from the saved game, so they pick up where the player left off. It can be skipped, and it ends when sol 1 ends (`src/game/sol/tutorial.ts`).
- **Ask NOLA explainers.** Every resource (and muscles & bones, and rest) has a "?" button: what it is, why it matters, how it works in the game, one real-science fact, a Listen button, and an "Ask NOLA" link that fills in a question on the chat page (`src/game/sol/explainers.ts`).
- **Sol-end summary.** Today's trade-off in one sentence ("You gave up 8 kWh of power and 1 kg of water to get more food."), what the plan gave and cost, how every store changed over the day and night (with up and down arrows and words), the Astronaut Science card, and a Listen button for the whole summary.
- **Final debrief** when the mission ends (`src/game/progress/record.ts`):
  - **Score out of 100.** Survival is worth 40 points, scaled by sols survived. Good reasoning is worth 60, the average of five habits: smart choices (spending from plenty, or topping up the lowest store, rebuilt from the ledger at the moment of each choice), protecting the crew before storms, crew care (nights without fatigue or weak muscles), follow-through on urgent jobs, and planning ahead (nights without a shortage). A habit with no chance to show it (for example, no storm happened) is not counted. Resources left over earn nothing directly.
  - **"Your biggest trade-off was…"**: the choice that cost the biggest share of the stores, with the real amounts.
  - **"What real mission planners do"**: three real practices, chosen to match the player's weakest habit and what happened in the mission.
- **Concept badges** need both halves: the concept **learned** in its Academy module and **used** in the game. Shield Keeper (shielding), Power Budgeter (power budgeting), Signal Delay Expert (comms delay), Storm Smart, Fit for Space (exercise and rest), Life Support Pro.
- **Ranks**, Cadet → Crew Member → Flight Engineer → Mission Specialist → Commander, from rank points: 1 per Academy module, 2 per badge, 5 for completing a mission. Commander also needs a completed mission scoring at least 60, so it takes good reasoning, not just time. Badges, best score and completed missions are saved at `users/{uid}/simulation/record`, so restarting the station keeps them; restarting the whole course clears them.
- **Read-aloud friendly.** Summaries, debrief, explainers and tutorial steps have Listen buttons with text written for speech (short sentences, amounts in words such as "8 kWh of power", no symbols a voice would stumble on; a test checks the explainers).
- **Colour-blind safe.** Good and bad are never shown by colour alone: arrows, ticks, locks, stars, the words LOW / up / down and numbers always go with them. The new "Colour-blind friendly colours" setting also swaps green and red for sky blue and amber (Okabe–Ito palette).

## Music and sound

| Where | Sound | File |
| --- | --- | --- |
| Lobby: sign-in pages, Mission Control and other pages | Lobby music (loops) | `public/audio/lobby.mp3` |
| NOLA Academy and lessons | Module music theme (loops) | `public/audio/module-theme.mp3` |
| Station game, 2D and 3D | Simulation 1, then Simulation 2, in turn | `public/audio/simulation-1.mp3`, `simulation-2.mp3` |
| While the astronaut walks | Footsteps | `public/audio/footsteps.mp3` |

The audio files were supplied by the project owner. They were levelled to about −18 LUFS with a −1.5 dB true-peak ceiling (the originals were mastered at −14 LUFS, a streaming level, with peaks at 0 dBFS), re-encoded at 128 kbps (music) and 96 kbps (footsteps), cutting the total from 11.5 MB to 4.4 MB. The footstep clip was trimmed to exactly nine steps so it loops in rhythm.

How it works (`src/features/audio/`):

- **Buses.** Music → duck bus → master, and footsteps → effects bus → master, built with Web Audio gain nodes. The settings sliders set bus gains only. Each slider is squared before use, so the change feels even along its travel, and 0 is true silence.
- **Music follows the page**, with a 1.2-second crossfade. A single track loops; the simulation tracks play one after the other. Switching between the 2D and 3D station keeps the same track playing.
- **Ducking.** While NOLA reads aloud, the music dips to 30% through the duck bus, so the player's music setting is never overwritten.
- **Footsteps** play while the astronaut walks: the 3D scene reports walking through `GameBridge`; in 2D (Phaser unchanged) the page watches the movement keys and joystick. Each pass of the loop plays at a slightly different speed, so the steps do not sound mechanical.
- **Browser rules.** Nothing plays until the first click, tap or key press. The sound pauses when the tab is hidden. Music that is turned to 0 or muted is not downloaded at all.
- **Settings.** Music volume, sound effects volume and "Mute all sound" are in the accessibility settings, saved with the account; a Sound on/off button sits on the station screen.

## Crew health and Astronaut Science (NASA OSDR)

The sol engine tracks the crew's body as two conditions, each 0–100%, shown in the HUD:

- **Muscles & bones** weaken by 2% every sol (weightlessness). Below 70%, the crew loses 3% health each night.
- **Rest** drops by 8% every sol (tiredness). Below 40%, the crew loses 3% health each night.

Two decisions look after them, and both cost something real:

- **Do a workout** (exercise session): costs 2 science points (time) and 3 kWh of power (treadmill and bike); +10% muscles & bones once the workout is done at the Med Station.
- **Have a rest day**: costs 2 science points (a day with no science) and an extra meal; +50% rest. Skipping the maintenance shift also gives +25% rest.

All of these numbers are game values in `SOL_CONFIG.body` and `DECISION_AMOUNTS`, labelled as such. Doing nothing for a whole mission now fails (the crew gets tired and weak); a crew that exercises and rests regularly gets through (both are tested).

**Astronaut Science cards.** When crew health changes, the end-of-sol summary shows a real finding that explains why: weak muscles → a muscle and bone study, tiredness → the body-clock study, radiation (including a storm that hits an unprotected crew) → a radiation study, a finished workout → an exercise study. Every card says **who was studied** (mice on the ISS, volunteers in bed-rest studies on Earth, astronaut data), quotes the study's own words, and cites it: authors, publication title and a link to the study on NASA OSDR.

| Topic | OSDR study | What it found (in the study's words) |
| --- | --- | --- |
| Muscles and bones | [OSD-342](https://osdr.nasa.gov/bio/repo/data/studies/OSD-342) | Mice lost significant muscle and bone mass in 33 days on the ISS |
| Muscles and bones | [OSD-417](https://osdr.nasa.gov/bio/repo/data/studies/OSD-417) | Bone loss in mice in flight, with gut microbe changes |
| Exercise | [OSD-942](https://osdr.nasa.gov/bio/repo/data/studies/OSD-942) | Exercise counteracted the loss of fitness, muscle and strength in NASA's 70-day bed-rest study |
| Exercise | [OSD-51](https://osdr.nasa.gov/bio/repo/data/studies/OSD-51) | Exercise cut muscle gene changes by 89% and 96% in a 60-day bed-rest study |
| Exercise | [OSD-540](https://osdr.nasa.gov/bio/repo/data/studies/OSD-540) | 10 days of leg unloading shrank and weakened the thigh; 21 days of strength exercise restored most of it |
| Body clock and rest | [OSD-343](https://osdr.nasa.gov/bio/repo/data/studies/OSD-343) | Spaceflight altered circadian rhythm pathways (59 astronauts, the Twins Study and flight samples) |
| Radiation | [OSD-479](https://osdr.nasa.gov/bio/repo/data/studies/OSD-479) | Simulated deep-space radiation impaired spatial learning in male mice, not females |
| Radiation | [OSD-984](https://osdr.nasa.gov/bio/repo/data/studies/OSD-984) | Long-term effects on muscle energy proteins 9 months after unloading plus low-dose radiation |

OSDR holds very little on sleep itself, so the "rest" card uses the body-clock finding and says plainly that the study looked at the body clock, not sleep.

**Where the data comes from.** The findings and full citations are in `src/data/astronautScience.json`, built from OSDR's public study search API (`https://osdr.nasa.gov/osdr/data/search?term=OSD-342&type=cgene&size=5`, no key). The recorded answers are kept in `src/data/__fixtures__/osdr/`, and a test checks every quote appears word for word in them. `api/astronaut-science.ts` checks the studies live (cached for a day): if a study's quoted sentences are still in its OSDR description, the card says "Checked live with NASA OSDR today"; otherwise, or offline, it shows the saved copy and says when it was recorded.

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

## NASA space-weather summary

By default, `MockSpaceDataProvider` supplies illustrative values for the Radiation Monitor, always labelled as simulated. (Radiation Storms, Astronaut Science and the Mars delay use real data regardless; see the sections above.)

Ready to switch on: `NasaDonkiProvider` reads real events from NASA's [DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) space-weather database through `api/space-weather.ts`: the strongest recent solar flare, the highest Kp index and the number of solar particle events over the past seven days. Set `VITE_SPACE_DATA_SOURCE=nasa` to use it. If NASA cannot be reached or returns something unexpected, the app falls back to simulated data and says so.

- **Real:** the NOAA R scale (from flare X-ray class) and G scale (from Kp) used in `spaceWeatherModel.ts`.
- **Ours:** how those scales change the game. More solar activity makes storms more frequent and stronger. This is a game mechanic, not a radiation forecast.
- **Not provided by NASA, and not invented:** food, water, oxygen or battery levels. Those come only from the simulation.

**Status:** this summary adapter is covered by unit tests using sample responses in DONKI's documented format, but has not been run against the live service. (The radiation-storm route has: it was checked live against DONKI-API 2.0.) Check it once on your deployment before relying on it.

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

**Status:** the request checks, the sign-in check, the off-topic handling and every fallback path are unit-tested against simulated Gemini and OpenRouter responses. The OpenRouter path has been run live with a free-tier key. The Gemini path has not, so test it once with `/api/chat?test=1` after adding `GEMINI_API_KEY`.

## Accessibility

- Text size (three steps), high contrast, an easy-reading font (Lexend) and reduced motion. Settings work before login and follow the account across devices.
- Read-aloud "Listen" buttons on NOLA's speech, lesson cards and chat replies, with speed and volume.
- Everything NOLA says is shown as text, so nothing depends on sound. Music and footsteps are extras: they can be turned down or muted, and nothing in the game needs them.
- Full keyboard use: a skip link, visible focus, real buttons and radio controls, dialogs that trap focus and close with Escape.
- The game can be played without steering: the Map lists every machine and takes the astronaut straight to it.
- Everything in the game canvas is also described in ordinary page content: current room, nearby machine, mission tasks, resources and warnings.
- Repair mini-games have no time limit, except the alignment game, which becomes a no-rush dial when reduced motion is on.
- Status is never shown by colour alone: there is always a word or an icon as well ("LOW", "Locked", up and down arrows, ticks and locks). A **Colour-blind friendly colours** setting also swaps green and red for blue and amber.
- Lint includes the `jsx-a11y` accessibility rules.

Not yet done: testing with real screen-reader users and on a range of real phones.

## Privacy

The app stores a nickname (the sign-up form asks students not to use their real name), avatar choices, settings, lesson progress and the saved game. The login email is held by Firebase Authentication. Chat messages are not stored by the app; when the AI is on they are sent to the AI provider to be answered.

If this goes beyond a hackathon demo to real children, get proper advice on children's privacy law (for example COPPA and GDPR) and parental consent first.

## Testing

`npm test` runs the unit tests (235 at the time of writing), which cover:

- The simulation engine: every resource rule, missions, faults, storms, failure and recovery, save and load, and a long randomised run checking all values stay in range.
- The Lesson Unlock Manager and the Academy progress rules.
- All eight lessons' content (well-formed, exactly one right answer per question, every slider activity starts unsolved and can be solved).
- The knowledge search and NOLA's built-in replies, including the personal-information guard.
- Space data validation, the NOAA scale thresholds, the NASA conversion and the fallback to simulated data.
- Music and sound: the right music for each page, the simulation playlist, the slider curve, the sound settings, and that every audio file exists.
- Ranks, badges, score and debrief (rewarding reasoning over leftovers, storm readiness, follow-through, the biggest trade-off wording), the tutorial steps, the explainers' read-aloud wording, and the saved record.
- Crew health and Astronaut Science: exercise and rest costs, nightly body wear, the OSDR route on recorded data, quotes matching the studies, citations, the offline fallback, and which finding explains each health change.
- Earth communication: Mars distances against NASA's recorded closest approaches, the Moon delay, how the wait is sped up, replies blocked by a broken antenna, training mistakes, and the training questions.
- The DONKI events route on real recorded NASA data (which events count, host order with and without a key, caching, the 502 answer), the offline archive, and the radiation storm rules (costs, harm, one storm at a time, old saves).
- The AI backend's request checks and sign-in check.
- The station map (every machine reachable, locked doors block).
- The Data sources page: every sol-engine number is listed and labelled, every NASA URL the server code fetches is named, and every file it points to exists.

## Adding content

- **A lesson:** copy a file in `src/features/academy/content/`, register it in `content/index.ts`, and add the module to `curriculum.ts`.
- **A mission:** add an entry to `src/simulation/missions.ts`. Task ids match engine actions (see `completeTask` calls in `engine.ts`).
- **A machine:** add it to `EQUIPMENT` in `src/game/stationMap.ts` and give it a panel in `src/game/hud/EquipmentPanel.tsx`.
- **Game balance:** change numbers in `src/simulation/config.ts`, then run the tests.
