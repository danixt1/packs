# StoryEngine — AI Coding Agent Instructions

A declarative textual game engine built with SvelteKit. Authors describe worlds in JSON-like declarative data, and the engine simulates them.

## Quick Start

```bash
npm run dev      # Start dev server
npm run check    # Type check
npm test         # Run unit tests (vitest)
```

## Project Structure

```
src/
  lib/
    data/world.ts         # Default game world (places, characters, items, dialogues, templates)
    types/data            # Contains expected input data interfaces in valid JSON format
      declarative.d.ts      # Interfaces detailing the input to world generation
      getters.d.ts          # Declare forms to get variables from game in a valid JSON format.
    engine/
        index.ts            # Core engine: state, conditions, effects, actions, events
        getters.ts          # resolve the getter object or return the value if not is a getter.
        autonomy.ts         # Rule-based NPC autonomy system
        types.ts          # Runtime type definitions (mutable state shapes)
        engine.spec.ts      # Engine unit tests
        autonomy.spec.ts    # Autonomy unit tests
  routes/+page.svelte   # Temporary front end from the game.
```

## Key Concepts

### World Declaration Flow

1. **Declarative data** (`declarative.d.ts`) → 2. **Generated World Data** (`world.ts`) → 3. **Engine execution**(`engine/index.ts`) → 4. **Game view(UI)** (`routes/+page.svelte`)

### Getter System

The engine uses a getter-based resolution system for conditions, effects, and text templates:
- `self-variable`, `self-metadata` — actor's variables/fields
- `target:character-variable`, `target:place-variable`, `target:item-variable` — target entity data
- `runtime:event-variable`, `runtime:action-metadata` — runtime context
- `temp-variable` — temporary values during action execution

### Core Engine Functions

| Function | Purpose |
|----------|---------|
| `createRuntimeState(world)` | Clone world declaration into mutable runtime state |
| `buildIndexes(world, state)` | Build lookup maps for fast access |
| `resolveGetter(state, getter, context)` | Resolve getter to value |
| `evaluateConditions(state, conditions, context)` | Evaluate AND/OR/NOT expressions |
| `collectTargets(world, state, action, actorId)` | Find valid targets for an action |
| `buildActionOptions(world, state, actorId, audience)` | Build player/autonomous action choices |
| `startAction(world, state, option)` | Begin action execution |
| `completeDueActions(world, state)` | Finalize actions whose time elapsed |
| `renderEvents(world, state)` | Match events to text templates |
| `getGameView(world, state)` | Current state for UI rendering |
| `createGameEngine(world)` | Full engine API with dispatch/save/load |

### Autonomy System

NPCs use rule-based autonomy with goals and rules:
- Goals: conditions that activate based on priority
- Rules: action selection when goal is active
- `targeting`: `firstValid` or `randomValid`

## Common Patterns

### Adding a New Action

1. Add `ActionDeclaration` to `characterActions` in `world.ts`
2. Add text templates for events the action emits
3. Test with existing engine tests or add new ones

### Adding a New Text Template

Templates match events by `primaryRole`, `event`, and `filters`:
```ts
{
  type: 'text-template',
  name: 'Event Description',
  template: '$roleName/variable$',
  match: {
    primaryRole: 'roleName',
    roles: {
      roleName: { event: 'EVENT_NAME', filters: ['FROM_THE_PLAYER'] }
    }
  },
  priority: 10,
  categories: ['first-person']
}
```

### Adding a Dialogue Tree

Dialogues match by `intent` and character labels:
```ts
{
  type: 'dialogue-tree',
  id: 'unique-id',
  intent: 'intent-name',
  startsAt: 'startNodeId',
  nodes: [{ id: 'startNodeId', speaker: 'target', text: '...', choices: [] }]
}
```

## Important Conventions

- **Never mutate the original world declaration** — always clone with `structuredClone()` or custom `clone()` helpers
- **Runtime state is serializable** — indexes are rebuilt from state, not stored separately
- **Getter failures return structured `{ ok: false, ... }`** — callers decide how to handle
- **Conditions use infix notation** with `AND`, `OR`, `NOT`, `(` `)` and shunting-yard evaluation

## Debugging

- `state.debug` array collects resolver failures and autonomy traces
- `state.eventQueue` holds unconsumed events
- `state.log` contains rendered text lines
- `getGameView()` returns current player perspective