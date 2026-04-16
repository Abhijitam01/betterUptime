export async function register() {
    // Node.js v22+ exposes a `localStorage` global when --localstorage-file is
    // passed to the process. Next.js Turbopack passes that flag without a valid
    // path, leaving a broken Storage object whose methods throw at runtime.
    // Next.js's own HMR overlay code calls localStorage.getItem on the server,
    // which triggers the TypeError. Replace the broken global with a no-op
    // in-memory implementation so server-side rendering never crashes.
    if (typeof window !== "undefined") return; // only in server/Node context

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
        // If the property is non-configurable we can't override it — nothing to do.
    }
}
