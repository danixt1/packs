# About serialization

All data from world to the current state is serializable.
this data is the input to engine to run the game.

The data workflow of data is:

1. `src/lib/types/data` contains the expected types to input the data.
2. `src/lib/data` contains pre builded data using the expected types.
3. `src/lib/engine/types.ts` contains the types when the engine is running.

The 2 main types are: World(in declarative.d.ts) and RuntimeState( in engine/types.ts).

## Local save files

Gameplay saves are stored locally in the browser and are identified by a world ID and save-slot ID. A save slot stores the serialized `RuntimeState`, the save display name, timestamps, and the world version used to create it.

The gameplay menu supports multiple slots through `Save > Save as new file` and `Load`. `Save` updates the current slot, while `Save as new file` creates a separate slot without replacing the current one.

The `Export JSON save` action creates a versioned `story-engine-save` JSON document. `Import JSON save` accepts that document, checks that it belongs to the active world, verifies the world-version compatibility, and creates a new local slot. Save files are local to the browser profile; exporting is the way to move a save between profiles or devices.

## World interface

Encapsulate all informations of how the world should by generated in runtime.

### Actions

Actions are stored in one `World.actions` collection. The `availableTo` field
controls which audience can select an action:

- `availableTo: ['player']` makes an action player-only.
- `availableTo: ['autonomous']` makes an action available only to autonomous
	characters.
- `availableTo: ['player', 'autonomous']` shares an action with both audiences.
- When `availableTo` is omitted, the action is player-only for compatibility
	with the original action behavior.

Player actions still need a `display` declaration to appear in the player UI.
Autonomous actions do not need a display. Action names must be unique across
`World.actions`, because autonomy rules and action lifecycle execution resolve
declarations by name.