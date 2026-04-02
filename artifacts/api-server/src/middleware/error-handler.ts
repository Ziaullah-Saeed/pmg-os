import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  domain?: string;

  constructor(message: string, statusCode = 500, isOperational = true, domain?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.domain = domain;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;
  const requestId = (req as any).id ?? req.headers["x-request-id"] ?? "unknown";

  logger.error({
    err: { message: err.message, stack: err.stack, code: err.code },
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    isOperational,
    domain: err.domain,
  }, `Unhandled error: ${err.message}`);

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json({
    error: isOperational ? err.message : "Internal server error",
    requestId,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

export function setupProcessErrorHandlers(): void {
  process.on("uncaughtException", (err) => {
    logger.fatal({ err: { message: err.message, stack: err.stack } }, "Uncaught exception — process will continue but state may be inconsistent");
  });

  process.on("unhandledRejection", (reason: any) => {
    const message = reason?.message ?? String(reason);
    const stack = reason?.stack;
    logger.error({ err: { message, stack } }, "Unhandled promise rejection");
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl,
    method: req.method,
  });
}
