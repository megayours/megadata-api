import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";
import type { StatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  constructor(message: string, public status: StatusCode, public cause?: Error) {
    super(message);
    this.name = "ApiError";
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string, public cause?: Error) {
    super(message, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, cause);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public cause?: Error) {
    super(message, HTTP_STATUS_CODES.BAD_REQUEST, cause);
    this.name = "ValidationError";
  }
}