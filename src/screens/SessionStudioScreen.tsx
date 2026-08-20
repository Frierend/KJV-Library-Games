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
import { ScoringRosterEditor } from "../components/gameplay/ScoringRosterEditor";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { IconButton } from "../components/ui/IconButton";
import { InfoTip } from "../components/ui/InfoTip";
import { StatusNotice } from "../components/ui/StatusNotice";
import { gameRegistry } from "../games/registry";
import type { GameId } from "../games/types";
import {
  LEGACY_VERSE_BUILDER_SETTINGS,
  resolveVerseBuilderSettings,
  type MissingWordsDifficulty,
  type VerseOrderDifficulty,
} from "../games/verse-builder/verseBuilderTypes";
import { createId } from "../session/createSession";
import { useSession } from "../session/controller";
import {
  builtInPresets,
  cloneSessionConfig,
  createPlaylistItem,
  createPlayer,
  createTeam,
  defaultSessionConfig,
} from "../session/presets";
import {
  normalizePlayers,
  normalizeTeams,
  validatePlayers,
  validateTeams,
} from "../session/scoring";
import type {
  GamePlaylistItem,
  SessionConfig,
  SessionMode,
  SessionPreset,
} from "../session/types";
import {
  isFullscreenSupported,
  requestFullscreen,
  type FullscreenFailure,
} from "../utils";

function newPlaylistItem(gameId: GameId, index: number) {
  return {
    ...createPlaylistItem(gameId, index),
    id: createId(`playlist-${gameId}`),
  };
}

function contentNoun(gameId: GamePlaylistItem["gameId"]) {
  if (gameId === "quiz") return "question";
  if (gameId === "four-pics") return "puzzle";
  return "verse";
}

