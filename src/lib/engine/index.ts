import type {
	ActionOption,
	ActiveDialogue,
	DialogueView,
	DisplayAttribute,
	Engine,
	GameCommand,
	GameView,
	ResolveContext,
	RuntimeEvent,
	RuntimeItem,
	RuntimeState,
	RuntimeTarget,
	RunningAction,
	VarDisplayView,
	WorldIndexes,
	RuntimeCharacter
} from './types';
import { runAutonomy } from './autonomy';
import { resolveGetter } from './getters';
import type { Character, World } from '$lib/types/data/declarative';

const clone = <T>(value: T): T => structuredClone(value);
const isGetter = (value: unknown): value is { type: 'getter'; in: string; variable: string; fallback?: string | number | boolean } =>
	typeof value === 'object' && value !== null && (value as { type?: string }).type === 'getter';

const optionSeparator = '|';

export function createRuntimeState(world: World): RuntimeState {
	const placeByCharacter = new Map<string, string>();
	for (const place of world.places ?? []) {
		for (const characterId of place.charactersId ?? []) placeByCharacter.set(characterId, place.id);
	}

	return {
		time: 0,
		world: clone(world.vars ?? []),
		places: (world.places ?? []).map((place: any) => ({
			id: place.id,
			name: place.name,
			description: place.description,
			connectedPlaces: [...(place.connectedPlaces ?? [])],
			vars: clone(place.vars ?? []),
			charactersId: [...(place.charactersId ?? [])]
		})),
		characters: (world.characters ?? []).map((character: Character) => ({
			id: character.id,
			name: character.name,
			labels: [...(character.labels ?? [])],
			vars: clone(character.vars ?? []),
			displayAttributes:[],
			displayVariables:[],
			controlledByPlayer: Boolean(character.controlledByPlayer),
			playableStatus: character.playableStatus,
			placeId: placeByCharacter.get(character.id) ?? '',
			autonomy: clone(character.autonomy ?? null),
			autonomyMemory: clone(character.autonomy?.memory ?? []),
			autonomyState: {
				lastDecisionTime: 0,
				cycle: 0,
				cooldowns: {}
			}
		})),
		items: (world.items ?? []).map((item: any) => ({
			id: item.id,
			name: item.name,
			description: item.description,
			vars: clone(item.vars ?? []),
			location: item.location ? clone(item.location) : { type: 'nowhere' }
		})),
		runningActions: [],
		eventQueue: [],
		log: [],
		nextSequence: 1,
		debug: []
	};
}

export function buildIndexes(world: any, state: RuntimeState): WorldIndexes {
	const places = new Map(state.places.map((place) => [place.id, place]));
	const characters = new Map(state.characters.map((character) => [character.id, character]));
	const items = new Map(state.items.map((item) => [item.id, item]));
	const itemsByPlace = new Map<string, RuntimeItem[]>();
	const itemsByCharacter = new Map<string, RuntimeItem[]>();

	for (const item of state.items) {
		if (item.location.type === 'place') {
			itemsByPlace.set(item.location.id, [...(itemsByPlace.get(item.location.id) ?? []), item]);
		}
		if (item.location.type === 'character') {
			itemsByCharacter.set(item.location.id, [...(itemsByCharacter.get(item.location.id) ?? []), item]);
		}
	}

	const actions = new Map<string, any>();
	for (const action of [...(world.characterActions ?? []), ...(world.autonomousActions ?? [])]) {
		actions.set(action.name, action);
	}

	const dialogues = new Map<string, any>();
	const dialoguesByIntent = new Map<string, any[]>();
	for (const dialogue of world.dialogues ?? []) {
		dialogues.set(dialogue.id, dialogue);
		dialoguesByIntent.set(dialogue.intent, [...(dialoguesByIntent.get(dialogue.intent) ?? []), dialogue]);
	}

	const templatesByEvent = new Map<string, any[]>();
	for (const template of world.textTemplates ?? []) {
		for (const role of Object.values(template.match?.roles ?? {}) as any[]) {
			templatesByEvent.set(role.event, [...(templatesByEvent.get(role.event) ?? []), template]);
		}
	}

	return { places, characters, items, itemsByPlace, itemsByCharacter, actions, dialogues, dialoguesByIntent, templatesByEvent };
}

function getSelf(state: RuntimeState, context: ResolveContext) {
	if (!context.self) return undefined;
	if (typeof context.self === 'string') return state.characters.find((character) => character.id === context.self);
	return context.self;
}


