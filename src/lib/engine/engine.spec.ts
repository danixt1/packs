import { describe, expect, it } from 'vitest';
import {
	buildActionOptions,
	createGameEngine,
	createRuntimeState,
	evaluateConditions,
	renderEvents,
	validateWorld
} from '$lib/engine';
import { resolveGetter } from './getters';
import type { World } from '$lib/types/data/declarative';

const byName = (worldUnderTest: any, name: string) => worldUnderTest.characterActions.find((action: any) => action.name === name);
const numberVar = (vars: { name: string; value: unknown }[], name: string) => vars.find((item) => item.name === name)?.value as number;
const actionNameCondition = (actionName: string, operator: '==' | '!=' = '==') => ({
	type: 'condition-relational',
	left: { type: 'getter', in: 'runtime:action-metadata', variable: 'actionName' },
	operator,
	right: actionName
});

function engineTestWorld(actionOverrides: Record<string, any> = {}):World {
	const eventEffect = (event: string, data: Record<string, any> = {}) => ({
		type: 'event',
		event,
		context: {
			actorId: { type: 'getter', in: 'self-metadata', variable: 'id' },
			targetId: { type: 'getter', in: 'target:character-metadata', variable: 'id', fallback: '' },
			placeId: { type: 'getter', in: 'self-metadata', variable: 'idPlace' },
			audience: 'actor'
		},
		data
	});
	const action = (name: string, executionTime = 5, overrides: Record<string, any> = {}) => ({
		name,
		display: {
			name,
			description: name,
			showAs: 'optionOfActionList'
		},
		attributes: ['interruptible'],
		activationConditions: [],
		targets: [{ type: 'collector', target: 'self' }],
		onActivate: [{ type: 'event', event: `${name.toUpperCase()}_ACTIVATED` }],
		onInterrupt: [{ type: 'event', event: `${name.toUpperCase()}_INTERRUPTED` }],
		onComplete: [{ type: 'event', event: `${name.toUpperCase()}_COMPLETED` }],
		executionTime,
		...overrides,
		...(actionOverrides[name] ?? {})
	});

	return {
		name: 'Engine Test World',
		places: [
			{
				id: 'camp',
				name: 'Camp',
				description: 'Camp',
				connectedPlaces: ['path'],
				vars: [{ name: 'onObservedText', type: 'string', value: 'The camp is quiet.' }],
				charactersId: ['arthur', 'merlin', 'troll']
			},
			{
				id: 'path',
				name: 'Path',
				description: 'Path',
				connectedPlaces: ['camp'],
				vars: [],
				charactersId: []
			}
		],
		characters: [
			{
				id: 'arthur',
				name: 'Arthur',
				vars: [
					{ name: 'health', type: 'number', value: 100 },
					{ name: 'energy', type: 'number', value: 10 },
					{ name: 'canAttack', type: 'boolean', value: true },
					{ name: 'berserk', type: 'boolean', value: false }
				],
				controlledByPlayer: true
			},
			{
				id: 'merlin',
				name: 'Merlin',
				labels: ['friendly'],
				vars: [
					{ name: 'health', type: 'number', value: 100 },
					{ name: 'mood', type: 'number', value: 5 },
					{ name: 'canAttack', type: 'boolean', value: false }
				],
				controlledByPlayer: false
			},
			{
				id: 'troll',
				name: 'Troll',
				labels: ['hostile'],
				vars: [
					{ name: 'health', type: 'number', value: 80 },
					{ name: 'energy', type: 'number', value: 5 },
					{ name: 'canAttack', type: 'boolean', value: true }
				],
				controlledByPlayer: false
			}
		],
		items: [],
		characterActions: [
			{
				name: 'Move',
				display: {
					name: 'Move to $target:place-metadata:name$',
					description: 'Move to a connected place.',
					showAs: 'optionOfObject'
				},
				attributes: ['interruptible'],
				activationConditions: [],
				targets: [{ type: 'collector', target: 'connectedPlaces', fromPlaceId: { type: 'getter', in: 'self-variable', variable: 'placeId' } }],
				onActivate: [],
				onInterrupt: [
					eventEffect('MOVE_INTERRUPTED'),
					{
						type: 'conditional',
						conditions: [actionNameCondition('attack')],
						onTrue: [eventEffect('MOVE_INTERRUPTED_BY_ATTACK', { placeName: { type: 'getter', in: 'target:place-metadata', variable: 'name' } })]
					}
				],
				onComplete: [
					{
						type: 'move',
						moveId: { type: 'getter', in: 'self-metadata', variable: 'id' },
						toId: { type: 'getter', in: 'target:place-metadata', variable: 'id' }
					}
				],
				executionTime: 10,
				...(actionOverrides.Move ?? {})
			},
			{
				name: 'observe',
				display: {
					name: 'Observe',
					description: 'Observe the current place.',
					showAs: 'optionOfActionList'
				},
				activationConditions: [],
				targets: [
					{
						type: 'collector',
						target: 'place',
						collectIf: [
							{ type: 'condition-relational', left: { type: 'getter', in: 'self-metadata', variable: 'idPlace' }, operator: '==', right: { type: 'getter', in: 'target:place-metadata', variable: 'id' } },
							'AND',
							{ type: 'condition-exists', variableToCheck: { type: 'getter', in: 'target:place-variable', variable: 'onObservedText' } }
						]
					}
				],
				onActivate: [],
				onComplete: [
					{
						type: 'event',
						event: 'PLACE_OBSERVED',
						context: {
							actorId: { type: 'getter', in: 'self-metadata', variable: 'id' },
							placeId: { type: 'getter', in: 'target:place-metadata', variable: 'id' },
							audience: 'actor'
						},
						data: { text: { type: 'getter', in: 'target:place-variable', variable: 'onObservedText' } }
					}
				],
				executionTime: 2,
				...(actionOverrides.observe ?? {})
			},
			{
				name: 'attack',
				display: {
					name: 'Attack $target:character-metadata:name$',
					description: 'Attack a nearby character.',
					showAs: 'optionOfObject'
				},
				activationConditions: [
					{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'health' }, operator: '>', right: 0 },
					'AND',
					'(',
					{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'energy' }, operator: '>', right: 0 },
					'OR',
					{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'berserk', fallback: false }, operator: '==', right: true },
					')',
					'AND',
					{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'canAttack' }, operator: '==', right: true }
				],
				targets: [
					{
						type: 'collector',
						target: 'character',
						collectIf: [
							{ type: 'condition-relational', left: { type: 'getter', in: 'self-metadata', variable: 'id' }, operator: '!=', right: { type: 'getter', in: 'target:character-metadata', variable: 'id' } },
							'AND',
							{ type: 'condition-relational', left: { type: 'getter', in: 'self-metadata', variable: 'idPlace' }, operator: '==', right: { type: 'getter', in: 'target:character-metadata', variable: 'idPlace' } },
							'AND',
							{ type: 'condition-relational', left: { type: 'getter', in: 'target:character-variable', variable: 'health' }, operator: '>', right: 0 },
							'AND',
							{ type: 'condition-is-valid', variableToCheck: { type: 'getter', in: 'target:character-variable', variable: 'canAttack' } }
						]
					}
				],
				onActivate: [],
				onInterrupt: [],
				onComplete: [
					{
						type: 'setter',
						var: { type: 'getter', in: 'target:character-variable', variable: 'health' },
						mode: 'decrement',
						value: { type: 'random-interval', min: 5, max: 15, tempVarName: 'damageDealt' }
					},
					{
						type: 'setter',
						var: { type: 'getter', in: 'self-variable', variable: 'energy' },
						mode: 'decrement',
						value: 1
					},
					{
						type: 'event',
						event: 'CHARACTER_ATTACKED',
						context: {
							actorId: { type: 'getter', in: 'self-metadata', variable: 'id' },
							targetId: { type: 'getter', in: 'target:character-metadata', variable: 'id' },
							placeId: { type: 'getter', in: 'self-metadata', variable: 'idPlace' },
							audience: 'actor'
						},
						data: {
							targetName: { type: 'getter', in: 'target:character-metadata', variable: 'name' },
							damage: { type: 'getter', in: 'temp-variable', variable: 'damageDealt' }
						}
					}
				],
				executionTime: 3,
				...(actionOverrides.attack ?? {})
			},
			{
				name: 'talk',
				display: {
					name: 'Talk to $target:character-metadata:name$',
					description: 'Talk to a nearby friendly character.',
					showAs: 'optionOfObject'
				},
				activationConditions: [],
				targets: [
					{
						type: 'collector',
						target: 'character',
						collectIf: [
							{ type: 'condition-relational', left: { type: 'getter', in: 'self-metadata', variable: 'id' }, operator: '!=', right: { type: 'getter', in: 'target:character-metadata', variable: 'id' } },
							'AND',
							{ type: 'condition-relational', left: { type: 'getter', in: 'self-metadata', variable: 'idPlace' }, operator: '==', right: { type: 'getter', in: 'target:character-metadata', variable: 'idPlace' } }
						]
					}
				],
				onActivate: [{ type: 'start-dialogue', intent: 'small-talk', targetId: { type: 'getter', in: 'target:character-metadata', variable: 'id' } }],
				onComplete: [],
				executionTime: 0,
				...(actionOverrides.talk ?? {})
			},
			action('wait',10),
			action('blocker', 20),
			action('probe', 5),
			action('instant-probe', 0)
		],
		vars: [],
		textTemplates: [
			{
				type: 'text-template',
				name: 'observed place',
				template: 'You observe the place: $obs/text$',
				match: { primaryRole: 'obs', roles: { obs: { event: 'PLACE_OBSERVED' } } }
			},
			{
				type: 'text-template',
				name: 'attack',
				template: 'You attacked $attack/targetName$ for $attack/damage$ damage.',
				match: { primaryRole: 'attack', roles: { attack: { event: 'CHARACTER_ATTACKED' } } }
			},
			{
				type: 'text-template',
				name: 'move interrupted by attack',
				template: 'Movement interrupted by attack.',
				match: { primaryRole: 'interrupt', roles: { interrupt: { event: 'MOVE_INTERRUPTED_BY_ATTACK' } } }
			},
			{
				type: 'text-template',
				name: 'move interrupted',
				template: 'Movement interrupted.',
				match: { primaryRole: 'interrupt', roles: { interrupt: { event: 'MOVE_INTERRUPTED' } } }
			}
		],
		dialogues: [
			{
				type: 'dialogue-tree',
				id: 'test-small-talk',
				name: 'Test Small Talk',
				intent: 'small-talk',
				match: { targetCharacterIds: ['merlin'] },
				startsAt: 'start',
				nodes: [
					{
						id: 'start',
						speaker: 'target',
						text: 'Need help?',
						choices: [
							{
								id: 'ask-for-help',
								text: 'Help me.',
								conditions: [{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'health' }, operator: '<', right: 100 }],
								effects: [
									{ type: 'setter', var: { type: 'getter', in: 'self-variable', variable: 'health' }, mode: 'set', value: 100 },
									{ type: 'setter', var: { type: 'getter', in: 'target:character-variable', variable: 'mood' }, mode: 'increment', value: 1 }
								],
								nextNodeId: 'helped'
							}
						]
					},
					{
						id: 'helped',
						speaker: 'target',
						text: 'There. That should help for now.',
						choices: [{ id: 'thanks', text: 'Thanks.', endDialogue: true }]
					}
				]
			}
		]
	};
}

