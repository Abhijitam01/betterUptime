# BetterUptime Mobile App — Complete Build Prompt

Paste this entire prompt into an AI coding assistant (Cursor, Claude, ChatGPT) to build the React Native / Expo app from scratch.

---

## THE PROMPT

Build a complete React Native mobile app using **Expo (SDK 51+)** and **Expo Router** for a website uptime monitoring service called **BetterUptime**. The app connects to a REST API hosted on Railway. Below is every screen, every component, the full design system, all API calls, and the exact behavior expected.

---

## TECH STACK

- **Framework**: React Native with Expo (managed workflow)
- **Router**: Expo Router (file-based routing)
- **Language**: TypeScript
- **State / Data fetching**: TanStack Query (`@tanstack/react-query`) for all API calls
- **Secure storage**: `expo-secure-store` for JWT + refresh token
- **HTTP**: native `fetch`
- **Charts**: `react-native-svg` + custom bar chart (no third-party chart lib)
- **Icons**: `@expo/vector-icons` (Feather set)
- **Notifications**: `expo-notifications` for local push notifications when site goes down (optional but include the hook)

---

## API BASE URL

```
const BASE_URL = "https://api-production-4514.up.railway.app"
```

Replace with the real Railway URL. Store in `constants/api.ts`.

---

## AUTHENTICATION

### Token storage
Use `expo-secure-store`:
```ts
SecureStore.setItemAsync("jwt", token)
SecureStore.setItemAsync("refresh_token", token)
SecureStore.getItemAsync("jwt")
SecureStore.deleteItemAsync("jwt")
```

### Every authenticated request
Send the JWT as a raw `Authorization` header — **no "Bearer" prefix**:
```
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Auto-refresh logic
Build an `apiFetch` wrapper that:
1. Attaches the JWT from SecureStore to every request
2. If response is 401, calls `POST /user/refresh` with the stored `refresh_token`
3. Stores the new `jwt` and `refresh_token` (old refresh_token is now invalid — rotate it)
4. Retries the original request once with the new JWT
5. If refresh also fails with 401, clears both tokens from SecureStore and redirects to `/signin`

---

## DESIGN SYSTEM

### Colors (use these exact values everywhere)
```ts
const colors = {
  bg: "#080c18",           // page background — deep dark navy
  card: "rgba(255,255,255,0.04)",   // glass card background
  cardBorder: "rgba(255,255,255,0.08)", // glass card border
  cardHover: "rgba(255,255,255,0.06)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.08)",
  inputFocusBorder: "rgba(16,185,129,0.5)",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e1",   // slate-300
  textMuted: "#64748b",       // slate-500
  divider: "rgba(255,255,255,0.06)",
  emerald: "#10b981",         // primary accent
  emeraldDim: "rgba(16,185,129,0.15)",
  emeraldBorder: "rgba(16,185,129,0.25)",
  red: "#f87171",             // down status
  redDim: "rgba(239,68,68,0.15)",
  redBorder: "rgba(239,68,68,0.25)",
  violet: "#a78bfa",
  violetDim: "rgba(167,139,250,0.15)",
  sky: "#38bdf8",
  amber: "#fbbf24",
}
```

### Typography
```ts
// Use system fonts — SF Pro on iOS, Roboto on Android
// Sizes
const text = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
}
```

### Spacing
Use multiples of 4 throughout: 4, 8, 12, 16, 20, 24, 32, 48.

### Border radius
- Cards: 16
- Buttons: 12
- Pills/badges: 20 (fully round)
- Inputs: 12

### Glass card style (reusable component)
```ts
// GlassCard.tsx
const styles = {
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
  }
}
```

### Status colors
```ts
function statusColor(status: string) {
  if (status === "Up") return "#10b981"
  if (status === "Down") return "#f87171"
  if (status === "keyword_failed") return "#a78bfa"
  return "#64748b" // Unknown
}
```

### Dark input style (reusable)
```ts
const inputStyle = {
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "#ffffff",
  fontSize: 14,
}
```

---

## NAVIGATION STRUCTURE

Use Expo Router with this file structure:
```
app/
  _layout.tsx          — root layout, AuthProvider, QueryClient
  (auth)/
    signin.tsx
    signup.tsx
  (app)/
    _layout.tsx        — bottom tab navigator (only shown when authenticated)
    index.tsx          — Dashboard (monitors list)
    monitor/
      [id].tsx         — Monitor detail
    settings.tsx       — Account settings