function compare(left: any, operator: string, right: any) {
	if (operator === '==') return left === right;
	if (operator === '!=') return left !== right;
	if (operator === '>') return Number(left) > Number(right);
	if (operator === '<') return Number(left) < Number(right);
	return false;
}

function evaluateConditionToken(state: RuntimeState, token: any, context: ResolveContext) {
	if (token.type === 'condition-relational') {
		const left = resolveGetter(state, token.left, context);
		const right = resolveGetter(state, token.right, context);
		return left.ok && right.ok ? compare(left.value, token.operator, right.value) : false;
	}
	if (token.type === 'condition-exists') return resolveGetter(state, token.variableToCheck, context).ok;
	if (token.type === 'condition-is-valid') {
		const resolved = resolveGetter(state, token.variableToCheck, context);
		return resolved.ok && Boolean(resolved.value);
	}
	return false;
}

export function evaluateConditions(state: RuntimeState, conditions: any[] = [], context: ResolveContext = {}) {
	if (!conditions.length) return true;
	const precedence: Record<string, number> = { OR: 1, AND: 2, NOT: 3 };
	const output: any[] = [];
	const operators: string[] = [];

	for (const token of conditions) {
		if (typeof token === 'string') {
			if (token === '(') operators.push(token);
			else if (token === ')') {
				while (operators.length && operators.at(-1) !== '(') output.push(operators.pop());
				operators.pop();
			} else {
				while (operators.length && operators.at(-1) !== '(' && precedence[operators.at(-1) ?? ''] >= precedence[token]) {
					output.push(operators.pop());
				}
				operators.push(token);
			}
		} else {
			output.push(token);
		}
	}
	while (operators.length) output.push(operators.pop());

	const stack: boolean[] = [];
	for (const token of output) {
		if (typeof token === 'string') {
			if (token === 'NOT') stack.push(!Boolean(stack.pop()));
			if (token === 'AND') stack.push(Boolean(stack.pop()) && Boolean(stack.pop()));
			if (token === 'OR') stack.push(Boolean(stack.pop()) || Boolean(stack.pop()));
		} else {
			stack.push(evaluateConditionToken(state, token, context));
		}
	}
	return Boolean(stack.pop());
}

function writeVariable(state: RuntimeState, variableGetter: any, value: any, mode: string, context: ResolveContext, rng = Math.random) {
	const resolved = resolveGetter(state, variableGetter, context);
	if (!resolved.ok || !resolved.variable) {
		state.debug.push(`Cannot write ${variableGetter?.in}:${variableGetter?.variable}`);
		return false;
	}
	let incoming = value;
	if (typeof value === 'object' && value?.type === 'random-interval') {
		incoming = Math.floor(rng() * (value.max - value.min + 1)) + value.min;
		if (value.tempVarName && context.temp) context.temp[value.tempVarName] = incoming;
	}
	if (typeof value === 'object' && value?.type === 'random-value') {
		incoming = value.values[Math.floor(rng() * value.values.length)];
		if (value.tempVarName && context.temp) context.temp[value.tempVarName] = incoming;
	}
	if (isGetter(incoming)) incoming = resolveGetter(state, incoming, context).value;

	const current = resolved.variable.value;
	if (mode === 'set') resolved.variable.value = incoming;
	if (mode === 'increment') resolved.variable.value = Number(current) + Number(incoming);
	if (mode === 'decrement') resolved.variable.value = Number(current) - Number(incoming);
	if (mode === 'multiply') resolved.variable.value = Number(current) * Number(incoming);
	if (mode === 'divide') resolved.variable.value = Number(current) / Number(incoming);
	if (resolved.variable.type === 'number') {
		if (resolved.variable.min !== undefined) resolved.variable.value = Math.max(resolved.variable.min, Number(resolved.variable.value));
		if (resolved.variable.max !== undefined) resolved.variable.value = Math.min(resolved.variable.max, Number(resolved.variable.value));
	}
	return true;
}