function addRunningAction(worldUnderTest: any, state: ReturnType<typeof createRuntimeState>, actionName: string, actorId = 'merlin') {
	const option = buildActionOptions(worldUnderTest, state, actorId).find((candidate) => candidate.actionName === actionName)!;
	state.runningActions.push({
		id: `manual-${actionName}`,
		option,
		actionName,
		actorId,
		startedAt: 0,
		completeAt: 20,
		categories: [],
		attributes: ['interruptible']
	});
	return option;
}

function textTemplateOrderWorld() {
	return {
		name: 'Text Template Order World',
		places: [
			{
				id: 'camp',
				name: 'Camp',
				description: 'Camp',
				connectedPlaces: [],
				vars: [],
				charactersId: ['arthur', 'troll']
			}
		],
		characters: [
			{
				id: 'arthur',
				name: 'Arthur',
				vars: [],
				controlledByPlayer: true
			},
			{
				id: 'troll',
				name: 'Troll',
				vars: [],
				controlledByPlayer: false
			}
		],
		items: [],
		characterActions: [],
		vars: [],
		textTemplates: [
			{
				type: 'text-template',
				name: 'Player Is attacked',
				template: '$attack/attackerName$ attacked you.',
				match: { primaryRole: 'attack', roles: { attack: { event: 'CHARACTER_ATTACKED', filters: ['TARGETS_PLAYER'] } } },
				priority: 10
			},
			{
				type: 'text-template',
				name: 'Player Attacks',
				template: 'You attacked $attack/targetName$.',
				match: { primaryRole: 'attack', roles: { attack: { event: 'CHARACTER_ATTACKED', filters: ['FROM_THE_PLAYER'] } } },
				priority: 10
			},
			{
				type: 'text-template',
				name: 'Attacking while attacked',
				template: 'combo: you attacked $player/targetName$ while $origin/attackerName$ attacked you.',
				match: {
					primaryRole: 'origin',
					roles: {
						origin: { event: 'CHARACTER_ATTACKED', filters: ['TARGETS_PLAYER'] },
						player: { event: 'CHARACTER_ATTACKED', filters: ['FROM_THE_PLAYER'], samePlaceAs: 'origin' }
					}
				},
				priority: 30
			}
		]
	};
}

