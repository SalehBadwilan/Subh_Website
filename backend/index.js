/**
 * Central route registry. Aggregates every CRUD factory into a single router
 * that app.js mounts under /api. Each factory receives the initialized models.
 */
import { Router } from 'express';

// catalog
import createCategoryRoutes from './catalog/categories.js';
import createProductRoutes from './catalog/products.js';
import createProductImageRoutes from './catalog/productImages.js';
import createPackageRoutes from './catalog/packages.js';
import createPackageItemRoutes from './catalog/packageItems.js';
// identity
import createUserRoutes from './identity/users.js';
import createRoleRoutes from './identity/roles.js';
import createPermissionRoutes from './identity/permissions.js';
import createUserRoleRoutes from './identity/userRoles.js';
import createRolePermissionRoutes from './identity/rolePermissions.js';
import createAddressRoutes from './identity/addresses.js';
// merchant
import createMerchantRoutes from './merchant/merchants.js';
import createMerchantApplicationRoutes from './merchant/merchantApplications.js';
import createMerchantEmployeeRoutes from './merchant/merchantEmployees.js';
import createMerchantProductRoutes from './merchant/merchantProducts.js';
import createPlanRoutes from './merchant/plans.js';
import createMerchantSubscriptionRoutes from './merchant/merchantSubscriptions.js';
import createAdminEmployeeRoutes from './merchant/adminEmployees.js';
// orders
import createOrderRoutes from './orders/orders.js';
import createOrderItemRoutes from './orders/orderItems.js';
import createOrderStatusHistoryRoutes from './orders/orderStatusHistory.js';
import createCartRoutes from './orders/carts.js';
import createCartItemRoutes from './orders/cartItems.js';
// payments
import createPaymentRoutes from './payments/payments.js';
import createPaymentEventRoutes from './payments/paymentEvents.js';
import createRefundRoutes from './payments/refunds.js';
import createInvoiceRoutes from './payments/invoices.js';
import createShipmentRoutes from './payments/shipments.js';
// inventory
import createInventoryRoutes from './inventory/inventory.js';
import createStockReservationRoutes from './inventory/stockReservations.js';
import createStockMovementRoutes from './inventory/stockMovements.js';
// platform
import createNotificationRoutes from './platform/notifications.js';
import createAuditLogRoutes from './platform/auditLogs.js';
// auth
import createOtpRoutes from './auth/otpRoutes.js';

export function createApiRouter({ models }) {
  const api = Router();

  // auth (phone OTP)
  api.use('/auth/otp', createOtpRoutes({ models }));

  // catalog
  api.use('/categories', createCategoryRoutes({ models }));
  api.use('/products', createProductRoutes({ models }));
  api.use('/product-images', createProductImageRoutes({ models }));
  api.use('/packages', createPackageRoutes({ models }));
  api.use('/package-items', createPackageItemRoutes({ models }));
  // identity
  api.use('/users', createUserRoutes({ models }));
  api.use('/roles', createRoleRoutes({ models }));
  api.use('/permissions', createPermissionRoutes({ models }));
  api.use('/user-roles', createUserRoleRoutes({ models }));
  api.use('/role-permissions', createRolePermissionRoutes({ models }));
  api.use('/addresses', createAddressRoutes({ models }));
  // merchant
  api.use('/merchants', createMerchantRoutes({ models }));
  api.use('/merchant-applications', createMerchantApplicationRoutes({ models }));
  api.use('/merchant-employees', createMerchantEmployeeRoutes({ models }));
  api.use('/merchant-products', createMerchantProductRoutes({ models }));
  api.use('/plans', createPlanRoutes({ models }));
  api.use('/merchant-subscriptions', createMerchantSubscriptionRoutes({ models }));
  api.use('/admin-employees', createAdminEmployeeRoutes({ models }));
  // orders
  api.use('/orders', createOrderRoutes({ models }));
  api.use('/order-items', createOrderItemRoutes({ models }));
  api.use('/order-status-history', createOrderStatusHistoryRoutes({ models }));
  api.use('/carts', createCartRoutes({ models }));
  api.use('/cart-items', createCartItemRoutes({ models }));
  // payments
  api.use('/payments', createPaymentRoutes({ models }));
  api.use('/payment-events', createPaymentEventRoutes({ models }));
  api.use('/refunds', createRefundRoutes({ models }));
  api.use('/invoices', createInvoiceRoutes({ models }));
  api.use('/shipments', createShipmentRoutes({ models }));
  // inventory
  api.use('/inventory', createInventoryRoutes({ models }));
  api.use('/stock-reservations', createStockReservationRoutes({ models }));
  api.use('/stock-movements', createStockMovementRoutes({ models }));
  // platform
  api.use('/notifications', createNotificationRoutes({ models }));
  api.use('/audit-logs', createAuditLogRoutes({ models }));

  return api;
}

export default createApiRouter;