export function collectTargets(world: any, state: RuntimeState, action: any, actorId: string) {
	if (!evaluateConditions(state, action.activationConditions ?? [], { self: actorId })) return [];
	const targets: RuntimeTarget[] = [];
	const seen = new Set<string>();
	const add = (target: RuntimeTarget) => {
		const key = `${target.type}:${target.id}`;
		if (!seen.has(key)) {
			seen.add(key);
			targets.push(target);
		}
	};

	for (const collector of action.targets ?? []) {
		if (collector.target === 'self') add({ type: 'self', id: actorId });
		if (collector.target === 'connectedPlaces') {
			const fromPlaceId = resolveGetter(state, collector.fromPlaceId, { self: actorId }).value as string;
			const place = state.places.find((candidate) => candidate.id === fromPlaceId);
			for (const id of place?.connectedPlaces ?? []) add({ type: 'place', id });
		}
		if (collector.target === 'character') {
			for (const character of state.characters) {
				const target = { type: 'character', id: character.id } as const;
				if (evaluateConditions(state, collector.collectIf ?? [], { self: actorId, target })) add(target);
			}
		}
		if (collector.target === 'place') {
			for (const place of state.places) {
				const target = { type: 'place', id: place.id } as const;
				if (evaluateConditions(state, collector.collectIf ?? [], { self: actorId, target })) add(target);
			}
		}
		if (collector.target === 'item') {
			for (const item of state.items) {
				const target = { type: 'item', id: item.id } as const;
				if (evaluateConditions(state, collector.collectIf ?? [], { self: actorId, target })) add(target);
			}
		}
	}
	return targets;
}

function renderTemplateText(state: RuntimeState, template: string, context: ResolveContext) {
	return template.replace(/\$([^$]+)\$/g, (_, path: string) => {
		const lastColon = path.lastIndexOf(':');
		const variable = path.slice(lastColon + 1);
		const source = path.slice(0, lastColon);
		const normalizedGetter = { type: 'getter', in: source, variable };
		const resolved = resolveGetter(state, normalizedGetter, context);
		return resolved.ok ? String(resolved.value) : '';
	});
}

export function buildActionOptions(world: any, state: RuntimeState, actorId: string, audience: 'player' | 'autonomous' = 'player') {
	const actions = audience === 'autonomous' ? [...(world.characterActions ?? []), ...(world.autonomousActions ?? [])] : world.characterActions ?? [];
	const options: ActionOption[] = [];

	for (const action of actions) {
		const availableTo = action.availableTo ?? ['player'];
		if (!availableTo.includes(audience)) continue;
		if (audience === 'player' && !action.display) continue;

		const activationPassed = evaluateConditions(state, action.activationConditions ?? [], { self: actorId });
		if (!activationPassed && !action.attributes?.includes('showAsLockedInUI')) continue;
		const targets = activationPassed ? collectTargets(world, state, action, actorId) : [];
		if (!targets.length && !action.targets?.some((collector: any) => collector.target === 'self')) {
			if (!action.attributes?.includes('showAsLockedInUI')) continue;
		}

		const buildMode = action.buildMode ?? 'oneActionPerTarget';
		const groups =
			buildMode === 'oneActionPerTarget'
				? targets.map((target) => [target])
				: buildMode === 'oneActionPerTargetType'
					? Object.values(Object.groupBy(targets, (target) => target.type))
					: [targets];

		for (const group of groups as RuntimeTarget[][]) {
			if (!group?.length) continue;
			const context = { self: actorId, target: group[0] };
			const suffix = group.map((target) => `${target.type}:${target.id}`).join(',');
			options.push({
				id: [actorId, action.name, buildMode, suffix].join(optionSeparator),
				name: renderTemplateText(state, action.display?.name ?? action.name, context),
				description: action.display?.description ?? action.description,
				locked: !activationPassed,
				actionName: action.name,
				actorId,
				targets: group,
				executionTime: action.executionTime ?? 0,
				buildMode,
				availableTo: audience
			});
		}
	}

	if (audience === 'player' && options.length == 0) {
		options.push({
			id: [actorId, '__wait', 'oneActionPerTarget', 'self:' + actorId].join(optionSeparator),
			name: 'Wait',
			description: 'Wait for a few minutes.',
			locked: false,
			actionName: '__wait',
			actorId,
			targets: [{ type: 'self', id: actorId }],
			executionTime: 10,
			buildMode: 'oneActionPerTarget',
			availableTo: 'player'
		});
	}

	return options;
}

function actionDeclaration(world: any, name: string) {
	if (name === '__wait') {
		return { name: '__wait', executionTime: 10, targets: [{ type: 'collector', target: 'self' }], onActivate: [], onComplete: [], activationConditions: [] };
	}
	return [...(world.characterActions ?? []), ...(world.autonomousActions ?? [])].find((action: any) => action.name === name);
}