function attackEvent(sequence: number, actorId: string, targetId: string, data: Record<string, string | number>) {
	return {
		id: String(sequence),
		time: 0,
		sequence,
		event: 'CHARACTER_ATTACKED',
		context: { actorId, targetId, placeId: 'camp' },
		data
	};
}

describe('runtime kernel', () => {
	it('creates mutable state and resolves getters without mutating the declaration', () => {
		expect.assertions(3);
		const world = engineTestWorld();
		const state = createRuntimeState(world);
		const arthur = state.characters.find((character) => character.id === 'arthur');

		expect(arthur?.placeId).toBe('camp');
		expect(resolveGetter(state, { type: 'getter', in: 'self-variable', variable: 'health' }, { self: 'arthur' }).value).toBe(100);

		arthur!.vars.find((variable) => variable.name === 'health')!.value = 1;
		expect(world.characters.find((character) => character.id === 'arthur')?.vars.find((variable) => variable.name === 'health')?.value).toBe(100);
	});

	it('evaluates activation conditions and parenthesized OR target conditions', () => {
		expect.assertions(3);
		const world = engineTestWorld();
		const state = createRuntimeState(world);
		const attack = byName(world, 'attack');

		expect(evaluateConditions(state, attack?.activationConditions, { self: 'arthur' })).toBe(true);

		state.characters.find((character) => character.id === 'arthur')!.vars.find((variable) => variable.name === 'energy')!.value = 0;
		expect(evaluateConditions(state, attack?.activationConditions, { self: 'arthur' })).toBe(false);

		const troll = state.characters.find((character) => character.id === 'troll')!;
		const camp = state.places.find((place) => place.id === 'camp')!;
		const forest = state.places.find((place) => place.id === troll.placeId)!;
		forest.charactersId = forest.charactersId.filter((id) => id !== 'troll');
		camp.charactersId.push('troll');
		troll.placeId = 'camp';
		state.characters.find((character) => character.id === 'arthur')!.vars.find((variable) => variable.name === 'energy')!.value = 10;

		expect(buildActionOptions(world, state, 'arthur').some((option) => option.actionName === 'attack' && option.targets[0]?.id === 'troll')).toBe(true);
	});

	it.each([
		[
			'player attack first',
			[
				attackEvent(1, 'arthur', 'troll', { attackerName: 'Arthur', targetName: 'Troll', damage: 7 }),
				attackEvent(2, 'troll', 'arthur', { attackerName: 'Troll', targetName: 'Arthur', damage: 5 })
			]
		],
		[
			'player targeted first',
			[
				attackEvent(1, 'troll', 'arthur', { attackerName: 'Troll', targetName: 'Arthur', damage: 5 }),
				attackEvent(2, 'arthur', 'troll', { attackerName: 'Arthur', targetName: 'Troll', damage: 7 })
			]
		]
	])('renders multi-role attack templates regardless of event order: %s', (_name, events) => {
		expect.assertions(2);
		const world = textTemplateOrderWorld();
		const state = createRuntimeState(world);
		state.eventQueue.push(...events);

		renderEvents(world, state);

		expect(state.log).toEqual(['combo: you attacked Troll while Troll attacked you.']);
		expect(state.eventQueue.every((event) => event.consumed)).toBe(true);
	});
});

