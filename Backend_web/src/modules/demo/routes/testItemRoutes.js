/**
 * Demo routes — proves that HTTP -> DB -> response works.
 *
 * Mounted under /api/test-data by the app.
 */
import { Router } from 'express';
import { getAllTestItems } from '../services/testItemService.js';

const router = Router();

/**
 * GET /api/test-data
 * Returns rows from the demo TestItem table.
 */
router.get('/', async (_req, res, next) => {
  try {
    const items = await getAllTestItems();
    res.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
