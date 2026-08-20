export function LoadingState({ label = "Preparing session…" }: { label?: string }) {
  return (
    <main aria-busy="true" className="app-shell loading-screen">
      <span aria-hidden="true" className="loading-spinner" />
      <p role="status">{label}</p>
    </main>
  );
}
