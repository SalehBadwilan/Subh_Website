/**
 * Demo data access. Bridges the test route to the TestItem model.
 */
import TestItem from '../models/TestItem.js';

export async function seedIfEmpty() {
  const count = await TestItem.count();
  if (count > 0) return { seeded: false, count };

  await TestItem.bulkCreate([
    { title: 'Hello from Subh backend' },
    { title: 'Database connection works' },
    { title: 'Modular Monolith scaffold' },
  ]);
  return { seeded: true, count: 3 };
}

export async function getAllTestItems() {
  return TestItem.findAll({
    order: [['id', 'ASC']],
    raw: true,
  });
}
