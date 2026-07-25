/**
 * Wrap an async route handler so rejected promises are forwarded to next(),
 * letting the centralized error handler deal with them. Express 5 does not
 * auto-catch async rejections reliably across versions, so we do it ourselves.
 *
 *   router.get('/:id', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