```

### Bottom tab bar (shown when authenticated)
3 tabs:
1. **Dashboard** — house icon (Feather `home`)
2. **Settings** — settings icon (Feather `settings`)

Tab bar style:
```ts
tabBarStyle: {
  backgroundColor: "#080c18",
  borderTopColor: "rgba(255,255,255,0.06)",
  borderTopWidth: 1,
  height: 60,
  paddingBottom: 8,
}
tabBarActiveTintColor: "#10b981"
tabBarInactiveTintColor: "#64748b"
```

---

## SCREENS

---

### 1. SIGN IN SCREEN — `(auth)/signin.tsx`

**Background**: `#080c18` full screen

**Layout** (centered, no scroll):
- Top: logo area
  - Small emerald pulsing dot (10px circle, `#10b981`) + text "BetterUptime" (18px semibold white)
  - Subtle subtitle: "Monitor your websites" (13px, slate-500)
- Glass card (centered, mx: 24):
  - Title: "Welcome back" (20px bold white)
  - Subtitle: "Sign in to your account" (13px slate-400)
  - Gap: 24px between title and form
  - **Username field**: dark input, placeholder "Username"
  - **Password field**: dark input, placeholder "Password", `secureTextEntry`
  - **Sign in button**: full width, `#10b981` background, white bold text "Sign in", height 48, borderRadius 12. Disabled state: `bg-emerald-800` text `#10b981` opacity 0.4.
  - Loading state on button: show `ActivityIndicator` white instead of text
  - Error: red text below button if credentials wrong
- Bottom link: "Don't have an account? **Sign up**" — tapping navigates to signup

**Behavior**:
- Call `POST /user/signin`
- On success: store `jwt` + `refresh_token` in SecureStore, navigate to `(app)/`
- On error: show error message below button

---

### 2. SIGN UP SCREEN — `(auth)/signup.tsx`

**Same layout as sign in** but:
- Title: "Create account"
- Subtitle: "Start monitoring for free"
- Fields: Username, Password
- Button: "Create account"
- Bottom link: "Already have an account? **Sign in**"

**Behavior**:
- Call `POST /user/signup`
- On success: immediately call `POST /user/signin` with same credentials, store tokens, navigate to `(app)/`

---

### 3. DASHBOARD SCREEN — `(app)/index.tsx`

**Header** (custom, inside SafeAreaView):
- Left: emerald dot + "BetterUptime" text (same as sign in)
- Right: emerald "+" circular button (32px, `rgba(16,185,129,0.15)` bg, `#10b981` border, `+` in emerald) — opens "Add Monitor" bottom sheet

**Pull to refresh**: `RefreshControl` in the ScrollView, emerald tint

**Stats bar** (4 cards in a 2x2 or horizontal scroll row, shown only if monitors exist):
Each stat card (glass card, smaller padding 16px):
- Label: uppercase 10px slate-500 letter-spaced
- Value: 24px bold

Stats:
1. **Monitors** — total count (white)
2. **Status** — "X up" (emerald) + "X down" (red) if any down
3. **Avg Response** — `Xms` (white, monospace)
4. **Uptime** — `X%` (emerald if 100%, red if any down, white otherwise)

**Status banner** (shown only if monitors exist):
Full-width card with colored left accent:
- Green variant (all up): `rgba(16,185,129,0.1)` bg, `rgba(16,185,129,0.25)` border
  - Pulsing green dot + "All systems operational" in emerald
- Red variant (any down): `rgba(239,68,68,0.1)` bg, `rgba(239,68,68,0.25)` border
  - Red dot + "X site(s) down" in red

**Monitor list**:
Each monitor is a `MonitorCard` (touchable, navigates to `/monitor/[id]`):

```
┌─────────────────────────────────────────┐
│ ● Up    My Website              [chart] │
│         https://example.com      243ms  │
│         Added Jan 15             99.9%  │
└─────────────────────────────────────────┘
```

