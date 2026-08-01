import { Download, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../components/ui/Button";
import { StatusNotice } from "../components/ui/StatusNotice";
import { useSession } from "../session/controller";

const UPDATE_DEFERRED_KEY = "kjventure.update-deferred.v1";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaStatus() {
  const { activeSession } = useSession();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateDeferred, setUpdateDeferred] = useState(
    () => localStorage.getItem(UPDATE_DEFERRED_KEY) === "true",
  );
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const sessionIsUnsafeToReload = activeSession?.status === "active";

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  useEffect(() => {
    if (!needRefresh || !updateDeferred || sessionIsUnsafeToReload) return;
    localStorage.removeItem(UPDATE_DEFERRED_KEY);
    setUpdateDeferred(false);
    void updateServiceWorker(true);
  }, [needRefresh, sessionIsUnsafeToReload, updateDeferred, updateServiceWorker]);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function deferUpdate() {
    localStorage.setItem(UPDATE_DEFERRED_KEY, "true");
    setUpdateDeferred(true);
  }

  if (!online) {
    return (
      <aside className="pwa-status" data-testid="pwa-status">
        <StatusNotice live="polite" tone="offline">
          <strong>Offline mode.</strong> Installed games and saved sessions remain available.
        </StatusNotice>
      </aside>
    );
  }

  if (needRefresh) {
    return (
      <aside className="pwa-status" data-testid="pwa-status">
        <StatusNotice
          actions={
            sessionIsUnsafeToReload ? (
              <Button
                disabled={updateDeferred}
                leadingIcon={<RefreshCw size={17} />}
                onClick={deferUpdate}
                variant="secondary"
              >
                {updateDeferred ? "Update queued" : "Update after session"}
              </Button>
            ) : (
              <>
                <Button
                  leadingIcon={<RefreshCw size={17} />}
                  onClick={() => void updateServiceWorker(true)}
                  variant="secondary"
                >
                  Update now
                </Button>
                <Button onClick={() => setNeedRefresh(false)} variant="ghost">Later</Button>
              </>
            )
          }
          tone="warning"
        >
          <strong>A KJVenture update is ready.</strong> Active play will never reload automatically.
        </StatusNotice>
      </aside>
    );
  }

  if (offlineReady) {
    return (
      <aside className="pwa-status" data-testid="pwa-status">
        <StatusNotice
          actions={<Button onClick={() => setOfflineReady(false)} variant="ghost">Dismiss</Button>}
          tone="success"
        >
          <strong>Ready offline.</strong> KJVenture can now play without a connection.
        </StatusNotice>
      </aside>
    );
  }

  if (installPrompt) {
    return (
      <aside className="pwa-status" data-testid="pwa-status">
        <StatusNotice
          actions={
            <Button leadingIcon={<Download size={17} />} onClick={() => void install()} variant="secondary">
              Install
            </Button>
          }
        >
          <strong>Install KJVenture</strong> for a full-screen, offline-ready game-night app.
        </StatusNotice>
      </aside>
    );
  }

  return (
    <span className="sr-only" data-testid="pwa-status">
      <WifiOff aria-hidden="true" /> KJVenture is online. Installation is available when supported by your browser.
    </span>
  );
}