function emitEvent(state: RuntimeState, event: string, context: RuntimeEvent['context'], data: RuntimeEvent['data'], actionInstanceId?: string) {
	state.eventQueue.push({
	id: String(state.nextSequence),
	time: state.time,
	sequence: state.nextSequence++,
	event,
	context,
	data,
	actionInstanceId
	});
}

function emitEventFromEffect(state: RuntimeState, effect: any, context: ResolveContext, actionInstanceId?: string) {
	const resolveField = (value: any) => {
		const resolved = resolveGetter(state, value, context);
		return resolved.ok ? resolved.value : undefined;
	};
	const eventContext: RuntimeEvent['context'] = {};
	for (const key of ['actorId', 'targetId', 'subjectId', 'placeId'] as const) {
		const value = resolveField(effect.context?.[key]);
		if (value !== undefined) eventContext[key] = String(value);
	}
	eventContext.audience = effect.context?.audience;
	eventContext.tags = [...(effect.context?.tags ?? [])];

	const player = state.characters.find((character) => character.controlledByPlayer);
	if (effect.emitOnlyIf === 'actorIsPlayer' && eventContext.actorId !== player?.id) return;
	if (effect.emitOnlyIf === 'targetIsPlayer' && eventContext.targetId !== player?.id) return;
	if (effect.emitOnlyIf === 'actorIsNonPlayer' && eventContext.actorId === player?.id) return;
	if (effect.emitOnlyIf === 'targetIsNonPlayer' && eventContext.targetId === player?.id) return;
	if (effect.emitOnlyIf === 'inTheSamePlaceAsPlayer' && eventContext.placeId !== player?.placeId) return;

	const data: RuntimeEvent['data'] = {};
	for (const [key, value] of Object.entries(effect.data ?? {})) {
		const resolved = resolveField(value);
		if (resolved !== undefined) data[key] = resolved;
	}
	emitEvent(state,effect.event,eventContext,data,actionInstanceId)
}

function moveCharacter(state: RuntimeState, characterId: string, placeId: string) {
	const character = state.characters.find((candidate) => candidate.id === characterId);
	const nextPlace = state.places.find((candidate) => candidate.id === placeId);
	if (!character || !nextPlace) return false;
	const currentPlace = state.places.find((candidate) => candidate.id === character.placeId);
	if (currentPlace) currentPlace.charactersId = currentPlace.charactersId.filter((id) => id !== characterId);
	if (!nextPlace.charactersId.includes(characterId)) nextPlace.charactersId.push(characterId);
	character.placeId = placeId;
	return true;
}

function dialogueMatches(state: RuntimeState, dialogue: any, selfId: string, targetId: string) {
	const target = state.characters.find((character) => character.id === targetId);
	const self = state.characters.find((character) => character.id === selfId);
	if (!target || !self) return false;
	const match = dialogue.match ?? {};
	const hasAny = (labels?: string[], entity = target) => !labels?.length || labels.some((label) => entity.labels.includes(label));
	const hasAll = (labels?: string[], entity = target) => !labels?.length || labels.every((label) => entity.labels.includes(label));
	const hasNone = (labels?: string[], entity = target) => !labels?.length || labels.every((label) => !entity.labels.includes(label));
	return (
		(!match.targetCharacterIds?.length || match.targetCharacterIds.includes(targetId)) &&
		hasAny(match.targetLabelsAny) &&
		hasAll(match.targetLabelsAll) &&
		hasNone(match.targetLabelsNone) &&
		hasAny(match.selfLabelsAny, self) &&
		hasAll(match.selfLabelsAll, self) &&
		hasNone(match.selfLabelsNone, self) &&
		evaluateConditions(state, match.conditions ?? [], { self: selfId, target: { type: 'character', id: targetId } })
	);
}

function startDialogue(world: any, state: RuntimeState, effect: any, context: ResolveContext) {
	const self = getSelf(state, context);
	const targetId = resolveGetter(state, effect.targetId ?? { type: 'getter', in: 'target:character-metadata', variable: 'id' }, context).value as string;
	if (!self || !targetId) return;
	const candidates = effect.dialogueId
		? (world.dialogues ?? []).filter((dialogue: any) => dialogue.id === effect.dialogueId)
		: (world.dialogues ?? []).filter((dialogue: any) => dialogue.intent === effect.intent);
	const dialogue = candidates
		.filter((candidate: any) => dialogueMatches(state, candidate, self.id, targetId))
		.sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0))[0];
	if (!dialogue) return;
	state.activeDialogue = { id: `${dialogue.id}:${self.id}:${targetId}`, dialogueId: dialogue.id, selfId: self.id, targetId, nodeId: dialogue.startsAt };
	const node = dialogue.nodes.find((candidate: any) => candidate.id === dialogue.startsAt);
	if (node?.onEnter?.length) executeEffects(world, state, node.onEnter, { self: self.id, target: { type: 'character', id: targetId }, temp: {} });
}

