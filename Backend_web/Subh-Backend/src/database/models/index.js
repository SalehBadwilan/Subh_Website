/**
 * Central model registry.
 *
 * Each module file exports a factory `(sequelize, DataTypes) => Model`.
 * Calling `initModels(sequelize)` initializes every model and wires all
 * associations. This is invoked once during boot.
 */
import User from './User.js';
import Role from './Role.js';
import Permission from './Permission.js';
import UserRole from './UserRole.js';
import RolePermission from './RolePermission.js';
import Address from './Address.js';
import MerchantApplication from './MerchantApplication.js';
import Merchant from './Merchant.js';
import MerchantEmployee from './MerchantEmployee.js';
import Plan from './Plan.js';
import MerchantSubscription from './MerchantSubscription.js';
import AdminEmployee from './AdminEmployee.js';
import Category from './Category.js';
import Product from './Product.js';
import ProductImage from './ProductImage.js';
import Package from './Package.js';
import PackageItem from './PackageItem.js';
import MerchantProduct from './MerchantProduct.js';
import Inventory from './Inventory.js';
import StockReservation from './StockReservation.js';
import StockMovement from './StockMovement.js';
import Cart from './Cart.js';
import CartItem from './CartItem.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import OrderStatusHistory from './OrderStatusHistory.js';
import Shipment from './Shipment.js';
import Payment from './Payment.js';
import PaymentEvent from './PaymentEvent.js';
import Refund from './Refund.js';
import Invoice from './Invoice.js';
import Notification from './Notification.js';
import AuditLog from './AuditLog.js';
import OtpCode from './OtpCode.js';
import SupportTicket from './SupportTicket.js';
// Stage 2 — Merchant extras (update requests, settlements, plan changes).
import ProductUpdateRequest from './ProductUpdateRequest.js';
import Settlement from './Settlement.js';
import SubscriptionChangeRequest from './SubscriptionChangeRequest.js';
// Stage 3 — Admin settings (platform-wide key/value).
import Setting from './Setting.js';

export function initModels(sequelize, DataTypes) {
  const m = {
    User: User(sequelize, DataTypes),
    Role: Role(sequelize, DataTypes),
    Permission: Permission(sequelize, DataTypes),
    UserRole: UserRole(sequelize, DataTypes),
    RolePermission: RolePermission(sequelize, DataTypes),
    Address: Address(sequelize, DataTypes),
    MerchantApplication: MerchantApplication(sequelize, DataTypes),
    Merchant: Merchant(sequelize, DataTypes),
    MerchantEmployee: MerchantEmployee(sequelize, DataTypes),
    Plan: Plan(sequelize, DataTypes),
    MerchantSubscription: MerchantSubscription(sequelize, DataTypes),
    AdminEmployee: AdminEmployee(sequelize, DataTypes),
    Category: Category(sequelize, DataTypes),
    Product: Product(sequelize, DataTypes),
    ProductImage: ProductImage(sequelize, DataTypes),
    Package: Package(sequelize, DataTypes),
    PackageItem: PackageItem(sequelize, DataTypes),
    MerchantProduct: MerchantProduct(sequelize, DataTypes),
    Inventory: Inventory(sequelize, DataTypes),
    StockReservation: StockReservation(sequelize, DataTypes),
    StockMovement: StockMovement(sequelize, DataTypes),
    Cart: Cart(sequelize, DataTypes),
    CartItem: CartItem(sequelize, DataTypes),
    Order: Order(sequelize, DataTypes),
    OrderItem: OrderItem(sequelize, DataTypes),
    OrderStatusHistory: OrderStatusHistory(sequelize, DataTypes),
    Shipment: Shipment(sequelize, DataTypes),
    Payment: Payment(sequelize, DataTypes),
    PaymentEvent: PaymentEvent(sequelize, DataTypes),
    Refund: Refund(sequelize, DataTypes),
    Invoice: Invoice(sequelize, DataTypes),
    Notification: Notification(sequelize, DataTypes),
    AuditLog: AuditLog(sequelize, DataTypes),
    OtpCode: OtpCode(sequelize, DataTypes),
    SupportTicket: SupportTicket(sequelize, DataTypes),
    // Stage 2
    ProductUpdateRequest: ProductUpdateRequest(sequelize, DataTypes),
    Settlement: Settlement(sequelize, DataTypes),
    SubscriptionChangeRequest: SubscriptionChangeRequest(sequelize, DataTypes),
    // Stage 3
    Setting: Setting(sequelize, DataTypes),
  };

  setupAssociations(m);
  return m;
}

