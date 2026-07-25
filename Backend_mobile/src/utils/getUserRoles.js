export async function getUserRoles(userId, models) {
  const {
    UserRole,
    Role,
    Merchant,
    MerchantEmployee,
    AdminEmployee,
  } = models;

  const roles = [];

  // Legacy role assignments
  const assignments = await UserRole.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Role,
        attributes: ["slug"],
      },
    ],
  });

  roles.push(
    ...assignments
      .map((assignment) => assignment.Role?.slug)
      .filter(Boolean)
  );

  // Merchant
  const merchant = await Merchant.findOne({
    where: { user_id: userId },
  });

  if (merchant) {
    roles.push("merchant");
  }

  // Merchant Employee
  const merchantEmployee = await MerchantEmployee.findOne({
    where: {
      user_id: userId,
      is_active: true,
    },
  });

  if (merchantEmployee) {
    roles.push("merchant_employee");
  }

  // Admin Employee
  const adminEmployee = await AdminEmployee.findOne({
    where: {
      user_id: userId,
      is_active: true,
    },
  });

  if (adminEmployee) {
    roles.push("admin_employee");
  }

  if (roles.length === 0) {
    roles.push("customer");
  }

  return [...new Set(roles)];
}