/**
 * AI module barrel.
 *
 * Follows the same { name, routes, mountPath } shape as the demo module. The
 * actual mounting happens in src/routes/index.js (alongside the CRUD modules)
 * so the AI routes share the same model-injection + centralized error handler
 * pipeline as the rest of the API.
 *
 *   name      — module identifier
 *   routes    — factory: createAiRoutes({ models }) -> Express Router
 *   mountPath — intended mount point: /api/ai
 */
import createAiRoutes from './routes/aiRoutes.js';

export const aiModule = {
  name: 'ai',
  routes: createAiRoutes,
  mountPath: '/api/ai',
};

export default aiModule;