function executeEffects(world: any, state: RuntimeState, effects: any[] = [], context: ResolveContext, actionInstanceId?: string) {
	for (const effect of effects) {
		if (effect.type === 'setter') writeVariable(state, effect.var, effect.value, effect.mode, context);
		if (effect.type === 'move') {
			const characterId = resolveGetter(state, effect.moveId, context).value;
			const placeId = resolveGetter(state, effect.toId, context).value;
			if (characterId && placeId) moveCharacter(state, String(characterId), String(placeId));
		}
		if (effect.type === 'event') emitEventFromEffect(state, effect, context, actionInstanceId);
		if (effect.type === 'conditional') executeEffects(world, state, evaluateConditions(state, effect.conditions ?? [], context) ? effect.onTrue ?? [] : effect.onFalse ?? [], context, actionInstanceId);
		if (effect.type === 'start-dialogue') startDialogue(world, state, effect, context);
	}
}

function effectTargetPasses(option: ActionOption) {
	return option.targets.length ? option.targets : [{ type: 'self', id: option.actorId } as RuntimeTarget];
}

function runLifecycle(
	world: any,
	state: RuntimeState,
	option: ActionOption,
	lifecycle: 'onActivate' | 'onComplete' | 'onInterrupt',
	actionRuntime?: Partial<RunningAction> & { executionTime?: number }
) {
	const declaration = actionDeclaration(world, option.actionName);
	for (const target of effectTargetPasses(option)) {
		executeEffects(
			world,
			state,
			declaration?.[lifecycle] ?? [],
			{
				self: option.actorId,
				target,
				temp: {},
				actionRuntime: {
					actionName: actionRuntime?.actionName,
					executionTime: actionRuntime?.option?.executionTime ?? actionRuntime?.executionTime,
					isFromPlayer: actionRuntime?.option?.availableTo === 'player',
					categories: actionRuntime?.categories
				}
			},
			actionRuntime?.id
		);
	}
}

function actionRuntimeMetadata(action: Partial<RunningAction> & { executionTime?: number }) {
	return {
		actionName: action.actionName,
		executionTime: action.option?.executionTime ?? action.executionTime,
		isFromPlayer: action.option?.availableTo === 'player',
		categories: action.categories
	};
}

function maybeInterrupt(world: any, state: RuntimeState, interrupting: RunningAction) {
	let interruptingCancelled = false;
	const interruptingDeclaration = actionDeclaration(world, interrupting.actionName);
	for (const running of [...state.runningActions]) {
		if (running.id === interrupting.id || running.cancelled || !running.attributes.includes('interruptible')) continue;

		const selfConditions = interruptingDeclaration?.interruption?.interruptSelfConditions;
		if (selfConditions?.length) {
			const shouldInterruptSelf = evaluateConditions(state, selfConditions, {
				self: interrupting.actorId,
				actionRuntime: actionRuntimeMetadata(running)
			});
			if (shouldInterruptSelf) {
				interrupting.cancelled = true;
				interruptingCancelled = true;
				break;
			}
		}

		const declaration = actionDeclaration(world, running.actionName);
		const targetConditions = declaration?.interruption?.interruptTargetConditions;
		if (targetConditions?.length) {
			const pass = evaluateConditions(state, targetConditions, {
				self: running.actorId,
				actionRuntime: actionRuntimeMetadata(interrupting)
			});
			if (!pass) continue;
		}
		runLifecycle(world, state, running.option, 'onInterrupt', interrupting);
		running.cancelled = true;
	}
	state.runningActions = state.runningActions.filter((action) => !action.cancelled);
	return interruptingCancelled;
}

