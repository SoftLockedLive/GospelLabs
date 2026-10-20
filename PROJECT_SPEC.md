# Gospel Labs — Project Specification

## Product Vision

Build Gospel Labs, a modern, mobile-first web application that helps members of The Church of Jesus Christ of Latter-day Saints investigate gospel questions using a structured research process.

Tagline: **Question. Study. Discover.**

The application is inspired by scientific problem-solving, but it is not intended to treat spiritual truth as something that can always be proven experimentally.

The application does not provide predetermined doctrinal solutions, grade theological conclusions, or claim religious authority.

Users form their own conclusions using scriptures, Church resources, careful reasoning, and personal reflection.

## Technology

- Next.js with App Router
- TypeScript in strict mode
- Tailwind CSS
- Accessible, reusable UI components
- Lucide icons
- Dexie and IndexedDB for persistent local data
- Zod for schema validation
- Local JSON for the curated question bank
- Installable Progressive Web App

Use stable, maintained package versions and avoid unnecessary dependencies.

Do not introduce AI models, AI APIs, user authentication, cloud databases, analytics, advertising, or subscription functionality.

## Visual Design

Create a clean, modern scientific interface.

Default theme: dark.

Colors:
- Background: #071116
- Surface: #11232C
- Accent: #27C6DD
- Primary text: #F1F7F9
- Secondary text: #A0B3BB

Use subtle borders, restrained accent colors, clear typography, generous spacing, and responsive layouts.

The application should feel like a premium research notebook rather than a school assignment, chatbot, or gaming dashboard.

Provide a light theme if practical, but prioritize a polished dark theme.

## Primary Screens

1. Dashboard
   - Start a custom investigation
   - Browse the question bank
   - Resume recent investigations
   - Display investigation status

2. Question Bank
   - Load curated questions from a local JSON file
   - Search and filter by topic and difficulty
   - Select a random question
   - Show suggested references and investigation prompts
   - Start an investigation from a selected question

3. Investigation Workspace
   - Five navigable sections:
     1. Question
     2. Hypothesis
     3. Research
     4. Analysis
     5. Conclusion
   - Flexible navigation without mandatory completion gates
   - Editable text fields
   - Evidence cards
   - Autosave and resume
   - User-controlled completion status

4. My Library
   - Browse saved investigations
   - Search and filter by status
   - Resume, reopen, or delete investigations
   - Access saved evidence within investigations

5. Settings
   - Appearance preferences
   - Export and import backups
   - Local data management
   - Privacy information

## Investigation Data

Each investigation should support:

- Stable unique ID
- Original question
- Optional source question-bank ID
- Title and category
- Creation and modification timestamps
- Current section
- Context and subquestions
- Zero or more hypotheses
- Evidence cards
- Analysis notes
- User-authored conclusion
- Remaining questions
- Reflection notes
- Status: investigating, partially-understood, or concluded

An investigation must remain editable after being marked concluded.

## Evidence Cards

Each evidence card should contain:

- Unique ID
- Source type
- Source title or reference
- Optional source URL
- Observation
- Relevance to the investigation
- Optional tags
- Creation and modification timestamps

Support adding, editing, and deleting evidence.

Users should be able to reference their evidence cards in the Analysis and Conclusion sections.

Suggested references are starting points, not automatically verified evidence.

## Question Bank

Store curated questions in a version-controlled JSON file.

Each entry should contain:
- Stable ID
- Question text
- Category
- Difficulty
- Tags
- Optional suggested references
- Optional investigation prompts
- Optional submission attribution

No question requires a predetermined answer.

Questions must be easy to add without modifying application code.

Validate the question bank with Zod and report invalid entries clearly.

Never fabricate citations or automatically claim a suggested reference proves a theological conclusion.

## Local Data

Store user-created investigations in IndexedDB.

Requirements:
- Autosave edits
- Preserve data between sessions
- Support offline use
- Handle storage failures gracefully
- Export complete backups as JSON
- Validate imported backups
- Support merge and replace import modes
- Prevent accidental data loss
- Version backup schemas for future migration

The question bank and personal investigation data must remain separate.

## Scripture Integration

For v1, use verified external links to official Church scripture and study resources.

Do not scrape Church websites or assume an official public API exists.

Do not reproduce large amounts of copyrighted Church material.

Allow users to manually enter scripture references and resource links.

The application must not imply that it has independently verified a source unless verification actually occurred.

## UX Principles

- Mobile-first and responsive
- Accessible controls and keyboard navigation
- Autosave without disruptive dialogs
- Clear loading, empty, and error states
- No forced study streaks
- No grades or doctrinal correctness scores
- No mandatory hypotheses
- No mandatory final conclusion
- Users can return to any investigation section
- Respect reduced-motion preferences

## Engineering Requirements

- Keep components modular and reusable
- Separate persistence, domain logic, and UI
- Avoid oversized components
- Use strict types and runtime validation at data boundaries
- Include automated tests for important data operations
- Maintain a clean project structure
- Document setup and development commands
- Do not overengineer future features

## Development Process

Implement the project incrementally.

Before each phase:
1. Review the current repository.
2. Explain the planned files and changes.
3. Implement only the requested phase.
4. Run relevant checks.
5. Summarize what works, what remains incomplete, and any known limitations.

Do not implement future phases without authorization.

The first release should be useful without any AI, server-side database, or recurring infrastructure cost.
