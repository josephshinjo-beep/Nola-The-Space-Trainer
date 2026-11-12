# NOLA – Space Trainer

**LEARN • EXPLORE • ACHIEVE**

An educational space-survival platform for ages 10–16: interactive lessons (NOLA Academy), a top-down space-station simulation (NOLA Mission) and a friendly robot companion (NOLA).

## Current status: Milestone 1 – Foundation

| Works now | Not built yet |
|---|---|
| Sign up, log in, log out, password reset (Firebase Authentication) | Lessons and quizzes (Milestone 3) |
| Sessions remembered between visits; protected pages | The station game (Milestones 4–5) |
| A private profile per student in Cloud Firestore | NOLA chat and AI (Milestone 6) |
| App layout and navigation for desktop and mobile | NASA data (Milestone 7) |
| Firestore security rules | Avatar, accessibility settings (Milestone 2) |

Pages for unbuilt modules say plainly that they are under construction.

The NOLA robot drawing is a stand-in based on the written brief. It will be redrawn from the official reference image (`src/features/companion/NolaMascot.tsx` is the only file that changes).

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

### One-time Firebase console setup

1. **Authentication → Sign-in method →** enable **Email/Password**.
2. **Firestore Database → Create database** (production mode).
3. **Firestore Database → Rules →** paste the contents of [`firestore.rules`](firestore.rules) and click **Publish**.
   (Or, with the Firebase CLI: `firebase deploy --only firestore:rules --project <your-project-id>`.)

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run build` | Type-check and build the production site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Check TypeScript types only |
| `npm test` | Run unit tests |

## Technology choices

- **React + TypeScript + Vite** – the website. TypeScript catches many mistakes before the code runs; Vite gives instant reloads.
- **Tailwind CSS** – styling, with NOLA's colours and fonts defined once in `src/index.css`.
- **React Router** – page navigation and protected routes.
- **Firebase Authentication + Cloud Firestore** – accounts and per-student data, with no server of our own to run.
- **Self-hosted fonts** (Fredoka, Nunito) – no requests to third-party font servers from a children's app.
- **Vitest** – unit tests.
- **Phaser 3** (from Milestone 4) – the 2D game. It will be loaded only on the Mission page.

## Project structure

```
src/
├── app/            Route map, page frame (navigation), route guards
├── pages/          Top-level pages
├── components/     Reusable UI pieces (Button, TextField, Logo)
├── features/
│   ├── auth/       Sign-in state, forms, validation, friendly error messages
│   └── companion/  NOLA mascot and speech bubble
├── services/       Firebase start-up and Firestore access (repositories)
└── types/          Shared TypeScript types
firestore.rules     Who may read and write what in the database
```

Folders for lessons, the simulation engine, the game and space data are added in their milestones.

## How data is protected

- Every student's data lives under `users/{their user id}` in Firestore.
- `firestore.rules` lets a signed-in student read and write only their own folder; everything else is denied.
- The Firebase values in `.env.local` identify the project and are safe in a browser. They are not passwords. The rules above are what protect the data.
- Secret keys (Firebase Admin, AI API keys) must never go in this frontend. They will live in a backend added in Milestone 6.
- The app stores only a nickname; the login email is held by Firebase Authentication.

## Deploying to Vercel

Import the repository in Vercel, add the six `VITE_FIREBASE_*` variables under **Settings → Environment Variables**, and deploy. Then add your Vercel domain under **Firebase console → Authentication → Settings → Authorized domains**.
