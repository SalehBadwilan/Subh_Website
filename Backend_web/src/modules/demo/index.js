/**
 * Demo module barrel.
 *
 * In a Modular Monolith each module exposes a small public surface. Today
 * the only module is `demo`. Later modules (catalog, orders, payments,
 * inventory, ai) will follow the same shape and be registered in app.js.
 */
import testItemRoutes from './routes/testItemRoutes.js';
import TestItem from './models/TestItem.js';

export const demoModule = {
  name: 'demo',
  models: [TestItem],
  routes: testItemRoutes,
  mountPath: '/api/test-data',
};

export default demoModule;
