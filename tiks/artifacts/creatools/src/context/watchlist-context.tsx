import {
  createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode
} from "react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "creatools_watchlist";
const EVENTS_KEY = "creatools_watch_events";
const POLL_INTERVAL_MS = 60_000;
const MAX_EVENTS = 100;

export interface WatchedCreator {
  username: string;
  addedAt: number;
  isLive: boolean | null;
  viewerCount: number | null;
  title: string | null;
  lastChecked: number | null;
}

export interface WatchEvent {
  id: string;
  username: string;
  type: "went_live" | "went_offline";
  viewerCount: number | null;
  title: string | null;
  timestamp: number;
}

interface WatchlistState {
  creators: WatchedCreator[];
  events: WatchEvent[];
  notifPermission: NotificationPermission;
  add: (username: string) => void;
  remove: (username: string) => void;
  requestPermission: () => Promise<void>;
  liveCount: number;
}

const WatchlistContext = createContext<WatchlistState | null>(null);

function loadCreators(): WatchedCreator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCreators(creators: WatchedCreator[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
}

function loadEvents(): WatchEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: WatchEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchLiveStatus(username: string, token: string | null): Promise<{
  isLive: boolean; viewerCount: number | null; title: string | null;
}> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/tiktok/live-status?uniqueId=${encodeURIComponent(username)}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    isLive: !!(data?.status_id === 4 || data?.isLive || data?.live),
    viewerCount: data?.viewerCount ?? data?.viewer_count ?? null,
    title: data?.title ?? data?.liveTitle ?? null,
  };
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [creators, setCreators] = useState<WatchedCreator[]>(loadCreators);
  const [events, setEvents] = useState<WatchEvent[]>(loadEvents);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const { toast } = useToast();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = localStorage.getItem("creatools_token");
  }, []);

  const addEvent = useCallback((event: WatchEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev].slice(0, MAX_EVENTS);
      saveEvents(next);
      return next;
    });
  }, []);

  const fireBrowserNotif = useCallback((creator: WatchedCreator, type: "went_live" | "went_offline") => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const title = type === "went_live"
      ? `🔴 ${creator.username} está ao vivo!`
      : `⭕ ${creator.username} encerrou a live`;
    const body = type === "went_live"
      ? creator.title
        ? `"${creator.title}" — ${creator.viewerCount?.toLocaleString() ?? "?"} espectadores`
        : `${creator.viewerCount?.toLocaleString() ?? "?"} espectadores`
      : "A transmissão foi encerrada";
    new Notification(title, { body, icon: "/favicon.ico" });
  }, []);

  const checkAll = useCallback(async (currentCreators: WatchedCreator[]) => {
    if (!currentCreators.length) return;
    const token = tokenRef.current;

    const results = await Promise.allSettled(
      currentCreators.map((c) => fetchLiveStatus(c.username, token))
    );

    setCreators((prev) => {
      const next = prev.map((creator, i) => {
        const result = results[i];
        if (result.status === "rejected") {
          return { ...creator, lastChecked: Date.now() };
        }
        const { isLive, viewerCount, title } = result.value;
        const wasLive = creator.isLive;

        if (wasLive !== null && wasLive !== isLive) {
          const type = isLive ? "went_live" : "went_offline";
          const updated = { ...creator, isLive, viewerCount, title, lastChecked: Date.now() };
          const event: WatchEvent = {
            id: `${creator.username}-${Date.now()}`,
            username: creator.username,
            type,
            viewerCount: isLive ? viewerCount : null,
            title: isLive ? title : null,
            timestamp: Date.now(),
          };
          addEvent(event);
          fireBrowserNotif(updated, type);
          toast({
            title: type === "went_live" ? `🔴 ${creator.username} está ao vivo!` : `⭕ ${creator.username} encerrou a live`,
            description: type === "went_live"
              ? title || `${viewerCount?.toLocaleString() ?? "?"} espectadores`
              : undefined,
            duration: 6000,
          });
          return updated;
        }

        return { ...creator, isLive, viewerCount, title, lastChecked: Date.now() };
      });
      saveCreators(next);
      return next;
    });
  }, [addEvent, fireBrowserNotif, toast]);

  const creatorsRef = useRef(creators);
  creatorsRef.current = creators;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await checkAll(creatorsRef.current);
    };
    run();
    const timer = setInterval(run, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [checkAll]);

  const add = useCallback((username: string) => {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return;
    setCreators((prev) => {
      if (prev.some((c) => c.username.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [
        ...prev,
        { username: trimmed, addedAt: Date.now(), isLive: null, viewerCount: null, title: null, lastChecked: null },
      ];
      saveCreators(next);
      return next;
    });
  }, []);

  const remove = useCallback((username: string) => {
    setCreators((prev) => {
      const next = prev.filter((c) => c.username !== username);
      saveCreators(next);
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }, []);

  const liveCount = creators.filter((c) => c.isLive === true).length;

  return (
    <WatchlistContext.Provider value={{ creators, events, notifPermission, add, remove, requestPermission, liveCount }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be inside WatchlistProvider");
  return ctx;
}
