const TOKEN_KEY = "bu_token";
const REFRESH_TOKEN_KEY = "bu_refresh";

function isLocalStorageAvailable(): boolean {
    try {
        return typeof localStorage !== "undefined" &&
            typeof localStorage.getItem === "function";
    } catch {
        return false;
    }
}

export function getToken(): string | null {
    if (!isLocalStorageAvailable()) return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
    if (!isLocalStorageAvailable()) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken(): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}
