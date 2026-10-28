# Gospel Labs 3.0

A **major** release under [VERSIONING.md](VERSIONING.md): Gospel Labs looks different as a whole. The goal is a more Christ-centered look, inspired by the Church's Gospel Library app, so the app no longer reads as "AI-generated".

**Live since October 28, 2026, about 00:32 MDT:** commit `053b3ee`, tag `v3.0.0.0`, build `20261028063245`. The owner tried a local demo first and then approved the release.

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

## Release
- **Checks before deploying:** lint and typecheck were clean; 1,501 unit tests passed; `verify:study` passed (351 sources, 2,721 quotations, 0 failures); end-to-end, 251 passed and 3 skipped (device-specific), desktop and Pixel 7.
- **Pushed:** `main` and the tag only. The development branch `new-look-3.0` stays local; `main` holds the same tree as one squashed commit.
- **`verify:production`:** passed. The two warnings (no HSTS, Cloudflare NEL) are the same as in earlier releases.
- **Paintings:** served as `image/webp`.
- **Live check on a phone:**
  - A new visitor gets the welcome with "Choose your look".
  - A returning 2.2 visitor on a dark-mode phone opens in Evening, with What's new for 3.0 and the look choice.
  - A Lab user stays in Lab.
  - A study step pins its evidence and hides the tab bar.
  - The Journal and Settings › About load.
  - No broken images, and no page errors.
- **Cloudflare:** it injects its Web Analytics beacon (`static.cloudflareinsights.com`) into pages for browsers. The Content-Security-Policy blocks it, so nothing is sent, but browsers log the block in the console. It isn't part of the build. To stop it, turn off Web Analytics (automatic setup) for the site in Cloudflare.
- **Rollback:** `.gospellabs-previous` on Atlas is 2.2.0.1, and rolling back is safe for data. 2.2.0.1 opens the version 3 database and ignores the journal table, and it refuses format 4 backups rather than drop the journal (see HOSTING.md).

## Approved by the owner
- **The logo:** "the word as a seed", a sprout rising from an open book (Alma 32:27–28). It's the app icon and sits beside the name.
- **The paintings:**
  - twelve public-domain works, credited in `src/content/art.json` and Settings › About;
  - Connect with Christ uses Hofmann's *Christ in Gethsemane* (1886), whose 1200 file is slightly upscaled from a 1,141 px scan;
  - left out on purpose: Bloch's *Resurrection* (a low-quality file, with a bare chest) and Hofmann's *Jesus among the Doctors* (a German museum photo with possible rights).
- **The new words:**
  - the What's new text, which names "the Church's Gospel Library app" as the inspiration;
  - the Journal's prompts and Elder Bednar's words on tender mercies ("The Tender Mercies of the Lord," April 2005);
  - the Home title, "Search the scriptures. Know Him."

## Next
- **Content isn't part of this release.** The held-back content pass on `content-2.2.1` would now ship as **3.0.1.0**, a CONTENT release on top of 3.0. Rebase it onto `main` first.