- Status dot (8px circle) colored by status, with pulsing ring if "Up"
- Display name (bold white 14px) or URL if no display name
- URL in slate-500 13px (only if display_name exists)
- "Added X" date in slate-500 11px
- Right side: mini sparkline + response time + uptime %

**Mini sparkline** (right side of each card):
- 20 vertical bars, 3px wide each, 2px gap
- Bar height proportional to `response_time_ms` (min 20%, max 100%)
- Colors: `#10b981` (Up), `#f87171` (Down), `#475569` (Unknown/empty)
- Empty bars (no data): `rgba(255,255,255,0.08)` at 25% height

Below sparkline:
- Latest response time: `Xms` (12px monospace white semibold)
- Uptime %: emerald 12px monospace (calculated from all ticks: up_count / total * 100)

**Swipe to delete**: swipe left on a MonitorCard to reveal a red delete button.

**Empty state** (no monitors):
Centered, glass card with dashed border:
- Large emerald clock/globe icon (40px)
- "No websites monitored yet" (slate-300 14px medium)
- "Add a URL above to start watching it" (slate-500 12px)
- "Add your first monitor" emerald button

**Add Monitor bottom sheet**:
- Title: "Monitor a new website"
- URL text input (dark input, placeholder "https://example.com")
- "Add website" emerald button
- On submit: `POST /website` → refresh list → close sheet

---

### 4. MONITOR DETAIL SCREEN — `(app)/monitor/[id].tsx`

**Back button**: top-left chevron-left, navigates back

**Header card** (glass card):
- Status dot + display name (20px bold white)
- URL (slate-400 13px)
- Status badge pill (see StatusBadge below)
- "Last checked X minutes ago" (slate-500 11px)
- Row of quick stats: Response time | SSL expires | Check interval

**StatusBadge component** (pill):
- Up: `rgba(16,185,129,0.15)` bg, `rgba(16,185,129,0.25)` border, `#10b981` text
- Down: `rgba(239,68,68,0.15)` bg, `rgba(239,68,68,0.25)` border, `#f87171` text
- keyword_failed: `rgba(167,139,250,0.15)` bg, `rgba(167,139,250,0.25)` border, `#a78bfa` text
- Unknown: `rgba(255,255,255,0.06)` bg, `rgba(255,255,255,0.08)` border, `#64748b` text

**Response time chart** (section):
Title: "Response Time" (slate-500 11px uppercase)
Custom bar chart using `react-native-svg`:
- 50 bars from history API (newest on right)
- Bar color: emerald (Up), red (Down), slate (Unknown)
- Heights proportional to response_time_ms
- X-axis: light grid lines
- Tap a bar: show tooltip with status + ms + time

**Check History** (paginated table, 10 per page):
Glass card with section header "Check History"
Each row:
- Status badge
- Response time (monospace)
- Timestamp (relative: "2 min ago", "1 hr ago")
Pagination: row of page number buttons at bottom, active page in emerald

**Incident Timeline** (section):
Title: "Incidents"
Each incident card:
- Open incidents (no resolved_at): red left border, red badge "ONGOING"
- Resolved: green left border, green badge "RESOLVED"
- Shows: started_at, resolved_at (or "Ongoing"), duration, cause
Pagination: same style as history

**Monitor Settings** (collapsible section or separate tab):
- Display name input (dark input)
- Check interval picker: 30s / 1m / 2m / 5m / 10m (segmented control style)
- SSL monitoring toggle (emerald switch)
- Keyword monitor: toggle to enable, text input for pattern
- Save button (same save → saved → edit flow as web settings)

**Alert Settings** (section):
Toggle row for:
- Email alerts (with email address shown)
- Alert on down
- Alert on recovery
- Webhook URL (text input, optional)
Save button same pattern

**Maintenance Windows** (section):
List of windows with delete button
"Add window" → date/time pickers for start + end, optional label input

**Danger zone** (bottom):
Red tinted glass card
"Delete this monitor" → confirmation alert → `DELETE /website/:id` → navigate back

---

### 5. SETTINGS SCREEN — `(app)/settings.tsx`

**Header**: "Account Settings" (20px bold white), "Manage your profile" (slate-400 13px)

