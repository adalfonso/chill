import { Request, Response, NextFunction } from "express";

/**
 * Strip the query string from a URL, keeping only the path
 *
 * `req.originalUrl` otherwise prints every cast token verbatim -- cast
 * tokens are session-bound (ADR-0009 decision 6), so logging them is
 * logging a credential.
 *
 * @param url - a path, optionally followed by `?query`
 * @returns the path with any query string removed
 */
export const redactQueryString = (url: string): string => url.split("?")[0];

export const accessLogs = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.info(
      `${req.method} ${redactQueryString(req.originalUrl)} → ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
};
