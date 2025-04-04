export class ApiError extends Error {
  constructor(message: string, public status: number, public cause?: Error) {
    super(message);
    this.name = "ApiError";
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string, public cause?: Error) {
    super(message, 500, cause);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public cause?: Error) {
    super(message, 400, cause);
    this.name = "ValidationError";
  }
}