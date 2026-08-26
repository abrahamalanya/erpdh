import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getConfiguracion } from '../api/configuracion';

interface AppConfigContextValue {
  nombreApp: string;
  faviconUrl: string | null;
  refresh: () => void;
}

const DEFAULT_NOMBRE_APP = 'umax';

const AppConfigContext = createContext<AppConfigContextValue>({
  nombreApp: DEFAULT_NOMBRE_APP,
  faviconUrl: null,
  refresh: () => {},
});

/**
 * Loads the global branding config (app name + favicon) once, at the app
 * root — needed by LoginPage before anyone authenticates, so this fetches
 * the public GET /configuracion endpoint directly, not via useAuth. Falls
 * back to "umax" + Vite's default favicon (already in index.html) on
 * failure or while loading, so a slow/broken backend never blanks the page.
 */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [nombreApp, setNombreApp] = useState(DEFAULT_NOMBRE_APP);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  function load() {
    getConfiguracion()
      .then((res) => {
        setNombreApp(res.data.nombre_app || DEFAULT_NOMBRE_APP);
        setFaviconUrl(res.data.favicon_url);
      })
      .catch(() => {});
  }

  useEffect(load, []);

  useEffect(() => {
    document.title = nombreApp;
  }, [nombreApp]);

  useEffect(() => {
    if (!faviconUrl) return;

    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = faviconUrl;
  }, [faviconUrl]);

  return (
    <AppConfigContext.Provider value={{ nombreApp, faviconUrl, refresh: load }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  return useContext(AppConfigContext);
}
