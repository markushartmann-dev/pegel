/**
 * Wird einmal beim Start des Next.js-Servers ausgeführt.
 * Startet den Hintergrundjob für Push-Erinnerungen (nur Node.js-Laufzeit).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startScheduler } = await import("./server/scheduler");
    startScheduler();
  }
}
