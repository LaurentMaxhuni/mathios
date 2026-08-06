export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only fixed left-4 top-4 z-[70] rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
