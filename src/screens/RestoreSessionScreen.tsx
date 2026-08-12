import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../app/AppShell";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useSession } from "../session/controller";

export function RestoreSessionScreen() {
  const navigate = useNavigate();
  const { activeSession, discardSession } = useSession();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (!activeSession || activeSession.status === "complete") return <Navigate replace to="/" />;
  return (
    <AppShell>
      <section className="restore-card">
        <span className="eyebrow">Session restored safely</span>
        <h1>Continue where you left off?</h1>
        <p>
          {activeSession.config.title} is at round {activeSession.roundIndex + 1} of{" "}
          {activeSession.preparedRounds.length}. The time limit is paused.
        </p>
        <div className="setup-actions">
          <Button onClick={() => navigate(`/play/${activeSession.id}`)}>Continue Session</Button>
          <Button onClick={() => navigate("/")} variant="secondary">Return to Library</Button>
          <Button onClick={() => setConfirmDiscard(true)} variant="ghost">Discard Session</Button>
        </div>
      </section>
      <ConfirmDialog
        confirmLabel="Discard Session"
        description="This removes the saved session from this device."
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          discardSession();
          navigate("/");
        }}
        open={confirmDiscard}
        title="Discard this session?"
      />
    </AppShell>
  );
}