function startAction(world: any, state: RuntimeState, option: ActionOption) {
	if (option.locked) return;
	const declaration = actionDeclaration(world, option.actionName);
	const existing = state.runningActions.find((action) => action.actorId === option.actorId);
	if (existing) return;
	const running: RunningAction = {
		id: `${option.id}${optionSeparator}${state.nextSequence}`,
		option,
		actionName: option.actionName,
		actorId: option.actorId,
		startedAt: state.time,
		completeAt: state.time + option.executionTime,
		categories: [...(declaration?.categories ?? [])],
		attributes: [...(declaration?.attributes ?? [])]
	};
	runLifecycle(world, state, option, 'onActivate', running);
	const interruptedSelf = maybeInterrupt(world, state, running);
	if (interruptedSelf) return;
	if (option.executionTime <= 0) {
		runLifecycle(world, state, option, 'onComplete', running);
		maybeInterrupt(world, state, running);
	} else {
		state.runningActions.push(running);
	}
}

function completeDueActions(world: any, state: RuntimeState) {
	for (const running of [...state.runningActions].sort((a, b) => a.completeAt - b.completeAt)) {
		if (running.completeAt <= state.time && !running.cancelled) {
			runLifecycle(world, state, running.option, 'onComplete', running);
			running.cancelled = true;
			maybeInterrupt(world, state, running);
		}
	}
	state.runningActions = state.runningActions.filter((action) => !action.cancelled);
}

function eventPassesFilter(state: RuntimeState, event: RuntimeEvent, filter: string) {
	const player = state.characters.find((character) => character.controlledByPlayer);
	if (!player) return false;
	if (filter === 'FROM_THE_PLAYER') return event.context.actorId === player.id;
	if (filter === 'TARGETS_PLAYER') return event.context.targetId === player.id || event.context.subjectId === player.id;
	if (filter === 'FROM_NON_PLAYER') return event.context.actorId !== player.id;
	if (filter === 'TARGETS_NON_PLAYER') return event.context.targetId !== player.id;
	if (filter === 'IN_PLAYER_PLACE') return event.context.placeId === player.placeId;
	return true;
}

function roleMatches(state: RuntimeState, event: RuntimeEvent, role: any) {
	return event.event === role.event
	 && (role.filters ?? []).every((filter: string) => (eventPassesFilter(state, event, filter))) && 
	 evaluateConditions(state, role.conditions ?? [], {
		event,
	 });
}

function relationMatches(selected: Record<string, RuntimeEvent>, roleName: string, role: any, event: RuntimeEvent) {
	for (const [field, contextKey] of [
		['sameActorAs', 'actorId'],
		['sameTargetAs', 'targetId'],
		['sameSubjectAs', 'subjectId'],
		['samePlaceAs', 'placeId']
	] as const) {
		const other = selected[role[field]];
		if (role[field] && other?.context[contextKey] !== event.context[contextKey]) return false;
	}
	return Boolean(roleName);
}

function renderLogLine(template: string, selected: Record<string, RuntimeEvent>) {
	return template.replace(/\$([^/]+)\/([^$]+)\$/g, (_, roleName: string, field: string) => {
		const event = selected[roleName];
		return String(event?.data[field] ?? event?.context[field as keyof RuntimeEvent['context']] ?? '');
	});
}

function findTemplateMatches(state: RuntimeState, template: any, templateIndex: number) {
	const roles = template.match?.roles ?? {};
	const primaryRoleName = template.match?.primaryRole;
	const primaryRole = roles[primaryRoleName];
	if (!primaryRoleName || !primaryRole) return [];

	const events = state.eventQueue.filter((candidate) => !candidate.consumed).sort((a, b) => a.sequence - b.sequence);
	const otherRoles = Object.entries(roles).filter(([roleName]) => roleName !== primaryRoleName) as [string, any][];
	const matches: { template: any; selected: Record<string, RuntimeEvent>; earliestSequence: number; templateIndex: number }[] = [];

	for (const event of events) {
		if (!roleMatches(state, event, primaryRole)) continue;
		const selected: Record<string, RuntimeEvent> = { [primaryRoleName]: event };
		let valid = true;

		for (const [roleName, role] of otherRoles) {
			const selectedIds = new Set(Object.values(selected).map((selectedEvent) => selectedEvent.id));
			const candidate = events.find(
				(other) => !selectedIds.has(other.id) && roleMatches(state, other, role) && relationMatches(selected, roleName, role, other)
			);
			if (!candidate) {
				valid = false;
				break;
			}
			selected[roleName] = candidate;
		}

		if (valid) {
			matches.push({
				template,
				selected,
				earliestSequence: Math.min(...Object.values(selected).map((selectedEvent) => selectedEvent.sequence)),
				templateIndex
			});
		}
	}

	return matches;
}

