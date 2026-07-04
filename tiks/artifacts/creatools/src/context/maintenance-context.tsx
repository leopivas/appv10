import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface PageMaintenance {
  enabled: boolean;
  message?: string;
  estimatedReturn?: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedReturn?: string;
  landingAlert?: string;
  pages?: Record<string, PageMaintenance>;
}

interface MaintenanceContextValue {
  maint: MaintenanceConfig;
  loading: boolean;
  refresh: () => void;
}

const DEFAULT: MaintenanceConfig = { enabled: false };

const MaintenanceContext = createContext<MaintenanceContextValue>({
  maint: DEFAULT,
  loading: true,
  refresh: () => {},
});

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [maint, setMaint] = useState<MaintenanceConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/maintenance`);
      if (res.ok) setMaint(await res.json() as MaintenanceConfig);
    } catch { /* ignore */ }
    setLoading(false);
  }, [BASE]);

  useEffect(() => {
    void fetch_();
    const id = setInterval(() => void fetch_(), 30_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return (
    <MaintenanceContext.Provider value={{ maint, loading, refresh: fetch_ }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
