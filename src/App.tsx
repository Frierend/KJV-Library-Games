import { BrowserRouter } from "react-router-dom";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { AppRouter } from "./app/AppRouter";
import { SessionProvider } from "./session/controller";

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
