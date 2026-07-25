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
// ai
import createAiRoutes from '../modules/ai/routes/aiRoutes.js';
// customer (Stage 1 — Customer APIs)
import createCustomerProductRoutes from '../modules/customer/routes/products.js';
import createCustomerCartRoutes from '../modules/customer/routes/cart.js';
import createCustomerOrderRoutes from '../modules/customer/routes/orders.js';
import createCustomerAddressRoutes from '../modules/customer/routes/addresses.js';
import createCustomerNotificationRoutes from '../modules/customer/routes/notifications.js';
import createCustomerSupportRoutes from '../modules/customer/routes/supportTickets.js';
// payments (Customer checkout flow)
import createCustomerPaymentRoutes from '../modules/payments/routes/payments.js';
import createPaymentWebhookRoutes from '../modules/payments/routes/webhooks.js';
// merchant & merchant-employee (Stage 2)
import createMerchantPortalRoutes from '../modules/merchant/routes/index.js';
import createMerchantEmployeePortalRoutes from '../modules/merchantEmployee/routes/index.js';
// admin (Stage 3 — Admin APIs)
import createAdminRoutes from '../modules/admin/routes/index.js';
// operations (Stage 4 — Operations APIs)
import createOperationsRoutes from '../modules/operations/routes/index.js';

export function createApiRouter({ models }) {
  const api = Router();

  // auth (phone OTP)
  api.use('/auth/otp', createOtpRoutes({ models }));

  // ai (semantic product search)
  api.use('/ai', createAiRoutes({ models }));

  // Gateway webhooks (server-to-server, NO auth). Mounted on a dedicated
  // /webhooks base path so the customer /payments router's `authenticate`
  // middleware never applies. Signature is verified by the active provider.
  api.use('/webhooks/payments', createPaymentWebhookRoutes({ models }));

  // --- Stage 1: Customer APIs ----------------------------------------------
  // Registered BEFORE the generic CRUD routers so the customer-facing read
  // handlers win for shared paths (/products, /orders, /addresses,
  // /notifications). Customer routers expose only GET (and authenticated
  // mutations); admin CRUD POST/PUT/DELETE still fall through because the
  // customer routers do not define those verbs.
  api.use('/products', createCustomerProductRoutes({ models }));
  api.use('/cart', createCustomerCartRoutes({ models }));
  api.use('/orders', createCustomerOrderRoutes({ models }));
  api.use('/addresses', createCustomerAddressRoutes({ models }));
  api.use('/notifications', createCustomerNotificationRoutes({ models }));
  api.use('/support', createCustomerSupportRoutes({ models }));
  // Customer payment flow (initiate/confirm + scoped GET). Registered BEFORE
  // the generic READ-only /payments router so POST wins; the generic router's
  // GET routes remain available for admin tooling (different query shape).
  api.use('/payments', createCustomerPaymentRoutes({ models }));
  // NOTE: /packages (GET active) and /merchant-applications (POST) were
  // adapted in place on their existing routers — no extra mount needed.

  // --- Stage 2: Merchant & Merchant Employee APIs -------------------------
  // Mounted with their own base path (/merchant, /merchant-employee) so they
  // never collide with the generic CRUD routers or the customer routes.
  api.use('/merchant', createMerchantPortalRoutes({ models }));
  api.use('/merchant-employee', createMerchantEmployeePortalRoutes({ models }));

  // --- Stage 3: Admin APIs ------------------------------------------------
  // Mounted with its own base path (/admin). All endpoints require an
  // authenticated user that is either a full Admin or an Admin Employee
  // (read-only). The router is mounted BEFORE the generic CRUD routers so the
  // /admin/* paths win and never overlap with /products, /merchants, etc.
  // (those generic paths remain unchanged for admin tooling and customers).
  api.use('/admin', createAdminRoutes({ models }));

  // --- Stage 4: Operations APIs -------------------------------------------
  // Mounted with its own base path (/operations). Endpoints require an
  // authenticated user that is warehouse staff (operations), a full Admin, or
  // an Admin Employee (read-only). Mounted BEFORE the generic CRUD routers so
  // the /operations/* paths win and never overlap with /orders, /inventory,
  // /shipments, /stock-movements (those generic paths remain unchanged).
  api.use('/operations', createOperationsRoutes({ models }));

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
