import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../app/AppShell";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { StatusNotice } from "../components/ui/StatusNotice";
import { gameRegistry } from "../games/registry";
import { createId } from "../session/createSession";
import { useSession } from "../session/controller";
import {
  builtInPresets,
  cloneSessionConfig,
  createPlaylistItem,
  createTeam,
  defaultSessionConfig,
} from "../session/presets";
import type {
  GamePlaylistItem,
  SessionConfig,
  SessionMode,
  SessionPreset,
  TeamConfig,
} from "../session/types";
import {
  isFullscreenSupported,
  requestFullscreen,
  type FullscreenFailure,
} from "../utils";

function newPlaylistItem(gameId: "quiz" | "four-pics", index: number) {
  return {
    ...createPlaylistItem(gameId, index),
    id: createId(`playlist-${gameId}`),
  };
}

function newTeam(index: number): TeamConfig {
  return { ...createTeam(index), id: createId("team") };
}

export function SessionStudioScreen() {
  const navigate = useNavigate();
  const { createSession, deletePreset, preferences, savePreset, savedPresets } = useSession();
  const [config, setConfig] = useState<SessionConfig>(() =>
    ({
      ...cloneSessionConfig(defaultSessionConfig),
      ...preferences,
    }),
  );
  const [presetName, setPresetName] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const presets = [...builtInPresets, ...savedPresets];
  const fullscreenSupported = isFullscreenSupported();

  const teamError = useMemo(() => {
    if (config.mode !== "team") return "";
    if (config.teams.length < 2 || config.teams.length > 6) {
      return "Team mode requires 2 to 6 teams.";
    }
    const names = config.teams.map((team) => team.name.trim().toLowerCase());
    if (names.some((name) => !name)) return "Every team needs a name.";
    if (new Set(names).size !== names.length) return "Team names must be unique.";
    return "";
  }, [config.mode, config.teams]);

  const sessionError =
    config.playlist.length === 0
      ? "Add at least one game to the playlist."
      : teamError;

  function applyPreset(preset: SessionPreset) {
    setConfig(cloneSessionConfig(preset.config));
    setPresetName(preset.title);
    setSavedMessage("");
  }

  function updatePlaylistItem(id: string, update: Partial<GamePlaylistItem>) {
    setConfig((current) => ({
      ...current,
      playlist: current.playlist.map((item) =>
        item.id === id ? { ...item, ...update } : item,
      ),
    }));
  }

  function movePlaylistItem(index: number, direction: -1 | 1) {
    setConfig((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.playlist.length) return current;
      const playlist = [...current.playlist];
      [playlist[index], playlist[target]] = [playlist[target], playlist[index]];
      return { ...current, playlist };
    });
  }

  function setMode(mode: SessionMode) {
    setConfig((current) => ({
      ...current,
      mode,
      teams:
        mode === "team" && current.teams.length < 2
          ? [newTeam(0), newTeam(1)]
          : current.teams,
      playlist:
        mode === "study"
          ? current.playlist.map((item) => ({ ...item, timerSeconds: null }))
          : current.playlist,
    }));
  }

  async function startSession() {
    if (sessionError) return;
    let fullscreenFailure: FullscreenFailure | undefined;
    if (config.fullscreenAtStart && !document.fullscreenElement) {
      const outcome = await requestFullscreen();
      if (outcome.status !== "success") fullscreenFailure = outcome;
    }
    const session = createSession(cloneSessionConfig(config));
    navigate(`/play/${session.id}`, {
      state: fullscreenFailure ? { fullscreenFailure } : undefined,
    });
  }

  return (
    <AppShell>
      <section className="studio-heading">
        <div>
          <span className="eyebrow">Host setup</span>
          <h1>Session Studio</h1>
          <p>Build a polished local game-night playlist, then preview it before starting.</p>
        </div>
        <Button leadingIcon={<ArrowLeft size={18} />} onClick={() => navigate("/")} variant="ghost">
          Library
        </Button>
      </section>

      <div className="studio-layout">
        <div className="studio-editor">
          <section className="studio-section">
            <div className="studio-section__heading">
              <div><span className="eyebrow">Step 1</span><h2>Session</h2></div>
            </div>
            <label className="studio-field">
              <span>Session title</span>
              <input
                maxLength={60}
                onChange={(event) => setConfig((current) => ({ ...current, title: event.target.value }))}
                value={config.title}
              />
            </label>
            <fieldset className="studio-fieldset">
              <legend>Play mode</legend>
              <div className="mode-grid">
                {(["fellowship", "team", "study"] as const).map((mode) => (
                  <button
                    aria-pressed={config.mode === mode}
                    className={`mode-card ${config.mode === mode ? "is-selected" : ""}`}
                    key={mode}
                    onClick={() => setMode(mode)}
                    type="button"
                  >
                    <strong>{mode[0].toUpperCase() + mode.slice(1)}</strong>
                    <span>
                      {mode === "team"
                        ? "Manual team scores"
                        : mode === "study"
                          ? "Untimed, reference-focused"
                          : "Classic host-led play"}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="studio-section" id="presets">
            <div className="studio-section__heading">
              <div><span className="eyebrow">Ready-made</span><h2>Presets</h2></div>
            </div>
            <div className="preset-grid">
              {presets.map((preset) => (
                <article className="preset-card" key={preset.id}>
                  <button onClick={() => applyPreset(preset)} type="button">
                    <strong>{preset.title}</strong>
                    <span>{preset.description}</span>
                  </button>
                  {!preset.builtIn && (
                    <IconButton
                      icon={<Trash2 size={17} />}
                      label={`Delete ${preset.title}`}
                      onClick={() => deletePreset(preset.id)}
                    />
                  )}
                </article>
              ))}
            </div>
            <div className="save-preset-row">
              <label className="studio-field">
                <span>Preset name</span>
                <input
                  maxLength={60}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder={config.title}
                  value={presetName}
                />
              </label>
              <Button
                disabled={!presetName.trim()}
                leadingIcon={<Save size={17} />}
                onClick={() => {
                  savePreset(presetName.trim(), cloneSessionConfig(config));
                  setSavedMessage("Preset saved on this device.");
                }}
                variant="secondary"
              >
                Save Preset
              </Button>
            </div>
            {savedMessage && <p className="inline-success" role="status">{savedMessage}</p>}
          </section>

          <section className="studio-section">
            <div className="studio-section__heading">
              <div><span className="eyebrow">Step 2</span><h2>Playlist</h2></div>
              <div className="studio-section__actions">
                <Button
                  leadingIcon={<Plus size={16} />}
                  onClick={() => setConfig((current) => ({
                    ...current,
                    playlist: [...current.playlist, newPlaylistItem("quiz", current.playlist.length)],
                  }))}
                  variant="ghost"
                >
                  Quiz
                </Button>
                <Button
                  leadingIcon={<Plus size={16} />}
                  onClick={() => setConfig((current) => ({
                    ...current,
                    playlist: [...current.playlist, newPlaylistItem("four-pics", current.playlist.length)],
                  }))}
                  variant="ghost"
                >
                  Four Pics
                </Button>
              </div>
            </div>

            <div className="playlist-editor">
              {config.playlist.map((item, index) => {
                const game = gameRegistry[item.gameId];
                const maxRounds = item.gameId === "quiz" ? 100 : 30;
                return (
                  <article className="playlist-item" key={item.id}>
                    <div className="playlist-item__header">
                      <span className="playlist-item__number">{index + 1}</span>
                      <div><strong>{game.title}</strong><small>{game.contentCount} records available</small></div>
                      <div className="playlist-item__actions">
                        <IconButton disabled={index === 0} icon={<ArrowUp size={17} />} label={`Move ${game.title} earlier`} onClick={() => movePlaylistItem(index, -1)} />
                        <IconButton disabled={index === config.playlist.length - 1} icon={<ArrowDown size={17} />} label={`Move ${game.title} later`} onClick={() => movePlaylistItem(index, 1)} />
                        <IconButton icon={<Trash2 size={17} />} label={`Remove ${game.title}`} onClick={() => setConfig((current) => ({ ...current, playlist: current.playlist.filter((candidate) => candidate.id !== item.id) }))} />
                      </div>
                    </div>
                    <div className="playlist-settings">
                      <label className="studio-field"><span>Content pack</span><select disabled value="kjventure-core"><option>KJVenture Core Library</option></select></label>
                      <label className="studio-field"><span>Rounds</span><input aria-label={`${game.title} rounds`} max={maxRounds} min={1} onChange={(event) => updatePlaylistItem(item.id, { roundCount: Math.max(1, Math.min(maxRounds, Number(event.target.value) || 1)) })} type="number" value={item.roundCount} /></label>
                      <label className="studio-field"><span>Order</span><select onChange={(event) => updatePlaylistItem(item.id, { order: event.target.value as GamePlaylistItem["order"] })} value={item.order}><option value="random">Random</option><option value="source">Source order</option></select></label>
                      <label className="studio-field"><span>Timer seconds</span><input aria-label={`${game.title} timer seconds`} disabled={item.timerSeconds === null} max={300} min={5} onChange={(event) => updatePlaylistItem(item.id, { timerSeconds: Math.max(5, Math.min(300, Number(event.target.value) || 20)) })} type="number" value={item.timerSeconds ?? 20} /></label>
                      <label className="studio-check"><input checked={item.timerSeconds === null} onChange={(event) => updatePlaylistItem(item.id, { timerSeconds: event.target.checked ? null : 20 })} type="checkbox" /><span>No timer</span></label>
                      <label className="studio-field"><span>At time’s up</span><select disabled={item.timerSeconds === null} onChange={(event) => updatePlaylistItem(item.id, { expiryBehavior: event.target.value as GamePlaylistItem["expiryBehavior"] })} value={item.expiryBehavior}><option value="require-reveal">Require reveal</option><option value="allow-skip">Allow Next</option><option value="auto-reveal">Auto-reveal</option></select></label>
                      <label className="studio-field"><span>Difficulty</span><select disabled><option>Not yet tagged</option></select></label>
                    </div>
                  </article>
                );
              })}
              {config.playlist.length === 0 && <p className="empty-state">Add Quiz or Four Pics to begin.</p>}
            </div>
          </section>

          {config.mode === "team" && (
            <section className="studio-section">
              <div className="studio-section__heading">
                <div><span className="eyebrow">Optional scoring</span><h2>Teams</h2></div>
                <Button
                  disabled={config.teams.length >= 6}
                  leadingIcon={<Plus size={16} />}
                  onClick={() => setConfig((current) => ({ ...current, teams: [...current.teams, newTeam(current.teams.length)] }))}
                  variant="ghost"
                >Add Team</Button>
              </div>
              <div className="team-editor">
                {config.teams.map((team, index) => (
                  <div className={`team-field team-field--${team.color}`} key={team.id}>
                    <label className="studio-field"><span>Team {index + 1}</span><input aria-label={`Team ${index + 1} name`} maxLength={24} onChange={(event) => setConfig((current) => ({ ...current, teams: current.teams.map((candidate) => candidate.id === team.id ? { ...candidate, name: event.target.value } : candidate) }))} value={team.name} /></label>
                    <IconButton disabled={config.teams.length <= 2} icon={<Trash2 size={17} />} label={`Remove ${team.name || `team ${index + 1}`}`} onClick={() => setConfig((current) => ({ ...current, teams: current.teams.filter((candidate) => candidate.id !== team.id) }))} />
                  </div>
                ))}
              </div>
              {teamError && <p className="validation-message" role="alert">{teamError}</p>}
              <label className="studio-check"><input checked={config.showAudienceScores} onChange={(event) => setConfig((current) => ({ ...current, showAudienceScores: event.target.checked }))} type="checkbox" /><span>Show scores on the gameplay stage</span></label>
            </section>
          )}

          <section className="studio-section">
            <div className="studio-section__heading"><div><span className="eyebrow">Step 3</span><h2>Presentation preferences</h2></div></div>
            <div className="preference-grid">
              <label className="studio-field"><span>References</span><select onChange={(event) => setConfig((current) => ({ ...current, referenceDisplay: event.target.value as SessionConfig["referenceDisplay"] }))} value={config.referenceDisplay}><option value="on-resolution">After resolution</option><option value="always">Always visible</option><option value="hidden">Hidden</option></select></label>
              <label className="studio-field"><span>Motion</span><select onChange={(event) => setConfig((current) => ({ ...current, motion: event.target.value as SessionConfig["motion"] }))} value={config.motion}><option value="system">Follow device</option><option value="full">Full motion</option><option value="reduced">Reduced motion</option></select></label>
              <label className="studio-check"><input checked={config.soundEnabled} onChange={(event) => setConfig((current) => ({ ...current, soundEnabled: event.target.checked }))} type="checkbox" /><span>Sound cues</span></label>
              <label className={`studio-check ${!fullscreenSupported ? "studio-check--disabled" : ""}`}>
                <input
                  checked={config.fullscreenAtStart}
                  disabled={!fullscreenSupported}
                  onChange={(event) => setConfig((current) => ({ ...current, fullscreenAtStart: event.target.checked }))}
                  type="checkbox"
                />
                <span>Request fullscreen when starting</span>
              </label>
            </div>
            {!fullscreenSupported && (
              <div className="studio-fullscreen-notice">
                <StatusNotice tone="warning">
                  Fullscreen is unavailable in this browser.
                </StatusNotice>
              </div>
            )}
          </section>
        </div>

        <aside className="studio-preview" aria-label="Live session preview">
          <div className="studio-preview__frame">
            <div className="studio-preview__top"><span>KJVenture</span><span>{config.playlist.length} game{config.playlist.length === 1 ? "" : "s"}</span></div>
            <div className="studio-preview__body">
              <Eye aria-hidden="true" />
              <span className="eyebrow">Live preview</span>
              <h2>{config.title || "Untitled Session"}</h2>
              <p>{config.mode[0].toUpperCase() + config.mode.slice(1)} mode</p>
              <ol>{config.playlist.map((item) => <li key={item.id}>{gameRegistry[item.gameId].title}<span>{item.roundCount} rounds · {item.timerSeconds === null ? "No timer" : `${item.timerSeconds}s`}</span></li>)}</ol>
            </div>
          </div>
          {sessionError && <p className="validation-message" role="alert">{sessionError}</p>}
          <Button disabled={Boolean(sessionError)} onClick={() => void startSession()} trailingIcon={<ArrowLeft className="icon-flip" size={18} />}>
            Start Session
          </Button>
          <small>All settings and content stay on this device.</small>
        </aside>
      </div>
    </AppShell>
  );
}
