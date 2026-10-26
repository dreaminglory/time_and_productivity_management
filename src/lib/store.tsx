import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { produce } from 'immer';
import type { AppData } from './types';
import { normalize } from './defaults';

export interface Api {
  load(): Promise<unknown>;
  save(json: string): Promise<void>;
  saveSync(json: string): void;
  applySettings(s: { startWithWindows: boolean; closeToTray: boolean }): Promise<void>;
  notify(title: string, body: string): Promise<void>;
  setStatus(text: string): Promise<void>;
  openDataFolder(): Promise<void>;
  dataPath(): Promise<string>;
  onResume(cb: () => void): void;
  onNavigate(cb: (view: string) => void): void;
}

declare global {
  interface Window {
    api?: Api;
  }
}

/** Browser fallback (used only when the UI runs outside Electron, e.g. for previewing). */
const browserApi: Api = {
  load: async () => JSON.parse(localStorage.getItem('day-tracker') ?? 'null'),
  save: async (json) => localStorage.setItem('day-tracker', json),
  saveSync: (json) => localStorage.setItem('day-tracker', json),
  applySettings: async () => {},
  notify: async (title, body) => console.info('[notify]', title, body),
  setStatus: async () => {},
  openDataFolder: async () => {},
  dataPath: async () => 'browser localStorage',
  onResume: () => {},
  onNavigate: () => {},
};

export const api: Api = window.api ?? browserApi;

type Updater = (d: AppData) => void;

const Ctx = createContext<{ data: AppData; update: (fn: Updater) => void } | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const loaded = useRef<AppData | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api.load().then((raw) => {
      const d = normalize(raw);
      loaded.current = d;
      setData(d);
    });
  }, []);

  const flush = useCallback(() => {
    if (pending.current === null) return;
    api.save(pending.current);
    pending.current = null;
  }, []);

  useEffect(() => {
    if (!data || data === loaded.current) return;
    pending.current = JSON.stringify(data);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
  }, [data, flush]);

  useEffect(() => {
    const onUnload = () => {
      if (pending.current !== null) api.saveSync(pending.current);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const settings = data?.settings;
  useEffect(() => {
    if (settings) api.applySettings({ startWithWindows: settings.startWithWindows, closeToTray: settings.closeToTray });
  }, [settings?.startWithWindows, settings?.closeToTray]);

  const update = useCallback((fn: Updater) => {
    setData((prev) => (prev ? produce(prev, fn) : prev));
  }, []);

  if (!data) return <div className="loading">Loading…</div>;
  return <Ctx.Provider value={{ data, update }}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData outside DataProvider');
  return ctx;
}

/** Re-renders every `ms` and returns the current time in ms. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
