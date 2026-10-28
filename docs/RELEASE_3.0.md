# Gospel Labs 3.0

A **major** release under [VERSIONING.md](VERSIONING.md): Gospel Labs looks different as a whole. The goal is a more Christ-centered look, inspired by the Church's Gospel Library app, so the app no longer reads as "AI-generated". **Not released.** It is built on the local branch `new-look-3.0`, with nothing pushed or deployed.

The design system is in [DESIGN.md](DESIGN.md).

## What changed

### The look
- **White pages (Daylight),** with one ink-blue accent (`#1f4e9c`) used only for things you can tap and for the current state.
  - A device that never chose a theme follows the device: Daylight when it's set to light, Evening when it's set to dark. That way nobody is met with a white screen at night. Before 3.0, every device got Lab.
  - **"Choose your look"** is in the welcome card and in What's new for 3.0: follow my device, Daylight, or Evening. Anyone on Lab or Parchment sees theirs kept as a fourth choice.
  - Anyone who chose Lab keeps Lab: the original dark teal, now in the new layout.
  - Parchment and Evening are unchanged apart from the accent: Parchment's is now ink.
- **Type:**
  - Literata for titles, scripture, questions and reflections; Source Sans 3 for the interface.
  - No monospace, and no spaced capitals except printed-scripture ones ("STEP 1 OF 3", "2 NEPHI 9:20–22").
- **Paintings of the Savior:** twelve public-domain works (Bloch, Hofmann, Rembrandt, Murillo, Holman Hunt, Ford Madox Brown, Holbein, Vermeer), from Wikimedia Commons. They lead Home, every investigation, Connect, Character of Christ, Scripture Explorer, and the end of an investigation. Each is credited under it and in Settings › About.
- **Scripture set like the printed books:** bold verse numbers, an italic headnote under each step's title, and the learner's choices marked like a highlighter, with an underline so the mark doesn't rely on color alone.
- **A new mark:** a sprout rising from an open book replaces the flask, as the app icon and beside the name.
- **Retired:**
  - the glow and grid behind pages;
  - the flask and sparkle icons;
  - monospace capital labels;
  - "↗" arrows on links inside the app;
  - zero-padded numbers ("01");
  - colored pills on every source;
  - most boxes around sections (sections now sit under a hairline).
  - The stock headline "What would you like to study today?" is now "Search the scriptures. Know Him." (John 5:39; John 17:3).

### Phones
- **No top bar.** Each page starts with its own title; Home starts with the name.
- **A study step fills the screen.** The tab bar is hidden, and a slim bar keeps "‹ Overview" and the level ("Easy · Quick"). Check and the hint sit at the bottom edge while you read and tap.
- **The evidence stays in view while you answer:**
  - **Phones and tablets:** it's pinned under the study bar. Tap "Evidence" and it opens into a panel that scrolls on its own, with the question still visible below. It stays open from step to step.
  - **Wide screens:** it sits in a column beside the step.
  - Before, it opened above the question, so answering meant scrolling up and down between them.
- **Home's first screen** holds the painting, the next investigation, and its button, plus "Only a few minutes?" for Connect. Before, Continue was below the fold, at 785 px.

### The Journal (new)
The Notebook has two tabs, **Discoveries** and **Journal**. A friend asked for "a place in notebooks that's like a journal where I can see all my notes and write thoughts and then have them connected to where I had them", and "kinda like a tender mercy or God's hands journal".
- **Write:** a thought, a tender mercy, or a question. It's saved only on this device and can be edited or deleted.
- **Everything you've written:** journal entries, plus everything written elsewhere, newest first, each linked back to where it was written. "Elsewhere" means:
  - step reflections;
  - Discovery Card notes and highlight notes;
  - Character of Christ and Connect private notes;
  - Scripture Explorer notes;
  - Map connections;
  - 1.x research notes.
- Search, and a filter: Everything, Journal, or From studying.
- **From a study step:** "Write in your journal" saves the thought with a link back to that step.
- **Writing appears once.** Reflections and private notes that are copied onto a Discovery Card are shown once, where they were written.
- **Backups include the journal** (backup format 4). Versions 2.0–2.2 refuse a format 4 file instead of silently leaving the journal out. Format 3 files still import.
- **Storage:** IndexedDB version 3 adds only a `journal` table. A rollback to 2.2 still opens the database and ignores the table.

### Settings
- **A short list:** Appearance, Study, Backup and data, Privacy, Send feedback, About Gospel Labs. Each opens its own page.
- **About** now explains the version's four numbers. The old text said versions had three parts. It also lists the art credits.

### Versions
The four numbers keep the owner's order; each now means one thing, and the first that changes decides how loudly learners hear about the release (see [VERSIONING.md](VERSIONING.md)):

| Number | Name in About | Learners hear |
| --- | --- | --- |
| Major | Major | What's new, with the tour |
| Minor | Update | What's new |
| Content | Content | A one-line note |
| Patch | Fix | Nothing (listed in About only) |

- **Content changes are never a quiet fix:** a learner may have studied the old wording, so content changes are always announced.
- **Learners see the short form** ("Gospel Labs 3.0"). The full number (3.0.0.0) stays in About and in bug reports.

## What learners see
- **Returning learners:** What's new for 3.0, "A new look, centered on the Savior", with the tour offered.
- **New learners:** the welcome, then Home in the new look.

## For the owner: review before release
1. **The logo** (chosen: "the word as a seed").
   - A sprout rising from an open book. Alma compares the word to a seed: "an experiment upon my words" (Alma 32:27–28).
   - It's the app icon (`src/app/icon.svg`, `src/app/apple-icon.png`, `public/icons/`) and sits beside the name (`BrandMark` in `src/components/layout/brand.tsx`).
   - Check it on your phone's home screen in the demo.
2. **The paintings.**
   - The twelve picks and credits are in `src/content/art.json`.
   - Alternates are in the scratchpad contact sheet. Two alternates were left out on purpose:
     - Bloch's *Resurrection*: a low-quality file, with a bare chest.
     - Hofmann's *Jesus among the Doctors*: a German museum photo with possible rights.
   - Connect with Christ now uses Heinrich Hofmann's *Christ in Gethsemane* (1886), replacing a Rembrandt-workshop head of Christ that the owner didn't like. The source scan is 1,141 px wide, so its 1200 file is slightly upscaled.
3. **New words.** Please review this new copy:
   - **What's new for 3.0** (`src/content/changelog.json`). It names "the Church's Gospel Library app" as the inspiration.
   - **The Journal's prompts:**
     - "What's on your mind? Write anything."
     - "Where did you notice the Lord's hand today? Big or small."
     - "What are you wondering about?"
   - **The Tender mercy explanation:** Elder Bednar's words from "The Tender Mercies of the Lord" (April 2005), quoted from the talk's text.
   - **The Home title:** "Search the scriptures. Know Him."
4. **Content isn't part of this release.** The 2.2.1.0 content pass is still on `content-2.2.1`. If it ships first, 3.0's changelog entry goes above it, and the two branches are merged before the 3.0 release.