function contentCountLabel(gameId: GamePlaylistItem["gameId"], count: number) {
  const noun = contentNoun(gameId);
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

type NumericDraftField = "roundCount" | "timerSeconds";
type PlaylistDrafts = Record<
  string,
  Partial<Record<NumericDraftField, string>>
>;
type PlaylistNumericErrors = Record<
  string,
  Partial<Record<NumericDraftField, string>>
>;

function maxRoundsFor(gameId: GameId) {
  return gameId === "quiz" ? 100 : gameId === "four-pics" ? 30 : 20;
}

function numericFieldError(value: string, min: number, max: number) {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (
    trimmed === "" ||
    !/^\d+$/.test(trimmed) ||
    !Number.isSafeInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    return `Enter a whole number from ${min} to ${max}.`;
  }
  return "";
}

const modeOptions: readonly {
  mode: SessionMode;
  label: string;
  helper: string;
}[] = [
  { mode: "fellowship", label: "Fellowship Mode", helper: "Classic host-led play without scores." },
  { mode: "individual", label: "Individual Play", helper: "Everyone competes separately." },
  { mode: "team", label: "Team Play", helper: "Players compete in groups." },
  { mode: "study", label: "Study Mode", helper: "Untimed, reference-focused play." },
];

function normalizedConfig(config: SessionConfig): SessionConfig {
  return {
    ...config,
    players: normalizePlayers(config.players),
    teams: normalizeTeams(config.teams),
  };
}

interface PendingModeChange {
  mode: SessionMode;
  preset?: SessionPreset;
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
  const [playlistDrafts, setPlaylistDrafts] = useState<PlaylistDrafts>({});
  const [presetName, setPresetName] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [pendingModeChange, setPendingModeChange] = useState<PendingModeChange | null>(null);
  const presets = [...builtInPresets, ...savedPresets];
  const fullscreenSupported = isFullscreenSupported();

  const scoringError = useMemo(() => {
    if (config.mode === "team") return validateTeams(config.teams).firstError;
    if (config.mode === "individual") return validatePlayers(config.players).firstError;
    return "";
  }, [config.mode, config.players, config.teams]);

  const numericFieldErrors = useMemo<PlaylistNumericErrors>(() => {
    const errors: PlaylistNumericErrors = {};
    for (const item of config.playlist) {
      const roundCount = playlistDrafts[item.id]?.roundCount ?? String(item.roundCount);
      const timerSeconds = playlistDrafts[item.id]?.timerSeconds ?? String(item.timerSeconds ?? 20);
      errors[item.id] = {
        roundCount: numericFieldError(roundCount, 1, maxRoundsFor(item.gameId)),
        timerSeconds: item.timerSeconds === null
          ? ""
          : numericFieldError(timerSeconds, 5, 300),
      };
    }
    return errors;
  }, [config.playlist, playlistDrafts]);

  const firstNumericError = config.playlist
    .map((item) => numericFieldErrors[item.id]?.roundCount || numericFieldErrors[item.id]?.timerSeconds)
    .find(Boolean) ?? "";

  const sessionError =
    config.playlist.length === 0
      ? "Add at least one game to the playlist."
      : firstNumericError || scoringError;

  function playlistDraftValue(item: GamePlaylistItem, field: NumericDraftField) {
    const draft = playlistDrafts[item.id]?.[field];
    if (draft !== undefined) return draft;
    return field === "roundCount"
      ? String(item.roundCount)
      : String(item.timerSeconds ?? 20);
  }

  function updatePlaylistDraft(id: string, field: NumericDraftField, value: string) {
    setPlaylistDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  function clearPlaylistDraft(id: string, field: NumericDraftField) {
    setPlaylistDrafts((current) => {
      const itemDraft = current[id];
      if (!itemDraft || itemDraft[field] === undefined) return current;
      const nextItemDraft = { ...itemDraft };
      delete nextItemDraft[field];
      const next = { ...current };
      if (Object.keys(nextItemDraft).length === 0) delete next[id];
      else next[id] = nextItemDraft;
      return next;
    });
  }

  function commitPlaylistDraft(id: string, field: NumericDraftField) {
    const item = config.playlist.find((candidate) => candidate.id === id);
    if (!item) return;
    const value = playlistDraftValue(item, field);
    const max = field === "roundCount" ? maxRoundsFor(item.gameId) : 300;
    const min = field === "roundCount" ? 1 : 5;
    if (numericFieldError(value, min, max)) return;
    const parsed = Number(value);
    if (field === "roundCount") updatePlaylistItem(id, { roundCount: parsed });
    else updatePlaylistItem(id, { timerSeconds: parsed });
    clearPlaylistDraft(id, field);
  }

  function configWithPlaylistDrafts() {
    return {
      ...config,
      playlist: config.playlist.map((item) => {
        const roundDraft = playlistDraftValue(item, "roundCount");
        const timerDraft = playlistDraftValue(item, "timerSeconds");
        const roundCount = numericFieldError(roundDraft, 1, maxRoundsFor(item.gameId))
          ? item.roundCount
          : Number(roundDraft);
        const timerSeconds = item.timerSeconds === null || numericFieldError(timerDraft, 5, 300)
          ? item.timerSeconds
          : Number(timerDraft);
        return { ...item, roundCount, timerSeconds };
      }),
    };
  }

  function applyPreset(preset: SessionPreset) {
    const currentCount = config.mode === "team"
      ? config.teams.length
      : config.mode === "individual"
        ? config.players.length
        : 0;
    if (preset.config.mode !== config.mode && currentCount > 0) {
      setPendingModeChange({ mode: preset.config.mode, preset });
      return;
    }
    setConfig(cloneSessionConfig(preset.config));
    setPlaylistDrafts({});
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

  function updateVerseBuilderSettings(id: string, update: Partial<NonNullable<GamePlaylistItem["verseBuilder"]>>) {
    const item = config.playlist.find((candidate) => candidate.id === id);
    if (!item || item.gameId !== "verse-builder") return;
    const current = resolveVerseBuilderSettings(item.verseBuilder);
    updatePlaylistItem(id, { verseBuilder: { ...current, ...update } });
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

  function applyMode(mode: SessionMode) {
    setPlaylistDrafts({});
    setConfig((current) => ({
      ...current,
      mode,
      teams:
        mode === "team"
          ? [
              { ...createTeam(0), id: createId("team") },
              { ...createTeam(1), id: createId("team") },
            ]
          : [],
      players:
        mode === "individual"
          ? [{ ...createPlayer(0), id: createId("player") }]
          : [],
      playlist:
        mode === "study"
          ? current.playlist.map((item) => ({ ...item, timerSeconds: null }))
          : current.playlist,
    }));
  }

  function requestMode(mode: SessionMode) {
    if (mode === config.mode) return;
    const currentCount = config.mode === "team"
      ? config.teams.length
      : config.mode === "individual"
        ? config.players.length
        : 0;
    if (currentCount > 0) {
      setPendingModeChange({ mode });
      return;
    }
    applyMode(mode);
  }

  async function startSession() {
    if (sessionError) return;
    let fullscreenFailure: FullscreenFailure | undefined;
    if (config.fullscreenAtStart && !document.fullscreenElement) {
      const outcome = await requestFullscreen();
      if (outcome.status !== "success") fullscreenFailure = outcome;
    }
    const session = createSession(cloneSessionConfig(normalizedConfig(configWithPlaylistDrafts())));
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
          Back to Library
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
              <legend>
                Play Format
                <InfoTip label="Play Format">
                  Choose how the session is hosted. Fellowship Mode is host-led without scores, while Study Mode is untimed and reference-focused.
                </InfoTip>
              </legend>
              <div className="mode-grid">
                {modeOptions.map((option) => (
                  <button
                    aria-pressed={config.mode === option.mode}
                    className={`mode-card ${config.mode === option.mode ? "is-selected" : ""}`}
                    key={option.mode}
                    onClick={() => requestMode(option.mode)}
                    type="button"
                  >
                    <strong>{option.label}</strong>
                    <span>{option.helper}</span>
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
                disabled={!presetName.trim() || Boolean(sessionError)}
                leadingIcon={<Save size={17} />}
                onClick={() => {
                  savePreset(
                    presetName.trim(),
                    cloneSessionConfig(normalizedConfig(configWithPlaylistDrafts())),
                  );
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
                <Button
                  leadingIcon={<Plus size={16} />}
                  onClick={() => setConfig((current) => ({
                    ...current,
                    playlist: [...current.playlist, newPlaylistItem("verse-builder", current.playlist.length)],
                  }))}
                  variant="ghost"
                >
                  Verse Builder
                </Button>
              </div>
            </div>

            <div className="playlist-editor">
              {config.playlist.map((item, index) => {
                const game = gameRegistry[item.gameId];
                const maxRounds = maxRoundsFor(item.gameId);
                const roundCountError = numericFieldErrors[item.id]?.roundCount ?? "";
                const timerError = numericFieldErrors[item.id]?.timerSeconds ?? "";
                const roundCountHelpId = `${item.id}-round-count-help`;
                const timerHelpId = `${item.id}-timer-help`;
                const verseBuilderSettings = item.gameId === "verse-builder"
                  ? resolveVerseBuilderSettings(item.verseBuilder ?? LEGACY_VERSE_BUILDER_SETTINGS)
                  : null;
                return (
                  <article className="playlist-item" key={item.id}>
                    <div className="playlist-item__header">
                      <span className="playlist-item__number">{index + 1}</span>
                      <div><strong>{game.title}</strong><small>{contentCountLabel(item.gameId, game.contentCount)} available</small></div>
                      <div className="playlist-item__actions">
                        <IconButton disabled={index === 0} icon={<ArrowUp size={17} />} label={`Move ${game.title} earlier`} onClick={() => movePlaylistItem(index, -1)} />
                        <IconButton disabled={index === config.playlist.length - 1} icon={<ArrowDown size={17} />} label={`Move ${game.title} later`} onClick={() => movePlaylistItem(index, 1)} />
                        <IconButton icon={<Trash2 size={17} />} label={`Remove ${game.title}`} onClick={() => setConfig((current) => ({ ...current, playlist: current.playlist.filter((candidate) => candidate.id !== item.id) }))} />
                      </div>
                    </div>
                    <div className="playlist-settings">
                      <div className="studio-field"><span><label htmlFor={`${item.id}-content-pack`}>Content Pack</label><InfoTip label="Content Pack">The built-in KJVenture library supplies the questions and puzzles for this session.</InfoTip></span><select disabled id={`${item.id}-content-pack`} value="kjventure-core"><option>KJVenture Core Library</option></select></div>
                      <label className="studio-field">
                        <span>Number of {contentNoun(item.gameId)[0].toUpperCase() + contentNoun(item.gameId).slice(1)}s</span>
                        <input
                          aria-describedby={roundCountError ? roundCountHelpId : undefined}
                          aria-invalid={Boolean(roundCountError)}
                          aria-label={`${game.title} number of ${contentNoun(item.gameId)}s`}
                          max={maxRounds}
                          min={1}
                          onBlur={() => commitPlaylistDraft(item.id, "roundCount")}
                          onChange={(event) => updatePlaylistDraft(item.id, "roundCount", event.target.value)}
                          type="number"
                          value={playlistDraftValue(item, "roundCount")}
                        />
                        {roundCountError && <small className="validation-message" id={roundCountHelpId}>{roundCountError}</small>}
                      </label>
                      <div className="studio-field"><span><label htmlFor={`${item.id}-order`}>{contentNoun(item.gameId)[0].toUpperCase() + contentNoun(item.gameId).slice(1)} Order</label><InfoTip label={`${contentNoun(item.gameId)[0].toUpperCase() + contentNoun(item.gameId).slice(1)} Order`}>Random mixes the available {contentNoun(item.gameId)}s; Source order follows the library sequence.</InfoTip></span><select id={`${item.id}-order`} onChange={(event) => updatePlaylistItem(item.id, { order: event.target.value as GamePlaylistItem["order"] })} value={item.order}><option value="random">Random</option><option value="source">Source order</option></select></div>
                      <label className="studio-field">
                        <span>Time Limit</span>
                        <input
                          aria-describedby={timerError ? timerHelpId : undefined}
                          aria-invalid={Boolean(timerError)}
                          aria-label={`${game.title} time limit`}
                          disabled={item.timerSeconds === null}
                          max={300}
                          min={5}
                          onBlur={() => commitPlaylistDraft(item.id, "timerSeconds")}
                          onChange={(event) => updatePlaylistDraft(item.id, "timerSeconds", event.target.value)}
                          type="number"
                          value={playlistDraftValue(item, "timerSeconds")}
                        />
                        {timerError && <small className="validation-message" id={timerHelpId}>{timerError}</small>}
                      </label>
                      <label className="studio-check"><input checked={item.timerSeconds === null} onChange={(event) => { updatePlaylistItem(item.id, { timerSeconds: event.target.checked ? null : 20 }); clearPlaylistDraft(item.id, "timerSeconds"); }} type="checkbox" /><span>No Time Limit</span></label>
                      <div className="studio-field"><span><label htmlFor={`${item.id}-expiry`}>When Time Expires</label><InfoTip label="When Time Expires">Require reveal keeps the current question or puzzle in place. Allow Skipping bypasses it, while Auto-reveal shows the answer automatically.</InfoTip></span><select disabled={item.timerSeconds === null} id={`${item.id}-expiry`} onChange={(event) => updatePlaylistItem(item.id, { expiryBehavior: event.target.value as GamePlaylistItem["expiryBehavior"] })} value={item.expiryBehavior}><option value="require-reveal">Require reveal</option><option value="allow-skip">Allow Skipping</option><option value="auto-reveal">Auto-reveal</option></select></div>
                      {verseBuilderSettings ? (
                        <>
                          <fieldset className="studio-fieldset studio-fieldset--compact">
                            <legend>Play Style</legend>
                            <div className="option-grid option-grid--two">
                              <button
                                aria-label="Missing Words"
                                aria-pressed={verseBuilderSettings.playStyle === "missing-words"}
                                className={`option-button ${verseBuilderSettings.playStyle === "missing-words" ? "is-selected" : ""}`}
                                onClick={() => updateVerseBuilderSettings(item.id, { playStyle: "missing-words" })}
                                type="button"
                              >
                                Missing Words <small aria-hidden="true">Recommended</small>
                              </button>
                              <button
                                aria-label="Verse Order"
                                aria-pressed={verseBuilderSettings.playStyle === "verse-order"}
                                className={`option-button ${verseBuilderSettings.playStyle === "verse-order" ? "is-selected" : ""}`}
                                onClick={() => updateVerseBuilderSettings(item.id, { playStyle: "verse-order" })}
                                type="button"
                              >
                                Verse Order
                              </button>
                            </div>
                          </fieldset>
                          <div className="studio-field">
                            <span><label htmlFor={`${item.id}-difficulty`}>Difficulty</label><InfoTip label="Difficulty">Missing Words difficulty changes the number of blanks. Verse Order difficulty filters the reviewed assembly records.</InfoTip></span>
                            <select
                              aria-label="Verse Builder difficulty"
                              id={`${item.id}-difficulty`}
                              onChange={(event) => verseBuilderSettings.playStyle === "missing-words"
                                ? updateVerseBuilderSettings(item.id, { missingWordsDifficulty: event.target.value as MissingWordsDifficulty })
                                : updateVerseBuilderSettings(item.id, { verseOrderDifficulty: event.target.value as VerseOrderDifficulty })}
                              value={verseBuilderSettings.playStyle === "missing-words" ? verseBuilderSettings.missingWordsDifficulty : verseBuilderSettings.verseOrderDifficulty}
                            >
                              {verseBuilderSettings.playStyle === "missing-words" ? (
                                <>
                                  <option value="introductory">Introductory — 1 missing word</option>
                                  <option value="intermediate">Intermediate — 2 missing words</option>
                                  <option value="advanced">Advanced — 3 missing words</option>
                                </>
                              ) : (
                                <>
                                  <option value="all">All difficulties</option>
                                  <option value="introductory">Introductory</option>
                                  <option value="intermediate">Intermediate</option>
                                  <option value="advanced">Advanced</option>
                                </>
                              )}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="studio-field"><span><label htmlFor={`${item.id}-difficulty`}>Difficulty</label><InfoTip label="Difficulty">Difficulty filters are unavailable because the current library has no difficulty metadata yet.</InfoTip></span><select disabled id={`${item.id}-difficulty`}><option>Difficulty not assigned</option></select></div>
                      )}
                    </div>
                  </article>
                );
              })}
              {config.playlist.length === 0 && <p className="empty-state">Add Quiz or Four Pics to begin.</p>}
            </div>
          </section>

          {(config.mode === "team" || config.mode === "individual") && (
            <section className="studio-section">
              <ScoringRosterEditor
                mode={config.mode}
                onPlayersChange={(players) => setConfig((current) => ({ ...current, players }))}
                onTeamsChange={(teams) => setConfig((current) => ({ ...current, teams }))}
                players={config.players}
                teams={config.teams}
              />
              <label className="studio-check"><input checked={config.showAudienceScores} onChange={(event) => setConfig((current) => ({ ...current, showAudienceScores: event.target.checked }))} type="checkbox" /><span>Show Scores During Gameplay</span></label>
            </section>
          )}

          <section className="studio-section presentation-settings">
            <div className="studio-section__heading"><div><span className="eyebrow">Step 3</span><h2>Presentation Settings</h2></div></div>
            <p className="presentation-settings__helper">Control how the session appears and behaves when shown on a laptop, TV, or projector. These settings do not change the game content.</p>
            <div className="presentation-settings__groups">
              <fieldset className="presentation-group">
                <legend>Content Display</legend>
                <div className="presentation-group__controls">
                  <div className="studio-field"><span><label htmlFor="reference-display">Bible Reference Display</label><InfoTip label="Bible Reference Display">Choose when the Bible reference appears during play; this setting does not change the answer or scoring.</InfoTip></span><select id="reference-display" onChange={(event) => setConfig((current) => ({ ...current, referenceDisplay: event.target.value as SessionConfig["referenceDisplay"] }))} value={config.referenceDisplay}><option value="on-resolution">After Answer Reveal</option><option value="always">Always Show</option><option value="hidden">Hidden</option></select></div>
                </div>
              </fieldset>
              <fieldset className="presentation-group">
                <legend>Audio &amp; Motion</legend>
                <div className="presentation-group__controls">
                  <div className="studio-field"><span><label htmlFor="animation-level">Animation Level</label><InfoTip label="Animation Level">Reduced Motion minimizes animation, while Follow Device Setting respects the device accessibility preference.</InfoTip></span><select id="animation-level" onChange={(event) => setConfig((current) => ({ ...current, motion: event.target.value as SessionConfig["motion"] }))} value={config.motion}><option value="system">Follow Device Setting</option><option value="full">Full Motion</option><option value="reduced">Reduced Motion</option></select></div>
                  <label className="studio-check"><input checked={config.soundEnabled} onChange={(event) => setConfig((current) => ({ ...current, soundEnabled: event.target.checked }))} type="checkbox" /><span>Enable Sound Effects</span></label>
                </div>
              </fieldset>
              <fieldset className="presentation-group">
                <legend>Screen &amp; Display</legend>
                <div className="presentation-group__controls">
                  <div className={`studio-check ${!fullscreenSupported ? "studio-check--disabled" : ""}`}>
                    <input
                      checked={config.fullscreenAtStart}
                      disabled={!fullscreenSupported}
                      id="fullscreen-at-start"
                      onChange={(event) => setConfig((current) => ({ ...current, fullscreenAtStart: event.target.checked }))}
                      type="checkbox"
                    />
                    <label htmlFor="fullscreen-at-start">Start Session in Fullscreen</label>
                    <InfoTip label="Start Session in Fullscreen">Requests browser fullscreen when the session starts; the browser may require a user gesture or deny the request.</InfoTip>
                  </div>
                  {!fullscreenSupported && (
                    <div className="studio-fullscreen-notice">
                      <StatusNotice tone="warning">
                        Fullscreen is unavailable in this browser.
                      </StatusNotice>
                    </div>
                  )}
                </div>
              </fieldset>
            </div>
          </section>
        </div>

        <aside className="studio-preview" aria-label="Session Preview">
          <div className="studio-preview__frame">
            <div className="studio-preview__top"><span>KJVenture</span><span>{config.playlist.length} {config.playlist.length === 1 ? "Game" : "Games"}</span></div>
            <div className="studio-preview__body">
              <Eye aria-hidden="true" />
              <span className="eyebrow">Session Preview</span>
              <h2>{config.title || "Untitled Session"}</h2>
              <p>{modeOptions.find((option) => option.mode === config.mode)?.label}</p>
              <ol>{config.playlist.map((item) => <li key={item.id}>{gameRegistry[item.gameId].title}<span>{contentCountLabel(item.gameId, item.roundCount)} · {item.timerSeconds === null ? "No Time Limit" : `${item.timerSeconds}-second time limit`}</span></li>)}</ol>
            </div>
          </div>
          {sessionError && <p className="validation-message" role="alert">{sessionError}</p>}
          <Button disabled={Boolean(sessionError)} onClick={() => void startSession()} trailingIcon={<ArrowLeft className="icon-flip" size={18} />}>
            Start Session
          </Button>
          <small>All settings and content stay on this device.</small>
        </aside>
      </div>

      <ConfirmDialog
        confirmLabel={`Switch to ${modeOptions.find((option) => option.mode === pendingModeChange?.mode)?.label ?? "selected mode"}`}
        description={
          config.mode === "individual"
            ? `This clears ${config.players.length} player ${config.players.length === 1 ? "name" : "names"}.`
            : config.mode === "team"
              ? `This clears ${config.teams.length} team ${config.teams.length === 1 ? "name" : "names"}.`
              : "The selected mode uses a different scoring setup."
        }
        destructive
        onCancel={() => setPendingModeChange(null)}
        onConfirm={() => {
          const pending = pendingModeChange;
          setPendingModeChange(null);
          if (!pending) return;
          if (pending.preset) {
            setConfig(cloneSessionConfig(pending.preset.config));
            setPlaylistDrafts({});
            setPresetName(pending.preset.title);
            setSavedMessage("");
          } else {
            applyMode(pending.mode);
          }
        }}
        open={Boolean(pendingModeChange)}
        title={`Change to ${modeOptions.find((option) => option.mode === pendingModeChange?.mode)?.label ?? "another mode"}?`}
      />
    </AppShell>
  );
}
