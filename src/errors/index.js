export class AppError extends Error {
  constructor(message, { code = "APP_ERROR", statusCode = 500, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed", { code = "DATABASE_ERROR", cause } = {}) {
    super(message, { code, statusCode: 503, cause });
  }
}
