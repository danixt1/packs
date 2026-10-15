import { world as bundledWorld } from '$lib/data/world';
import type { RuntimeState } from '$lib/engine/types';
import type { World } from '$lib/types/data/declarative';

export const MAIN_WORLD_ID = 'main';
export const WORLD_INDEX_KEY = 'game-worlds';
export const WORLD_DATA_PREFIX = 'world-';
export const SAVE_INDEX_KEY = 'game-saves';
export const SAVE_DATA_PREFIX = 'game-save-';

export interface StoredWorldMetadata {
	id: string;
	name: string;
	description: string;
	version: number[];
	createdAt: number;
	updatedAt: number;
	isBundled?: boolean;
}

export interface StoredSaveMetadata {
	worldId: string;
	slotId: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	worldVersion: number[];
}

export interface StoredSave extends StoredSaveMetadata {
	serializedState: string;
}

export interface SaveExportPayload {
	format: 'story-engine-save';
	formatVersion: 1;
	worldId: string;
	saveName: string;
	worldVersion: number[];
	exportedAt: number;
	state: RuntimeState;
}

export interface WorldExportPayload {
	format: 'story-engine-world';
	formatVersion: 1;
	worldId: string;
	worldName: string;
	exportedAt: number;
	world: World;
}

export type WorldLoadResult =
	| { ok: true; world: World; metadata: StoredWorldMetadata }
	| { ok: false; reason: string };

export type SaveLoadResult =
	| { ok: true; save: StoredSave; warning?: string }
	| { ok: false; reason: string };

export type VersionCompatibility =
	| { compatible: true; warning?: string }
	| { compatible: false; reason: string };

function hasBrowserStorage() {
	return typeof localStorage !== 'undefined';
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorld(value: unknown): value is World {
	if (!isRecord(value)
		|| typeof value.name !== 'string'
		|| typeof value.description !== 'string'
		|| !Array.isArray(value.version)
		|| !value.version.every((part) => typeof part === 'number' && Number.isFinite(part))) {
		return false;
	}

	const requiredCollections = ['places', 'characters', 'items', 'actions', 'vars', 'textTemplates'] as const;
	if (!requiredCollections.every((key) => Array.isArray(value[key]) && value[key].every(isRecord))) return false;
	if (value.dialogues !== undefined && (!Array.isArray(value.dialogues) || !value.dialogues.every(isRecord))) return false;
	if (value.displays !== undefined && (!Array.isArray(value.displays) || !value.displays.every(isRecord))) return false;
	return value.editor === undefined || isRecord(value.editor);
}

function normalizeVersion(version: unknown): number[] {
	if (!Array.isArray(version)) return [0, 0, 0];
	return version.slice(0, 3).map((part) => (typeof part === 'number' && Number.isFinite(part) ? part : 0));
}

function readJson<T>(key: string): T | undefined {
	if (!hasBrowserStorage()) return undefined;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : undefined;
	} catch (error) {
		console.warn(`Failed to read local storage key "${key}".`, error);
		return undefined;
	}
}

function writeJson(key: string, value: unknown): boolean {
	if (!hasBrowserStorage()) return false;
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		console.warn(`Failed to write local storage key "${key}".`, error);
		return false;
	}
}

function removeKey(key: string) {
	if (!hasBrowserStorage()) return;
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn(`Failed to remove local storage key "${key}".`, error);
	}
}

function now() {
	return Date.now();
}

