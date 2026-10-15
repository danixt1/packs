import type { ActionDeclaration, CollectorToGet, ConditionalList, EffectFomAction, EffectInterrupt } from '$lib/types/data/declarative';
import { validateConditionalList, type ConditionToken } from './conditionalList';

export interface ActionValidationContext {
    existingNames?: Iterable<string>;
    editingOid?: string | null;
}

export interface ActionValidationResult {
    valid: boolean;
    reason?: string;
}

const BUILD_MODES = new Set(['oneActionPerTarget', 'oneActionForAllTargets', 'oneActionPerTargetType']);
const SHOW_AS = new Set(['optionOfObject', 'optionOfActionList']);
const ATTRIBUTES = new Set(['passiveAction', 'showAsLockedInUI', 'interruptible']);
const AUDIENCES = new Set(['player', 'autonomous']);
const EFFECT_TYPES = new Set(['move', 'event', 'conditional', 'setter', 'start-dialogue']);
const INTERRUPT_EFFECT_TYPES = new Set(['move', 'event', 'conditional']);
const COLLECTOR_TARGETS = new Set(['character', 'place', 'item', 'self', 'connectedPlaces']);
const OPERATORS = new Set(['>', '<', '==', '!=']);
const MODES = new Set(['set', 'increment', 'decrement', 'multiply', 'divide']);

function invalid(reason: string): ActionValidationResult {
    return { valid: false, reason };
}

function valid(): ActionValidationResult {
    return { valid: true };
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGetter(value: unknown): boolean {
    return isRecord(value) && value.type === 'getter' && typeof value.in === 'string' && typeof value.variable === 'string' && value.variable.trim().length > 0;
}

function isPrimitive(value: unknown): value is string | number | boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isPrimitiveOrGetter(value: unknown): boolean {
    return isPrimitive(value) || isGetter(value);
}

function validateConditions(value: unknown, location: string): ActionValidationResult {
    if (!Array.isArray(value)) return invalid(`${location} must be a list`);
    const result = validateConditionalList(value as ConditionToken[]);
    if (!result.valid) return invalid(`${location} is invalid: ${result.reason ?? 'invalid expression'}`);
    for (const token of value) {
        if (!isRecord(token)) continue;
        const conditionResult = validateCondition(token, location);
        if (!conditionResult.valid) return conditionResult;
    }
    return valid();
}

function validateCondition(value: Record<string, any>, location: string): ActionValidationResult {
    if (value.type === 'condition-relational') {
        if (!OPERATORS.has(value.operator)) return invalid(`${location} has an invalid relational operator`);
        if (!isPrimitiveOrGetter(value.left) || !isPrimitiveOrGetter(value.right)) {
            return invalid(`${location} relational conditions need valid left and right operands`);
        }
        return valid();
    }
    if (value.type === 'condition-exists' || value.type === 'condition-is-valid') {
        if (!isGetter(value.variableToCheck)) return invalid(`${location} ${value.type} needs a getter`);
        return valid();
    }
    return invalid(`${location} contains an invalid condition`);
}

function validateCollector(value: unknown, index: number): ActionValidationResult {
    const location = `Target collector ${index + 1}`;
    if (!isRecord(value) || value.type !== 'collector' || typeof value.target !== 'string' || !COLLECTOR_TARGETS.has(value.target)) {
        return invalid(`${location} has an invalid collector type`);
    }
    if (value.target === 'self') return valid();
    if (value.target === 'connectedPlaces') {
        if (!isPrimitiveOrGetter(value.fromPlaceId) || (typeof value.fromPlaceId === 'string' && !value.fromPlaceId.trim())) {
            return invalid(`${location} needs a source place id or getter`);
        }
        return valid();
    }
    return validateConditions(value.collectIf, `${location} conditions`);
}

function validateRandomValue(value: unknown, location: string): ActionValidationResult {
    if (!isRecord(value) || (value.type !== 'random-interval' && value.type !== 'random-value')) {
        return invalid(`${location} has an invalid random value`);
    }
    if (value.type === 'random-interval') {
        if (!Number.isFinite(value.min) || !Number.isFinite(value.max) || value.min > value.max) {
            return invalid(`${location} has an invalid interval`);
        }
        return valid();
    }
    if (!Array.isArray(value.values) || value.values.length === 0 || !value.values.every(isPrimitive)) {
        return invalid(`${location} needs at least one literal value`);
    }
    return valid();
}

function validateEffect(value: unknown, location: string, interruptOnly = false): ActionValidationResult {
    if (!isRecord(value) || typeof value.type !== 'string' || !EFFECT_TYPES.has(value.type)) {
        return invalid(`${location} has an invalid effect type`);
    }
    if (interruptOnly && !INTERRUPT_EFFECT_TYPES.has(value.type)) {
        return invalid(`${location} is not allowed in interruption effects`);
    }
    switch (value.type) {
        case 'move':
            if (!isGetter(value.moveId) || !isGetter(value.toId)) return invalid(`${location} move effects need two getters`);
            return valid();
        case 'event':
            if (typeof value.event !== 'string' || !value.event.trim()) return invalid(`${location} needs an event name`);
            if (value.data !== undefined) {
                if (!isRecord(value.data) || !Object.values(value.data).every(isPrimitiveOrGetter)) return invalid(`${location} has invalid event data`);
            }
            if (value.context !== undefined && !isRecord(value.context)) return invalid(`${location} has invalid event context`);
            return valid();
        case 'setter':
            if (!isGetter(value.var) || !MODES.has(value.mode)) return invalid(`${location} needs a variable getter and mode`);
            if (isRecord(value.value) && (value.value.type === 'random-interval' || value.value.type === 'random-value')) {
                const randomResult = validateRandomValue(value.value, `${location} value`);
                if (!randomResult.valid) return randomResult;
            } else if (!isPrimitiveOrGetter(value.value)) {
                return invalid(`${location} needs a literal, getter, or random value`);
            }
            return valid();
        case 'start-dialogue':
            if ((typeof value.dialogueId !== 'string' || !value.dialogueId.trim()) && (typeof value.intent !== 'string' || !value.intent.trim())) {
                return invalid(`${location} needs a dialogue id or intent`);
            }
            if (value.targetId !== undefined && !isPrimitiveOrGetter(value.targetId)) return invalid(`${location} has an invalid target`);
            return valid();
        case 'conditional': {
            const conditionsResult = validateConditions(value.conditions, `${location} conditions`);
            if (!conditionsResult.valid) return conditionsResult;
            const trueResult = validateEffects(value.onTrue, `${location} true branch`, interruptOnly);
            if (!trueResult.valid) return trueResult;
            if (value.onFalse !== undefined) return validateEffects(value.onFalse, `${location} false branch`, interruptOnly);
            return valid();
        }
    }
    return invalid(`${location} has an unsupported effect type`);
}

function validateEffects(value: unknown, location: string, interruptOnly = false): ActionValidationResult {
    if (!Array.isArray(value)) return invalid(`${location} must be a list`);
    for (let index = 0; index < value.length; index += 1) {
        const result = validateEffect(value[index], `${location} effect ${index + 1}`, interruptOnly);
        if (!result.valid) return result;
    }
    return valid();
}

function validateDisplay(value: unknown): ActionValidationResult {
    if (value === undefined || value === null) return valid();
    if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim() || typeof value.description !== 'string' || !SHOW_AS.has(value.showAs)) {
        return invalid('Display needs a name, description, and valid display mode');
    }
    if (value.actionLockedText !== undefined && typeof value.actionLockedText !== 'string') return invalid('Display locked text must be text');
    if (value.icon !== undefined && typeof value.icon !== 'string') return invalid('Display icon must be text');
    return valid();
}

