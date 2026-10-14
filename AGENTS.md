# StoryEngine — AI Coding Agent Instructions

A textual game built with SvelteKit 5. 

- uses: static adapter with hash routing in frontend.
- tests with: vitest 4.

# Context Engineering

the ai need more data to better understand the repository, before editing anything check the docs folder if have some concept related to the current task.

Case don't have any docs, check if have a skill who match the user request and read it.

## Quick Start

```bash
npm run dev      # Start dev server
npm run check    # Type check
npm test         # Run unit tests (vitest)
```

## Documents

Before doing any task check in docs folder and read any related doc to the user request.

## Project Structure

```
src/
    lib/
        components/
            editor/ # contains components related to editor route.
            inputs/ # the inputs with the default visual style attached.
        data/
            word.ts # A base world data who can by processed by engine and showed in game view.
        engine/ # The Backend engine who receive data as declared in src/lib/types/data
        notify.ts # Connected to a PopUp element who show messages for a small amount of time have functions like `showError`,`showInfo`.
```
## Key Concepts

### Data Flow

1. **Declarative data** (`declarative.d.ts`) → 2. **Generated World Data** (`world.ts`) → 3. **Engine execution**(`engine/index.ts`) → 4. **Game view(UI)** (`routes/+page.svelte`)
