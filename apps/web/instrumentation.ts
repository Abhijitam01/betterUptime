export async function register() {
    if (typeof window !== "undefined") return;

    const needsPolyfill =
        typeof localStorage === "undefined" ||
        typeof (localStorage as Storage).getItem !== "function";

    if (!needsPolyfill) return;

    const store = new Map<string, string>();

    const noopStorage: Storage = {
        get length() { return store.size; },
        getItem(key: string) { return store.get(key) ?? null; },
        setItem(key: string, value: string) { store.set(key, value); },
        removeItem(key: string) { store.delete(key); },
        clear() { store.clear(); },
        key(index: number) { return [...store.keys()][index] ?? null; },
    };

    try {
        Object.defineProperty(globalThis, "localStorage", {
            value: noopStorage,
            writable: true,
            configurable: true,
        });
    } catch {
    }
}
