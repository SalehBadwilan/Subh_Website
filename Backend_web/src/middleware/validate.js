/**
 * Collects express-validator results. If any validation failed, responds 422
 * with a structured error body; otherwise calls next().
 *
 *   router.post('/', body('email').isEmail(), validate, handler);
 */
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(422, 'Validation failed', errors));
};

export default validate;