**Profile card** (glass):
- "Username" label (slate-500 uppercase 10px)
- Username value (white 14px)

**Alert email form** (glass card):
- "Alert Email" label
- Dark input (disabled when not editing)
- When not editing: show "✓ Saved" in emerald + "Edit" ghost button
- When editing: show "Save changes" emerald button
- On save: call `PATCH /user/me` → show saved state

**Sign out button**:
Ghost button at bottom, slate-400 text "Sign out", on press clear SecureStore and navigate to signin

---

## REUSABLE COMPONENTS

### `GlassCard`
Props: `children`, `style?`
Renders a view with glass background + border + 16px radius.

### `StatusBadge`
Props: `status: "Up" | "Down" | "keyword_failed" | "Unknown"`
Renders a pill with appropriate color.

### `DarkInput`
Props: standard TextInput props
Renders a styled text input with dark background.

### `EmeraldButton`
Props: `title`, `onPress`, `loading?`, `disabled?`, `style?`
Renders the primary emerald button. Shows `ActivityIndicator` when loading.

### `MiniSparkline`
Props: `websiteId: string`
Fetches history from `GET /status/:id/history` and renders 20 vertical bars.

### `Paginator`
Props: `page`, `totalPages`, `onChange`
Renders ← 1 2 3 → page controls. Active page: emerald pill. Hidden if totalPages <= 1.

---

## DATA FETCHING PATTERNS

Use TanStack Query throughout:

```ts
// List monitors — refetch every 10 minutes
useQuery({
  queryKey: ["websites"],
  queryFn: () => api.listWebsites(),
  refetchInterval: 600_000,
})

// Monitor history — refetch every 10 minutes
useQuery({
  queryKey: ["history", websiteId],
  queryFn: () => api.getWebsiteHistory(websiteId),
  refetchInterval: 600_000,
})

// Mutations — invalidate relevant queries on success
const addMutation = useMutation({
  mutationFn: (url: string) => api.addWebsite(url),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["websites"] }),
})
```

---

## LOADING AND ERROR STATES

**Loading skeletons**: Use animated opacity (0.3 → 0.7 → 0.3) on placeholder rectangles inside glass cards. Show 2-3 skeleton cards on initial load.

**Error state**: Red-tinted glass card with "Failed to load. Pull to refresh." text.

**Empty states**: Centered content with icon, primary text, secondary text as described per screen.

---

## STATUS BAR AND SAFE AREA

- `StatusBar` style: `"light"` (white text on dark background)
- Use `SafeAreaView` on all screens with `backgroundColor: "#080c18"`
- Bottom safe area padding on all screens

---

## COMPLETE API CLIENT — `lib/api.ts`

