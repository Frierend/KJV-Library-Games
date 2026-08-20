import {
  ArrowRight,
  Download,
  Gamepad2,
  History,
  Library,
  Settings2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../app/AppShell";
import { BrandMark } from "../components/ui/BrandMark";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { StatusNotice } from "../components/ui/StatusNotice";
import { useSession } from "../session/controller";

export function HomeScreen() {
  const navigate = useNavigate();
  const { activeSession, discardSession, savedPresets, storageError } = useSession();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const resumable = activeSession && activeSession.status !== "complete";

  return (
    <AppShell>
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="eyebrow">King James Version game nights</span>
          <h1>Host beautiful Bible game sessions anywhere.</h1>
          <p>
            Bring fellowships, Sunday schools, classrooms, and families together
            for a warm journey through the Word.
          </p>
          <div className="home-hero__actions">
            <Button
              onClick={() => navigate("/studio")}
              trailingIcon={<ArrowRight size={18} />}
            >
              Host a Session
            </Button>
            <Button
              leadingIcon={<Library size={18} />}
              onClick={() => navigate("/games")}
              variant="secondary"
            >
              Explore Games
            </Button>
          </div>
        </div>
        <div aria-hidden="true" className="home-hero__art">
          <BrandMark large />
          <div className="home-hero__book-lines"><span /><span /><span /></div>
        </div>
      </section>

      <section aria-label="KJVenture shortcuts" className="journey-grid">
        {resumable && (
          <article className="journey-card journey-card--continue">
            <History aria-hidden="true" />
            <span className="eyebrow">Saved safely</span>
            <h2>Continue Last Session</h2>
            <p>
              {activeSession.config.title} · Round {activeSession.roundIndex + 1} of{" "}
              {activeSession.preparedRounds.length}. The time limit will remain paused.
            </p>
            <div className="journey-card__actions">
              <Button onClick={() => navigate(`/play/${activeSession.id}`)}>
                Continue Session
              </Button>
              <Button
                leadingIcon={<Trash2 size={17} />}
                onClick={() => setConfirmDiscard(true)}
                variant="ghost"
              >
                Discard Session
              </Button>
            </div>
          </article>
        )}
        <Link className="journey-card" to="/studio">
          <Settings2 aria-hidden="true" />
          <span className="eyebrow">Build your night</span>
          <h2>Session Studio</h2>
          <p>Create mixed playlists, choose timing, and preview the experience.</p>
        </Link>
        <Link className="journey-card" to="/games">
          <Gamepad2 aria-hidden="true" />
          <span className="eyebrow">Quick Play</span>
          <h2>Explore Games</h2>
          <p>Open the quiz, Four Pics, or Verse Builder directly.</p>
        </Link>
        <Link className="journey-card" to="/studio#presets">
          <Download aria-hidden="true" />
          <span className="eyebrow">On this device</span>
          <h2>Saved Presets</h2>
          <p>{savedPresets.length} custom preset{savedPresets.length === 1 ? "" : "s"} saved on this device.</p>
        </Link>
      </section>

      {storageError && (
        <div className="home-status">
          <StatusNotice tone="warning">{storageError}</StatusNotice>
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Discard Session"
        description="This removes the saved session from this device. It cannot be recovered."
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          discardSession();
          setConfirmDiscard(false);
        }}
        open={confirmDiscard}
        title="Discard the saved session?"
      />
    </AppShell>
  );
}
