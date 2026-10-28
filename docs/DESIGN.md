# Design

Gospel Labs 3.0 has a more Christ-centered look, inspired by the Church's Gospel Library app. Learners are mostly 14–15 years old, on phones, with little patience for clutter. Every screen should feel like opening the scriptures, not like opening a dashboard.

Borrow the qualities of the Church's apps, never their identity: no Church logo, no Ensign typefaces, no Christus or temple marks, and nothing that would let Gospel Labs pass for an official app. Settings carries the line that it isn't one.

## The mark

A sprout rising from an open book (`BrandMark` in `src/components/layout/brand.tsx`). Alma compares the word to a seed to be tried, "an experiment upon my words" (Alma 32:27–28): that is what "Labs" means here.
- **In the app:** the mark in ink sits beside "Gospel Labs" in Literata semibold.
- **As an icon:** the mark is white on an ink tile.
- **Rules:** never recolor the leaves separately, add a glow, or put the mark in a circle.

## Principles

1. **Christ first.** Real paintings of the Savior lead the main surfaces. Words about Him come before features.
2. **Read, don't operate.** Scripture, questions, and reflections are set in a serif and given room. Controls stay quiet.
3. **One thing per screen on a phone.** The first screen of every page shows its main action without scrolling.
4. **Plain lists before cards.** Separate things with hairlines and space. Use a box only when it is a single tappable object.
5. **One accent, only for action.** Ink blue means "you can tap this" or "this is current". Nothing decorative is ink blue.

## Color

Tokens are in `src/app/globals.css` (one set per theme). Components use the Tailwind names (`bg-canvas`, `text-fg`, `text-muted`, `border-line`, `bg-accent`, …), never raw colors.

| Theme | Use | Canvas | Accent |
| --- | --- | --- | --- |
| Daylight (`light`) | The default when the device is set to light | White `#ffffff` | Ink blue `#1f4e9c` |
| Parchment (`dawn`) | Long reading | Paper `#f5efe3` | Ink `#24508f` |
| Evening (`evening`) | The default when the device is set to dark | `#0e1124` | Gold `#e8c46f` |
| Lab (`dark`) | The original 2.x look, kept for those who chose it | `#071116` | Teal `#27c6dd` |

- **Until a learner chooses, the theme follows the device** ("Follow my device"). Nobody opening the app at night in dark mode gets a white screen. The welcome and What's new for 3.0 both offer "Choose your look" (follow my device, Daylight, Evening).
- **Text:** `fg` for primary text, `muted` for secondary text, `subtle` for metadata. All are at least 4.5:1 on every surface.
- **Sacred:** the warm `sacred` surface is for Connect with Christ and other reflective moments only.
- **Highlight:** marker yellow (`bg-highlight`), always paired with a solid underline (`decoration-highlight-line`), so a choice never rests on color alone.
- **Status:** green, amber, and danger are for status only, and always come with words or an icon.
- **No glow.** No gradients, blurred blobs, page washes, or grids.

## Type

There are two families. **Literata** is for anything read slowly: titles, scripture, questions, and reflections. **Source Sans 3** is for everything operated. There is no monospace, and no spaced capitals except the printed-scripture kind.

| Style | Size / line | Use |
| --- | --- | --- |
| `text-title` | 28/34, 36/42 from lg | The page's one `<h1>`, in Literata |
| `text-heading` | 20/28, 24/32 from sm | Section headings, sans semibold |
| `kicker` + a color | 14/20 | The small line above a title, in sentence case. Usually `text-muted`; never the accent |
| `scripture-caps` + a color | 13/18 | A scripture reference or a step count, in spaced Literata capitals ("2 NEPHI 9:20–22") |
| `headnote` + a color | 17/27, 18/29 from sm | A step's introduction, in Literata italic, like a chapter summary |
| `prose-scripture` | 18/31 | Scripture and long reflective reading |
| Body | 15–17 | Sans. 16 by default; 17 bold for a step's prompt |