export function renderEvents(world: any, state: RuntimeState) {
	const templates = [...(world.textTemplates ?? [])].sort((a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0));
	while (state.eventQueue.some((candidate) => !candidate.consumed)) {
		const matches = templates.flatMap((template: any, templateIndex: number) => findTemplateMatches(state, template, templateIndex));
		const selectedMatch = matches.sort((a, b) => {
			const sequenceDiff = a.earliestSequence - b.earliestSequence;
			if (sequenceDiff) return sequenceDiff;
			const priorityDiff = (b.template.priority ?? 0) - (a.template.priority ?? 0);
			if (priorityDiff) return priorityDiff;
			const roleCountDiff = Object.keys(b.selected).length - Object.keys(a.selected).length;
			if (roleCountDiff) return roleCountDiff;
			return a.templateIndex - b.templateIndex;
		})[0];

		if (selectedMatch) {
			let renderedText = renderLogLine(selectedMatch.template.template, selectedMatch.selected);
			if(renderedText){
				state.log.push(renderedText);
			}
			for (const consumed of Object.values(selectedMatch.selected)) consumed.consumed = true;
		} else {
			const event = state.eventQueue.filter((candidate) => !candidate.consumed).sort((a, b) => a.sequence - b.sequence)[0];
			state.log.push(`[${event.event}]`);
			event.consumed = true;
		}
	}
}

export function getDialogueView(world: any, state: RuntimeState): DialogueView | undefined {
	const active = state.activeDialogue;
	if (!active) return undefined;
	const dialogue = (world.dialogues ?? []).find((candidate: any) => candidate.id === active.dialogueId);
	const node = dialogue?.nodes.find((candidate: any) => candidate.id === active.nodeId);
	if (!dialogue || !node) return undefined;
	const target = state.characters.find((character) => character.id === active.targetId);
	const self = state.characters.find((character) => character.id === active.selfId);
	const speaker = node.speaker === 'self' ? self?.name : node.speaker === 'target' ? target?.name : 'Narrator';
	const choices = (node.choices ?? [])
		.filter((choice: any) => evaluateConditions(state, choice.conditions ?? [], { self: active.selfId, target: { type: 'character', id: active.targetId } }))
		.map((choice: any) => ({ id: choice.id, text: choice.text }));
	return { id: active.id, speaker: speaker ?? 'Narrator', text: node.text, choices };
}

function chooseDialogue(world: any, state: RuntimeState, choiceId: string) {
	const active = state.activeDialogue;
	if (!active) return;
	const dialogue = (world.dialogues ?? []).find((candidate: any) => candidate.id === active.dialogueId);
	const node = dialogue?.nodes.find((candidate: any) => candidate.id === active.nodeId);
	const choice = node?.choices.find((candidate: any) => candidate.id === choiceId);
	if (!dialogue || !node || !choice) return;
	const context = { self: active.selfId, target: { type: 'character', id: active.targetId } as RuntimeTarget, temp: {} };
	if (!evaluateConditions(state, choice.conditions ?? [], context)) return;
	executeEffects(world, state, choice.effects ?? [], context);
	if (choice.endDialogue) state.activeDialogue = undefined;
	else if (choice.nextNodeId) {
		state.activeDialogue = { ...active, nodeId: choice.nextNodeId };
		const nextNode = dialogue.nodes.find((candidate: any) => candidate.id === choice.nextNodeId);
		if (nextNode?.onEnter?.length) executeEffects(world, state, nextNode.onEnter, context);
	}
}

function simulate(world: any, state: RuntimeState, minutes: number) {
	const endTime = state.time + Math.max(0, minutes);
	if (minutes === 0) {
		runAutonomy(world, state, { evaluateConditions, buildActionOptions, startAction });
		completeDueActions(world, state);
		renderEvents(world, state);
		return;
	}
	while (state.time < endTime) {
		runAutonomy(world, state, { evaluateConditions, buildActionOptions, startAction });
		const nextDue = Math.min(endTime, ...state.runningActions.map((action) => action.completeAt).filter((time) => time > state.time));
		state.time = Number.isFinite(nextDue) ? nextDue : endTime;
		completeDueActions(world, state);
	}
	renderEvents(world, state);
}

function playerId(state: RuntimeState) {
	return state.characters.find((character) => character.controlledByPlayer)?.id ?? state.characters[0]?.id;
}

