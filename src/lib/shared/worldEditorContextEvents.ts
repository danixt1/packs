export const WORLD_EDITOR_CONTEXTS_CHANGED = 'world-editor-contexts-changed';

export interface WorldEditorContextsChangedDetail {
    worldId: string;
}

export function notifyWorldEditorContextsChanged(worldId: string) {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent<WorldEditorContextsChangedDetail>(WORLD_EDITOR_CONTEXTS_CHANGED, {
        detail: { worldId }
    }));
}

export function listenForWorldEditorContextsChanged(worldId: string, callback: () => void) {
    if (typeof window === 'undefined') return () => {};

    const listener = (event: Event) => {
        const detail = (event as CustomEvent<WorldEditorContextsChangedDetail>).detail;
        if (detail?.worldId === worldId) callback();
    };

    window.addEventListener(WORLD_EDITOR_CONTEXTS_CHANGED, listener);
    return () => window.removeEventListener(WORLD_EDITOR_CONTEXTS_CHANGED, listener);
}
