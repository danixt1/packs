import type {ResolveContext, ResolvedValue, RuntimeCharacter, RuntimeItem, RuntimePlace, RuntimeState, RuntimeVariable,RuntimeGetter } from "./types";

const isGetter = (value: unknown): value is RuntimeGetter =>
	typeof value === 'object' && value !== null && (value as { type?: string }).type === 'getter';

function findVar(vars: RuntimeVariable[], name: string) {
	return vars.find((variable) => variable.name === name);
}

function getSelf(state: RuntimeState, context: ResolveContext) {
	if (!context.self) return undefined;
	if (typeof context.self === 'string') return state.characters.find((character) => character.id === context.self);
	return context.self;
}
function targetEntity(state: RuntimeState, context: ResolveContext, targetKind?: string) {
    const target = context.target;
    if (!target) return undefined;
    if (target.type === 'self') return state.characters.find((character) => character.id === target.id);
    if (targetKind === 'character' && target.type === 'character') return state.characters.find((character) => character.id === target.id);
    if (targetKind === 'place' && target.type === 'place') return state.places.find((place) => place.id === target.id);
    if (targetKind === 'item' && target.type === 'item') return state.items.find((item) => item.id === target.id);
    return undefined;
}
function characterMetadata(character: RuntimeCharacter, variable: string) {
    if (variable === 'id') return character.id;
    if (variable === 'name') return character.name;
    if (variable === 'idPlace' || variable === 'placeId') return character.placeId;
    if (variable === 'isPlayer') return character.controlledByPlayer;
    if (variable === 'isObserved') return true;
    return undefined;
}

function placeMetadata(place: RuntimePlace, variable: string) {
    if (variable === 'id') return place.id;
    if (variable === 'name') return place.name;
    if (variable === 'description') return place.description;
    return undefined;
}

function itemMetadata(item: RuntimeItem, variable: string) {
    if (variable === 'id') return item.id;
    if (variable === 'name') return item.name;
    if (variable === 'description') return item.description;
    return undefined;
}

