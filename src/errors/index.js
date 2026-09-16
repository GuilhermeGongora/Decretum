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

export class ValidationError extends AppError {
  constructor(message, { code = "INVALID_PAYLOAD", cause } = {}) {
    super(message, { code, statusCode: 400, cause });
  }
}

export class NotFoundError extends AppError {
  constructor(message, { code = "NOT_FOUND", cause } = {}) {
    super(message, { code, statusCode: 404, cause });
  }
}

export class ConflictError extends AppError {
  constructor(message, { code = "CONFLICT", cause } = {}) {
    super(message, { code, statusCode: 409, cause });
  }
}

export class DomainRuleError extends AppError {
  constructor(message, { code = "DOMAIN_RULE_VIOLATION", cause } = {}) {
    super(message, { code, statusCode: 422, cause });
  }
}

export class NoEligibleCardError extends AppError {
  constructor(message = "No eligible card is available", { cause } = {}) {
    super(message, { code: "NO_ELIGIBLE_CARD", statusCode: 500, cause });
  }
}
