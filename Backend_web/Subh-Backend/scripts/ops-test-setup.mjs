// Temporary test helper: prints real user/inventory/order ids for testing.
import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../src/config/database.js';

try {
  const [rows] = await sequelize.query(`
    SELECT u.id, u.phone, u.full_name, r.slug AS role
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.slug IN ('warehouse','admin','admin_employee','customer')
    ORDER BY r.slug
    LIMIT 8;`);
  console.log('USERS:', JSON.stringify(rows));

  const [inv] = await sequelize.query(`
    SELECT id, sku, on_hand, reserved, reorder_threshold, sellable_type
    FROM inventory
    WHERE on_hand > 0
    ORDER BY on_hand DESC
    LIMIT 3;`);
  console.log('INV:', JSON.stringify(inv));

  const [orders] = await sequelize.query(`
    SELECT id, number, status
    FROM orders
    WHERE status IN ('paid','preparing','ready_to_ship','shipped','delivered')
    LIMIT 8;`);
  console.log('ORDERS:', JSON.stringify(orders));

  const [ae] = await sequelize.query(`SELECT user_id, is_active, department FROM admin_employees LIMIT 5;`);
  console.log('ADMIN_EMPLOYEES:', JSON.stringify(ae));

  const [ship] = await sequelize.query(`SELECT id, order_id, status FROM shipments LIMIT 5;`);
  console.log('SHIPMENTS:', JSON.stringify(ship));
} catch (e) {
  console.error('ERR', e.message);
} finally {
  await sequelize.close();
}
