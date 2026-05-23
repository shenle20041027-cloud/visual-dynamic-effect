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

const env = (import.meta as any).env || {};
export const SHOW_BACKEND_URL = String(env.VITE_SHOW_BACKEND_URL || 'http://localhost:4300').replace(/\/$/, '');
const controlToken = String(env.VITE_CONTROL_TOKEN || '');
export const BAOFA_SCREEN_BASE_URL = 'http://localhost:4303/screen';

export const SHOW_SCREEN_IDS = [
  'A1',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3',
  'E1', 'F1',
  'L1', 'L2', 'R1', 'R2',
] as const;

export function getBaofaScreenUrl(screenId: string) {
  return `${BAOFA_SCREEN_BASE_URL}/${encodeURIComponent(screenId)}`;
}

export async function fetchScreenState(signal?: AbortSignal): Promise<{
  routes: Record<string, ScreenRoute>;
  presentation: ScreenPresentation;
}> {
  const headers: Record<string, string> = {};
  if (controlToken) headers['x-control-token'] = controlToken;
  const response = await fetch(`${SHOW_BACKEND_URL}/api/state`, { headers, signal });
  if (!response.ok) throw new Error(`Show API state failed: ${response.status}`);
  const state = await response.json();
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

export async function fetchScreenRoutes(signal?: AbortSignal): Promise<Record<string, ScreenRoute>> {
  const state = await fetchScreenState(signal);
  return state.routes;
}
