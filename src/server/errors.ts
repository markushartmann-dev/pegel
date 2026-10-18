/**
 * Fachliche Fehler mit HTTP-Status. Nur `message` wird an den Client gesendet;
 * interne Details (Stacktraces, SQL) bleiben im Server-Log.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "ERROR",
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError(400, message, "BAD_REQUEST", fields);
export const unauthorized = (message = "Bitte melde dich an.") => new AppError(401, message, "UNAUTHORIZED");
export const forbidden = (message = "Keine Berechtigung für diese Aktion.") => new AppError(403, message, "FORBIDDEN");
export const notFound = (message = "Nicht gefunden.") => new AppError(404, message, "NOT_FOUND");
export const conflict = (message: string) => new AppError(409, message, "CONFLICT");
export const tooManyRequests = (message = "Zu viele Anfragen. Bitte warte einen Moment.") =>
  new AppError(429, message, "RATE_LIMITED");
