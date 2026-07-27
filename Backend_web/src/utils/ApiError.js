/**
 * Error with an attached HTTP status code. Throwing one of these from a route
 * handler is picked up by the centralized error handler in app.js.
 *
 *   throw new ApiError(404, 'Product not found');
 */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details) this.details = details;
  }
}

export const notFound = (entity = 'Resource') => new ApiError(404, `${entity} not found`);
export const badRequest = (message = 'Bad request', details = null) =>
  new ApiError(400, message, details);
export const conflict = (message = 'Conflict', details = null) =>
  new ApiError(409, message, details);

export default ApiError;
