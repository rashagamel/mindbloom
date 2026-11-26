# MindBloom

A small bilingual (Arabic/English) learning app for children aged 3 to 6. It teaches letters and
counting through short games, and adapts the practice to each child's mistakes. It supports learning
and progress monitoring only. It does not diagnose anything.

## What it does

- Question types, picked per skill: **sound match** (hear a letter, pick it), **missing letter**
  (complete a word), **count** (count objects, pick the numeral) and **tracing** (draw the letter or
  numeral with a finger; the app scores how much of it was covered and how much of the line stayed
  on it, see `lib/trace.js`).
- **Memory game** (`/memory/...`): match a letter with a picture of a word that starts with it, or a
  numeral with that many objects. Wrong matches are logged as mix-ups, like any other answer.
- **Songs, stories and dialogues** (`/library`): short pages with a picture, the text read aloud,
  and next/back buttons. Completing one earns stars.
- **Adaptive engine** (`lib/engine.js`): Bayesian Knowledge Tracing estimates how well the child
  knows each item; a decaying confusion table records which wrong answer was chosen for which
  target; the next question favours weak items and re-offers the look-alike the child keeps
  choosing. More letters unlock as mastery grows, and the number of choices grows with mastery.
- **Parent area** (`/parent`, behind a small adult maths question): mastery, accuracy, repeated
  mix-ups, practice suggestions, JSON export, and erase-all.
- English and Arabic interface, with right-to-left layout.
- No account, no server, no tracking. Progress is stored in the browser (`localStorage`).

## Nothing is hard-coded: change these files, not the code

| File | What it controls |
| --- | --- |
| `data/content.json` | Every domain, letter/number, spoken text, look-alike group and example word. Add a letter, a word or a whole new domain here. |
| `data/config.json` | Questions per session, BKT parameters, unlock rules, number of choices, confusion decay and flag threshold, thresholds, stars, adult-gate range. |
| `data/strings.json` | All interface text. Add a language by copying the `en` block. |
| `data/library.json` | Every song, story, dialogue or video. Text items have `lines`; a video item has a `youtube` field (a video id or any YouTube link) and an optional `credit`. |

