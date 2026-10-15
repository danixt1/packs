import type { Snippet } from 'svelte';

export interface ContextFrameMeta {
    mode?: 'create' | 'edit';
    originalId?: string;
    existingIds?: string[];
    validate?: (data: any) => { valid: boolean; reason?: string };
    [key: string]: any;
}

export interface ContextFrame<TIn = any, TOut = any> {
    /** Monotonic internal ID: "frame_1", "frame_2" - never used for naming or switch matching */
    readonly id: string;
    /** Human-readable title for breadcrumbs trail only */
    readonly title: string;
    /** Snapshot passed upon opening */
    readonly initialData: TIn;
    /** Mutable working draft inside this frame */
    draft: TIn;
    /** Metadata such as edit mode, collision lists, custom validators */
    meta?: ContextFrameMeta;
    /** The Svelte snippet that knows how to render this frame */
    render?: Snippet<[ContextFrame<TIn, TOut>]>;
    /** Resolves the frame with a frozen snapshot of output and pops it from stack */
    resolve: (data: TOut) => void;
    /** Cancels frame without saving changes and pops it from stack */
    cancel: () => void;
}

export interface PushOptions<TIn = any, TOut = any> {
    title: string;
    data: TIn;
    render?: Snippet<[ContextFrame<TIn, TOut>]>;
    meta?: ContextFrameMeta;
}

export interface BreadcrumbItem {
    id: string;
    title: string;
    depth: number;
}

export interface ContextStack {
    readonly frames: ContextFrame[];
    readonly current: ContextFrame | null;
    readonly depth: number;
    readonly breadcrumbs: BreadcrumbItem[];
    push: <TIn = any, TOut = any>(options: PushOptions<TIn, TOut>) => Promise<TOut | null>;
    pop: () => void;
    jumpTo: (frameId: string) => void;
    reset: () => void;
}

/**
 * Deep snapshot helper to detach any proxies or references.
 * Uses structuredClone where available, with JSON fallback.
 */
export function deepSnapshot<T>(value: T): T {
    if (value === undefined || value === null) return value;
    try {
        return structuredClone(value);
    } catch {
        return JSON.parse(JSON.stringify(value));
    }
}

/**
 * Creates a recursive, recursion-safe ContextStack for forms.
 * Every push creates an isolated frame with a monotonic frame_id.
 * State is isolated via deepSnapshot.
 */
export function createContextStack(): ContextStack {
    let frameSequence = 0;
    let frames = $state<ContextFrame[]>([]);

    function popFrame(targetId?: string) {
        if (!frames.length) return;
        if (!targetId || frames[frames.length - 1].id === targetId) {
            frames = frames.slice(0, -1);
        } else {
            const index = frames.findIndex((f) => f.id === targetId);
            if (index !== -1) {
                // Keep everything up to targetId inclusive, discard children above it
                frames = frames.slice(0, index + 1);
            }
        }
    }

    function push<TIn = any, TOut = any>(options: PushOptions<TIn, TOut>): Promise<TOut | null> {
        frameSequence++;
        const frameId = `frame_${frameSequence}`;
        const isolatedInput = deepSnapshot(options.data);

        return new Promise<TOut | null>((resolvePromise) => {
            let settled = false;

            const frame: ContextFrame<TIn, TOut> = {
                id: frameId,
                title: options.title,
                initialData: isolatedInput,
                draft: deepSnapshot(options.data),
                meta: options.meta ? deepSnapshot(options.meta) : undefined,
                render: options.render,
                resolve: (data: TOut) => {
                    if (settled) return;
                    settled = true;
                    const finalSnapshot = deepSnapshot(data);
                    popFrame(frameId);
                    resolvePromise(finalSnapshot);
                },
                cancel: () => {
                    if (settled) return;
                    settled = true;
                    popFrame(frameId);
                    resolvePromise(null);
                }
            };

            frames = [...frames, frame];
        });
    }

    function reset() {
        // Cancel any pending frames from top to bottom
        const pending = [...frames].reverse();
        frames = [];
        for (const frame of pending) {
            frame.cancel();
        }
    }

    return {
        get frames() {
            return frames;
        },
        get current() {
            return frames.length ? frames[frames.length - 1] : null;
        },
        get depth() {
            return frames.length;
        },
        get breadcrumbs(): BreadcrumbItem[] {
            return frames.map((f, i) => ({
                id: f.id,
                title: f.title,
                depth: i + 1
            }));
        },
        push,
        pop: () => {
            if (frames.length) {
                frames[frames.length - 1].cancel();
            }
        },
        jumpTo: (frameId: string) => {
            const index = frames.findIndex((f) => f.id === frameId);
            if (index === -1) return;
            // Cancel any child frames that are on top of the target frame
            while (frames.length > index + 1) {
                frames[frames.length - 1].cancel();
            }
        },
        reset
    };
}
