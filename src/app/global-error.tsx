"use client";

import Image from "next/image";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#f7f6f2",
          color: "#1d2738",
        }}
      >
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <Image
              src="/brand/mathios-logo.png"
              alt="Mathios"
              width={88}
              height={88}
              style={{ objectFit: "contain" }}
            />
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Mathios
            </p>
            <h1 style={{ fontSize: "2rem", margin: "1rem 0 0.5rem" }}>
              The workspace needs a restart.
            </h1>
            <p style={{ color: "#5b6472", margin: 0 }}>
              An unexpected application error interrupted the page.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                border: 0,
                borderRadius: "0.5rem",
                background: "#1d2738",
                color: "white",
                cursor: "pointer",
                padding: "0.7rem 1rem",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
