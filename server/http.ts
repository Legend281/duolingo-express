import { Request, Response } from 'express';

/**
 * Responds to an unexpected failure. The real error (SQLite messages, internal details) is
 * logged server-side with the request it happened on; the client only ever gets a generic
 * message. Routes used to send `err.message` straight back to whoever called them.
 */
export function sendServerError(req: Request, res: Response, err: unknown): void {
  console.error(`[api] ${req.method} ${req.originalUrl} failed:`, err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: 'Something went wrong on our side. Please try again.' });
}