/**
 * All foreign-key associations live in ONE place to make the graph auditable.
 */
export function setupAssociations(m) {
  // ---- Identity & RBAC ----
  m.User.hasMany(m.UserRole, { foreignKey: 'user_id' });
  m.UserRole.belongsTo(m.User, { foreignKey: 'user_id' });
  m.Role.hasMany(m.UserRole, { foreignKey: 'role_id' });
  m.UserRole.belongsTo(m.Role, { foreignKey: 'role_id' });
  m.Role.belongsToMany(m.Permission, { through: m.RolePermission, foreignKey: 'role_id', otherKey: 'permission_id' });
  m.Permission.belongsToMany(m.Role, { through: m.RolePermission, foreignKey: 'permission_id', otherKey: 'role_id' });
  m.User.hasMany(m.Address, { foreignKey: 'user_id' });
  m.Address.belongsTo(m.User, { foreignKey: 'user_id' });

  // ---- Merchants ----
  m.User.hasOne(m.Merchant, { foreignKey: 'user_id' });
  m.Merchant.belongsTo(m.User, { foreignKey: 'user_id' });
  m.User.hasOne(m.MerchantApplication, { foreignKey: 'user_id' });
  m.MerchantApplication.belongsTo(m.User, { foreignKey: 'user_id' });
  m.Merchant.hasMany(m.MerchantEmployee, { foreignKey: 'merchant_id' });
  m.MerchantEmployee.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.User.hasMany(m.MerchantEmployee, { foreignKey: 'user_id' });
  m.MerchantEmployee.belongsTo(m.User, { foreignKey: 'user_id' });
  m.Merchant.hasMany(m.MerchantSubscription, { foreignKey: 'merchant_id' });
  m.MerchantSubscription.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.Plan.hasMany(m.MerchantSubscription, { foreignKey: 'plan_id' });
  m.MerchantSubscription.belongsTo(m.Plan, { foreignKey: 'plan_id' });

  // ---- Admin ----
  m.User.hasOne(m.AdminEmployee, { foreignKey: 'user_id' });
  m.AdminEmployee.belongsTo(m.User, { foreignKey: 'user_id' });

  // ---- Catalog ----
  m.Category.hasMany(m.Category, { foreignKey: 'parent_id', as: 'children' });
  m.Category.belongsTo(m.Category, { foreignKey: 'parent_id', as: 'parent' });
  m.Category.hasMany(m.Product, { foreignKey: 'category_id' });
  m.Product.belongsTo(m.Category, { foreignKey: 'category_id' });
  m.Product.hasMany(m.ProductImage, { foreignKey: 'product_id' });
  m.ProductImage.belongsTo(m.Product, { foreignKey: 'product_id' });
  m.Package.belongsToMany(m.Product, { through: m.PackageItem, foreignKey: 'package_id', otherKey: 'product_id' });
  m.Product.belongsToMany(m.Package, { through: m.PackageItem, foreignKey: 'product_id', otherKey: 'package_id' });
  m.Merchant.hasMany(m.MerchantProduct, { foreignKey: 'merchant_id' });
  m.MerchantProduct.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.Product.hasMany(m.MerchantProduct, { foreignKey: 'product_id' });
  m.MerchantProduct.belongsTo(m.Product, { foreignKey: 'product_id' });
  m.Package.hasMany(m.MerchantProduct, { foreignKey: 'package_id' });
  m.MerchantProduct.belongsTo(m.Package, { foreignKey: 'package_id' });

  // ---- Inventory ----
  m.Inventory.hasMany(m.StockReservation, { foreignKey: 'inventory_id' });
  m.StockReservation.belongsTo(m.Inventory, { foreignKey: 'inventory_id' });
  m.Inventory.hasMany(m.StockMovement, { foreignKey: 'inventory_id' });
  m.StockMovement.belongsTo(m.Inventory, { foreignKey: 'inventory_id' });
  // Stage 4 — Operations: resolve the actor (user) that performed each stock
  // movement. The `actor_id` column already references users.id; wiring the
  // association here lets the movements ledger include the actor's name without
  // an extra query. Purely additive — no existing query depends on its absence.
  m.StockMovement.belongsTo(m.User, { foreignKey: 'actor_id', as: 'Actor' });

  // ---- Cart & checkout ----
  m.User.hasOne(m.Cart, { foreignKey: 'user_id' });
  m.Cart.belongsTo(m.User, { foreignKey: 'user_id' });
  m.Cart.hasMany(m.CartItem, { foreignKey: 'cart_id' });
  m.CartItem.belongsTo(m.Cart, { foreignKey: 'cart_id' });
  m.Product.hasMany(m.CartItem, { foreignKey: 'product_id' });
  m.Package.hasMany(m.CartItem, { foreignKey: 'package_id' });
  m.Merchant.hasMany(m.CartItem, { foreignKey: 'merchant_id' });

  // ---- Orders ----
  m.User.hasMany(m.Order, { foreignKey: 'user_id' });
  m.Order.belongsTo(m.User, { foreignKey: 'user_id' });
  m.Merchant.hasMany(m.Order, { foreignKey: 'merchant_id' });
  m.Order.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.Order.belongsTo(m.Address, { foreignKey: 'shipping_address_id', as: 'shippingAddress' });
  m.Order.belongsTo(m.Order, { foreignKey: 'parent_order_id', as: 'parentOrder' });
  m.Order.hasMany(m.OrderItem, { foreignKey: 'order_id' });
  m.OrderItem.belongsTo(m.Order, { foreignKey: 'order_id' });
  m.OrderItem.belongsTo(m.Product, { foreignKey: 'product_id' });
  m.OrderItem.belongsTo(m.Package, { foreignKey: 'package_id' });
  m.OrderItem.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.Order.hasMany(m.OrderStatusHistory, { foreignKey: 'order_id' });
  m.OrderStatusHistory.belongsTo(m.Order, { foreignKey: 'order_id' });

  // ---- Fulfilment & payments ----
  m.Order.hasOne(m.Shipment, { foreignKey: 'order_id' });
  m.Shipment.belongsTo(m.Order, { foreignKey: 'order_id' });
  m.Order.hasMany(m.Payment, { foreignKey: 'order_id' });
  m.Payment.belongsTo(m.Order, { foreignKey: 'order_id' });
  m.Payment.hasMany(m.PaymentEvent, { foreignKey: 'payment_id' });
  m.PaymentEvent.belongsTo(m.Payment, { foreignKey: 'payment_id' });
  m.Payment.hasMany(m.Refund, { foreignKey: 'payment_id' });
  m.Refund.belongsTo(m.Payment, { foreignKey: 'payment_id' });
  m.Order.hasMany(m.Refund, { foreignKey: 'order_id' });
  m.Order.hasOne(m.Invoice, { foreignKey: 'order_id' });
  m.Invoice.belongsTo(m.Order, { foreignKey: 'order_id' });

  // ---- Platform ----
  m.User.hasMany(m.Notification, { foreignKey: 'user_id' });
  m.Notification.belongsTo(m.User, { foreignKey: 'user_id' });
  m.AuditLog.belongsTo(m.User, { foreignKey: 'actor_id' });

  // ---- Support tickets (Customer APIs) ----
  m.User.hasMany(m.SupportTicket, { foreignKey: 'user_id' });
  m.SupportTicket.belongsTo(m.User, { foreignKey: 'user_id' });
  m.SupportTicket.belongsTo(m.Order, { foreignKey: 'order_id' });

  // ---- Stage 2: Merchant extras (update requests, settlements, plan changes) ----
  m.Merchant.hasMany(m.ProductUpdateRequest, { foreignKey: 'merchant_id', as: 'ProductUpdateRequests' });
  m.ProductUpdateRequest.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.ProductUpdateRequest.belongsTo(m.Product, { foreignKey: 'product_id' });
  m.ProductUpdateRequest.belongsTo(m.Package, { foreignKey: 'package_id' });
  m.ProductUpdateRequest.belongsTo(m.MerchantProduct, { foreignKey: 'merchant_product_id' });

  m.Merchant.hasMany(m.Settlement, { foreignKey: 'merchant_id', as: 'Settlements' });
  m.Settlement.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });

  m.Merchant.hasMany(m.SubscriptionChangeRequest, { foreignKey: 'merchant_id', as: 'SubscriptionChangeRequests' });
  m.SubscriptionChangeRequest.belongsTo(m.Merchant, { foreignKey: 'merchant_id' });
  m.SubscriptionChangeRequest.belongsTo(m.Plan, { foreignKey: 'current_plan_id', as: 'CurrentPlan' });
  m.SubscriptionChangeRequest.belongsTo(m.Plan, { foreignKey: 'requested_plan_id', as: 'RequestedPlan' });
}

export default { initModels, setupAssociations };
