import type { ActionOption, RuntimeCharacter, RuntimeState } from './types';

type AutonomyRuntime = Record<string, string | number | boolean>;

type AutonomyDecisionStatus = 'skipped' | 'ready' | 'idle' | 'acted' | 'waited' | 'no-rule';

export type AutonomyCandidateTrace = {
	name: string;
	priority: number;
	passed: boolean;
	reason?: string;
};

export type AutonomyDecisionTrace = {
	characterId: string;
	time: number;
	status: AutonomyDecisionStatus;
	reason?: string;
	elapsed: number;
	interval: number;
	cycle: number;
	currentGoal?: string;
	selectedRule?: string;
	actionName?: string;
	optionCount?: number;
	selectedOptionId?: string;
	goals: AutonomyCandidateTrace[];
	rules: AutonomyCandidateTrace[];
};

export type AutonomyDecision = {
	trace: AutonomyDecisionTrace;
	rule?: any;
	option?: ActionOption;
	autonomyRuntime?: AutonomyRuntime;
};

export type AutonomyDependencies = {
	evaluateConditions: (state: RuntimeState, conditions: any[], context?: any) => boolean;
	buildActionOptions: (world: any, state: RuntimeState, actorId: string, audience: 'autonomous') => ActionOption[];
	startAction: (world: any, state: RuntimeState, option: ActionOption) => void;
};

const prioritySort = (a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0);

function debugAutonomy(state: RuntimeState, trace: AutonomyDecisionTrace) {
	const details = [
		`autonomy:${trace.characterId}`,
		`time=${trace.time}`,
		`cycle=${trace.cycle}`,
		`status=${trace.status}`
	];
	if (trace.reason) details.push(`reason=${trace.reason}`);
	if (trace.currentGoal) details.push(`goal=${trace.currentGoal}`);
	if (trace.selectedRule) details.push(`rule=${trace.selectedRule}`);
	if (trace.actionName) details.push(`action=${trace.actionName}`);
	if (trace.optionCount !== undefined) details.push(`options=${trace.optionCount}`);
	state.debug.push(details.join(' '));
}

export function evaluateAutonomyDecision(world: any, state: RuntimeState, character: RuntimeCharacter, dependencies: AutonomyDependencies): AutonomyDecision {
	const autonomy = character.autonomy;
	const interval = autonomy?.decisionInterval ?? 1;
	const elapsed = state.time - character.autonomyState.lastDecisionTime;
	const cycle = character.autonomyState.cycle + 1;
	const trace: AutonomyDecisionTrace = {
		characterId: character.id,
		time: state.time,
		status: 'ready',
		elapsed,
		interval,
		cycle,
		goals: [],
		rules: []
	};

	if (character.controlledByPlayer) {
		return { trace: { ...trace, status: 'skipped', reason: 'player-controlled' } };
	}
	if (!autonomy) {
		return { trace: { ...trace, status: 'skipped', reason: 'missing-autonomy' } };
	}
	if (autonomy.enabled === false) {
		return { trace: { ...trace, status: 'skipped', reason: 'disabled' } };
	}
	if (elapsed < interval) {
		return { trace: { ...trace, status: 'skipped', reason: `waiting-for-interval(${elapsed}/${interval})` } };
	}

	const goals = [...(autonomy.goals ?? [])].sort(prioritySort);
	for (const goal of goals) {
		trace.goals.push({
			name: goal.name,
			priority: goal.priority ?? 0,
			passed: dependencies.evaluateConditions(state, goal.when ?? [], { self: character.id })
		});
	}

	const currentGoal = goals.find((goal: any) => trace.goals.find((candidate) => candidate.name === goal.name)?.passed);
	trace.currentGoal = currentGoal?.name;
	const autonomyRuntime = {
		currentGoal: currentGoal?.name ?? '',
		lastActionName: character.autonomyState.lastActionName ?? '',
		cycle
	};

	const rules = [...(autonomy.rules ?? [])].sort(prioritySort);
	for (const rule of rules) {
		let reason: string | undefined;
		if (rule.goal && rule.goal !== currentGoal?.name) reason = `goal-mismatch(${rule.goal})`;
		else if (character.autonomyState.cooldowns[rule.name]) reason = `cooldown(${character.autonomyState.cooldowns[rule.name]})`;
		const passed = !reason && dependencies.evaluateConditions(state, rule.when ?? [], { self: character.id, autonomyRuntime });
		trace.rules.push({
			name: rule.name,
			priority: rule.priority ?? 0,
			passed,
			reason: reason ?? (passed ? undefined : 'conditions-failed')
		});
	}

	const rule = rules.find((candidate: any) => trace.rules.find((entry) => entry.name === candidate.name)?.passed);
	if (!rule) return { trace: { ...trace, status: 'no-rule' }, autonomyRuntime };

	trace.selectedRule = rule.name;
	if (rule.type === 'idle-rule') return { trace: { ...trace, status: 'idle', actionName: 'wait' }, rule, autonomyRuntime };

	const options = dependencies
		.buildActionOptions(world, state, character.id, 'autonomous')
		.filter((option) => option.actionName === rule.actionName && !option.locked);
	const option = options[0];
	trace.actionName = rule.actionName;
	trace.optionCount = options.length;
	trace.selectedOptionId = option?.id;

	return {
		trace: { ...trace, status: option ? 'acted' : 'waited' },
		rule,
		option,
		autonomyRuntime
	};
}

export function tickAutonomyCooldowns(state: RuntimeState) {
	for (const character of state.characters) {
		for (const [name, value] of Object.entries(character.autonomyState.cooldowns)) {
			if (value <= 1) delete character.autonomyState.cooldowns[name];
			else character.autonomyState.cooldowns[name] = value - 1;
		}
	}
}

export function runAutonomy(world: any, state: RuntimeState, dependencies: AutonomyDependencies) {
	for (const character of state.characters.filter((candidate) => !candidate.controlledByPlayer && candidate.autonomy)) {
		const decision = evaluateAutonomyDecision(world, state, character, dependencies);
		debugAutonomy(state, decision.trace);
		if (decision.trace.status === 'skipped') continue;

		character.autonomyState.lastDecisionTime = state.time;
		character.autonomyState.cycle = decision.trace.cycle;
		character.autonomyState.currentGoal = decision.trace.currentGoal;

		if (decision.trace.status === 'idle' || decision.trace.status === 'waited') {
			character.autonomyState.lastActionName = 'wait';
			continue;
		}
		if (decision.trace.status !== 'acted' || !decision.rule || !decision.option) continue;

		dependencies.startAction(world, state, decision.option);
		character.autonomyState.lastActionName = decision.option.actionName;
		if (decision.rule.cooldown) character.autonomyState.cooldowns[decision.rule.name] = decision.rule.cooldown;
	}
	tickAutonomyCooldowns(state);
}