Recorded audio: add `"audio": "/audio/b.mp3"` to any item (or `{ "en": ..., "ar": ... }`) and put
the file in `public/audio/`. Without it the browser's built-in voice is used. Arabic voices differ
by device, so record the core letters for the evaluation.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # simulates a child who mixes up b and d and checks the engine reacts
npm run build
```

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New, Project**, import the repository, and keep the defaults
   (framework: Next.js). No environment variables are needed.
3. Deploy. Every push to the main branch redeploys.

Or from the command line: `npx vercel` then `npx vercel --prod`.

## Optional next steps (not required for the first version)

- Tracing quality: the scorer is deliberately generous. Have a teacher try it with children and
  adjust `tracing` in `data/config.json`.
- A shared database (for example Supabase) so a teacher can see several children. This needs
  parental consent flows and ethics approval before collecting any data.
- Speech recognition for pronunciation, only after testing on consented recordings of children.

## Adding YouTube videos

Copy the `video-abc-phonics` entry in `data/library.json` and paste any YouTube link into
`youtube`. Videos load through `youtube-nocookie.com` and only after the child presses play.
Before adding one, open it and check three things: the channel is the official one, the content is
suitable for ages 3 to 6, and embedding is allowed (if not, the player shows an error). The lyrics
of copyrighted songs are not copied into the app on purpose; the video is the source.

Candidates found by search but **not yet checked** (channel and embedding unverified):

| Language | Title as listed | Link |
| --- | --- | --- |
| Arabic | الحروف الهجائية أغنية للأطفال | https://www.youtube.com/watch?v=DeZfxkHYvVI |
| Arabic | أنشودة الحروف العربية | https://www.youtube.com/watch?v=Tx_yoMRDDqc |
| Arabic | أغنية الحروف الهجائية العربية | https://www.youtube.com/watch?v=ul7EboaendE |
| Arabic | تعلم الحروف العربية للأطفال أ ب ت ث | https://www.youtube.com/watch?v=RiBZ2Axr8AY |
| English | Phonics Alphabet Song (Lowercase) | https://www.youtube.com/watch?v=Wvns1A5hmOs |
| English | Top 10 Counting Songs, Learn To Count (Super Simple Songs) | https://www.youtube.com/watch?v=7D4K9oi7oBM |
| English | Wheels on the Bus (CoComelon) | https://www.youtube.com/watch?v=e_04ZrNroTo |


## Levels, Twin Detective and the problem/solution (v2)

**Problem:** children aged 3-6 mix up look-alike letters/numbers (b/d, ب/ت/ث, 6/9), and a fixed lesson order does not react. Parents see a score but not *what* is confused.

**Solution (the loop):** Play levels -> the app records which wrong twin was picked -> it builds a personal **Twin Detective** mission (clue cards + a short drill on just that group) -> the mix-up weight decays when answers are right, so the case is "solved" -> the parent dashboard shows it.

What was added
- `data/levels.json`: worlds and levels (17). Edit items, titles, icons, colors, stickers here.
- `data/twins.json`: the clue for every look-alike letter/number (emoji + one sentence, en/ar).
- `data/about.json`: the in-app "Problem and solution" page.
- Level flow: Meet cards -> 8 questions -> 1-3 stars -> next level unlocks (1 star needed). Questions only use letters the child has met.
- New question types: tap-to-build a word (`build`) and bubble pop (sound questions shown as bubbles).
- Garden (a flower grows per level) and a sticker book; mascot, confetti, sound effects (toggle on home).
- Tunables are in `data/config.json` (`levels`, `twins`, `selection`, `sound`).

Real photos: not shipped (licensing/offline). Any word in `data/content.json` can get an `"image": "/images/bus.jpg"` field (put files in `public/images`); it replaces the emoji automatically.

Tested: `npm test` (engine, levels, missions, build) and a Playwright run on the production build at phone width (desktop Chromium only, not a real phone). Arabic voices depend on the device.

### Shape games (v3)
Built to teach the hardest look-alike problems by *seeing and doing*, not only choosing:
- **Ball and stick (b d p q):** build the letter by placing the ball. A wrong tap shows which letter you actually made. Data: `parts` in `data/content.json` (English domain).
- **Dot doctor (Arabic):** a dotless letter shape; tap above/below to add dots. Wrong dots show which letter they made. Data: `dots` (skeleton, above, below) per letter. ف and ق are not included because their dotless forms are not shown reliably by all Windows fonts.
- **Frog hops (numbers):** a frog hops along a number line; count the hops and pick where it lands.
- **Twin Lab (/lab):** mirror, flip and turn b/d/p/q and 6/9 and watch them become their twins; an Arabic dot machine.
- These also appear inside Twin Detective drills. Chances are in `config.selection` (`partsChance`, `dotsChance`, `hopChance`).

### Check-up, Monster Feeder and rewards (v5)
- **Magic check-up** (`/check/<domain>`, button on each home card): 10 questions, no hints or right/wrong feedback, look-alike pairs first. Each result is saved; the next check-up shows the change (use it as pre/post evidence). The parent dashboard has a history table and the result page lists the mixed-up pairs and the best level to practice. It is a learning check, never a diagnosis (shown on screen). Settings: `config.assessment`.
- **Feed the monster** (`/monster/<domain>`): the monster asks for one letter or number; feed it only that one, decoys are its look-alike twins. Wrong picks make it say "yuck". Counts as evidence for the adaptive engine. Settings: `config.monster`.
- **Rewards** (`/rewards`): daily streak, 15 badges and 7 hats that Bloom can wear (unlocked by stars). All defined in `data/rewards.json` (badge `stat` can be sessions, stars, levels, perfect, streak, missions, stickers, checkups), so you can add or change them without code.

### Shapes and Match (v6)
- **Shapes domain** (`id: "shapes"` in `data/content.json`): circle, square, triangle, rectangle, star, heart, oval, diamond, each drawn as a coloured SVG, with a short fact and 3-4 real-life examples (sun, ball, sponge, pizza slice, door, egg, kite...). Look-alikes (circle/oval, square/rectangle/diamond) get Twin Detective clues in `data/twins.json`.
  It works everywhere letters work: levels (3 levels), free practice, check-up, Monster Feeder, Memory (shape vs. real object), parent dashboard.
  New question type `example`: shows a real object (a clock) and asks which shape it looks like.
- **Match game** (`/match`): tap a picture, then its word (animals, food, things, nature; 46 words, English and Arabic) or tap a real object, then its shape. Words the child got wrong come back first (`state.vocab`). Words are in `data/vocab.json`; add rows freely. Settings: `config.match`.
- `npm run assets` now also lists vocab pictures and recordings (`public/images/<id>.jpg`, `public/audio/vocab-<id>-<en|ar>.mp3`).
- Badges "Word wizard" / "Word master" added in `data/rewards.json`.

### Look, motion and language (v7)
- **Language switch** (pill at the top of every page): Arabic <-> English at any time, even before sign-up. It changes text, direction (RTL/LTR), arrows and the voice language. `npm test` checks that every string, badge, clue and vocab word exists in both languages with the same `{placeholders}`.
- **Storybook background** (`components/Scene.js`): drifting clouds, spinning sun, birds, swaying flowers. **World banners** (`components/WorldArt.js`): pyramids, rocket, balloons, blocks. Mascot blinks, pictures sit in a framed bubble, cards pop in, flowers grow. All vector + CSS, nothing to download, and `prefers-reduced-motion` turns motion off.
- **Optional animated emoji:** set `animatedEmoji.enabled` to `true` in `data/config.json` to show Google's animated Noto emoji (needs internet, falls back to the normal emoji; Noto Emoji is CC BY 4.0, credit it in the report). Not verified from the build environment, so test it once.
- Every screen was checked at phone width in Arabic and English for horizontal overflow.

### Library videos (v8)
Four text items were replaced by YouTube videos (ids start with `video-`): Arabic alphabet song, Counting 1 to 10, The Ugly Duckling (English), The hare and the tortoise (Arabic). The videos were found through search and are not owned by us; an owner can remove a video or block embedding at any time. Each video page has an "Open on YouTube" link as a fallback. To swap a video, change the `youtube` link of the item in `data/library.json`. Please play each one once before delivery and check it is suitable for children.

### Profiles, Number Bakery and offline app (v9)
- **Several children on one device** (`/profiles`, chip on the home screen): each child has a name, avatar and their own progress. Old single-child data is moved into the first profile automatically. Progress stays in this browser only.
- **Class report** (Grown-ups page): a table of all children (sessions, stars, levels, first -> latest check-up per area) with downloads: summary CSV and check-ups CSV (open in Excel, Arabic works), and a JSON of everyone. This is the evidence for pre/post learning gain. It is monitoring only, not diagnosis.
- **Number Bakery** (numbers domain, question type `bake`): tap the jar to put cookies on the tray, one by one; each cookie says its number; tap a cookie to take it away. Teaches one-to-one counting. Chance: `config.selection.bakeChance`, max cookies: `config.bakery.maxCookies`.
- **Install and play offline (PWA):** after the first visit with internet, the app saves every page and works without internet (YouTube videos still need it). The Grown-ups page shows "Ready to play offline" and an Install button (on iPhone: Share -> Add to Home Screen). The page list comes from your JSON data (`/routes.json`), so new levels or words are included automatically. The service worker (`public/sw.js`) runs only in the production build (`npm run build && npm start` or on Vercel), not in `npm run dev`. To force an update for everyone, change `CACHE` in `public/sw.js`.
- Icons: `npm run icons` redraws `public/icons/*` from the mascot (needs Playwright; optional, PNGs are already included).

### Sign in by name, backup, and printable worksheets (v10)
- **Continue by typing the name:** on the first screen (and on `/profiles`), typing the same nickname as an existing child (any case, spaces, alef/yaa spelling) shows "Welcome back" and continues with that child's stars, levels and history instead of creating a new one. There is no server and no password: the name is the key to a profile stored in this browser. Do not use real full names.
- **Move to another phone or computer:** `/profiles` -> "Save a backup" downloads a JSON file; on the other device use "Load a backup". If the same name exists on both, the one with more progress is kept. Backups also accept the JSON from the Grown-ups page.
- **Printable worksheets** (`/worksheets`, tile on the home screen): pick a topic (Arabic letters, English letters, numbers, shapes, or picture-word vocabulary) and an activity: *Trace*, *Circle the same* (look-alikes as decoys), *Draw a line* (letter -> picture, shape -> real object, picture -> word), *Count and write*. The items the child finds hardest come first, so each child gets a personal sheet. "New sheet" reshuffles, "Show answer key" is for the teacher, "Print" gives one clean A4 page (menus hidden), in Arabic or English with the right direction. Logic: `lib/worksheets.js`, tested in `npm test`.

### Explainable progress, starter check and difficulty recovery (v11)
- **"What the data shows"** (Grown-ups page, `components/Insights.js`, logic in `lib/insights.js`): a skill profile (bars for each area, writing from tracing, memory) and plain sentences that say *why*: repeated look-alike mix-ups with a suggested activity, areas where the child takes longer, which way of learning works best (looking, listening or doing, shown only when there are at least 6 answers in two ways and a gap of 15 points), recent trend, how often a simpler step was needed, and strengths. With too little play it says so instead of guessing. Every answer in the log now stores its question type (`ty`) so these comparisons are possible. Wording is in `data/strings.json` (`explain*`).
- **Child report** (`/report`, button on the Grown-ups page): one printable A4 page with the skill profile, first vs. latest check-up per area, observations, home ideas and the "not a diagnosis" note. Arabic or English.
- **Starter check** (`/start`, card on the home screen until done or skipped): 4 quiet questions in each area (`config.starter.perDomain`). Results are saved as the first check-up, so later check-ups show the change.
- **Difficulty recovery** (in `components/Session.js`, rules in `lib/engine.js`): when an item is missed twice in a session, the next question is a smaller step (2 choices, with sound, the mascot says "let's take a smaller step"), and the item comes back two questions later as a re-check. Both are tagged in the log (`rec` 1 and 2) and counted in the report. Not used in check-ups.
- All of this is learning monitoring only; the app never labels a child with a disorder.

### Sound fixes and interactive cards (v12)
- **Crash fixed:** the learning card looked up the picture word for a letter without treating أ إ آ as ا, so the alef card crashed when its word button was tapped. The lookup is now shared (`wordOf` in `lib/content.js`). Checked by opening every card of all 40 levels in Arabic and English.
- **Letter names and sounds:** Arabic letter names now carry diacritics (`أَلِف`, `بَاء`...) so voices read them as letters (plain "ألف" is read as the number 1000), and every letter has a `sound` (`بَ`, `buh`...). Both are in `data/content.json` (`say`, `sound`) and can be replaced by recordings (`audio`).
- **Voices:** `lib/speech.js` waits until the browser has loaded its voices, picks the best voice for the language, and never reads Arabic with an English voice. If the device has no voice for a language, a notice appears and the Grown-ups page has a **Sound check** card (voice found / missing, test button, how to install a voice). Recordings in `public/audio` always win over the device voice.
- **Cards** are now tidy sections: *Look and listen* (tap the big letter for name + sound, or the Name / Sound buttons), *A word that starts with it*, *Look around you*, *How to remember it*. Everything is tappable, taps wiggle and get a tick, dots show progress and can be tapped, and there is a Back button.

## Sound Safari, Bloom Break and Focus mode (learning-difficulty support)

Built from research on early reading, maths and attention difficulties. This is practice and monitoring, **not a diagnosis**.

**Sound Safari** (`/safari`) trains the sound skills linked to early reading. Four games, in Arabic and English:
Rhyme Rain, Syllable Drums, First Sound Hunt and Robot Blender. All words live in `data/sounds.json`
(one pack per language), so adding words needs no code. Words a child struggles with come back more often.
Results show on the parent page (`components/SafariStats.js`).

**Mistake-friendly feedback.** A wrong pick fades out (no red, no buzzer) and Bloom says one of the `oops` lines in
`data/strings.json`. The 💡 Help button climbs a ladder: listen again, then one wrong choice is removed, then the answer glows.
Free practice and levels use the same `oops` lines.

**Bloom Break.** Between questions (never during one), Bloom offers a 30 second movement or breathing break after
6 minutes of play or 3 misses in a row. Skip is always available. Breaks are in `data/wellbeing.json`;
timings are in `data/config.json` under `wellbeing`.

**Focus mode.** The 🎯 button on the home page hides the animated background and stops decorative motion for that child.

Please have a native Arabic speaker and a teacher review `data/sounds.json` before classroom use (rhyme families, syllable
splits). Browser voices read letter sounds like "buh" unevenly: for best results record audio for the sounds.

## Quick Look Owl and My Superpower

**Quick Look Owl** (`/owl`) trains number sense without counting. Three games, adaptive, Arabic and English (Eastern Arabic numerals in Arabic):
- **Quick Look**: dots flash in dice or ten-frame patterns (or a random spread), the child says how many. The range grows from 1-3 up to 1-10 and the flash time shortens only a little as the child succeeds.
- **Number Line**: place a number on an unmarked line (0-5 first, then 0-10). A near miss gets a direction hint ("try nearer the bigger numbers"). The line always runs left to right, also in Arabic.
- **Bigger Tribe**: which group has more. The ratio tightens with each level.

All three use the same hint ladder, "oops" feedback and Bloom Breaks as Sound Safari. Numbers are in `data/config.json` under `owl`; results show on the parent page (`components/OwlStats.js`).

**My Superpower** (`/superpower`) is a child-facing, strengths-first page built from the existing Insights data (`lib/superpower.js`):
Eagle Eyes / Super Ears / Busy Hands / All-Rounder, "things I know", "my brain is growing these" and "brave tries".
It only names a power when there is enough evidence (the same rule as the parent Insights). If a child scores low across the board it shows "Superpower Explorer" instead of any label.

**Tests.** `npm test` covers the engines and data. `tests/e2e.py` is a browser click-through (see the top of the file).
Styling note: new classes are prefixed (`sf…`, `nl…`) so they never collide with existing game styles.

## Voices (Arabic + English on every phone)

The app speaks with three layers, first one that works wins: a recorded file (`audio` in `data/content.json`),
the **online voice** (`/api/tts`), then the phone's own voice. Phones without an Arabic voice now work because
the online voice sends a normal mp3.

**Recommended (best, clear, child-friendly voices): Azure Neural TTS** (free tier 500k characters/month)
1. Create a "Speech" resource in Azure and copy its Key and Region.
2. In Vercel > Project > Settings > Environment Variables add `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
   (optional: `AZURE_VOICE_AR` = `ar-EG-SalmaNeural` or `ar-SA-ZariyahNeural`, `AZURE_VOICE_EN` = `en-US-AnaNeural`).
3. Redeploy. Without a key the route falls back to the Google Translate voice (works, but unofficial and less accurate).

Azure also gets exact pronunciation of English letter names ("bee") and letter sounds (/bə/). Grown-ups > Sound check
shows whether the online voice is reachable. Every word is generated once, then cached for a year.

Numbers screens now say "Say it", "Count them!" and "Which number do you hear?" instead of the letter wording.