Scripture is set like the printed books: the reference in `scripture-caps`, a **bold verse number** at the start of each verse, and a learner's choices marked like a highlighter.

## Space, shape, and depth

- **Spacing:** 4, 8, 12, 16, 24, 32, 48 px. The phone gutter is 20 px.
- **Radii:** 8 px for controls (`rounded-lg`), 12 px for objects (`rounded-xl`; `rounded-2xl` and `rounded-3xl` also resolve to 12 px), and fully round for pills.
- **Depth:** things on the page are flat (hairlines, no shadow). `shadow-soft` is for sticky bars and a selected segment, and `shadow-lifted` for sheets and dialogs.

## Navigation

- **Phones and tablets:** there is no top bar. Each page starts with its own title, and Home starts with the wordmark. The tab bar holds Home, Investigate, Notebook, Connect, and More.
- **Study step:** `useFocusMode` hides the tab bar, and a slim sticky bar holds "‹ Overview" and the level ("Easy · Quick"). On phones, Check and the hint sit in a bar along the bottom edge.
- **Large screens:** a plain sidebar with the wordmark, grouped links, and Settings at the bottom.
- **Settings:** a short list. Each row opens one page: Appearance, Study, Backup and data, Privacy, Send feedback, About.

## Art

Paintings are listed in `src/content/art.json`, with files in `public/art/` and the `ArtImage` / `PageCover` components in `src/components/ui/art-image.tsx`.

- **Public domain only.** Artists who died long ago (Bloch, Hofmann, Rembrandt, …), from Wikimedia Commons, with the credit copied from the file page. Never use Church-owned or other copyrighted art, stock photos, or AI images.
- **No crucifixion scenes and no cross as the focus,** no nudity, and nothing too dark to read on a phone.
- **Each painting has alt text** that says what it shows. A thumbnail next to its own title is `decorative`.
- **Credit a cover like a museum label,** underneath it: title, artist, year. Every painting is also listed in Settings › About.
- **Two WebP sizes,** 600 and 1200 px wide, with a recorded focal point for 16:9 and 4:3 crops.

## Components

| Component | Rule |
| --- | --- |
| Button | `primary` (solid ink) for the one main action on a screen. `secondary` (outlined) for alternatives. `link` (ink text) for quiet actions such as "Need a hint?", "Edit", or "Write in your journal". `ghost` for neutral actions. `danger` for deleting. `soft` is retired. At least 44 px tall on touch screens. |
| Card | Only for one tappable object (an investigation, a study tool). Hairline border, 12 px radius, no shadow. The whole card is the link, with the title as its name. |
| List row | The default for collections: a thumbnail or icon, a bold title, one line of detail, and a chevron. Rows are separated by hairlines. |
| PageHeader | The page's `text-title` `<h1>`, an optional kicker above it, and a short description. |
| Tabs | Underlined. Use them for two or three views of one place, such as Notebook › Discoveries / Journal. |
| Segmented control | Two to four mutually exclusive choices, such as Quick / Deep. |
| Empty state | A sunken panel with a quiet line icon, a serif title, and one action. |

## When not to use…

- **…a card:** for anything that isn't one tappable thing. Sections, explanations, notices, and groups of controls use headings and hairlines instead. Never put a card inside a card.
- **…an icon:** as decoration next to a heading, inside a colored square, or when the word is already clear. Icons belong in navigation, on controls whose meaning they sharpen, and on status, where they back up the words. Never use sparkles, flasks, or ↗ on links that stay inside the app.
- **…a badge or pill:** for metadata that can simply be written ("About 10 min · 3 steps"), or for a source's kind (it's a quiet line of text). Use a pill only for a choice the learner toggles, such as the journal's kinds.

## Accessibility

- WCAG 2.2 AA in every theme. Control borders are at least 3:1 against the page.
- Touch targets are at least 44 px. Focus is always visible (2 px accent outline).
- Color is never the only signal. Reduced motion is respected, and motion is never needed to understand anything.
- Screen readers get alt text, region names, and sentence-case labels (no capitals that are read letter by letter).
