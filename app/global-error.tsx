"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main>
          <h1>Что-то пошло не так</h1>
          <p>Попробуйте обновить страницу или повторить действие.</p>
          <button type="button" onClick={reset}>
            Попробовать снова
          </button>
        </main>
      </body>
    </html>
  );
}
