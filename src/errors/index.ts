export class ApplicationError extends Error {
  constructor(
    public message = 'Internal server error',
    public status = 500,
    public code = 'INTERNAL_SERVER_ERROR',
  ) {
    super();
  }
}

export class NotFoundError extends ApplicationError {
  constructor(
    public message = 'We are unable to locate requested resource',
    public status = 404,
    public code = 'NOT_FOUND',
  ) {
    super();
  }
}

export class AuthenticationTokenMissingError extends ApplicationError {
  constructor(
    public message = 'Authentication Token Missing',
    public status = 401,
    public code = 'AUTHENTICATION_TOKEN_MISSING',
  ) {
    super();
  }
}

export class WrongAuthenticationTokenError extends ApplicationError {
  constructor(
    public message = 'Wrong Authentication Token',
    public status = 401,
    public code = 'WRONG_AUTHENTICATION_TOKEN',
  ) {
    super();
  }
}

export class WrongCredentialsError extends ApplicationError {
  constructor(
    public message = 'Invalid email or password',
    public status = 401,
    public code = 'INVALID_CRED',
  ) {
    super();
  }
}

export class InvalidEmailError extends ApplicationError {
  constructor(
    public message = 'Email already exist',
    public status = 401,
    public code = 'OCCUPIED_EMAIL',
  ) {
    super();
  }
}
export class BadRequestError extends ApplicationError {
  constructor(
    public message = 'Invalid parameters',
    public status = 400,
    public code = 'BAD_REQUEST',
  ) {
    super();
  }
}
export class UnauthorizedError extends ApplicationError {
  constructor(
    public message = 'Unauthorized access',
    public status = 401,
    public code = 'UNAUTHORIZED',
  ) {
    super();
  }
}
export class ForbiddenError extends ApplicationError {
  constructor(
    public message = 'Access denied',
    public status = 403,
    public code = 'FORBIDDEN',
  ) {
    super();
  }
}
export class NotFound extends ApplicationError {
  constructor(
    public message = 'Resource not found',
    public status = 404,
    public code = 'NOT_FOUND',
  ) {
    super();
  }
}