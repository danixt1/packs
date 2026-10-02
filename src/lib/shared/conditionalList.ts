import type { ConditionalList, ConditionExists, ConditionIsValid, ConditionRelational } from '$lib/types/data/declarative';

/**
 * Infix tokens accepted by the condition evaluator.
 * See `ConditionalList` in `src/lib/types/data/declarative.d.ts`.
 */
export type ConditionToken = ConditionalList;

export type ConditionObject = ConditionRelational | ConditionExists | ConditionIsValid;

export type ConditionOperator = 'AND' | 'OR' | 'NOT';
export type ConditionParen = '(' | ')';

const OPERATORS: ConditionOperator[] = ['AND', 'OR', 'NOT'];
const PARENS: ConditionParen[] = ['(', ')'];

export function isConditionObject(token: ConditionToken): token is ConditionObject {
	return typeof token === 'object' && token !== null;
}

export function isOperator(token: ConditionToken): token is ConditionOperator {
	return typeof token === 'string' && (OPERATORS as string[]).includes(token);
}

export function isParen(token: ConditionToken): token is ConditionParen {
	return typeof token === 'string' && (PARENS as string[]).includes(token);
}

export interface ValidationResult {
	valid: boolean;
	/** Human-readable reason when `valid` is false. */
	reason?: string;
}

/**
 * Validates the structure of an infix condition expression.
 *
 * Rules mirror the shunting-yard evaluator in `src/lib/engine/index.ts`:
 * - A condition object is an operand.
 * - `NOT` must precede an operand (or another `NOT`/`(`).
 * - `AND`/`OR` must sit between two operands (no two operators in a row).
 * - Parentheses must be balanced and non-empty.
 *
 * A trailing operator is allowed: it represents an in-progress expression
 * that the user is still building (e.g. `[cond, 'AND']`). An empty list is
 * also valid (the engine treats it as `true`).
 */
export function validateConditionalList(tokens: ConditionToken[]): ValidationResult {
	if (!tokens.length) return { valid: true };

	let expectOperand = true;
	const stack: ConditionParen[] = [];

	for (const token of tokens) {
		if (isConditionObject(token)) {
			if (!expectOperand) {
				return { valid: false, reason: 'Expected an operator before this condition.' };
			}
			expectOperand = false;
			continue;
		}

		if (token === 'NOT') {
			if (!expectOperand) {
				return { valid: false, reason: 'NOT must come before a condition.' };
			}
			// NOT keeps expecting an operand.
			continue;
		}

		if (token === '(') {
			if (!expectOperand) {
				return { valid: false, reason: 'Expected an operator before "(". ' };
			}
			stack.push('(');
			continue;
		}

		if (token === ')') {
			if (expectOperand) {
				return { valid: false, reason: '")" cannot close an empty group.' };
			}
			if (!stack.length) {
				return { valid: false, reason: 'Unmatched ")".' };
			}
			stack.pop();
			expectOperand = false;
			continue;
		}

		if (token === 'AND' || token === 'OR') {
			if (expectOperand) {
				return { valid: false, reason: `${token} must come after a condition.` };
			}
			expectOperand = true;
			continue;
		}

		return { valid: false, reason: `Unknown token: ${String(token)}.` };
	}

	if (stack.length) {
		return { valid: false, reason: 'Unclosed "(". ' };
	}
	return { valid: true };
}

/**
 * Whether appending `token` to the end of `tokens` keeps the list valid.
 * Used to disable toolbar buttons that would produce an invalid expression.
 */
export function canAppend(tokens: ConditionToken[], token: ConditionToken): boolean {
	return validateConditionalList([...tokens, token]).valid;
}

/**
 * Short human-readable label for a token, used by the list UI.
 */
export function describeToken(token: ConditionToken): string {
	if (isConditionObject(token)) {
		switch (token.type) {
			case 'condition-relational':
				return `${describeOperand(token.left)} ${token.operator} ${describeOperand(token.right)}`;
			case 'condition-exists':
				return `exists ${describeOperand(token.variableToCheck)}`;
			case 'condition-is-valid':
				return `valid ${describeOperand(token.variableToCheck)}`;
			default:
				return 'condition';
		}
	}
	return token;
}

export function describeOperand(value: unknown): string {
	if (typeof value === 'object' && value !== null && (value as { type?: string }).type === 'getter') {
		const getter = value as { in: string; variable: string };
		return `${getter.in}:${getter.variable}`;
	}
	if (typeof value === 'string') return `"${value}"`;
	return String(value);
}