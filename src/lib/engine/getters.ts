import type {
	ResolveContext,
	ResolvedValue,
	RuntimeCharacter,
	RuntimeItem,
	RuntimePlace,
	RuntimeState,
	RuntimeVariable,
	RuntimeGetter
} from './types';

// --- Type guards ---

const isGetter = (value: unknown): value is RuntimeGetter =>
	typeof value === 'object' && value !== null && (value as { type?: string }).type === 'getter';

// --- Metadata resolver maps ---

const CHARACTER_METADATA: Record<string, (c: RuntimeCharacter) => string | number | boolean | undefined> = {
	id: (c) => c.id,
	name: (c) => c.name,
	idPlace: (c) => c.placeId,
	placeId: (c) => c.placeId,
	isPlayer: (c) => c.controlledByPlayer,
	isObserved: () => true,
};

const PLACE_METADATA: Record<string, (p: RuntimePlace) => string | number | boolean | undefined> = {
	id: (p) => p.id,
	name: (p) => p.name,
	description: (p) => p.description,
};

const ITEM_METADATA: Record<string, (i: RuntimeItem) => string | number | boolean | undefined> = {
	id: (i) => i.id,
	name: (i) => i.name,
	description: (i) => i.description,
};

// --- Helper functions ---

function findVar(vars: RuntimeVariable[], name: string): RuntimeVariable | undefined {
	return vars.find((v) => v.name === name);
}

function getSelf(state: RuntimeState, context: ResolveContext): RuntimeCharacter | undefined {
	if (!context.self) return undefined;
	if (typeof context.self === 'string') return state.characters.find((c) => c.id === context.self);
	return context.self;
}

function targetEntity<T extends RuntimeCharacter | RuntimePlace | RuntimeItem>(
	state: RuntimeState,
	context: ResolveContext,
	targetKind: 'character' | 'place' | 'item'
): T | undefined {
	const target = context.target;
	if (!target) return undefined;
	if (target.type === 'self') return state.characters.find((c) => c.id === target.id) as T | undefined;
	if (targetKind === 'character' && target.type === 'character') return state.characters.find((c) => c.id === target.id) as T | undefined;
	if (targetKind === 'place' && target.type === 'place') return state.places.find((p) => p.id === target.id) as T | undefined;
	if (targetKind === 'item' && target.type === 'item') return state.items.find((i) => i.id === target.id) as T | undefined;
	return undefined;
}

function resolveEntityVariable<T extends RuntimeVariable[]>(
	entity: { id: string; vars: T } | undefined,
	variable: string,
	pathPrefix: string
): ResolvedValue {
	if (!entity) return { ok: false, path: pathPrefix, reason: 'missing' };
	const found = findVar(entity.vars, variable);
	if (found) return { ok: true, value: found.value, path: `${pathPrefix}:${variable}`, variable: found };
	return { ok: false, path: `${pathPrefix}:${variable}`, reason: 'missing' };
}

function resolveEntityMetadata<T extends Record<string, (e: any) => string | number | boolean | undefined>>(
	entity: any,
	metadataMap: T,
	variable: string,
	pathPrefix: string
): ResolvedValue {
	const resolver = metadataMap[variable];
	if (!resolver) return { ok: false, path: pathPrefix, reason: 'missing' };
	const value = resolver(entity);
	return value === undefined ? { ok: false, path: pathPrefix, reason: 'missing' } : { ok: true, value, path: `${pathPrefix}:${variable}` };
}

function ok(value: string | number | boolean | undefined, path: string, variable?: RuntimeVariable): ResolvedValue {
	return value === undefined ? { ok: false, path, reason: 'missing' } : { ok: true, value, path, variable };
}

// --- Getter source dispatch ---

type GetterHandler = (state: RuntimeState, getter: RuntimeGetter, context: ResolveContext) => ResolvedValue;

