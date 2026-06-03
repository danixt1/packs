import { describe, expect, it, vi } from 'vitest';
import { buildActionOptions, createRuntimeState, evaluateAutonomyDecision, evaluateConditions } from '$lib/engine';
import { runAutonomy } from '$lib/engine/autonomy';
import type { ActionOption, RuntimeState } from '$lib/engine';

function autonomyTestWorld() {
	return {
		name: 'Autonomy Test World',
		places: [
			{
				id: 'camp',
				name: 'Camp',
				description: 'Camp',
				connectedPlaces: ['forest'],
				vars: [],
				charactersId: ['arthur']
			},
			{
				id: 'forest',
				name: 'Forest',
				description: 'Forest',
				connectedPlaces: ['camp'],
				vars: [],
				charactersId: ['troll']
			}
		],
		characters: [
			{
				id: 'arthur',
				name: 'Arthur',
				vars: [
					{ name: 'health', type: 'number', value: 100 },
					{ name: 'canAttack', type: 'boolean', value: true }
				],
				controlledByPlayer: true
			},
			{
				id: 'troll',
				name: 'Troll',
				vars: [
					{ name: 'health', type: 'number', value: 80 },
					{ name: 'canAttack', type: 'boolean', value: true }
				],
				controlledByPlayer: false,
				autonomy: {
					mode: 'rule-based',
					enabled: true,
					decisionInterval: 2,
					goals: [
						{
							name: 'survive',
							priority: 100,
							when: [{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'health' }, operator: '<', right: 25 }]
						},
						{
							name: 'hunt',
							priority: 50,
							when: [{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'health' }, operator: '>', right: 0 }]
						}
					],
					rules: [
						{
							type: 'action-rule',
							name: 'retreat from danger',
							goal: 'survive',
							priority: 100,
							actionName: 'Move',
							when: [{ type: 'condition-relational', left: { type: 'getter', in: 'runtime:autonomy-metadata', variable: 'currentGoal' }, operator: '==', right: 'survive' }]
						},
						{
							type: 'action-rule',
							name: 'attack nearby threat',
							goal: 'hunt',
							priority: 80,
							actionName: 'attack',
							when: [{ type: 'condition-relational', left: { type: 'getter', in: 'runtime:autonomy-metadata', variable: 'currentGoal' }, operator: '==', right: 'hunt' }]
						}
					]
				}
			}
		],
		items: [],
		characterActions: [
			{
				name: 'attack',
				availableTo: ['autonomous'],
				activationConditions: [{ type: 'condition-relational', left: { type: 'getter', in: 'self-variable', variable: 'canAttack' }, operator: '==', right: true }],
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
				onActivate: [],
				onComplete: [],
				executionTime: 1
			}
		],
		vars: [],
		textTemplates: []
	};
}

function putArthurWithTroll(state: RuntimeState) {
	const arthur = state.characters.find((character) => character.id === 'arthur')!;
	const troll = state.characters.find((character) => character.id === 'troll')!;
	const forest = state.places.find((place) => place.id === troll.placeId)!;
	const camp = state.places.find((place) => place.id === arthur.placeId)!;
	camp.charactersId = camp.charactersId.filter((id) => id !== arthur.id);
	if (!forest.charactersId.includes(arthur.id)) forest.charactersId.push(arthur.id);
	arthur.placeId = troll.placeId;
}

const decisionDependencies = {
	evaluateConditions,
	buildActionOptions,
	startAction: vi.fn()
};

describe('autonomy decisions', () => {
	it('explains when a character is waiting for its decision interval', () => {
		expect.assertions(4);
		const world = autonomyTestWorld();
		const state = createRuntimeState(world);
		const troll = state.characters.find((character) => character.id === 'troll')!;
		state.time = 1;

		const decision = evaluateAutonomyDecision(world, state, troll, decisionDependencies);

		expect(decision.trace.status).toBe('skipped');
		expect(decision.trace.reason).toBe('waiting-for-interval(1/2)');
		expect(decision.trace.cycle).toBe(1);
		expect(troll.autonomyState.cycle).toBe(0);
	});

	it('returns goal, rule, and option diagnostics for a valid action rule', () => {
		expect.assertions(6);
		const world = autonomyTestWorld();
		const state = createRuntimeState(world);
		const troll = state.characters.find((character) => character.id === 'troll')!;
		state.time = 2;
		putArthurWithTroll(state);

		const decision = evaluateAutonomyDecision(world, state, troll, decisionDependencies);

		expect(decision.trace.status).toBe('acted');
		expect(decision.trace.currentGoal).toBe('hunt');
		expect(decision.trace.selectedRule).toBe('attack nearby threat');
		expect(decision.trace.optionCount).toBeGreaterThan(0);
		expect(decision.trace.rules.find((rule) => rule.name === 'retreat from danger')?.reason).toBe('goal-mismatch(survive)');
		expect(decision.option?.actionName).toBe('attack');
	});

	it('runs selected actions, updates cooldowns, and writes debug traces', () => {
		expect.assertions(5);
		const world = autonomyTestWorld();
		const state = createRuntimeState(world);
		const troll = state.characters.find((character) => character.id === 'troll')!;
		const attackRule = troll.autonomy.rules.find((rule: any) => rule.name === 'attack nearby threat');
		attackRule.cooldown = 2;
		state.time = 2;
		putArthurWithTroll(state);
		const startAction = vi.fn((_world: any, _state: RuntimeState, _option: ActionOption) => undefined);

		runAutonomy(world, state, { evaluateConditions, buildActionOptions, startAction });

		expect(startAction).toHaveBeenCalledOnce();
		expect(startAction.mock.calls[0][2].actionName).toBe('attack');
		expect(troll.autonomyState.lastActionName).toBe('attack');
		expect(troll.autonomyState.cooldowns['attack nearby threat']).toBe(1);
		expect(state.debug.some((line) => line.includes('autonomy:troll') && line.includes('status=acted') && line.includes('rule=attack nearby threat'))).toBe(true);
	});
});
