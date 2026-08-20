import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";
import { useSession } from "../session/controller";
import { HomeScreen } from "../screens/HomeScreen";

const ExploreGamesScreen = lazy(() =>
  import("../screens/ExploreGamesScreen").then((module) => ({
    default: module.ExploreGamesScreen,
  })),
);
const SessionStudioScreen = lazy(() =>
  import("../screens/SessionStudioScreen").then((module) => ({
    default: module.SessionStudioScreen,
  })),
);
const PlaySessionScreen = lazy(() =>
  import("../screens/PlaySessionScreen").then((module) => ({
    default: module.PlaySessionScreen,
  })),
);
const RestoreSessionScreen = lazy(() =>
  import("../screens/RestoreSessionScreen").then((module) => ({
    default: module.RestoreSessionScreen,
  })),
);

const QuizGame = lazy(() => import("../games/quiz/QuizGame"));
const FourPicsGame = lazy(() => import("../games/four-pics/FourPicsGame"));
const VerseBuilderGame = lazy(() => import("../games/verse-builder/VerseBuilderGame"));

function QuickGame({ game }: { game: "quiz" | "four-pics" | "verse-builder" }) {
  const navigate = useNavigate();
  const onExit = () => navigate("/games");
  if (game === "quiz") return <QuizGame onExit={onExit} />;
  if (game === "four-pics") return <FourPicsGame onExit={onExit} />;
  return <VerseBuilderGame onExit={onExit} />;
}

function MotionPreferenceSync() {
  const { activeSession, preferences } = useSession();
  useEffect(() => {
    const motion = activeSession?.config.motion ?? preferences.motion;
    document.documentElement.dataset.motion = motion;
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [activeSession?.config.motion, preferences.motion]);
  return null;
}

function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>("main h1");
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [location.pathname]);
  return null;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MotionPreferenceSync />
      <RouteFocus />
      <Routes>
        <Route element={<HomeScreen />} path="/" />
        <Route element={<ExploreGamesScreen />} path="/games" />
        <Route element={<QuickGame game="quiz" />} path="/games/quiz" />
        <Route element={<QuickGame game="four-pics" />} path="/games/four-pics" />
        <Route element={<QuickGame game="verse-builder" />} path="/games/verse-builder" />
        <Route element={<SessionStudioScreen />} path="/studio" />
        <Route element={<PlaySessionScreen />} path="/play/:sessionId" />
        <Route element={<RestoreSessionScreen />} path="/restore" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}
