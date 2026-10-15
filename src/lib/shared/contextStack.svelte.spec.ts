import { describe, expect, it } from 'vitest';
import { createContextStack } from './contextStack.svelte';

describe('contextStack (Core unit tests)', () => {
    it('initializes with empty frames and 0 depth', () => {
        const stack = createContextStack();
        expect(stack.depth).toBe(0);
        expect(stack.current).toBeNull();
        expect(stack.breadcrumbs).toEqual([]);
    });

    it('pushes frames with monotonic ids and deep copies data', async () => {
        const stack = createContextStack();
        const initialData = { name: 'attack', vars: ['v1'] };

        const promise = stack.push({
            title: 'Action Root',
            data: initialData
        });

        expect(stack.depth).toBe(1);
        expect(stack.current?.id).toBe('frame_1');
        expect(stack.current?.title).toBe('Action Root');
        expect(stack.current?.draft).toEqual(initialData);

        // Mutating draft should not affect initialData
        stack.current!.draft.name = 'modified';
        expect(initialData.name).toBe('attack');

        stack.current?.resolve({ ...stack.current.draft });
        const result = await promise;

        expect(result).toEqual({ name: 'modified', vars: ['v1'] });
        expect(stack.depth).toBe(0);
    });

    it('supports recursive / nested pushing (Effect -> Conditional -> onTrue -> Effect)', async () => {
        const stack = createContextStack();

        // Level 1: Root Effect
        const p1 = stack.push({ title: 'Root Effect', data: { type: 'conditional', onTrue: [] } });
        expect(stack.current?.id).toBe('frame_1');
        expect(stack.depth).toBe(1);

        // Level 2: onTrue List
        const p2 = stack.push({ title: 'onTrue Branch', data: { effects: [] } });
        expect(stack.current?.id).toBe('frame_2');
        expect(stack.depth).toBe(2);

        // Level 3: Child Effect (Recursive FormEffect instance)
        const p3 = stack.push({ title: 'Nested Effect', data: { type: 'event', event: 'nested' } });
        expect(stack.current?.id).toBe('frame_3');
        expect(stack.depth).toBe(3);

        expect(stack.breadcrumbs.map((b) => b.title)).toEqual([
            'Root Effect',
            'onTrue Branch',
            'Nested Effect'
        ]);

        // Resolve Child (Level 3)
        stack.current?.resolve({ type: 'event', event: 'nested_confirmed' });
        const res3 = await p3;
        expect(res3).toEqual({ type: 'event', event: 'nested_confirmed' });

        // Depth should be 2 now (onTrue Branch is active)
        expect(stack.depth).toBe(2);
        expect(stack.current?.id).toBe('frame_2');

        // Resolve Level 2
        stack.current?.resolve({ effects: [res3] });
        const res2 = await p2;
        expect(res2).toEqual({ effects: [{ type: 'event', event: 'nested_confirmed' }] });

        // Depth is 1 (Root Effect is active)
        expect(stack.depth).toBe(1);
        expect(stack.current?.id).toBe('frame_1');

        // Resolve Level 1
        stack.current?.resolve({ type: 'conditional', onTrue: res2?.effects });
        const res1 = await p1;
        expect(res1).toEqual({
            type: 'conditional',
            onTrue: [{ type: 'event', event: 'nested_confirmed' }]
        });
        expect(stack.depth).toBe(0);
    });

    it('cancels without side effects, resolving with null', async () => {
        const stack = createContextStack();
        const p1 = stack.push({ title: 'Form', data: { count: 10 } });

        expect(stack.depth).toBe(1);
        stack.current?.cancel();

        const result = await p1;
        expect(result).toBeNull();
        expect(stack.depth).toBe(0);
    });

    it('allows jumping back to an ancestor frame (breadcrumbs click)', async () => {
        const stack = createContextStack();

        const p1 = stack.push({ title: 'Frame 1', data: 1 });
        const p2 = stack.push({ title: 'Frame 2', data: 2 });
        const p3 = stack.push({ title: 'Frame 3', data: 3 });

        expect(stack.depth).toBe(3);
        const frame1Id = stack.breadcrumbs[0].id;

        // Jump back to Frame 1
        stack.jumpTo(frame1Id);

        const res3 = await p3;
        const res2 = await p2;
        expect(res3).toBeNull(); // Cancelled
        expect(res2).toBeNull(); // Cancelled

        expect(stack.depth).toBe(1);
        expect(stack.current?.id).toBe(frame1Id);

        stack.current?.resolve(99);
        const res1 = await p1;
        expect(res1).toBe(99);
        expect(stack.depth).toBe(0);
    });

    it('resets and cancels all active frames cleanly', async () => {
        const stack = createContextStack();
        const p1 = stack.push({ title: 'A', data: 'a' });
        const p2 = stack.push({ title: 'B', data: 'b' });

        stack.reset();

        expect(await p1).toBeNull();
        expect(await p2).toBeNull();
        expect(stack.depth).toBe(0);
    });
});
