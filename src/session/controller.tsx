import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createActiveSession, createId } from "./createSession";
import { sessionReducer, type SessionAction } from "./reducer";
import {
  readSavedPresets,
  readPreferences,
  readStoredSession,
  removeStoredSession,
  saveActiveSession,
  savePresets,
  savePreferences,
} from "./storage";
import type {
  ActiveSession,
  SessionConfig,
  SessionPreset,
  UserPreferences,
} from "./types";

type ControllerAction =
  | { type: "CREATE"; session: ActiveSession }
  | { type: "RESTORE"; session: ActiveSession }
  | { type: "SESSION"; action: SessionAction }
  | { type: "CLEAR" };

function controllerReducer(
  state: ActiveSession | null,
  action: ControllerAction,
): ActiveSession | null {
  if (action.type === "CREATE" || action.type === "RESTORE") return action.session;
  if (action.type === "CLEAR") return null;
  return state ? sessionReducer(state, action.action) : state;
}

interface SessionContextValue {
  activeSession: ActiveSession | null;
  storageError: string | null;
  restoredFromStorage: boolean;
  savedPresets: SessionPreset[];
  preferences: UserPreferences;
  createSession: (config: SessionConfig) => ActiveSession;
  dispatch: (action: SessionAction) => void;
  discardSession: () => void;
  savePreset: (title: string, config: SessionConfig) => void;
  deletePreset: (id: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readStoredSession(), []);
  const [activeSession, controllerDispatch] = useReducer(
    controllerReducer,
    initial.session,
  );
  const [savedPresets, setSavedPresets] = useState(readSavedPresets);
  const [preferences, setPreferences] = useState(readPreferences);
  const activeRef = useRef(activeSession);
  activeRef.current = activeSession;

  useEffect(() => {
    if (activeSession) saveActiveSession(activeSession);
  }, [activeSession]);

  useEffect(() => {
    const session = activeSession;
    if (!session || session.timer.status !== "running") return;
    const deadline = Date.now() + session.timer.remainingMs;
    const interval = window.setInterval(() => {
      controllerDispatch({
        type: "SESSION",
        action: { type: "TICK", remainingMs: Math.max(0, deadline - Date.now()) },
      });
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [activeSession?.id, activeSession?.roundIndex, activeSession?.timer.status]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "hidden" || !activeRef.current) return;
      const paused = sessionReducer(activeRef.current, { type: "PAUSE_TIMER" });
      controllerDispatch({ type: "RESTORE", session: paused });
      saveActiveSession(paused);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const createSession = useCallback((config: SessionConfig) => {
    const nextPreferences = {
      soundEnabled: config.soundEnabled,
      motion: config.motion,
      referenceDisplay: config.referenceDisplay,
      fullscreenAtStart: config.fullscreenAtStart,
    };
    setPreferences(nextPreferences);
    savePreferences(nextPreferences);
    const session = createActiveSession(config);
    controllerDispatch({ type: "CREATE", session });
    saveActiveSession(session);
    return session;
  }, []);

  const dispatch = useCallback((action: SessionAction) => {
    controllerDispatch({ type: "SESSION", action });
  }, []);

  const discardSession = useCallback(() => {
    controllerDispatch({ type: "CLEAR" });
    removeStoredSession();
  }, []);

  const savePreset = useCallback((title: string, config: SessionConfig) => {
    setSavedPresets((current) => {
      const next = [
        ...current,
        {
          id: createId("preset"),
          title,
          description: "Saved on this device.",
          builtIn: false,
          config,
        },
      ];
      savePresets(next);
      return next;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setSavedPresets((current) => {
      const next = current.filter((preset) => preset.id !== id);
      savePresets(next);
      return next;
    });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      activeSession,
      storageError: initial.error,
      restoredFromStorage: Boolean(initial.session),
      savedPresets,
      preferences,
      createSession,
      dispatch,
      discardSession,
      savePreset,
      deletePreset,
    }),
    [
      activeSession,
      createSession,
      deletePreset,
      discardSession,
      dispatch,
      initial.error,
      initial.session,
      savePreset,
      savedPresets,
      preferences,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider.");
  return context;
}
