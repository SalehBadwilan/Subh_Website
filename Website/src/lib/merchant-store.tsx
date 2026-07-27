import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Employee, MerchantOrder, MerchantProduct, Settlement } from "@/lib/merchant-data";
import { getUser } from "@/lib/auth";

export type MerchantApplicationStatus = "none" | "pending" | "approved" | "rejected";

export type MerchantProfile = {
  businessName: string;
  crNumber: string;
  taxNumber: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  package: string;
  joinedAt: string;
  packageExpiry?: string;
};

export type MerchantApplication = {
  id: string;
  profile: MerchantProfile;
  status: Exclude<MerchantApplicationStatus, "none">;
  submittedAt: string;
  crFileName?: string;
  rejectionReason?: string;
};

type SubmitApplicationInput = Omit<MerchantProfile, "joinedAt" | "packageExpiry"> & {
  joinedAt?: string;
  crFileName?: string;
};

type EmployeeInput = Omit<Employee, "id">;

type MerchantStoreValue = {
  // Current logged-in merchant (session)
  status: MerchantApplicationStatus;
  profile: MerchantProfile | null;
  currentMerchantId: string | null;
  submitApplication: (input: SubmitApplicationInput) => MerchantApplication;

  // All applications (admin view)
  applications: MerchantApplication[];
  approveApplication: (id: string) => void;
  rejectApplication: (id: string, reason?: string) => void;

  products: MerchantProduct[];
  orders: MerchantOrder[];
  settlements: Settlement[];

  employees: Employee[];
  addEmployee: (input: EmployeeInput) => Employee;
  updateEmployee: (id: string, input: EmployeeInput) => void;
  toggleEmployeeActive: (id: string) => void;
};

const MerchantStoreContext = createContext<MerchantStoreValue | null>(null);

function todayLabel(): string {
  return new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Fresh system: no preloaded merchant applications. Applications appear
// here only when submitted through the Merchant Registration flow.
const seedApplications: MerchantApplication[] = [];

export function MerchantStoreProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<MerchantApplication[]>(seedApplications);
  const [currentApplicationId, setCurrentApplicationId] = useState<string | null>(null);

  const [products] = useState<MerchantProduct[]>([]);
  const [orders] = useState<MerchantOrder[]>([]);
  const [settlements] = useState<Settlement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const current = useMemo(
    () =>
      currentApplicationId
        ? (applications.find((a) => a.id === currentApplicationId) ?? null)
        : null,
    [applications, currentApplicationId],
  );

  const status: MerchantApplicationStatus = current ? current.status : "none";
  const profile = current ? current.profile : null;

  const submitApplication = useCallback((input: SubmitApplicationInput): MerchantApplication => {
    const joinedAt = input.joinedAt ?? todayLabel();
    const app: MerchantApplication = {
      id: `app-${Date.now()}`,
      status: "pending",
      submittedAt: joinedAt,
      crFileName: input.crFileName,
      profile: {
        businessName: input.businessName,
        crNumber: input.crNumber,
        taxNumber: input.taxNumber,
        ownerName: input.ownerName,
        phone: input.phone,
        email: input.email,
        city: input.city,
        address: input.address,
        package: input.package,
        joinedAt,
      },
    };
    setApplications((prev) => [app, ...prev]);
    setCurrentApplicationId(app.id);
    return app;
  }, []);

  const approveApplication = useCallback((id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved", rejectionReason: undefined } : a)),
    );
  }, []);

  const rejectApplication = useCallback((id: string, reason?: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected", rejectionReason: reason } : a)),
    );
  }, []);

  const addEmployee = useCallback((input: EmployeeInput): Employee => {
    const created: Employee = { ...input, id: `e-${Date.now()}` };
    setEmployees((prev) => [...prev, created]);
    return created;
  }, []);

  const updateEmployee = useCallback((id: string, input: EmployeeInput) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...input } : e)));
  }, []);

  const toggleEmployeeActive = useCallback((id: string) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e)));
  }, []);
  const sessionMerchantId = getUser()?.merchant_id ?? null;
  const value = useMemo<MerchantStoreValue>(
    () => ({
      status,
      profile,
      currentMerchantId: sessionMerchantId ?? currentApplicationId,
      submitApplication,
      applications,
      approveApplication,
      rejectApplication,
      products,
      orders,
      settlements,
      employees,
      addEmployee,
      updateEmployee,
      toggleEmployeeActive,
    }),
    [
      status,
      profile,
      currentApplicationId,
      submitApplication,
      applications,
      approveApplication,
      rejectApplication,
      products,
      orders,
      settlements,
      employees,
      addEmployee,
      updateEmployee,
      toggleEmployeeActive,
    ],
  );

  return <MerchantStoreContext.Provider value={value}>{children}</MerchantStoreContext.Provider>;
}

export function useMerchantStore(): MerchantStoreValue {
  const ctx = useContext(MerchantStoreContext);
  if (!ctx) throw new Error("useMerchantStore must be used within MerchantStoreProvider");
  return ctx;
}