describe('actions, events, dialogue, autonomy, and persistence', () => {
	it('moves only after completion time and wait advances time', () => {
		expect.assertions(4);
		const world = engineTestWorld();
		const state = createRuntimeState(world);
		const move = buildActionOptions(world, state, 'arthur').find((option) => option.actionName === 'Move');
		const engine = createGameEngine(world, state);

		const view = engine.dispatch({ type: 'start-action', actionOptionId: move!.id });

		expect(view.time).toBe(10);
		expect(engine.getState().characters.find((character) => character.id === 'arthur')?.placeId).toBe('path');

		const wait = view.availableActions.find((option) => option.actionName === 'wait');
		const afterWait = engine.dispatch({ type: 'start-action', actionOptionId: wait!.id });
		expect(afterWait.time).toBe(20);
		expect(afterWait.playerId).toBe('arthur');
	});

	it('observes places and renders event text', () => {
		expect.assertions(2);
		const world = engineTestWorld();
		const engine = createGameEngine(world);
		const observe = engine.getView().availableActions.find((option) => option.actionName === 'observe');
		const view = engine.dispatch({ type: 'start-action', actionOptionId: observe!.id });

		expect(engine.getState().eventQueue.some((event) => event.event === 'PLACE_OBSERVED')).toBe(true);
		expect(view.log.some((line) => line.includes('You observe the place'))).toBe(true);
	});

	it('attacks with temp damage, variable writes, and player-specific text', () => {
		expect.assertions(5);
		const world = engineTestWorld();
		const state = createRuntimeState(world);
		const troll = state.characters.find((character) => character.id === 'troll')!;
		const camp = state.places.find((place) => place.id === 'camp')!;
		state.places.find((place) => place.id === troll.placeId)!.charactersId = [];
		camp.charactersId.push('troll');
		troll.placeId = 'camp';
		const engine = createGameEngine(world, state);
		const attack = engine.getView().availableActions.find((option) => option.actionName === 'attack' && option.targets[0]?.id === 'troll');
		const beforeHealth = numberVar(troll.vars, 'health');

		const view = engine.dispatch({ type: 'start-action', actionOptionId: attack!.id });
		const runtimeTroll = engine.getState().characters.find((character) => character.id === 'troll')!;
		const runtimeArthur = engine.getState().characters.find((character) => character.id === 'arthur')!;

		expect(numberVar(runtimeTroll.vars, 'health')).toBeLessThan(beforeHealth);
		expect(numberVar(runtimeArthur.vars, 'energy')).toBe(9);
		expect(engine.getState().eventQueue.find((event) => event.event === 'CHARACTER_ATTACKED')?.data.damage).toBeTypeOf('number');
		expect(view.log.some((line) => line.startsWith('You attacked Troll'))).toBe(true);
		expect(validateWorld(world)).toEqual([]);
	});

	it('starts dialogue by intent and applies visible choice effects', () => {
		expect.assertions(6);
		const world = engineTestWorld();
		const engine = createGameEngine(world);
		const arthur = engine.getState().characters.find((character) => character.id === 'arthur')!;
		arthur.vars.find((variable) => variable.name === 'health')!.value = 80;
		const talk = engine.getView().availableActions.find((option) => option.actionName === 'talk' && option.targets[0]?.id === 'merlin');
		const dialogueView = engine.dispatch({ type: 'start-action', actionOptionId: talk!.id }).activeDialogue;

		expect(dialogueView?.id).toContain('test-small-talk');
		expect(dialogueView?.choices.some((choice) => choice.id === 'ask-for-help')).toBe(true);

		const helped = engine.dispatch({ type: 'choose-dialogue', choiceId: 'ask-for-help' }).activeDialogue;
		const merlin = engine.getState().characters.find((character) => character.id === 'merlin')!;

		expect(numberVar(arthur.vars, 'health')).toBe(100);
		expect(numberVar(merlin.vars, 'mood')).toBe(6);
		expect(helped?.text).toBe('There. That should help for now.');
		expect(helped?.choices[0]?.id).toBe('thanks');
	});

	it('interrupts long movement with attack metadata and can serialize/restore state', () => {
		expect.assertions(5);
		const world = engineTestWorld();
		const state = createRuntimeState(world);
		const move = buildActionOptions(world, state, 'arthur').find((option) => option.actionName === 'Move')!;
		state.runningActions.push({
			id: 'manual-move',
			option: move,
			actionName: 'Move',
			actorId: 'merlin',
			startedAt: 0,
			completeAt: 20,
			categories: ['movement'],
			attributes: ['interruptible']
		});
		const troll = state.characters.find((character) => character.id === 'troll')!;
		state.places.find((place) => place.id === troll.placeId)!.charactersId = [];
		state.places.find((place) => place.id === 'camp')!.charactersId.push('troll');
		troll.placeId = 'camp';
		const testEngine = createGameEngine(world, state);
		testEngine.dispatch({ type: 'start-action', actionOptionId: testEngine.getView().availableActions.find((option) => option.actionName === 'attack' && option.targets[0]?.id === 'troll')!.id });

		expect(testEngine.getState().runningActions.every((action) => action.actionName !== 'Move')).toBe(true);
		expect(testEngine.getState().eventQueue.some((event) => event.event === 'MOVE_INTERRUPTED_BY_ATTACK')).toBe(true);
		expect(testEngine.getView().log.some((line) => line.includes('interrupted') || line.includes('blocked'))).toBe(true);

		const saved = testEngine.save();
		const restored = createGameEngine(world);
		const restoredView = restored.load(saved);
		expect(restoredView.time).toBe(testEngine.getView().time);
		expect(restored.getState().characters.find((character) => character.id === 'arthur')?.placeId).toBe(testEngine.getState().characters.find((character) => character.id === 'arthur')?.placeId);
	});

	it('cancels the newly started action when phase 1 self-interruption passes', () => {
		expect.assertions(5);
		const testWorld = engineTestWorld({
			probe: {
				interruption: {
					interruptSelfConditions: [actionNameCondition('blocker')]
				}
			}
		});
		const state = createRuntimeState(testWorld);
		addRunningAction(testWorld, state, 'blocker');
		const engine = createGameEngine(testWorld, state);

		engine.dispatch({ type: 'start-action', actionOptionId: engine.getView().availableActions.find((option) => option.actionName === 'probe')!.id });

		expect(engine.getState().runningActions.some((action) => action.actionName === 'blocker')).toBe(true);
		expect(engine.getState().runningActions.some((action) => action.actionName === 'probe')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_ACTIVATED')).toBe(true);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_INTERRUPTED')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_COMPLETED')).toBe(false);
	});

	it('interrupts the existing target action when phase 1 fails and phase 2 passes', () => {
		expect.assertions(4);
		const testWorld = engineTestWorld({
			blocker: {
				interruption: {
					interruptTargetConditions: [actionNameCondition('probe')]
				}
			},
			probe: {
				interruption: {
					interruptSelfConditions: [actionNameCondition('other-action')]
				}
			}
		});
		const state = createRuntimeState(testWorld);
		addRunningAction(testWorld, state, 'blocker');
		const engine = createGameEngine(testWorld, state);

		engine.dispatch({ type: 'start-action', actionOptionId: engine.getView().availableActions.find((option) => option.actionName === 'probe')!.id });

		expect(engine.getState().runningActions.some((action) => action.actionName === 'blocker')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'BLOCKER_INTERRUPTED')).toBe(true);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_INTERRUPTED')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_COMPLETED')).toBe(true);
	});

	it('keeps the target action when both interruption phases fail', () => {
		expect.assertions(4);
		const testWorld = engineTestWorld({
			blocker: {
				interruption: {
					interruptTargetConditions: [actionNameCondition('probe', '!=')]
				}
			},
			probe: {
				interruption: {
					interruptSelfConditions: [actionNameCondition('blocker', '!=')]
				}
			}
		});
		const state = createRuntimeState(testWorld);
		addRunningAction(testWorld, state, 'blocker');
		const engine = createGameEngine(testWorld, state);

		engine.dispatch({ type: 'start-action', actionOptionId: engine.getView().availableActions.find((option) => option.actionName === 'probe')!.id });

		expect(engine.getState().runningActions.some((action) => action.actionName === 'blocker')).toBe(true);
		expect(engine.getState().eventQueue.some((event) => event.event === 'BLOCKER_INTERRUPTED')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_INTERRUPTED')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'PROBE_COMPLETED')).toBe(true);
	});

	it('skips onComplete for instant actions that self-interrupt in phase 1', () => {
		expect.assertions(4);
		const testWorld = engineTestWorld({
			'instant-probe': {
				interruption: {
					interruptSelfConditions: [actionNameCondition('blocker')]
				}
			}
		});
		const state = createRuntimeState(testWorld);
		addRunningAction(testWorld, state, 'blocker');
		const engine = createGameEngine(testWorld, state);

		engine.dispatch({ type: 'start-action', actionOptionId: engine.getView().availableActions.find((option) => option.actionName === 'instant-probe')!.id });

		expect(engine.getState().runningActions.some((action) => action.actionName === 'blocker')).toBe(true);
		expect(engine.getState().eventQueue.some((event) => event.event === 'INSTANT-PROBE_ACTIVATED')).toBe(true);
		expect(engine.getState().eventQueue.some((event) => event.event === 'INSTANT-PROBE_INTERRUPTED')).toBe(false);
		expect(engine.getState().eventQueue.some((event) => event.event === 'INSTANT-PROBE_COMPLETED')).toBe(false);
	});
});
