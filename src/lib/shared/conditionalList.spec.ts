import { describe, expect, it } from 'vitest';
import {
	canAppend,
	describeToken,
	validateConditionalList,
	type ConditionToken
} from './conditionalList';

const cond = (): ConditionToken => ({
	type: 'condition-relational',
	operator: '==',
	left: { type: 'getter', in: 'self-variable', variable: 'health' },
	right: 0
});

describe('validateConditionalList', () => {
	it('accepts an empty list', () => {
		expect(validateConditionalList([]).valid).toBe(true);
	});

	it('accepts a single condition', () => {
		expect(validateConditionalList([cond()]).valid).toBe(true);
	});

	it('accepts two conditions joined by AND', () => {
		expect(validateConditionalList([cond(), 'AND', cond()]).valid).toBe(true);
	});

	it('accepts NOT before a condition', () => {
		expect(validateConditionalList(['NOT', cond()]).valid).toBe(true);
	});

	it('accepts a parenthesized group', () => {
		expect(validateConditionalList(['(', cond(), 'OR', cond(), ')', 'AND', cond()]).valid).toBe(true);
	});

	it('allows a trailing operator (in-progress expression)', () => {
		expect(validateConditionalList([cond(), 'AND']).valid).toBe(true);
	});

	it('rejects a leading AND', () => {
		expect(validateConditionalList(['AND', cond()]).valid).toBe(false);
	});

	it('rejects two operators in a row (AND after OR)', () => {
		expect(validateConditionalList([cond(), 'OR', 'AND', cond()]).valid).toBe(false);
	});

	it('rejects an unclosed parenthesis', () => {
		expect(validateConditionalList(['(', cond()]).valid).toBe(false);
	});

	it('rejects an unmatched closing parenthesis', () => {
		expect(validateConditionalList([cond(), ')']).valid).toBe(false);
	});

	it('rejects an empty group', () => {
		expect(validateConditionalList(['(', ')']).valid).toBe(false);
	});

	it('rejects NOT after an operand', () => {
		expect(validateConditionalList([cond(), 'NOT', cond()]).valid).toBe(false);
	});
});

describe('canAppend', () => {
	it('allows appending a condition to an empty list', () => {
		expect(canAppend([], cond())).toBe(true);
	});

	it('allows appending AND after a condition', () => {
		expect(canAppend([cond()], 'AND')).toBe(true);
	});

	it('disallows appending AND to an empty list', () => {
		expect(canAppend([], 'AND')).toBe(false);
	});

	it('disallows appending a condition right after a condition', () => {
		expect(canAppend([cond()], cond())).toBe(false);
	});

	it('allows appending NOT after AND', () => {
		expect(canAppend([cond(), 'AND'], 'NOT')).toBe(true);
	});
});

describe('describeToken', () => {
	it('describes operators literally', () => {
		expect(describeToken('AND')).toBe('AND');
		expect(describeToken('(')).toBe('(');
	});

	it('describes a relational condition', () => {
		const token = cond() as Extract<ConditionToken, { type: 'condition-relational' }>;
		expect(describeToken(token)).toBe('self-variable:health == 0');
	});

	it('describes an exists condition', () => {
		expect(
			describeToken({
				type: 'condition-exists',
				variableToCheck: { type: 'getter', in: 'target:place-variable', variable: 'onObservedText' }
			})
		).toBe('exists target:place-variable:onObservedText');
	});
});