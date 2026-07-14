/**
 * خريطة مسارات API. كل مسار دالة — لبناء URL آمن.
 * مرجع العقد: docs/api-contracts.md
 */
export const endpoints = {
  auth: {
    otpRequest: () => '/auth/otp/request',
    otpVerify: () => '/auth/otp/verify',
    refresh: () => '/auth/refresh',
    me: () => '/auth/me',
    logout: () => '/auth/logout',
  },
  products: {
    list: () => '/products',
    detail: (slug: string) => `/products/${slug}`,
  },
  categories: {
    list: () => '/categories',
    detail: (slug: string) => `/categories/${slug}`,
  },
  cart: {
    get: () => '/cart',
    addItem: () => '/cart/items',
    updateItem: (id: string) => `/cart/items/${id}`,
    removeItem: (id: string) => `/cart/items/${id}`,
    quote: () => '/cart/quote',
  },
  checkout: {
    intent: () => '/checkout/intent',
    confirm: () => '/checkout/confirm',
  },
  orders: {
    list: () => '/orders',
    detail: (id: string) => `/orders/${id}`,
    cancel: (id: string) => `/orders/${id}/cancel`,
    return: (id: string) => `/orders/${id}/return`,
  },
  addresses: {
    list: () => '/addresses',
    create: () => '/addresses',
    update: (id: string) => `/addresses/${id}`,
    remove: (id: string) => `/addresses/${id}`,
  },
  shipping: {
    options: () => '/shipping/options',
  },
  account: {
    get: () => '/account',
    update: () => '/account',
  },
  notifications: {
    list: () => '/notifications',
  },
  support: {
    createTicket: () => '/support/tickets',
  },
  merchant: {
    onboarding: () => '/merchant/onboarding',
    plans: () => '/merchant/plans',
    selectPlan: () => '/merchant/plans/select',
    products: () => '/merchant/products',
    requestProduct: () => '/merchant/products/request',
    orders: () => '/merchant/orders',
    finance: () => '/merchant/finance',
    reports: () => '/merchant/reports',
    staff: () => '/merchant/staff',
    updateStaffPermissions: (id: string) => `/merchant/staff/${id}/permissions`,
  },
  admin: {
    overview: () => '/admin/overview',
    merchants: () => '/admin/merchants',
    merchant: (id: string) => `/admin/merchants/${id}`,
    merchantStatus: (id: string) => `/admin/merchants/${id}/status`,
    products: () => '/admin/products',
    inventory: () => '/admin/inventory',
    orders: () => '/admin/orders',
    orderStatus: (id: string) => `/admin/orders/${id}/status`,
    payments: () => '/admin/payments',
    refunds: () => '/admin/refunds',
    capital: () => '/admin/capital',
    users: () => '/admin/users',
    userRoles: (id: string) => `/admin/users/${id}/roles`,
    auditLog: () => '/admin/audit-log',
    reports: () => '/admin/reports',
  },
  uploads: {
    create: () => '/uploads',
  },
} as const;