function ok(value: string | number | boolean | undefined, path: string, variable?: RuntimeVariable): ResolvedValue {
    return value === undefined ? { ok: false, path, reason: 'missing' } : { ok: true, value, path, variable };
}
export function resolveGetter(state: RuntimeState, getterOrLiteral: any, context: ResolveContext = {}): ResolvedValue {
    if (!isGetter(getterOrLiteral)) return { ok: true, value: getterOrLiteral };
    const getter = getterOrLiteral;
    const fail = (reason: string): ResolvedValue => {
        if (getter.fallback !== undefined) return { ok: true, value: getter.fallback, path: `${getter.in}:${getter.variable}` };
        const message = `Could not resolve ${getter.in}:${getter.variable} (${reason})`;
        (context.debug ?? state.debug).push(message);
        return { ok: false, path: `${getter.in}:${getter.variable}`, reason };
    };

    if (getter.in === 'world-variable') {
        const variable = findVar(state.world, getter.variable);
        return variable ? ok(variable.value, `world:${getter.variable}`, variable) : fail('missing world variable');
    }

    if (getter.in === 'temp-variable') {
        const value = context.temp?.[getter.variable];
        return value !== undefined ? ok(value, `temp:${getter.variable}`) : fail('missing temp variable');
    }

    if (getter.in === 'self-variable' || getter.in === 'self-metadata') {
        const self = getSelf(state, context);
        if (!self) return fail('missing self');
        if (getter.in === 'self-variable') {
            const variable = findVar(self.vars, getter.variable);
            if (variable) return ok(variable.value, `self:${self.id}:${getter.variable}`, variable);
            const meta = characterMetadata(self, getter.variable);
            return meta !== undefined ? ok(meta, `self:${self.id}:${getter.variable}`) : fail('missing self variable');
        }
        return ok(characterMetadata(self, getter.variable), `self:${self.id}:${getter.variable}`);
    }

    if (getter.in === 'target:character-variable' || getter.in === 'target:character-metadata') {
        const character = targetEntity(state, context, 'character') as RuntimeCharacter | undefined;
        if (!character) return fail('missing target character');
        if (getter.in.endsWith('-variable')) {
            const variable = findVar(character.vars, getter.variable);
            return variable ? ok(variable.value, `target:character:${character.id}:${getter.variable}`, variable) : fail('missing target character variable');
        }
        return ok(characterMetadata(character, getter.variable), `target:character:${character.id}:${getter.variable}`);
    }

    if (getter.in === 'target:character/place-variable' || getter.in === 'target:character/place-metadata') {
        const character = targetEntity(state, context, 'character') as RuntimeCharacter | undefined;
        const place = character ? state.places.find((candidate) => candidate.id === character.placeId) : undefined;
        if (!place) return fail('missing target character place');
        if (getter.in.endsWith('-variable')) {
            const variable = findVar(place.vars, getter.variable);
            return variable ? ok(variable.value, `target:character-place:${place.id}:${getter.variable}`, variable) : fail('missing target character place variable');
        }
        return ok(placeMetadata(place, getter.variable), `target:character-place:${place.id}:${getter.variable}`);
    }

    if (getter.in === 'target:place-variable' || getter.in === 'target:place-metadata') {
        const place = targetEntity(state, context, 'place') as RuntimePlace | undefined;
        if (!place) return fail('missing target place');
        if (getter.in.endsWith('-variable')) {
            const variable = findVar(place.vars, getter.variable);
            return variable ? ok(variable.value, `target:place:${place.id}:${getter.variable}`, variable) : fail('missing target place variable');
        }
        return ok(placeMetadata(place, getter.variable), `target:place:${place.id}:${getter.variable}`);
    }

    if (getter.in === 'target:item-variable' || getter.in === 'target:item-metadata') {
        const item = targetEntity(state, context, 'item') as RuntimeItem | undefined;
        if (!item) return fail('missing target item');
        if (getter.in.endsWith('-variable')) {
            const variable = findVar(item.vars, getter.variable);
            return variable ? ok(variable.value, `target:item:${item.id}:${getter.variable}`, variable) : fail('missing target item variable');
        }
        return ok(itemMetadata(item, getter.variable), `target:item:${item.id}:${getter.variable}`);
    }

    if (getter.in === 'runtime:action-metadata') {
        const action = context.actionRuntime;
        if (!action) return fail('missing action runtime');
        if (getter.variable === 'actionName') return ok(action.actionName, 'runtime:action:actionName');
        if (getter.variable === 'executionTime') return ok(action.executionTime, 'runtime:action:executionTime');
        if (getter.variable === 'isFromPlayer') return ok(action.isFromPlayer, 'runtime:action:isFromPlayer');
        if (getter.variable.startsWith('hasCategory:')) return ok(Boolean(action.categories?.includes(getter.variable.slice(12))), `runtime:action:${getter.variable}`);
        return fail('missing action metadata');
    }
    if(getter.in === 'runtime:event-variable') {
        const event = context.event;
        if (!event) return fail('missing event data');
        const data = event.data;
        if (getter.variable in data) return ok(data[getter.variable], `runtime:event:${getter.variable}`);
        return fail('missing event variable');
    }
    if (getter.in === 'runtime:event-metadata') {
        const event = context.eventRuntime;
        if (!event) return fail('missing event runtime');
        if (getter.variable === 'event') return ok(event.event, 'runtime:event:event');
        if (getter.variable === 'actorId') return ok(event.actorId, 'runtime:event:actorId');
        if (getter.variable === 'targetId') return ok(event.targetId, 'runtime:event:targetId');
        if (getter.variable === 'placeId') return ok(event.placeId, 'runtime:event:placeId');
        return fail('missing event metadata');
    }
    if (getter.in === 'runtime:autonomy-metadata' || getter.in === 'runtime:autonomy-variable') {
        const self = getSelf(state, context);
        if (!self) return fail('missing autonomy self');
        if (getter.in.endsWith('-metadata')) {
            const runtime = context.autonomyRuntime ?? {};
            if (getter.variable in runtime) return ok(runtime[getter.variable], `runtime:autonomy:${getter.variable}`);
            if (getter.variable === 'currentGoal') return ok(self.autonomyState.currentGoal, 'runtime:autonomy:currentGoal');
            if (getter.variable === 'lastActionName') return ok(self.autonomyState.lastActionName, 'runtime:autonomy:lastActionName');
            if (getter.variable === 'cycle') return ok(self.autonomyState.cycle, 'runtime:autonomy:cycle');
            return fail('missing autonomy metadata');
        }
        const variable = findVar(self.autonomyMemory, getter.variable);
        return variable ? ok(variable.value, `runtime:autonomy-memory:${getter.variable}`, variable) : fail('missing autonomy variable');
    }

    return fail('unsupported getter source');
}