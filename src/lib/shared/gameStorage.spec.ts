import { beforeEach, describe, expect, it } from 'vitest';
import { createRuntimeState } from '$lib/engine';
import { world } from '$lib/data/world';
import {
	compareWorldVersions,
	createSave,
	createSaveId,
	createWorldId,
	deleteSave,
	listSaves,
	listWorlds,
	loadSave,
	loadWorld,
	parseSaveExport,
	parseWorldExport,
	parseSavedState,
	renameSave,
	resetMainWorld,
	saveWorld,
	serializeWorldExport,
	serializeSaveExport,
	updateSave,
	WORLD_INDEX_KEY
} from './gameStorage';

function useMemoryStorage() {
	const values = new Map<string, string>();
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
			removeItem: (key: string) => values.delete(key),
			clear: () => values.clear()
		}
	});
	return values;
}

describe('game storage', () => {
	beforeEach(() => {
		useMemoryStorage().clear();
	});

	it('creates stable ids and avoids collisions', () => {
		expect(createWorldId('A Strange World', ['a-strange-world'])).toBe('a-strange-world-2');
		expect(createSaveId('My Save', ['my-save', 'my-save-2'])).toBe('my-save-3');
	});

	it('loads the bundled main world without storage', () => {
		const result = loadWorld('main');
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.world.name).toBe(world.name);
		expect(listWorlds().some((item) => item.id === 'main')).toBe(true);
	});

	it('does not create duplicate worlds when listing stored worlds', () => {
		const customWorld = { ...world, name: 'Created World', description: 'A custom world' };
		saveWorld('created-world', customWorld);

		const firstList = listWorlds();
		const secondList = listWorlds();

		expect(secondList).toEqual(firstList);
		expect(secondList.filter((item) => item.id !== 'main').map((item) => item.id)).toEqual(['created-world']);
	});

	it('persists and isolates saves by world and slot', () => {
		const first = createSave('main', 'First Save', createRuntimeState(world), world.version);
		const second = createSave('other-world', 'Other Save', createRuntimeState(world), world.version);

		expect(listSaves('main').map((save) => save.slotId)).toEqual([first.slotId]);
		expect(listSaves('other-world').map((save) => save.slotId)).toEqual([second.slotId]);
		expect(loadSave('main', second.slotId).ok).toBe(false);

		expect(renameSave('main', first.slotId, 'Renamed Save')?.name).toBe('Renamed Save');
		expect(deleteSave('other-world', second.slotId)).toBe(true);
		expect(listSaves('other-world')).toEqual([]);
	});

	it('updates an existing save with the current runtime state', () => {
		const state = createRuntimeState(world);
		const save = createSave('main', 'Adventure', state, world.version);
		state.time = 20;
		const updated = updateSave('main', save.slotId, state, world.version);

		expect(updated?.updatedAt).toBeGreaterThanOrEqual(save.updatedAt);
		expect(loadSave('main', save.slotId).ok).toBe(true);
	});

	it('rejects breaking versions and warns for compatible versions', () => {
		expect(compareWorldVersions([1, 0, 0], [2, 0, 0]).compatible).toBe(false);
		expect(compareWorldVersions([1, 0, 0], [1, 1, 0])).toMatchObject({ compatible: true, warning: expect.any(String) });
		expect(compareWorldVersions([1, 0, 0], [1, 0, 0])).toEqual({ compatible: true });
	});

	it('handles malformed saved state and main-world reset', () => {
		expect(parseSavedState('{"invalid":true}')).toBeUndefined();
		createSave('main', 'Adventure', createRuntimeState(world), world.version);
		resetMainWorld();
		const result = loadWorld('main');
		expect(result.ok).toBe(true);
	});

	it('round-trips versioned JSON save exports', () => {
		const save = createSave('main', 'Portable Adventure', createRuntimeState(world), world.version);
		const exported = serializeSaveExport(save);
		const imported = parseSaveExport(exported);

		expect(imported.ok).toBe(true);
		if (imported.ok) {
			expect(imported.payload.worldId).toBe('main');
			expect(imported.payload.saveName).toBe('Portable Adventure');
			expect(imported.payload.state.characters.length).toBe(world.characters.length);
		}
	});

	it('rejects unsupported JSON save files', () => {
		expect(parseSaveExport('{"format":"other-game"}')).toEqual({
			ok: false,
			reason: 'This file is not a supported Story Engine save.'
		});
	});

	it('round-trips versioned JSON world exports', () => {
		const exported = serializeWorldExport(world, 'main');
		const imported = parseWorldExport(exported);

		expect(imported.ok).toBe(true);
		if (imported.ok) {
			expect(imported.payload.worldId).toBe('main');
			expect(imported.payload.worldName).toBe(world.name);
			expect(imported.payload.world).toEqual(world);
		}
	});

	it('rejects unsupported JSON world files', () => {
		expect(parseWorldExport('{"format":"other-game"}')).toEqual({
			ok: false,
			reason: 'This file is not a supported Story Engine world.'
		});
	});
});