export function slugify(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

export function createUniqueId(name: string, existingIds: Iterable<string>, fallback = 'world'): string {
	const base = slugify(name) || fallback;
	const used = new Set(existingIds);
	if (!used.has(base)) return base;
	let suffix = 2;
	while (used.has(`${base}-${suffix}`)) suffix += 1;
	return `${base}-${suffix}`;
}

export function createWorldId(name: string, existingIds: Iterable<string> = []): string {
	return createUniqueId(name, existingIds, 'world');
}

export function createSaveId(name: string, existingIds: Iterable<string> = []): string {
	return createUniqueId(name, existingIds, 'save');
}

export function compareWorldVersions(saved: number[], current: number[]): VersionCompatibility {
	const savedVersion = normalizeVersion(saved);
	const currentVersion = normalizeVersion(current);
	if (savedVersion[0] !== currentVersion[0]) {
		return {
			compatible: false,
			reason: `This save uses world version ${savedVersion.join('.')} but the current world is ${currentVersion.join('.')}.`
		};
	}
	if (savedVersion[1] !== currentVersion[1] || savedVersion[2] !== currentVersion[2]) {
		return {
			compatible: true,
			warning: `This save was created with world version ${savedVersion.join('.')} and is being opened with ${currentVersion.join('.')}.`
		};
	}
	return { compatible: true };
}

function metadataFromWorld(world: World, id: string, previous?: StoredWorldMetadata): StoredWorldMetadata {
	const timestamp = now();
	return {
		id,
		name: world.name,
		description: world.description,
		version: [...world.version],
		createdAt: previous?.createdAt ?? timestamp,
		updatedAt: timestamp,
		isBundled: id === MAIN_WORLD_ID
	};
}

function isWorldMetadata(value: unknown): value is StoredWorldMetadata {
	return isRecord(value)
		&& typeof value.id === 'string'
		&& typeof value.name === 'string'
		&& typeof value.description === 'string'
		&& Array.isArray(value.version)
		&& typeof value.createdAt === 'number'
		&& typeof value.updatedAt === 'number';
}

function isSaveMetadata(value: unknown): value is StoredSaveMetadata {
	return isRecord(value)
		&& typeof value.worldId === 'string'
		&& typeof value.slotId === 'string'
		&& typeof value.name === 'string'
		&& typeof value.createdAt === 'number'
		&& typeof value.updatedAt === 'number'
		&& Array.isArray(value.worldVersion);
}

function isStoredSave(value: unknown): value is StoredSave {
	return isRecord(value)
		&& isSaveMetadata(value)
		&& typeof value.serializedState === 'string';
}

function readWorldMetadata(): StoredWorldMetadata[] {
	const value = readJson<unknown>(WORLD_INDEX_KEY);
	if (!Array.isArray(value)) return [];
	return value.filter(isWorldMetadata).map((metadata) => ({
		...metadata,
		version: normalizeVersion(metadata.version)
	}));
}

function writeWorldMetadata(worlds: StoredWorldMetadata[]) {
	return writeJson(WORLD_INDEX_KEY, worlds);
}

function readSaveMetadata(): StoredSaveMetadata[] {
	const value = readJson<unknown>(SAVE_INDEX_KEY);
	if (!Array.isArray(value)) return [];
	return value.filter(isSaveMetadata).map((metadata) => ({
		...metadata,
		worldVersion: normalizeVersion(metadata.worldVersion)
	}));
}

function writeSaveMetadata(saves: StoredSaveMetadata[]) {
	return writeJson(SAVE_INDEX_KEY, saves);
}

function worldDataKey(worldId: string) {
	return `${WORLD_DATA_PREFIX}${worldId}`;
}

function saveDataKey(worldId: string, slotId: string) {
	return `${SAVE_DATA_PREFIX}${worldId}-${slotId}`;
}

export function listWorlds(): StoredWorldMetadata[] {
	const metadata = readWorldMetadata();
	let bundledMetadata = metadata.find((world) => world.id === MAIN_WORLD_ID);
	if (!bundledMetadata) {
		bundledMetadata = metadataFromWorld(bundledWorld, MAIN_WORLD_ID);
		writeWorldMetadata([...metadata, bundledMetadata]);
	}
	const custom = metadata.filter((world) => world.id !== MAIN_WORLD_ID);
	return [bundledMetadata, ...custom].sort((left, right) => left.name.localeCompare(right.name));
}

export function getWorldMetadata(worldId: string): StoredWorldMetadata | undefined {
	return listWorlds().find((world) => world.id === worldId);
}

export function loadWorld(worldId: string): WorldLoadResult {
	const metadata = getWorldMetadata(worldId);
	if (worldId === MAIN_WORLD_ID) {
		const override = readJson<World>(worldDataKey(MAIN_WORLD_ID));
		if (override && isRecord(override)) {
			return { ok: true, world: clone(override), metadata: metadataFromWorld(override, MAIN_WORLD_ID, metadata) };
		}
		return { ok: true, world: clone(bundledWorld), metadata: metadataFromWorld(bundledWorld, MAIN_WORLD_ID, metadata) };
	}
	if (!metadata) return { ok: false, reason: 'World not found.' };
	const world = readJson<World>(worldDataKey(worldId));
	if (!world || !isRecord(world)) return { ok: false, reason: 'World data is missing or malformed.' };
	return { ok: true, world: clone(world), metadata: metadataFromWorld(world, worldId, metadata) };
}

export function saveWorld(worldId: string, world: World): StoredWorldMetadata {
	const existing = getWorldMetadata(worldId);
	const metadata = metadataFromWorld(world, worldId, existing);
	writeJson(worldDataKey(worldId), world);
	const worlds = readWorldMetadata().filter((item) => item.id !== worldId);
	writeWorldMetadata([...worlds, metadata]);
	return metadata;
}

export function listSaves(worldId: string): StoredSaveMetadata[] {
	return readSaveMetadata()
		.filter((save) => save.worldId === worldId)
		.sort((left, right) => right.updatedAt - left.updatedAt);
}

export function getSaveMetadata(worldId: string, slotId: string): StoredSaveMetadata | undefined {
	return listSaves(worldId).find((save) => save.slotId === slotId);
}

export function createSave(worldId: string, name: string, state: RuntimeState, worldVersion: number[]): StoredSave {
	const existing = listSaves(worldId);
	const slotId = createSaveId(name, existing.map((save) => save.slotId));
	const timestamp = now();
	const save: StoredSave = {
		worldId,
		slotId,
		name: name.trim() || 'New save',
		createdAt: timestamp,
		updatedAt: timestamp,
		worldVersion: normalizeVersion(worldVersion),
		serializedState: JSON.stringify(state)
	};
	writeSave(save);
	return save;
}

export function writeSave(save: StoredSave): boolean {
	const metadata = readSaveMetadata().filter((item) => !(item.worldId === save.worldId && item.slotId === save.slotId));
	const stored = {
		...save,
		worldVersion: normalizeVersion(save.worldVersion)
	};
	const didWriteData = writeJson(saveDataKey(save.worldId, save.slotId), stored);
	const didWriteIndex = writeSaveMetadata([...metadata, {
		worldId: stored.worldId,
		slotId: stored.slotId,
		name: stored.name,
		createdAt: stored.createdAt,
		updatedAt: stored.updatedAt,
		worldVersion: stored.worldVersion
	}]);
	return didWriteData && didWriteIndex;
}

export function updateSave(worldId: string, slotId: string, state: RuntimeState, worldVersion: number[]): StoredSave | undefined {
	const current = loadSave(worldId, slotId);
	if (!current.ok) return undefined;
	const save: StoredSave = {
		...current.save,
		updatedAt: now(),
		worldVersion: normalizeVersion(worldVersion),
		serializedState: JSON.stringify(state)
	};
	writeSave(save);
	return save;
}

export function loadSave(worldId: string, slotId: string): SaveLoadResult {
	const metadata = getSaveMetadata(worldId, slotId);
	if (!metadata) return { ok: false, reason: 'Save not found.' };
	const stored = readJson<unknown>(saveDataKey(worldId, slotId));
	if (!isStoredSave(stored)) return { ok: false, reason: 'Save data is missing or malformed.' };
	const worldResult = loadWorld(worldId);
	if (!worldResult.ok) return { ok: false, reason: worldResult.reason };
	const compatibility = compareWorldVersions(stored.worldVersion, worldResult.world.version);
	if (!compatibility.compatible) return { ok: false, reason: compatibility.reason };
	return { ok: true, save: { ...stored, worldVersion: normalizeVersion(stored.worldVersion) }, warning: compatibility.warning };
}

export function deleteSave(worldId: string, slotId: string): boolean {
	removeKey(saveDataKey(worldId, slotId));
	return writeSaveMetadata(readSaveMetadata().filter((save) => !(save.worldId === worldId && save.slotId === slotId)));
}

export function renameSave(worldId: string, slotId: string, name: string): StoredSaveMetadata | undefined {
	const metadata = getSaveMetadata(worldId, slotId);
	if (!metadata || !name.trim()) return undefined;
	const stored = readJson<unknown>(saveDataKey(worldId, slotId));
	if (!isStoredSave(stored)) return undefined;
	const updated: StoredSave = { ...stored, name: name.trim(), updatedAt: now() };
	writeSave(updated);
	return {
		worldId: updated.worldId,
		slotId: updated.slotId,
		name: updated.name,
		createdAt: updated.createdAt,
		updatedAt: updated.updatedAt,
		worldVersion: normalizeVersion(updated.worldVersion)
	};
}

export function deleteWorld(worldId: string): boolean {
	if (worldId === MAIN_WORLD_ID) return false;
	removeKey(worldDataKey(worldId));
	for (const save of listSaves(worldId)) removeKey(saveDataKey(worldId, save.slotId));
	writeSaveMetadata(readSaveMetadata().filter((save) => save.worldId !== worldId));
	return writeWorldMetadata(readWorldMetadata().filter((world) => world.id !== worldId));
}

export function resetMainWorld(): boolean {
	removeKey(worldDataKey(MAIN_WORLD_ID));
	return writeWorldMetadata(readWorldMetadata().filter((world) => world.id !== MAIN_WORLD_ID));
}

export function parseSavedState(serializedState: string): RuntimeState | undefined {
	try {
		const parsed = JSON.parse(serializedState) as RuntimeState;
		if (!isRecord(parsed) || !Array.isArray(parsed.characters) || !Array.isArray(parsed.places)) return undefined;
		return parsed;
	} catch {
		return undefined;
	}
}

export function serializeSaveExport(save: StoredSave): string {
	const state = parseSavedState(save.serializedState);
	if (!state) throw new Error('The save state is malformed and cannot be exported.');
	const payload: SaveExportPayload = {
		format: 'story-engine-save',
		formatVersion: 1,
		worldId: save.worldId,
		saveName: save.name,
		worldVersion: normalizeVersion(save.worldVersion),
		exportedAt: now(),
		state
	};
	return JSON.stringify(payload, null, 2);
}

export type SaveExportResult =
	| { ok: true; payload: SaveExportPayload }
	| { ok: false; reason: string };

export function parseSaveExport(serialized: string): SaveExportResult {
	try {
		const value = JSON.parse(serialized) as unknown;
		if (!isRecord(value)
			|| value.format !== 'story-engine-save'
			|| value.formatVersion !== 1
			|| typeof value.worldId !== 'string'
			|| typeof value.saveName !== 'string'
			|| !Array.isArray(value.worldVersion)
			|| !('state' in value)) {
			return { ok: false, reason: 'This file is not a supported Story Engine save.' };
		}
		const state = parseSavedState(JSON.stringify(value.state));
		if (!state) return { ok: false, reason: 'The save state in this file is malformed.' };
		return {
			ok: true,
			payload: {
				format: 'story-engine-save',
				formatVersion: 1,
				worldId: value.worldId,
				saveName: value.saveName.trim() || 'Imported save',
				worldVersion: normalizeVersion(value.worldVersion),
				exportedAt: typeof value.exportedAt === 'number' ? value.exportedAt : now(),
				state
			}
		};
	} catch {
		return { ok: false, reason: 'The selected file is not valid JSON.' };
	}
}

export function serializeWorldExport(world: World, worldId: string): string {
	const payload: WorldExportPayload = {
		format: 'story-engine-world',
		formatVersion: 1,
		worldId,
		worldName: world.name,
		exportedAt: now(),
		world: clone(world)
	};
	return JSON.stringify(payload, null, 2);
}

export type WorldExportResult =
	| { ok: true; payload: WorldExportPayload }
	| { ok: false; reason: string };

export function parseWorldExport(serialized: string): WorldExportResult {
	try {
		const value = JSON.parse(serialized) as unknown;
		if (!isRecord(value)
			|| value.format !== 'story-engine-world'
			|| value.formatVersion !== 1
			|| typeof value.worldId !== 'string'
			|| typeof value.worldName !== 'string'
			|| !('world' in value)
			|| !isWorld(value.world)) {
			return { ok: false, reason: 'This file is not a supported Story Engine world.' };
		}
		return {
			ok: true,
			payload: {
				format: 'story-engine-world',
				formatVersion: 1,
				worldId: value.worldId,
				worldName: value.worldName.trim() || value.world.name,
				exportedAt: typeof value.exportedAt === 'number' ? value.exportedAt : now(),
				world: clone(value.world)
			}
		};
	} catch {
		return { ok: false, reason: 'The selected file is not valid JSON.' };
	}
}
