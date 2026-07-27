import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  seedCatalog,
  seedCategories,
  seedPackages,
  seedRoles,
  seedSettings,
  seedUsers,
  type AdminCategory,
  type AdminPackage,
  type AdminRole,
  type AdminUser,
  type CatalogProduct,
  type PlatformSettings,
  type StockMovement,
} from "@/lib/admin-data";

type PackageInput = Omit<AdminPackage, "id" | "active"> & { active?: boolean };
type CategoryInput = Omit<AdminCategory, "id" | "active"> & { active?: boolean };
type ProductInput = Omit<CatalogProduct, "id" | "assignedMerchantIds" | "active"> & {
  active?: boolean;
};

type AdminStoreValue = {
  // Catalog
  catalog: CatalogProduct[];
  addProduct: (input: ProductInput) => CatalogProduct;
  updateProduct: (
    id: string,
    input: Partial<Omit<CatalogProduct, "id" | "assignedMerchantIds">>,
  ) => void;
  assignProductToMerchant: (productId: string, merchantId: string) => void;
  unassignProductFromMerchant: (productId: string, merchantId: string) => void;
  toggleProductActive: (productId: string) => void;
  adjustStock: (productId: string, delta: number, reason: string) => void;
  stockMovements: StockMovement[];

  // Categories
  categories: AdminCategory[];
  addCategory: (input: CategoryInput) => AdminCategory;
  updateCategory: (id: string, input: Partial<AdminCategory>) => void;
  toggleCategoryActive: (id: string) => void;

  // Packages
  packages: AdminPackage[];
  addPackage: (input: PackageInput) => AdminPackage;
  updatePackage: (id: string, input: Partial<AdminPackage>) => void;
  togglePackageActive: (id: string) => void;

  // Users
  users: AdminUser[];
  toggleUserActive: (id: string) => void;

  // Roles & Settings
  roles: AdminRole[];
  settings: PlatformSettings;
  updateSettings: (input: Partial<PlatformSettings>) => void;
};

const AdminStoreContext = createContext<AdminStoreValue | null>(null);

function slugify(name: string, prefix: string): string {
  return `${prefix}-${Date.now()}-${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "new"
  }`;
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>(seedCatalog);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>(seedCategories);
  const [packages, setPackages] = useState<AdminPackage[]>(seedPackages);
  const [users, setUsers] = useState<AdminUser[]>(seedUsers);
  const [roles] = useState<AdminRole[]>(seedRoles);
  const [settings, setSettings] = useState<PlatformSettings>(seedSettings);

  const adjustStock = useCallback((productId: string, delta: number, reason: string) => {
    setCatalog((prev) => {
      const product = prev.find((p) => p.id === productId);
      if (!product) return prev;
      setStockMovements((m) => [
        {
          id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId,
          productName: product.name,
          delta,
          reason,
          at: new Date().toISOString(),
        },
        ...m,
      ]);
      return prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
      );
    });
  }, []);

  const addProduct = useCallback((input: ProductInput): CatalogProduct => {
    const created: CatalogProduct = {
      id: slugify(input.name || "product", "cp"),
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      price: input.price,
      sku: input.sku,
      stock: input.stock,
      assignedMerchantIds: [],
      active: input.active ?? true,
    };
    setCatalog((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProduct = useCallback(
    (id: string, input: Partial<Omit<CatalogProduct, "id" | "assignedMerchantIds">>) => {
      setCatalog((prev) => prev.map((p) => (p.id === id ? { ...p, ...input } : p)));
    },
    [],
  );

  const assignProductToMerchant = useCallback((productId: string, merchantId: string) => {
    setCatalog((prev) =>
      prev.map((p) =>
        p.id === productId && !p.assignedMerchantIds.includes(merchantId)
          ? { ...p, assignedMerchantIds: [...p.assignedMerchantIds, merchantId] }
          : p,
      ),
    );
  }, []);

  const unassignProductFromMerchant = useCallback((productId: string, merchantId: string) => {
    setCatalog((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              assignedMerchantIds: p.assignedMerchantIds.filter((m) => m !== merchantId),
            }
          : p,
      ),
    );
  }, []);

  const toggleProductActive = useCallback((productId: string) => {
    setCatalog((prev) => prev.map((p) => (p.id === productId ? { ...p, active: !p.active } : p)));
  }, []);

  const addCategory = useCallback((input: CategoryInput): AdminCategory => {
    const created: AdminCategory = {
      id: slugify(input.name, "cat"),
      name: input.name,
      description: input.description,
      active: input.active ?? true,
    };
    setCategories((prev) => [...prev, created]);
    return created;
  }, []);

  const updateCategory = useCallback((id: string, input: Partial<AdminCategory>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
  }, []);

  const toggleCategoryActive = useCallback((id: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  }, []);

  const addPackage = useCallback((input: PackageInput): AdminPackage => {
    const created: AdminPackage = {
      id: slugify(input.name, "pkg"),
      name: input.name,
      price: input.price,
      tagline: input.tagline,
      features: input.features,
      featured: input.featured,
      active: input.active ?? true,
    };
    setPackages((prev) => [...prev, created]);
    return created;
  }, []);

  const updatePackage = useCallback((id: string, input: Partial<AdminPackage>) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...input } : p)));
  }, []);

  const togglePackageActive = useCallback((id: string) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }, []);

  const toggleUserActive = useCallback((id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  }, []);

  const updateSettings = useCallback((input: Partial<PlatformSettings>) => {
    setSettings((prev) => ({ ...prev, ...input }));
  }, []);

  const value = useMemo<AdminStoreValue>(
    () => ({
      catalog,
      addProduct,
      updateProduct,
      assignProductToMerchant,
      unassignProductFromMerchant,
      toggleProductActive,
      adjustStock,
      stockMovements,
      categories,
      addCategory,
      updateCategory,
      toggleCategoryActive,
      packages,
      addPackage,
      updatePackage,
      togglePackageActive,
      users,
      toggleUserActive,
      roles,
      settings,
      updateSettings,
    }),
    [
      catalog,
      addProduct,
      updateProduct,
      assignProductToMerchant,
      unassignProductFromMerchant,
      toggleProductActive,
      adjustStock,
      stockMovements,
      categories,
      addCategory,
      updateCategory,
      toggleCategoryActive,
      packages,
      addPackage,
      updatePackage,
      togglePackageActive,
      users,
      toggleUserActive,
      roles,
      settings,
      updateSettings,
    ],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore(): AdminStoreValue {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