```ts
import * as SecureStore from "expo-secure-store"

const BASE_URL = "https://api-production-4514.up.railway.app"

async function apiFetch<T>(path: string, init?: RequestInit, _retry = true): Promise<T> {
  const token = await SecureStore.getItemAsync("jwt")
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: token } : {}),
    ...init?.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (res.status === 401 && _retry) {
    const refreshToken = await SecureStore.getItemAsync("refresh_token")
    if (!refreshToken) throw new Error("UNAUTHENTICATED")

    const refreshRes = await fetch(`${BASE_URL}/user/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!refreshRes.ok) {
      await SecureStore.deleteItemAsync("jwt")
      await SecureStore.deleteItemAsync("refresh_token")
      throw new Error("UNAUTHENTICATED")
    }

    const data = await refreshRes.json() as { jwt: string; refresh_token: string }
    await SecureStore.setItemAsync("jwt", data.jwt)
    await SecureStore.setItemAsync("refresh_token", data.refresh_token)
    return apiFetch<T>(path, init, false)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  // Auth
  signup: (username: string, password: string) =>
    apiFetch<{ id: string }>("/user/signup", { method: "POST", body: JSON.stringify({ username, password }) }),
  signin: (username: string, password: string) =>
    apiFetch<{ jwt: string; refresh_token: string }>("/user/signin", { method: "POST", body: JSON.stringify({ username, password }) }),

  // User
  getMe: () => apiFetch<UserProfile>("/user/me"),
  updateEmail: (email: string) => apiFetch<UserProfile>("/user/me", { method: "PATCH", body: JSON.stringify({ email }) }),

  // Websites
  listWebsites: () => apiFetch<Website[]>("/websites"),
  addWebsite: (url: string) => apiFetch<{ id: string }>("/website", { method: "POST", body: JSON.stringify({ url }) }),
  getWebsite: (id: string) => apiFetch<Website>(`/status/${id}`),
  updateWebsite: (id: string, data: Partial<Website>) => apiFetch<Website>(`/website/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWebsite: (id: string) => apiFetch<{ message: string }>(`/website/${id}`, { method: "DELETE" }),
  getWebsiteHistory: (id: string) => apiFetch<Tick[]>(`/status/${id}/history`),

  // Incidents
  getIncidents: (id: string) => apiFetch<Incident[]>(`/website/${id}/incidents`),

  // Alerts
  getAlertSetting: (id: string) => apiFetch<AlertSetting | null>(`/website/${id}/alerts`),
  saveAlertSetting: (id: string, data: Partial<AlertSetting>) =>
    apiFetch<AlertSetting>(`/website/${id}/alerts`, { method: "POST", body: JSON.stringify(data) }),

  // Maintenance
  getMaintenanceWindows: (id: string) => apiFetch<MaintenanceWindow[]>(`/website/${id}/maintenance`),
  addMaintenanceWindow: (id: string, data: { starts_at: string; ends_at: string; label?: string }) =>
    apiFetch<MaintenanceWindow>(`/website/${id}/maintenance`, { method: "POST", body: JSON.stringify(data) }),
  deleteMaintenanceWindow: (windowId: string) => apiFetch<{ message: string }>(`/maintenance/${windowId}`, { method: "DELETE" }),
}
```

---

## TYPES — `lib/types.ts`

```ts
export type WebsiteStatus = "Up" | "Down" | "Unknown" | "keyword_failed"

export type Tick = {
  id: string
  status: WebsiteStatus
  response_time_ms: number
  region_id: string
  createdAt: string
}

export type Website = {
  id: string
  url: string
  display_name: string | null
  time_added: string
  check_interval_sec: number
  ssl_monitor_enabled: boolean
  ssl_expires_at: string | null
  public_slug: string | null
  keyword_monitor: string | null
  latestTick: Tick | null
}

export type Incident = {
  id: string
  website_id: string
  started_at: string
  resolved_at: string | null
  cause: string | null
}

export type MaintenanceWindow = {
  id: string
  website_id: string
  starts_at: string
  ends_at: string
  label: string | null
}

export type AlertSetting = {
  id: string
  website_id: string
  email_enabled: boolean
  webhook_url: string | null
  alert_on_down: boolean
  alert_on_recovery: boolean
}

export type UserProfile = {
  id: string
  username: string
  email: string | null
}
```

---

## AUTH CONTEXT — `context/AuthContext.tsx`

```ts
// Wrap the entire app. On mount, check if jwt exists in SecureStore.
// If yes, try GET /user/me. If it succeeds, user is authenticated.
// If it fails with UNAUTHENTICATED, redirect to signin.
// Expose: user, isLoading, signout()
```

---

## INIT COMMAND

```bash
npx create-expo-app BetterUptimeMobile --template blank-typescript
cd BetterUptimeMobile
npx expo install expo-router expo-secure-store expo-notifications react-native-svg
npm install @tanstack/react-query @expo/vector-icons
```

---

## IMPORTANT BEHAVIORS

1. **No Bearer prefix** — send JWT raw: `Authorization: eyJ...` not `Authorization: Bearer eyJ...`
2. **Token rotation** — after refresh, store BOTH the new `jwt` and new `refresh_token`. The old refresh_token is immediately invalid.
3. **10-minute polling** — `refetchInterval: 600_000` on all queries
4. **Swipe-to-delete** on monitor list items
5. **Pull-to-refresh** on the dashboard and monitor detail
6. **Paginate** check history and incidents at 10 per page
7. **Status dot pulsing** — animate a ring expanding outward for "Up" monitors
8. **CORS is not an issue** — this is a native app, no browser CORS restrictions apply