function validateInterruption(value: unknown): ActionValidationResult {
    if (value === undefined) return valid();
    if (!isRecord(value)) return invalid('Interruption must be an object');
    if (value.interruptSelfConditions !== undefined) {
        const result = validateConditions(value.interruptSelfConditions, 'Self interruption conditions');
        if (!result.valid) return result;
    }
    if (value.interruptTargetConditions !== undefined) {
        const result = validateConditions(value.interruptTargetConditions, 'Target interruption conditions');
        if (!result.valid) return result;
    }
    return valid();
}

export function validateActionDraft(draft: unknown, context: ActionValidationContext = {}): ActionValidationResult {
    if (!isRecord(draft)) return invalid('Action data is invalid');
    if(draft.targets?.length == 0){
        return invalid("Target collectors is obrigatory.\nIt's capture what should by included in the action.");
    }
    if (typeof draft.name !== 'string' || !draft.name.trim()) return invalid('Action id is required');
    const existingNames = new Set(context.existingNames ?? []);
    const currentName = typeof context.editingOid === 'string' && context.editingOid.includes(':') ? context.editingOid.slice(context.editingOid.indexOf(':') + 1) : undefined;
    if (existingNames.has(draft.name) && draft.name !== currentName) return invalid('Action id already exists');
    if (draft.description !== undefined && typeof draft.description !== 'string') return invalid('Action description must be text');
    if (!Number.isFinite(draft.executionTime) || draft.executionTime < 0) return invalid('Execution time must be a non-negative number');
    if (draft.buildMode !== undefined && !BUILD_MODES.has(draft.buildMode)) return invalid('Select a valid execution mode');
    const displayResult = validateDisplay(draft.display);
    if (!displayResult.valid) return displayResult;
    if (draft.attributes !== undefined && (!Array.isArray(draft.attributes) || !draft.attributes.every((value: unknown) => ATTRIBUTES.has(value as string)))) return invalid('Action attributes are invalid');
    if (draft.availableTo !== undefined && (!Array.isArray(draft.availableTo) || !draft.availableTo.length || !draft.availableTo.every((value: unknown) => AUDIENCES.has(value as string)))) return invalid('Choose at least one valid action audience');
    if (draft.categories !== undefined && (!Array.isArray(draft.categories) || !draft.categories.every((value: unknown) => typeof value === 'string' && value.trim()))) return invalid('Action categories must be text');

    for (const [key, label] of [['activationConditions', 'Activation conditions']] as const) {
        const result = validateConditions(draft[key], label);
        if (!result.valid) return result;
    }
    if (!Array.isArray(draft.targets)) return invalid('Targets must be a list');
    for (let index = 0; index < draft.targets.length; index += 1) {
        const result = validateCollector(draft.targets[index], index);
        if (!result.valid) return result;
    }
    for (const [key, label] of [['onActivate', 'Activation effects'], ['onComplete', 'Completion effects']] as const) {
        const result = validateEffects(draft[key], label);
        if (!result.valid) return result;
    }
    if (draft.onInterrupt !== undefined) {
        const result = validateEffects(draft.onInterrupt, 'Interruption effects', true);
        if (!result.valid) return result;
    }
    return validateInterruption(draft.interruption);
}

export function isValidActionDraft(draft: unknown, context: ActionValidationContext = {}): draft is ActionDeclaration {
    return validateActionDraft(draft, context).valid;
}