export function updateCharacterDisplay(world:World,state:RuntimeState,chars:RuntimeCharacter[]){
	const defValues = new Map(world.displays?.map(e =>[e.varName,e]) || []);
	
	return chars.map(char => {
		const displayVariables: VarDisplayView[] = [];
		const displayAttributes: DisplayAttribute[] = [];
		
		for (const def of world.displays ?? []) {
			const context: ResolveContext = { self: char };
			const resolved = resolveGetter(state, { type: 'getter', in: 'self:character-variable', variable: def.varName }, context);
			
			if (resolved.ok && resolved.value !== undefined) {
				displayVariables.push({
					title: def.title ?? null,
					altText: def.altText ?? null,
					priority: def.priority ?? 0,
					icon: def.icon 
						? def.isValueIconPath 
							? String(resolved.value) 
							: def.icon 
						: null,
					iconFallback: def.icon && def.isValueIconPath ? def.icon : null,
					value: resolved.value
				});
			}
		}
		
		return {
			...char,
			displayVariables,
			displayAttributes
		};
	});
}

export function getGameView(world: any, state: RuntimeState): GameView {
	const id = playerId(state);
	const player = state.characters.find((character) => character.id === id) ?? state.characters[0];
	const currentPlace = state.places.find((place) => place.id === player.placeId) ?? state.places[0];
	return {
		time: state.time,
		playerId: id,
		currentPlace,
		visibleCharacters: updateCharacterDisplay(world,state,state.characters.filter((character) => character.placeId === currentPlace.id)),
		items: state.items.filter((item) => item.location.type === 'place' && item.location.id === currentPlace.id),
		availableActions: buildActionOptions(world, state, id, 'player'),
		activeDialogue: getDialogueView(world, state),
		log: [...state.log]
	};
}

export function validateWorld(world: any) {
	const errors: string[] = [];
	const places = new Set<string>();
	const characters = new Set<string>();
	for (const place of world.places ?? []) {
		if (places.has(place.id)) errors.push(`Duplicate place id: ${place.id}`);
		places.add(place.id);
	}
	for (const character of world.characters ?? []) {
		if (characters.has(character.id)) errors.push(`Duplicate character id: ${character.id}`);
		characters.add(character.id);
	}
	for (const place of world.places ?? []) {
		for (const id of place.charactersId ?? []) if (!characters.has(id)) errors.push(`Place ${place.id} references missing character ${id}`);
		for (const id of place.connectedPlaces ?? []) if (!places.has(id)) errors.push(`Place ${place.id} references missing connected place ${id}`);
	}
	for (const dialogue of world.dialogues ?? []) {
		const nodes = new Set((dialogue.nodes ?? []).map((node: any) => node.id));
		if (!nodes.has(dialogue.startsAt)) errors.push(`Dialogue ${dialogue.id} starts at missing node ${dialogue.startsAt}`);
		for (const node of dialogue.nodes ?? []) {
			for (const choice of node.choices ?? []) if (choice.nextNodeId && !nodes.has(choice.nextNodeId)) errors.push(`Dialogue ${dialogue.id} choice ${choice.id} links missing node ${choice.nextNodeId}`);
		}
	}
	for (const textTemplate of world.textTemplates ?? []) {
		if (textTemplate.match?.primaryRole && !textTemplate.match.roles?.[textTemplate.match.primaryRole]) errors.push(`Text template ${textTemplate.name} primary role ${textTemplate.match.primaryRole} is not defined in roles`);
	}
	return errors;
}

export function createGameEngine(world: any, savedState?: RuntimeState): Engine {
	let state = savedState ? clone(savedState) : createRuntimeState(world);
	if (!state.log.length) {
		emitEvent(state, 'GAME_START', { audience: 'global' }, {});
		renderEvents(world, state);
	}

	return {
		getState: () => state,
		getView: () => getGameView(world, state),
		dispatch: (command: GameCommand) => {
			if (command.type === 'start-action') {
				const option = getGameView(world, state).availableActions.find((candidate) => candidate.id === command.actionOptionId);
				if (option) {
					startAction(world, state, option);
					simulate(world, state, option.executionTime);
				}
			}
			if (command.type === 'choose-dialogue') {
				chooseDialogue(world, state, command.choiceId);
				simulate(world, state, 0);
			}
			return getGameView(world, state);
		},
		save: () => JSON.stringify(state),
		load: (serialized: string) => {
			state = JSON.parse(serialized) as RuntimeState;
			return getGameView(world, state);
		},
		validate: () => validateWorld(world)
	};
}

export type * from './types';
export { evaluateAutonomyDecision, tickAutonomyCooldowns } from './autonomy';
