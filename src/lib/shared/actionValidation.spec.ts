import { describe, expect, it } from 'vitest';
import { validateActionDraft } from './actionValidation';

const validAction = {
    name: 'wait',
    description: 'Wait for a while',
    executionTime: 5,
    buildMode: 'oneActionPerTarget',
    activationConditions: [],
    targets: [{ type: 'collector', target: 'self' }],
    onActivate: [],
    onComplete: []
};

describe('validateActionDraft', () => {
    it('accepts a complete minimal action without mutating it', () => {
        const draft = structuredClone(validAction);
        expect(validateActionDraft(draft)).toEqual({ valid: true });
        expect(draft).toEqual(validAction);
    });

    it('requires an action id', () => {
        expect(validateActionDraft({ ...validAction, name: ' ' }).valid).toBe(false);
    });

    it('rejects duplicate ids when creating an action', () => {
        expect(validateActionDraft(validAction, { existingNames: ['wait'] })).toEqual({
            valid: false,
            reason: 'Action id already exists'
        });
    });

    it('allows an unchanged id while editing', () => {
        expect(validateActionDraft(validAction, {
            existingNames: ['wait'],
            editingOid: 'action:wait'
        })).toEqual({ valid: true });
    });

    it('rejects malformed conditional expressions', () => {
        expect(validateActionDraft({
            ...validAction,
            activationConditions: ['AND']
        }).valid).toBe(false);
    });

    it('rejects malformed collectors', () => {
        expect(validateActionDraft({
            ...validAction,
            targets: [{ type: 'collector', target: 'connectedPlaces' }]
        }).valid).toBe(false);
    });

    it('rejects unsupported interruption effects', () => {
        expect(validateActionDraft({
            ...validAction,
            onInterrupt: [{ type: 'setter' }]
        }).valid).toBe(false);
    });
});
