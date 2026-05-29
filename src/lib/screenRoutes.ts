import { FIREBASE_DATABASE_URL, SHOW_BACKEND_URL, SHOW_CONTROL_TOKEN, SHOW_ID, SHOW_TRANSPORT, SHOW_WS_URL } from '@/lib/runtimeConfig';

export type ScreenOwner = 'vj' | 'baofa' | 'off' | 'diagnostic';

export type ScreenRoute = {
  screenId: string;
  owner: ScreenOwner;
  url: string | null;
  updatedAt?: number;
  status?: string;
  source?: string;
};

export type ScreenPresentation = {
  autoRedirect: boolean;
  showDebug: boolean;
  showMenu: boolean;
};

const controlToken = SHOW_CONTROL_TOKEN;
const databaseUrl = FIREBASE_DATABASE_URL;
const showId = SHOW_ID;
export const BAOFA_SCREEN_BASE_URL = 'http://localhost:4303/screen';

export const SHOW_SCREEN_IDS = [
  'A1',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3',
  'E1', 'F1',
  'L1', 'L2', 'R1', 'R2',
] as const;

export async function fetchScreenState(signal?: AbortSignal): Promise<{
  routes: Record<string, ScreenRoute>;
  presentation: ScreenPresentation;
}> {
  if (!controlToken.trim()) throw new Error('Control token is required');
  const state = shouldReadFirebaseState()
    ? await fetchFirebaseState(signal)
    : await fetchBackendState(signal);
  return normalizeScreenState(state);
}

async function fetchBackendState(signal?: AbortSignal) {
  const headers: Record<string, string> = {};
  if (controlToken) headers['x-control-token'] = controlToken;
  const response = await fetch(`${SHOW_BACKEND_URL}/api/state`, { headers, signal });
  if (!response.ok) throw new Error(`Show API state failed: ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error(`Show API state returned ${contentType || 'non-json content'}`);
  return response.json();
}

async function fetchFirebaseState(signal?: AbortSignal) {
  const response = await fetch(firebaseJsonUrl(`shows/${safePath(showId)}/state`), { signal });
  if (!response.ok) throw new Error(`Firebase state failed: ${response.status}`);
  return response.json();
}

function normalizeScreenState(state: any) {
  const presentation = state?.modules?.interaction?.screenPresentation || {};
  return {
    routes: state?.modules?.interaction?.screenRoutes || {},
    presentation: {
      autoRedirect: typeof presentation.autoRedirect === 'boolean' ? presentation.autoRedirect : true,
      showDebug: typeof presentation.showDebug === 'boolean' ? presentation.showDebug : false,
      showMenu: typeof presentation.showMenu === 'boolean' ? presentation.showMenu : false,
    },
  };
}

function shouldReadFirebaseState() {
  if (!databaseUrl) return false;
  if (SHOW_TRANSPORT === 'firebase') return true;
  if (SHOW_TRANSPORT === 'websocket' || SHOW_TRANSPORT === 'cloudflare') return !isUsableWebSocketUrl();
  return !isUsableWebSocketUrl();
}

function isUsableWebSocketUrl() {
  if (!SHOW_WS_URL) return false;
  try {
    const url = new URL(SHOW_WS_URL);
    if (!['ws:', 'wss:'].includes(url.protocol)) return false;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.protocol === 'ws:') return false;
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    if (typeof window !== 'undefined' && !localHosts.has(window.location.hostname) && localHosts.has(url.hostname)) return false;
    if (url.hostname.endsWith('vercel.app')) return false;
    return true;
  } catch {
    return false;
  }
}

function firebaseJsonUrl(path: string) {
  return `${databaseUrl}/${path}.json`;
}

function safePath(value: string) {
  return value.replace(/[.#$/[\]]/g, '-');
}

export async function fetchScreenRoutes(signal?: AbortSignal): Promise<Record<string, ScreenRoute>> {
  const state = await fetchScreenState(signal);
  return state.routes;
}
