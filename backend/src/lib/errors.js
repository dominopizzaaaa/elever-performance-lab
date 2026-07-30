/**
 * Errors that are safe to surface to the client. Anything that is not an
 * ApiError is treated as an unexpected fault and reported as a generic 500.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code.
   * @param {string} message Human readable, client-safe message.
   * @param {{ code?: string, details?: unknown }} [options]
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code ?? codeForStatus(status);
    this.details = options.details;
    this.expose = true;
  }
}

function codeForStatus(status) {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthenticated';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limited';
    default:
      return 'error';
  }
}

export const badRequest = (message, details) => new ApiError(400, message, { details });
export const unauthorized = (message = 'Authentication required') => new ApiError(401, message);
export const forbidden = (message = 'You do not have access to this resource') => new ApiError(403, message);
export const notFound = (message = 'Resource not found') => new ApiError(404, message);
export const conflict = (message, details) => new ApiError(409, message, { details });

/**
 * Wraps an async route handler so rejected promises reach the error middleware.
 * @template {import('express').RequestHandler} T
 * @param {T} handler
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