const GETTER_HANDLERS: Record<string, GetterHandler> = {
	'world-variable': (state, getter) => {
		const variable = findVar(state.world, getter.variable);
		if (variable) return ok(variable.value, `world-variable:${getter.variable}`, variable);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `world-variable:${getter.variable}` };
		return { ok: false, path: `world-variable:${getter.variable}`, reason: 'missing world variable' };
	},

	'temp-variable': (state, getter, context) => {
		const value = context.temp?.[getter.variable];
		if (value !== undefined) return ok(value, `temp-variable:${getter.variable}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `temp-variable:${getter.variable}` };
		return { ok: false, path: `temp-variable:${getter.variable}`, reason: 'missing temp variable' };
	},

	'self-variable': (state, getter, context) => {
		const self = getSelf(state, context);
		if (!self) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `self:${getter.variable}` };
			return { ok: false, path: `self:${getter.variable}`, reason: 'missing self' };
		}
		const result = resolveEntityVariable(self, getter.variable, `self:${self.id}`);
		if (result.ok) return result;
		const metaResult = resolveEntityMetadata(self, CHARACTER_METADATA, getter.variable, `self:${self.id}`);
		if (metaResult.ok) return metaResult;
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `self:${self.id}:${getter.variable}` };
		return { ok: false, path: `self:${self.id}:${getter.variable}`, reason: 'missing self variable' };
	},

	'self-metadata': (state, getter, context) => {
		const self = getSelf(state, context);
		if (!self) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `self:${getter.variable}` };
			return { ok: false, path: `self:${getter.variable}`, reason: 'missing self' };
		}
		const result = resolveEntityMetadata(self, CHARACTER_METADATA, getter.variable, `self:${self.id}`);
		if (result.ok) return result;
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `self:${self.id}:${getter.variable}` };
		return { ok: false, path: `self:${self.id}:${getter.variable}`, reason: 'missing self metadata' };
	},

	'target:character-variable': (state, getter, context) => {
		const character = targetEntity<RuntimeCharacter>(state, context, 'character');
		if (character) return resolveEntityVariable(character, getter.variable, `target:character:${character.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:character:${getter.variable}` };
		return { ok: false, path: `target:character:${getter.variable}`, reason: 'missing target character' };
	},

	'target:character-metadata': (state, getter, context) => {
		const character = targetEntity<RuntimeCharacter>(state, context, 'character');
		if (character) return resolveEntityMetadata(character, CHARACTER_METADATA, getter.variable, `target:character:${character.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:character:${getter.variable}` };
		return { ok: false, path: `target:character:${getter.variable}`, reason: 'missing target character' };
	},

	'target:character/place-variable': (state, getter, context) => {
		const character = targetEntity<RuntimeCharacter>(state, context, 'character');
		if (!character) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:character-place:${getter.variable}` };
			return { ok: false, path: `target:character-place:${getter.variable}`, reason: 'missing target character' };
		}
		const place = state.places.find((p) => p.id === character.placeId);
		if (place) return resolveEntityVariable(place, getter.variable, `target:character-place:${place.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:character-place:${getter.variable}` };
		return { ok: false, path: `target:character-place:${getter.variable}`, reason: 'missing target character place' };
	},

	'target:character/place-metadata': (state, getter, context) => {
		const character = targetEntity<RuntimeCharacter>(state, context, 'character');
		if (!character) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:character-place:${getter.variable}` };
			return { ok: false, path: `target:character-place:${getter.variable}`, reason: 'missing target character' };
		}
		const place = state.places.find((p) => p.id === character.placeId);
		if (place) return resolveEntityMetadata(place, PLACE_METADATA, getter.variable, `target:character-place:${place.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:character-place:${getter.variable}` };
		return { ok: false, path: `target:character-place:${getter.variable}`, reason: 'missing target character place' };
	},

	'target:place-variable': (state, getter, context) => {
		const place = targetEntity<RuntimePlace>(state, context, 'place');
		if (place) return resolveEntityVariable(place, getter.variable, `target:place:${place.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:place:${getter.variable}` };
		return { ok: false, path: `target:place:${getter.variable}`, reason: 'missing target place' };
	},

	'target:place-metadata': (state, getter, context) => {
		const place = targetEntity<RuntimePlace>(state, context, 'place');
		if (place) return resolveEntityMetadata(place, PLACE_METADATA, getter.variable, `target:place:${place.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:place:${getter.variable}` };
		return { ok: false, path: `target:place:${getter.variable}`, reason: 'missing target place' };
	},

	'target:item-variable': (state, getter, context) => {
		const item = targetEntity<RuntimeItem>(state, context, 'item');
		if (item) return resolveEntityVariable(item, getter.variable, `target:item:${item.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:item:${getter.variable}` };
		return { ok: false, path: `target:item:${getter.variable}`, reason: 'missing target item' };
	},

	'target:item-metadata': (state, getter, context) => {
		const item = targetEntity<RuntimeItem>(state, context, 'item');
		if (item) return resolveEntityMetadata(item, ITEM_METADATA, getter.variable, `target:item:${item.id}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `target:item:${getter.variable}` };
		return { ok: false, path: `target:item:${getter.variable}`, reason: 'missing target item' };
	},

	'runtime:action-metadata': (state, getter, context) => {
		const action = context.actionRuntime;
		if (!action) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:action:${getter.variable}` };
			return { ok: false, path: `runtime:action:${getter.variable}`, reason: 'missing action runtime' };
		}
		if (getter.variable === 'actionName') return ok(action.actionName, 'runtime:action:actionName');
		if (getter.variable === 'executionTime') return ok(action.executionTime, 'runtime:action:executionTime');
		if (getter.variable === 'isFromPlayer') return ok(action.isFromPlayer, 'runtime:action:isFromPlayer');
		if (getter.variable.startsWith('hasCategory:')) {
			return ok(Boolean(action.categories?.includes(getter.variable.slice(12))), `runtime:action:${getter.variable}`);
		}
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:action:${getter.variable}` };
		return { ok: false, path: `runtime:action:${getter.variable}`, reason: 'missing action metadata' };
	},

	'runtime:event-variable': (state, getter, context) => {
		const event = context.event;
		if (!event) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:event:${getter.variable}` };
			return { ok: false, path: `runtime:event:${getter.variable}`, reason: 'missing event data' };
		}
		const data = event.data as Record<string, string | number | boolean>;
		if (getter.variable in data) return ok(data[getter.variable], `runtime:event:${getter.variable}`);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:event:${getter.variable}` };
		return { ok: false, path: `runtime:event:${getter.variable}`, reason: 'missing event variable' };
	},

	'runtime:event-metadata': (state, getter, context) => {
		const event = context.eventRuntime;
		if (!event) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:event:${getter.variable}` };
			return { ok: false, path: `runtime:event:${getter.variable}`, reason: 'missing event runtime' };
		}
		if (getter.variable === 'event') return ok(event.event, 'runtime:event:event');
		if (getter.variable === 'actorId') return ok(event.actorId, 'runtime:event:actorId');
		if (getter.variable === 'targetId') return ok(event.targetId, 'runtime:event:targetId');
		if (getter.variable === 'placeId') return ok(event.placeId, 'runtime:event:placeId');
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:event:${getter.variable}` };
		return { ok: false, path: `runtime:event:${getter.variable}`, reason: 'missing event metadata' };
	},

	'runtime:autonomy-metadata': (state, getter, context) => {
		const self = getSelf(state, context);
		if (!self) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:autonomy:${getter.variable}` };
			return { ok: false, path: `runtime:autonomy:${getter.variable}`, reason: 'missing autonomy self' };
		}
		const runtime = context.autonomyRuntime ?? {};
		if (getter.variable in runtime) return ok(runtime[getter.variable], `runtime:autonomy:${getter.variable}`);
		if (getter.variable === 'currentGoal') return ok(self.autonomyState.currentGoal, 'runtime:autonomy:currentGoal');
		if (getter.variable === 'lastActionName') return ok(self.autonomyState.lastActionName, 'runtime:autonomy:lastActionName');
		if (getter.variable === 'cycle') return ok(self.autonomyState.cycle, 'runtime:autonomy:cycle');
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:autonomy:${getter.variable}` };
		return { ok: false, path: `runtime:autonomy:${getter.variable}`, reason: 'missing autonomy metadata' };
	},

	'runtime:autonomy-variable': (state, getter, context) => {
		const self = getSelf(state, context);
		if (!self) {
			if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:autonomy-memory:${getter.variable}` };
			return { ok: false, path: `runtime:autonomy-memory:${getter.variable}`, reason: 'missing autonomy self' };
		}
		const variable = findVar(self.autonomyMemory, getter.variable);
		if (variable) return ok(variable.value, `runtime:autonomy-memory:${getter.variable}`, variable);
		if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `runtime:autonomy-memory:${getter.variable}` };
		return { ok: false, path: `runtime:autonomy-memory:${getter.variable}`, reason: 'missing autonomy variable' };
	},
};

// --- Main resolver ---

export function resolveGetter(state: RuntimeState, getterOrLiteral: any, context: ResolveContext = {}): ResolvedValue {
	// Fast path: literal values
	if (!isGetter(getterOrLiteral)) return { ok: true, value: getterOrLiteral };

	const getter = getterOrLiteral;
	const handler = GETTER_HANDLERS[getter.in];

	if (handler) return handler(state, getter, context);

	// Fallback: check for fallback value
	if (getter.fallback !== undefined) {
		return { ok: true, value: getter.fallback, path: `${getter.in}:${getter.variable}` };
	}

	const message = `Could not resolve ${getter.in}:${getter.variable} (unsupported getter source)`;
	(context.debug ?? state.debug).push(message);
	return { ok: false, path: `${getter.in}:${getter.variable}`, reason: 'unsupported getter source' };
}