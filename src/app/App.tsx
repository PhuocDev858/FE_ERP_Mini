import { useState, useContext, createContext, useEffect } from "react";
import {
  Users, Package, DollarSign, LayoutDashboard,
  ChevronRight, ChevronDown, TrendingUp, TrendingDown,
  ArrowDownToLine, ArrowUpFromLine, Sun, Moon,
  Bell, Search, Settings, CheckCircle, XCircle,
  AlertCircle, Plus, Edit2, Trash2, LogOut, Lock, User as UserIcon, FileSpreadsheet
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type View =
  | "dashboard"
  | "hr-employees" | "hr-attendance" | "hr-leave" | "hr-payroll"
  | "inv-categories" | "inv-products" | "inv-stock" | "inv-eod"
  | "acc-accounts" | "acc-reports"
  | "sys-users" | "sys-audit";

// ─── Theme ────────────────────────────────────────────────────────────────────

const createS = (dark: boolean) => ({
  bg:      dark ? "#0B1120"  : "#E2E8F0",
  sidebar: dark ? "#0D1220"  : "#FFFFFF",
  card:    dark ? "#111827"  : "#FFFFFF",
  border:  dark ? "#1F2937"  : "#CBD5E1",
  muted:   dark ? "#64748B"  : "#475569",
  sub:     dark ? "#94A3B8"  : "#334155",
  text:    dark ? "#E2E8F0"  : "#0F172A",
  green:   dark ? "#10B981"  : "#059669",
  amber:   dark ? "#F59E0B"  : "#D97706",
  red:     dark ? "#EF4444"  : "#DC2626",
  blue:    dark ? "#3B82F6"  : "#2563EB",
  purple:  dark ? "#8B5CF6"  : "#7C3AED",
  tooltip: dark ? "#1E293B"  : "#FFFFFF",
  isDark: dark,
});

type SType = ReturnType<typeof createS>;
const ThemeCtx = createContext<SType>(createS(true));
const useS = () => useContext(ThemeCtx);

// ─── API Integration & Authentication ─────────────────────────────────────────

const API_BASE = "http://localhost:5043";

interface User {
  fullName: string;
  role: string;
  dbId?: number;
}

interface ApiContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  employees: any[];
  attendanceRows: any[];
  leaveRequests: any[];
  payrollData: any[];
  categories: any[];
  products: any[];
  stockTransactions: any[];
  accounts: any[];
  incomeStatement: any[];
  dashboardData: {
    revenueToday: number;
    stockValue: number;
    employeesToday: string;
    monthlyProfit: number;
    revenueChartData: any[];
    categoryPieData: any[];
    dailySalesData: any[];
  };
  refreshData: () => Promise<void>;
}

const ApiCtx = createContext<ApiContextType | null>(null);

const useApi = () => {
  const ctx = useContext(ApiCtx);
  if (!ctx) throw new Error("useApi must be used inside ApiProvider");
  return ctx;
};

function ApiProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("erp_token"));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("erp_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  // Business states
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockTransactions, setStockTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState({
    revenueToday: 28750000,
    stockValue: 269300000,
    employeesToday: "7 / 8",
    monthlyProfit: 173000000,
    revenueChartData: [
      { month: "T1", revenue: 520, cost: 416, profit: 104 },
      { month: "T2", revenue: 480, cost: 384, profit: 96 },
      { month: "T3", revenue: 610, cost: 488, profit: 122 },
      { month: "T4", revenue: 590, cost: 472, profit: 118 },
      { month: "T5", revenue: 720, cost: 576, profit: 144 },
      { month: "T6", revenue: 862, cost: 689, profit: 173 },
    ],
    categoryPieData: [
      { name: "Hóa mỹ phẩm", value: 67.8, color: "#3B82F6" },
      { name: "Thực phẩm khô", value: 45.2, color: "#10B981" },
      { name: "Bánh kẹo", value: 38.5, color: "#8B5CF6" },
      { name: "Đồ uống", value: 32.1, color: "#F59E0B" },
      { name: "Khác", value: 85.7, color: "#94A3B8" },
    ],
    dailySalesData: [
      { day: "T2", sales: 4.2 }, { day: "T3", sales: 3.8 }, { day: "T4", sales: 5.1 },
      { day: "T5", sales: 4.7 }, { day: "T6", sales: 6.2 }, { day: "T7", sales: 7.5 }, { day: "CN", sales: 5.9 },
    ],
  });

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (token) {
        logout();
      }
      throw new Error("Phiên làm việc hết hạn.");
    }

    if (res.status === 403) {
      throw new Error("Không có quyền truy cập chức năng này.");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error! status: ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
  };

  const login = async (u: string, p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: u, Password: p }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Tên tài khoản hoặc mật khẩu không chính xác.");
      }
      const data = await res.json();
      setToken(data.token);
      
      // Lấy thêm UserId từ API current user để liên kết CreatedBy/ApproverId
      let dbId = 0;
      try {
        const currentRes = await fetch(`${API_BASE}/api/auth/current`, {
          headers: { "Authorization": `Bearer ${data.token}` }
        });
        if (currentRes.ok) {
          const currentData = await currentRes.json();
          dbId = currentData.userId;
        }
      } catch (err) {
        console.error("Failed to fetch current user id:", err);
      }

      const userData = { fullName: data.fullName, role: data.role, dbId };
      setUser(userData);
      localStorage.setItem("erp_token", data.token);
      localStorage.setItem("erp_user", JSON.stringify(userData));
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
  };

  const refreshData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const userRole = user?.role || JSON.parse(localStorage.getItem("erp_user") || "{}").role;
      const isOwner = userRole === "OWNER";
      const isAccountant = userRole === "ACCOUNTANT";
      const isManager = userRole === "STORE_MANAGER";
      const isWarehouse = userRole === "WAREHOUSE_STAFF";

      let mappedEmployees: any[] = [];
      let mappedProducts: any[] = [];
      let catMap: Record<string, any> = {};

      // 1. Employees (OWNER, ACCOUNTANT, STORE_MANAGER, WAREHOUSE_STAFF)
      if (isOwner || isAccountant || isManager || isWarehouse) {
        try {
          const dbEmployees = await apiFetch("/api/hr/employees");
          mappedEmployees = dbEmployees.map((e: any) => ({
            id: e.employeeCode,
            dbId: e.id,
            version: e.version,
            name: e.fullName,
            dept: e.department === "Management" ? "Ban Quản lý" : 
                  e.department === "Store" ? "Cửa hàng" :
                  e.department === "Warehouse" ? "Kho vận" :
                  e.department === "POS" ? "Bán hàng" :
                  e.department === "Accounting" ? "Kế toán" : e.department,
            rawDept: e.department,
            role: e.position === "Owner" ? "Chủ siêu thị" :
                  e.position === "Store Manager" ? "Quản lý cửa hàng" :
                  e.position === "Warehouse Staff" ? "Thủ kho" :
                  e.position === "Cashier" ? "Thu ngân" :
                  e.position === "Accountant" ? "Kế toán viên" : e.position,
            rawPosition: e.position,
            phone: e.nationalId || "Chưa cập nhật",
            nationalId: e.nationalId || "",
            bankAccountNumber: e.bankAccountNumber || "",
            bankName: e.bankName || "",
            annualLeaveBalance: e.annualLeaveBalance ?? 12,
            status: e.status === "ACTIVE" ? "active" : "inactive",
            rawStatus: e.status,
            salary: e.baseSalary,
            mealAllowance: e.mealAllowance || 0,
            attendanceAllowance: e.attendanceAllowance || 0,
            joined: e.hireDate ? e.hireDate.split("-").reverse().join("/") : "",
            rawJoined: e.hireDate,
            rawTerminationDate: e.terminationDate || ""
          }));
          setEmployees(mappedEmployees);
        } catch (err) {
          console.error("Failed to fetch employees:", err);
        }
      }

      // 2. Attendance (OWNER, ACCOUNTANT, STORE_MANAGER)
      if (isOwner || isAccountant || isManager) {
        try {
          const dbAttendance = await apiFetch("/api/hr/attendance");
          const rowsMap: Record<string, any> = {};
          dbAttendance.forEach((r: any) => {
            if (!r.employee) return;
            const dateParts = r.workDate.split("-");
            const dateStr = `${dateParts[2]}/${dateParts[1]}`;
            if (!rowsMap[dateStr]) {
              rowsMap[dateStr] = { date: dateStr };
            }
            let status = "present";
            if (r.status === "LATE") status = "late";
            else if (r.status === "MISSING_CHECKOUT" || r.status === "ABSENT") status = "absent";
            else if (r.status === "LEAVE") status = "leave";
            else if (r.status === "WFH") status = "wfh";
            rowsMap[dateStr][r.employee.employeeCode] = status;
          });
          setAttendanceRows(Object.values(rowsMap));
        } catch (err) {
          console.error("Failed to fetch attendance:", err);
        }
      }

      // 3. Leaves (OWNER, ACCOUNTANT, STORE_MANAGER)
      if (isOwner || isAccountant || isManager) {
        try {
          const dbLeaves = await apiFetch("/api/hr/leave-requests");
          const mappedLeaves = dbLeaves.map((r: any) => ({
            id: `NP${r.id.toString().padStart(3, "0")}`,
            dbId: r.id,
            employeeId: r.employeeId,
            employee: r.employee?.fullName || "Nhân viên",
            typeCode: r.leaveType,
            type: r.leaveType === "ANNUAL" ? "Phép năm" :
                  r.leaveType === "SICK" ? "Phép bệnh" : "Nghỉ không lương",
            from: r.fromDate ? r.fromDate.split("-").reverse().join("/") : "",
            rawFrom: r.fromDate,
            to: r.toDate ? r.toDate.split("-").reverse().join("/") : "",
            rawTo: r.toDate,
            days: r.days,
            reason: r.reason,
            status: r.status.toLowerCase()
          }));
          setLeaveRequests(mappedLeaves);
        } catch (err) {
          console.error("Failed to fetch leave requests:", err);
        }
      }

      // 4. Payroll (OWNER, ACCOUNTANT, STORE_MANAGER)
      if (isOwner || isAccountant || isManager) {
        try {
          const dbPayroll = await apiFetch("/api/hr/payroll/list");
          const mappedPayroll = dbPayroll.map((r: any) => ({
            id: r.employee?.employeeCode || `NV${r.employeeId.toString().padStart(3, "0")}`,
            name: r.employee?.fullName || "Nhân viên",
            baseSalary: r.baseSalary,
            workDays: 22,
            actualDays: 22 - (r.unpaidLeaveDeduction > 0 ? 1 : 0),
            allowance: r.mealAllowance + r.attendanceAllowance,
            deduction: r.lateDeduction + r.unpaidLeaveDeduction,
            netSalary: r.net
          }));
          setPayrollData(mappedPayroll);
        } catch (err) {
          console.error("Failed to fetch payroll:", err);
        }
      }

      // 5. Products & Stock (All)
      try {
        const dbCategories = await apiFetch("/api/inventory/categories");
        const dbProducts = await apiFetch("/api/inventory/products");
        const dbStock = await apiFetch("/api/inventory/stock-balance");

        dbCategories.forEach((cat: any) => {
          catMap[cat.code] = {
            dbId: cat.id,
            id: cat.code,
            name: cat.name,
            code: cat.code,
            products: 0,
            value: 0
          };
        });

        mappedProducts = dbProducts.map((p: any) => {
          const bal = dbStock.find((s: any) => s.productId === p.id);
          const catName = catMap[p.categoryCode]?.name || p.categoryCode;
          return {
            id: p.sku,
            dbId: p.id,
            version: p.version,
            barcode: p.barcode || "",
            name: p.name,
            categoryCode: p.categoryCode,
            category: catName,
            unit: p.unit,
            stock: bal ? bal.quantity : 0,
            minStock: p.minStockLevel,
            buyPrice: p.averageCost,
            sellPrice: p.salePrice,
            imageUrl: p.imageUrl || "",
            brand: p.brand || "",
            supplier: p.supplier || "",
            isFresh: p.isFresh || false
          };
        });
        setProducts(mappedProducts);

        mappedProducts.forEach((p: any) => {
          const catCode = p.categoryCode;
          if (catMap[catCode]) {
            catMap[catCode].products += 1;
            catMap[catCode].value += p.stock * p.buyPrice;
          }
        });
        setCategories(Object.values(catMap));
      } catch (err) {
        console.error("Failed to fetch products or stock:", err);
      }

      // 7. Stock Transactions (OWNER, STORE_MANAGER, WAREHOUSE_STAFF)
      if (isOwner || isManager || isWarehouse) {
        try {
          const dbTrans = await apiFetch("/api/inventory/transactions");
          setStockTransactions(dbTrans);
        } catch (err) {
          console.error("Failed to fetch stock transactions:", err);
        }
      }

      // 8. Accounts (OWNER, ACCOUNTANT)
      if (isOwner || isAccountant) {
        try {
          const dbAccounts = await apiFetch("/api/accounting/accounts");
          const mappedAccounts = dbAccounts.map((a: any) => ({
            code: a.code,
            name: a.name,
            type: a.type === "Tai san" ? "Tài sản" :
                  a.type === "No phai tra" ? "Nợ phải trả" :
                  a.type === "Von CSH" ? "Vốn CSH" :
                  a.type === "Doanh thu" ? "Doanh thu" : "Chi phí",
            nature: a.nature === "No" ? "Nợ" : "Có",
            balance: a.balance
          }));
          setAccounts(mappedAccounts);
        } catch (err) {
          console.error("Failed to fetch accounts:", err);
        }
      }

      // 9. Income Statement (OWNER, ACCOUNTANT)
      let pl: any = {};
      if (isOwner || isAccountant) {
        try {
          pl = await apiFetch("/api/accounting/reports/p-and-l?year=2026&month=6");
          const mappedPL = [
            { label: "Doanh thu bán hàng (TK 511)", value: pl.revenue || 0, positive: true, bold: false },
            { label: "Giá vốn hàng bán (TK 632)", value: -(pl.cogs || 0), positive: false, bold: false },
            { label: "LỢI NHUẬN GỘP", value: pl.grossProfit || 0, positive: true, bold: true },
            { label: "Chi phí quản lý (TK 642)", value: -(pl.operatingExpenses || 0), positive: false, bold: false },
            { label: "Thu nhập khác (TK 711)", value: pl.otherIncome || 0, positive: true, bold: false },
            { label: "LỢI NHUẬN TRƯỚC THUẾ", value: pl.profitBeforeTax || 0, positive: true, bold: true },
            { label: "Thuế TNDN (20%)", value: -(pl.tax || 0), positive: false, bold: false },
            { label: "LỢI NHUẬN SAU THUẾ", value: pl.netProfit || 0, positive: true, bold: true },
          ];
          setIncomeStatement(mappedPL);
        } catch (err) {
          console.error("Failed to fetch PL report:", err);
        }
      }

      // 10. Dashboard (Everyone but filtered values based on role)
      try {
        let revenueToday = 28750000;
        if (isOwner || isAccountant) {
          const todayStr = new Date().toISOString().split("T")[0];
          const todayRev = await apiFetch(`/api/accounting/reports/daily-revenue?date=${todayStr}`).catch(() => ({ totalRevenue: 28750000 }));
          revenueToday = todayRev.totalRevenue;
        }

        const totalVal = mappedProducts.reduce((sum: number, p: any) => sum + p.stock * p.buyPrice, 0);
        const activeEmps = mappedEmployees.filter((e: any) => e.status === "active").length;
        
        const pieData = Object.values(catMap).map((c: any, idx: number) => ({
          name: c.name,
          value: Number((c.value / 1000000).toFixed(1)),
          color: ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#94A3B8"][idx % 5]
        }));

        const finalPieData = pieData.length > 0 ? pieData : [
          { name: "Hóa mỹ phẩm", value: 67.8, color: "#3B82F6" },
          { name: "Thực phẩm khô", value: 45.2, color: "#10B981" },
          { name: "Bánh kẹo", value: 38.5, color: "#8B5CF6" },
          { name: "Đồ uống", value: 32.1, color: "#F59E0B" },
        ];

        setDashboardData({
          revenueToday: revenueToday || 28750000,
          stockValue: totalVal || 269300000,
          employeesToday: mappedEmployees.length > 0 ? `${activeEmps} / ${mappedEmployees.length}` : "7 / 8",
          monthlyProfit: pl.netProfit || 173000000,
          revenueChartData: [
            { month: "T1", revenue: 520, cost: 416, profit: 104 },
            { month: "T2", revenue: 480, cost: 384, profit: 96 },
            { month: "T3", revenue: 610, cost: 488, profit: 122 },
            { month: "T4", revenue: 590, cost: 472, profit: 118 },
            { month: "T5", revenue: 720, cost: 576, profit: 144 },
            { month: "T6", revenue: pl.revenue ? Number((pl.revenue / 1000000).toFixed(1)) : 862, cost: pl.cogs ? Number((pl.cogs / 1000000).toFixed(1)) : 689, profit: pl.netProfit ? Number((pl.netProfit / 1000000).toFixed(1)) : 173 },
          ],
          categoryPieData: finalPieData,
          dailySalesData: [
            { day: "T2", sales: 4.2 }, { day: "T3", sales: 3.8 }, { day: "T4", sales: 5.1 },
            { day: "T5", sales: 4.7 }, { day: "T6", sales: 6.2 }, { day: "T7", sales: 7.5 }, { day: "CN", sales: revenueToday ? Number((revenueToday / 10000000).toFixed(1)) : 5.9 },
          ]
        });
      } catch (err) {
        console.error("Failed to build dashboard data:", err);
      }
    } catch (e) {
      console.error("Refresh data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  return (
    <ApiCtx.Provider value={{
      token, user, loading, login, logout, apiFetch,
      employees, attendanceRows, leaveRequests, payrollData,
      categories, products, stockTransactions, accounts, incomeStatement,
      dashboardData, refreshData
    }}>
      {children}
    </ApiCtx.Provider>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const employees: any[] = [];
const attendanceRows: any[] = [];
const leaveRequests: any[] = [];
const payrollData: any[] = [];
const categories: any[] = [];
const products: any[] = [];
const stockTransactions: any[] = [];
const eodData = {
  date: "20/06/2026",
  openingCash: 5000000, totalSales: 0, totalRefund: 0,
  cashPayments: 0, cardPayments: 0, closingCash: 5000000,
  transactions: 0, items: 0,
  lowStock: [],
  expiring: [],
};
const accounts: any[] = [];
const revenueChartData: any[] = [];
const dailySalesData: any[] = [];
const categoryPieData: any[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
const fmtM = (n: number) => (n / 1000000).toFixed(1) + " tr";

// ─── Sidebar Config ───────────────────────────────────────────────────────────

const navModules = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, views: [] as { id: string; label: string }[] },
  {
    id: "hr", label: "Nhân sự", icon: Users,
    views: [
      { id: "hr-employees", label: "Hồ sơ nhân viên" },
      { id: "hr-attendance", label: "Chấm công" },
      { id: "hr-leave", label: "Nghỉ phép" },
      { id: "hr-payroll", label: "Tính lương" },
    ],
  },
  {
    id: "inv", label: "Kho & Hàng hóa", icon: Package,
    views: [
      { id: "inv-categories", label: "Phân nhóm hàng hóa" },
      { id: "inv-products", label: "Danh mục hàng hóa" },
      { id: "inv-stock", label: "Nhập / Xuất kho" },
      { id: "inv-eod", label: "Kết thúc ngày" },
    ],
  },
  {
    id: "acc", label: "Thu chi & Kế toán", icon: DollarSign,
    views: [
      { id: "acc-accounts", label: "Hệ thống tài khoản" },
      { id: "acc-reports", label: "Báo cáo tài chính" },
    ],
  },
  {
    id: "system", label: "Hệ thống", icon: Settings,
    views: [
      { id: "sys-users", label: "Quản lý tài khoản" },
      { id: "sys-audit", label: "Nhật ký hệ thống" }
    ],
  },
];

// ─── Shared Primitives ────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium" style={{ color, background: bg }}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, sub, trend, accent }: {
  label: string; value: string; sub: string; trend: "up" | "down" | "neutral"; accent?: string;
}) {
  const S = useS();
  const color = trend === "up" ? S.green : trend === "down" ? S.red : S.muted;
  return (
    <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
      <div className="text-xs mb-3 font-medium" style={{ color: S.muted }}>{label}</div>
      <div className="text-2xl font-bold mb-1" style={{ color: accent || S.text }}>{value}</div>
      <div className="flex items-center gap-1 text-xs" style={{ color }}>
        {trend === "up" && <TrendingUp size={10} />}
        {trend === "down" && <TrendingDown size={10} />}
        <span>{sub}</span>
      </div>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  const S = useS();
  return (
    <div className="rounded-xl overflow-hidden transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
      <table className="w-full">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  const S = useS();
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: S.muted, borderBottom: `1px solid ${S.border}` }}>
      {children}
    </th>
  );
}

function Tr({ children, last, footer }: { children: React.ReactNode; last?: boolean; footer?: boolean }) {
  const S = useS();
  return (
    <tr
      className="transition-colors duration-100"
      style={{
        borderBottom: last || footer ? "none" : `1px solid ${S.border}`,
        background: footer ? (S.isDark ? "#0D1220" : "#F8FAFC") : "transparent",
      }}
      onMouseEnter={e => { if (!footer) (e.currentTarget as HTMLElement).style.background = S.isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"; }}
      onMouseLeave={e => { if (!footer) (e.currentTarget as HTMLElement).style.background = footer ? (S.isDark ? "#0D1220" : "#F8FAFC") : "transparent"; }}
    >
      {children}
    </tr>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  const S = useS();
  return <td className={`px-4 py-3 text-sm ${mono ? "font-mono" : ""}`} style={{ color: S.sub }}>{children}</td>;
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>{children}</div>
      {action}
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  const S = useS();
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: S.green, color: "#fff" }}>
      <Plus size={13} />{label}
    </button>
  );
}

function TooltipStyle(S: SType) {
  return {
    contentStyle: { background: S.tooltip, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 12, color: S.sub, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
    cursor: { fill: S.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
  };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ activeView, onNavigate }: { activeView: View; onNavigate: (v: View) => void }) {
  const S = useS();
  const { user } = useApi();
  const role = user?.role;
  const [expanded, setExpanded] = useState<string[]>(["hr", "inv", "acc", "system"]);

  const toggle = (id: string) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const getModuleId = (v: View) => v === "dashboard" ? "dashboard" : v.split("-")[0];

  const hoverStyle = S.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

  const getRoleLabel = (r?: string) => {
    switch (r) {
      case "OWNER": return "Chủ siêu thị";
      case "STORE_MANAGER": return "Quản lý cửa hàng";
      case "WAREHOUSE_STAFF": return "Thủ kho";
      case "ACCOUNTANT": return "Kế toán viên";
      default: return "Nhân viên";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "NV";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const allowedModules = navModules.map(mod => {
    if (mod.id === "dashboard") return mod;

    const filteredViews = mod.views.filter(v => {
      if (v.id === "hr-employees") return true;
      if (v.id === "hr-attendance" || v.id === "hr-leave" || v.id === "hr-payroll") {
        return role === "OWNER" || role === "ACCOUNTANT" || role === "STORE_MANAGER";
      }
      if (v.id === "inv-stock" || v.id === "inv-eod") {
        return role === "OWNER" || role === "STORE_MANAGER" || role === "WAREHOUSE_STAFF";
      }
      if (v.id === "inv-categories" || v.id === "inv-products") {
        return role === "OWNER" || role === "STORE_MANAGER" || role === "WAREHOUSE_STAFF" || role === "ACCOUNTANT";
      }
      if (mod.id === "acc") {
        return role === "OWNER" || role === "ACCOUNTANT";
      }
      if (v.id === "sys-users") {
        return role === "OWNER";
      }
      if (v.id === "sys-audit") {
        return role === "OWNER" || role === "ACCOUNTANT";
      }
      return false;
    });

    if (filteredViews.length === 0) return null;
    return { ...mod, views: filteredViews };
  }).filter(Boolean) as typeof navModules;

  return (
    <aside className="w-56 h-full flex flex-col flex-shrink-0 transition-colors duration-200" style={{ background: S.sidebar, borderRight: `1px solid ${S.border}` }}>
      <div className="flex items-center gap-2.5 px-4 py-3.5 transition-colors duration-200" style={{ borderBottom: `1px solid ${S.border}` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: S.green }}>
          <Package size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-none tracking-tight" style={{ color: S.text }}>MiniERP</div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: S.muted }}>Siêu thị Minh Anh</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {allowedModules.map(mod => {
          if (mod.views.length === 0) {
            const active = activeView === "dashboard";
            return (
              <button key={mod.id} onClick={() => onNavigate("dashboard")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={active ? { background: S.green, color: "#fff" } : { color: S.sub }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverStyle; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <mod.icon size={15} />
                <span className="font-medium">{mod.label}</span>
              </button>
            );
          }

          const isOpen = expanded.includes(mod.id);
          const isActive = getModuleId(activeView) === mod.id;

          return (
            <div key={mod.id}>
              <button onClick={() => toggle(mod.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 font-semibold"
                style={{ color: isActive ? S.text : (S.isDark ? "rgba(255,255,255,0.85)" : "#0F172A") }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hoverStyle}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <mod.icon size={15} />
                <span className="flex-1 text-left font-semibold">{mod.label}</span>
                <span style={{ color: S.muted }}>
                  {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </span>
              </button>
              {isOpen && (
                <div className="mt-0.5 ml-5 pl-3 pb-1 space-y-0.5" style={{ borderLeft: `1px solid ${S.border}` }}>
                  {mod.views.map(v => {
                    const active = activeView === v.id;
                    const displayLabel = v.id === "hr-employees" && role !== "OWNER" 
                      ? "Thông tin cá nhân" 
                      : v.label;
                    return (
                      <button key={v.id} onClick={() => onNavigate(v.id as View)}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
                        style={active ? { color: S.green, background: `${S.green}18`, fontWeight: 700 } : { color: S.isDark ? "rgba(255,255,255,0.8)" : "#0F172A" }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = S.green; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = S.isDark ? "rgba(255,255,255,0.8)" : "#0F172A"; }}>
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-3 flex items-center gap-2.5 transition-colors duration-200" style={{ borderTop: `1px solid ${S.border}` }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: S.green, color: "#fff" }}>
          {getInitials(user?.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: S.text }}>{user?.fullName || "Chưa đăng nhập"}</div>
          <div className="text-[10px]" style={{ color: S.muted }}>{getRoleLabel(role)}</div>
        </div>
        <button style={{ color: S.muted }}><Settings size={13} /></button>
      </div>
    </aside>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

const viewTitles: Record<View, string> = {
  dashboard: "Tổng quan",
  "hr-employees": "Hồ sơ nhân viên",
  "hr-attendance": "Bảng chấm công",
  "hr-leave": "Quản lý nghỉ phép",
  "hr-payroll": "Tính lương — Tháng 6/2025",
  "inv-categories": "Phân nhóm hàng hóa",
  "inv-products": "Danh mục hàng hóa",
  "inv-stock": "Nhập / Xuất kho",
  "inv-eod": "Kết thúc ngày — 20/06/2025",
  "acc-accounts": "Hệ thống tài khoản",
  "acc-reports": "Báo cáo tài chính",
  "sys-users": "Quản lý tài khoản",
};

function TopBar({ activeView, isDark, onToggleDark, onOpenChangePass }: { activeView: View; isDark: boolean; onToggleDark: () => void; onOpenChangePass: () => void }) {
  const S = useS();
  const { user, logout } = useApi();
  const roleLabels: Record<string, string> = {
    OWNER: "Chủ siêu thị",
    STORE_MANAGER: "Quản lý",
    WAREHOUSE_STAFF: "Thủ kho",
    CASHIER: "Thu ngân",
    ACCOUNTANT: "Kế toán"
  };

  return (
    <header className="h-12 flex items-center justify-between px-5 flex-shrink-0 transition-colors duration-200" style={{ background: S.sidebar, borderBottom: `1px solid ${S.border}` }}>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: S.muted }}>Siêu thị Minh Anh</span>
        <ChevronRight size={10} style={{ color: S.border }} />
        <span className="text-sm font-semibold" style={{ color: S.text }}>
          {activeView === "hr-employees" && user?.role !== "OWNER" ? "Thông tin cá nhân" : viewTitles[activeView]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer" style={{ background: isDark ? "#1E293B" : "#F1F5F9", color: S.muted }}>
          <Search size={11} />
          <span>Tìm kiếm...</span>
        </div>
        <button className="relative p-1.5 rounded-lg" style={{ color: S.muted }}>
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: S.green }}></span>
        </button>

        {/* Dark / Light toggle */}
        <button
          onClick={onToggleDark}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: isDark ? "#1E293B" : "#E2E8F0",
            color: S.sub,
            border: `1px solid ${S.border}`,
          }}
          title={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
        >
          {isDark
            ? <><Sun size={13} style={{ color: "#F59E0B" }} /><span style={{ color: S.sub }}>Sáng</span></>
            : <><Moon size={13} style={{ color: "#6366F1" }} /><span style={{ color: S.sub }}>Tối</span></>
          }
        </button>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2.5 ml-1" style={{ borderLeft: `1px solid ${S.border}` }}>
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold" style={{ color: S.text }}>{user.fullName}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: S.muted }}>
                {roleLabels[user.role] || user.role}
              </span>
            </div>
            <button
              onClick={onOpenChangePass}
              className="p-1.5 rounded-lg hover:bg-slate-700/10 dark:hover:bg-slate-300/10 transition-colors duration-200 cursor-pointer"
              style={{ color: S.muted }}
              title="Đổi mật khẩu tài khoản"
            >
              <Lock size={13} />
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors duration-200 cursor-pointer"
              style={{ color: S.muted }}
              title="Đăng xuất"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const S = useS();
  const tt = TooltipStyle(S);
  const { products, dashboardData } = useApi();
  const { revenueChartData, categoryPieData, dailySalesData } = dashboardData;
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Doanh thu hôm nay" value={fmtM(dashboardData.revenueToday)} sub="+12% so hôm qua" trend="up" accent={S.green} />
        <KpiCard label="Tồn kho (giá trị)" value={fmtM(dashboardData.stockValue)} sub={`${products.length} sản phẩm`} trend="neutral" />
        <KpiCard label="Nhân viên hôm nay" value={dashboardData.employeesToday} sub="1 đang nghỉ phép" trend="neutral" />
        <KpiCard label="Lợi nhuận T6" value={fmtM(dashboardData.monthlyProfit)} sub="+20% vs tháng 5" trend="up" accent={S.green} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="mb-4">
            <div className="text-sm font-semibold" style={{ color: S.text }}>Doanh thu & Chi phí 6 tháng đầu năm 2025</div>
            <div className="text-xs mt-0.5" style={{ color: S.muted }}>Đơn vị: Triệu đồng</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueChartData} barGap={3} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...tt} />
              <Bar dataKey="revenue" name="Doanh thu" fill={S.green} radius={[3, 3, 0, 0]} />
              <Bar dataKey="cost" name="Giá vốn" fill={S.isDark ? "#1E3A5F" : "#CBD5E1"} radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Lợi nhuận" fill={S.amber} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="text-sm font-semibold mb-0.5" style={{ color: S.text }}>Tồn kho theo nhóm</div>
          <div className="text-xs mb-3" style={{ color: S.muted }}>Triệu đồng</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={3} dataKey="value">
                {categoryPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...tt} cursor={undefined} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {categoryPieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }}></div>
                  <span style={{ color: S.sub }}>{d.name}</span>
                </div>
                <span className="font-mono font-semibold" style={{ color: S.text }}>{d.value}tr</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: S.text }}>Hàng sắp hết kho</div>
            <Badge label={`${lowStockProducts.length} mặt hàng`} color={S.amber} bg={`${S.amber}20`} />
          </div>
          {lowStockProducts.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${S.border}` }}>
              <div>
                <div className="text-sm font-medium" style={{ color: S.text }}>{p.name}</div>
                <div className="text-xs mt-0.5" style={{ color: S.muted }}>{p.unit}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold" style={{ color: S.red }}>Còn {p.stock}</div>
                <div className="text-xs" style={{ color: S.muted }}>Min: {p.minStock}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="text-sm font-semibold mb-0.5" style={{ color: S.text }}>Doanh thu 7 ngày gần nhất</div>
          <div className="text-xs mb-3" style={{ color: S.muted }}>Triệu đồng</div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={dailySalesData}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={S.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={S.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tt} />
              <Area type="monotone" dataKey="sales" name="Doanh thu" stroke={S.green} fill="url(#sg)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── HR: Employees ────────────────────────────────────────────────────────────

function HREmployees() {
  const S = useS();
  const { employees, user, apiFetch, refreshData } = useApi();
  const [search, setSearch] = useState("");

  const isOwner = user?.role === "OWNER";

  // CRUD states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Store");
  const [position, setPosition] = useState("Cashier");
  const [empRole, setEmpRole] = useState("CASHIER");
  const [baseSalary, setBaseSalary] = useState<number>(6000000);
  const [mealAllowance, setMealAllowance] = useState<number>(1000000);
  const [attendanceAllowance, setAttendanceAllowance] = useState<number>(500000);
  const [empStatus, setEmpStatus] = useState("ACTIVE");
  const [editReason, setEditReason] = useState("");

  // Các trường thông tin nhân sự mở rộng
  const [nationalId, setNationalId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState<number>(12);
  const [hireDate, setHireDate] = useState("");
  const [terminationDate, setTerminationDate] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setModalMode("add");
    setSelectedEmp(null);
    setFullName("");
    setDepartment("Store");
    setPosition("Cashier");
    setEmpRole("CASHIER");
    setBaseSalary(6000000);
    setMealAllowance(1000000);
    setAttendanceAllowance(500000);
    setEmpStatus("ACTIVE");
    setEditReason("");
    setNationalId("");
    setBankAccountNumber("");
    setBankName("");
    setAnnualLeaveBalance(12);
    setHireDate(new Date().toISOString().split("T")[0]);
    setTerminationDate("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (e: any) => {
    setModalMode("edit");
    setSelectedEmp(e);
    setFullName(e.name);
    setDepartment(e.rawDept || "Store");
    setPosition(e.rawPosition || "Cashier");
    setEmpRole(e.role === "Chủ siêu thị" ? "OWNER" :
               e.role === "Quản lý cửa hàng" ? "STORE_MANAGER" :
               e.role === "Thủ kho" ? "WAREHOUSE_STAFF" :
               e.role === "Thu ngân" ? "CASHIER" :
               e.role === "Kế toán viên" ? "ACCOUNTANT" : "EMPLOYEE");
    setBaseSalary(e.salary);
    setMealAllowance(e.mealAllowance);
    setAttendanceAllowance(e.attendanceAllowance);
    setEmpStatus(e.rawStatus || "ACTIVE");
    setEditReason("");
    setNationalId(e.nationalId || "");
    setBankAccountNumber(e.bankAccountNumber || "");
    setBankName(e.bankName || "");
    setAnnualLeaveBalance(e.annualLeaveBalance ?? 12);
    setHireDate(e.rawJoined || "");
    setTerminationDate(e.rawTerminationDate || "");
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Vui lòng điền đầy đủ họ và tên.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        FullName: fullName.trim(),
        Department: department,
        Position: position,
        Role: empRole,
        BaseSalary: Number(baseSalary),
        MealAllowance: Number(mealAllowance),
        AttendanceAllowance: Number(attendanceAllowance),
        NationalId: nationalId.trim() || null,
        BankAccountNumber: bankAccountNumber.trim() || null,
        BankName: bankName.trim() || null,
        AnnualLeaveBalance: Number(annualLeaveBalance),
        HireDate: hireDate || null,
        TerminationDate: terminationDate || null
      };

      if (modalMode === "add") {
        await apiFetch("/api/hr/employees", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch(`/api/hr/employees/${selectedEmp.dbId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            Status: empStatus,
            Version: selectedEmp.version,
            Reason: editReason.trim() || "Cập nhật nhân viên"
          })
        });
      }
      await refreshData();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: any) => {
    const reason = prompt(`Nhập lý do xóa nhân viên "${e.name}":`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Bắt buộc phải nhập lý do xóa.");
      return;
    }
    try {
      await apiFetch(`/api/hr/employees/${e.dbId}?reason=${encodeURIComponent(reason.trim())}&version=${e.version}`, {
        method: "DELETE"
      });
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Không thể xóa nhân viên.");
    }
  };

  if (!isOwner) {
    const me = employees.find(e => e.name === user?.fullName);
    if (!me) {
      return (
        <div className="flex items-center justify-center h-48" style={{ color: S.muted }}>
          Không tìm thấy thông tin hồ sơ cá nhân của bạn.
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto rounded-2xl p-6 transition-all duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b" style={{ borderColor: S.border }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg" style={{ background: S.green }}>
            {me.name.split(" ").pop()?.charAt(0)}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold" style={{ color: S.text }}>{me.name}</h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <Badge label={me.role} color={S.green} bg={`${S.green}18`} />
              <Badge label={me.dept} color={S.amber} bg={`${S.amber}18`} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider block" style={{ color: S.muted }}>Mã nhân viên</span>
            <span className="text-sm font-semibold font-mono" style={{ color: S.text }}>{me.id}</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider block" style={{ color: S.muted }}>Trạng thái làm việc</span>
            <span className="block">
              <Badge label={me.status === "active" ? "Đang làm việc" : "Đã nghỉ"}
                color={me.status === "active" ? S.green : S.muted}
                bg={me.status === "active" ? `${S.green}18` : `${S.muted}20`} />
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider block" style={{ color: S.muted }}>Số điện thoại</span>
            <span className="text-sm font-semibold" style={{ color: S.text }}>{me.phone}</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs uppercase font-semibold tracking-wider block" style={{ color: S.muted }}>Ngày gia nhập</span>
            <span className="text-sm font-semibold font-mono" style={{ color: S.text }}>{me.joined}</span>
          </div>

          <div className="space-y-1.5 col-span-1 sm:col-span-2 p-4 rounded-xl mt-2" style={{ background: S.isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px dashed ${S.border}` }}>
            <span className="text-xs uppercase font-semibold tracking-wider block mb-1" style={{ color: S.muted }}>Lương cơ bản thực tế</span>
            <span className="text-2xl font-bold font-mono" style={{ color: S.green }}>{fmt(me.salary)}</span>
          </div>
        </div>
      </div>
    );
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden relative gap-5">
      {/* Màn hình chính */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300">
        <SectionHeader action={isOwner ? <AddBtn label="Thêm nhân viên" onClick={openAdd} /> : null}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, phòng ban..."
            className="text-sm px-3 py-2 rounded-lg outline-none w-60 transition-colors duration-200"
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.text }} />
        </SectionHeader>
        <TableWrap>
          <thead>
            <tr>
              <Th>Mã NV</Th>
              <Th>Họ tên</Th>
              <Th>Phòng ban</Th>
              <Th>Chức vụ</Th>
              <Th>CCCD / CMND</Th>
              <Th>Ngày vào</Th>
              <Th>Lương cơ bản</Th>
              <Th>Trạng thái</Th>
              {isOwner && <Th>Thao tác</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <Tr key={e.id} last={i === filtered.length - 1}>
                <Td mono>{e.id}</Td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${S.green}25`, color: S.green }}>
                      {e.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <span className="text-sm font-medium" style={{ color: S.text }}>{e.name}</span>
                  </div>
                </td>
                <Td>{e.dept}</Td>
                <Td>{e.role}</Td>
                <Td mono>{e.phone ? (e.phone.length > 4 ? e.phone.replace(/^(\d{3})\d+(\d{1})$/, "$1xxx...xxx$2") : e.phone) : "Chưa cập nhật"}</Td>
                <Td mono>{e.joined}</Td>
                <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: S.text }}>{fmt(e.salary)}</td>
                <td className="px-4 py-3">
                  <Badge label={e.status === "active" ? "Đang làm" : "Đã nghỉ"}
                    color={e.status === "active" ? S.green : S.muted}
                    bg={e.status === "active" ? `${S.green}18` : `${S.muted}20`} />
                </td>
                {isOwner && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEdit(e)} 
                        className="p-1 rounded transition-colors hover:bg-black/10" 
                        style={{ color: S.muted }} 
                        title="Sửa"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDelete(e)} 
                        className="p-1 rounded transition-colors hover:bg-black/10 text-red-500 hover:text-red-600" 
                        style={{ color: S.red }} 
                        title="Xóa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                )}
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h4 className="text-base font-bold" style={{ color: S.text }}>
            {modalMode === "add" ? "Thêm nhân viên mới" : "Sửa hồ sơ nhân viên"}
          </h4>
          <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Họ và tên</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Số CCCD / CMND</label>
            <input 
              type="text" 
              value={nationalId} 
              onChange={e => setNationalId(e.target.value)}
              placeholder="Nhập số CCCD..."
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Số tài khoản ngân hàng</label>
              <input 
                type="text" 
                value={bankAccountNumber} 
                onChange={e => setBankAccountNumber(e.target.value)}
                placeholder="Số tài khoản..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Tên ngân hàng</label>
              <input 
                type="text" 
                value={bankName} 
                onChange={e => setBankName(e.target.value)}
                placeholder="Ví dụ: VCB, TCB..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Ngày tuyển dụng</label>
              <input 
                type="date" 
                value={hireDate} 
                onChange={e => setHireDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Ngày thôi việc</label>
              <input 
                type="date" 
                value={terminationDate} 
                onChange={e => setTerminationDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
                disabled={modalMode === "add"}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Số phép năm</label>
            <input 
              type="number" 
              value={annualLeaveBalance} 
              onChange={e => setAnnualLeaveBalance(Number(e.target.value))}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Phòng ban</label>
              <select 
                value={department} 
                onChange={e => setDepartment(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              >
                <option value="Management">Ban Quản lý</option>
                <option value="Store">Cửa hàng</option>
                <option value="Warehouse">Kho vận</option>
                <option value="POS">Bán hàng</option>
                <option value="Accounting">Kế toán</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Chức vụ</label>
              <select 
                value={position} 
                onChange={e => setPosition(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              >
                <option value="Owner">Chủ siêu thị</option>
                <option value="Store Manager">Quản lý cửa hàng</option>
                <option value="Warehouse Staff">Thủ kho</option>
                <option value="Cashier">Thu ngân</option>
                <option value="Accountant">Kế toán viên</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Vai trò phân quyền</label>
              <select 
                value={empRole} 
                onChange={e => setEmpRole(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              >
                <option value="OWNER">Chủ siêu thị (OWNER)</option>
                <option value="STORE_MANAGER">Quản lý (STORE_MANAGER)</option>
                <option value="WAREHOUSE_STAFF">Thủ kho (WAREHOUSE_STAFF)</option>
                <option value="ACCOUNTANT">Kế toán (ACCOUNTANT)</option>
                <option value="CASHIER">Thu ngân (CASHIER)</option>
                <option value="EMPLOYEE">Nhân viên thường (EMPLOYEE)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Trạng thái</label>
              <select 
                value={empStatus} 
                onChange={e => setEmpStatus(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
                disabled={modalMode === "add"}
              >
                <option value="ACTIVE">Đang làm việc</option>
                <option value="TERMINATED">Đã nghỉ việc (TERMINATED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Lương cơ bản</label>
            <input 
              type="number" 
              value={baseSalary} 
              onChange={e => setBaseSalary(Number(e.target.value))}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Phụ cấp ăn trưa</label>
              <input 
                type="number" 
                value={mealAllowance} 
                onChange={e => setMealAllowance(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Phụ cấp chuyên cần</label>
              <input 
                type="number" 
                value={attendanceAllowance} 
                onChange={e => setAttendanceAllowance(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          {modalMode === "edit" && (
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Lý do thay đổi hồ sơ</label>
              <input 
                type="text" 
                value={editReason} 
                onChange={e => setEditReason(e.target.value)}
                placeholder="Nhập lý do thay đổi..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          )}

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button 
              type="button" 
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85"
              style={{ background: S.border, color: S.text }}
              disabled={saving}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 text-white flex items-center gap-1.5"
              style={{ background: S.green }}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── HR: Attendance ───────────────────────────────────────────────────────────

function HRAttendance() {
  const S = useS();
  const { employees, attendanceRows, apiFetch, refreshData } = useApi();
  
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 22)); // June 2026
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  useEffect(() => {
    if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  const activeEmployee = employees.find(e => e.id === selectedEmpId);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const attCfg: Record<string, { label: string; text: string; color: string; bg: string }> = {
    present: { label: "✓", text: "Có mặt", color: S.green, bg: `${S.green}18` },
    late:    { label: "~", text: "Đi trễ", color: S.amber, bg: `${S.amber}18` },
    absent:  { label: "✗", text: "Vắng mặt", color: S.red,   bg: `${S.red}18` },
    leave:   { label: "P", text: "Nghỉ phép", color: S.blue,  bg: `${S.blue}18` },
    wfh:     { label: "WFH", text: "Làm từ xa", color: S.purple, bg: `${S.purple}18` },
  };

  const getStatus = (day: number) => {
    const dayStr = day.toString().padStart(2, "0");
    const monthStr = (month + 1).toString().padStart(2, "0");
    const dateKey = `${dayStr}/${monthStr}`;
    const row = attendanceRows.find(r => r.date === dateKey);
    return row ? row[selectedEmpId] : null;
  };

  const [showModal, setShowModal] = useState(false);
  const [modalDay, setModalDay] = useState(0);
  const [tempStatus, setTempStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCellClick = (day: number) => {
    const status = getStatus(day);
    setModalDay(day);
    setTempStatus(status || "present");
    setShowModal(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedEmpId || !modalDay) return;
    setSaving(true);
    try {
      const dayStr = modalDay.toString().padStart(2, "0");
      const monthStr = (month + 1).toString().padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      
      await apiFetch("/api/hr/attendance/set-status", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: selectedEmpId,
          workDate: dateStr,
          status: tempStatus
        })
      });
      
      await refreshData();
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Không thể cập nhật trạng thái chấm công.");
    } finally {
      setSaving(false);
    }
  };

  const weekHeaders = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  
  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const stats = { present: 0, late: 0, absent: 0, leave: 0, wfh: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const status = getStatus(d);
    if (status && stats[status as keyof typeof stats] !== undefined) {
      stats[status as keyof typeof stats]++;
    }
  }

  return (
    <div className="grid grid-cols-4 gap-5">
      <div className="col-span-1 flex flex-col rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}`, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
        <h3 className="text-xs uppercase font-bold tracking-widest mb-4" style={{ color: S.muted }}>Danh sách nhân viên</h3>
        <div className="space-y-2">
          {employees.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmpId(emp.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer"
              style={{
                background: selectedEmpId === emp.id ? (S.isDark ? "#1E293B" : "#E2E8F0") : "transparent",
              }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${S.green}25`, color: S.green }}>
                {emp.name.split(" ").pop()?.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: selectedEmpId === emp.id ? S.text : S.sub }}>{emp.name}</div>
                <div className="text-xs truncate" style={{ color: S.muted }}>{emp.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-3 space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg border transition-colors hover:bg-gray-800/40 cursor-pointer" style={{ borderColor: S.border, color: S.text }}>
              &larr;
            </button>
            <span className="text-base font-bold capitalize" style={{ color: S.text }}>
              Tháng {month + 1}, {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg border transition-colors hover:bg-gray-800/40 cursor-pointer" style={{ borderColor: S.border, color: S.text }}>
              &rarr;
            </button>
          </div>

          {activeEmployee && (
            <div className="text-right">
              <span className="text-sm font-bold block" style={{ color: S.text }}>{activeEmployee.name}</span>
              <span className="text-xs" style={{ color: S.muted }}>{activeEmployee.dept} — {activeEmployee.role}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: S.card, border: `1px solid ${S.border}` }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: S.muted }}>Có mặt</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: S.green }}>{stats.present}</span>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: S.card, border: `1px solid ${S.border}` }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: S.muted }}>Đi muộn</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: S.amber }}>{stats.late}</span>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: S.card, border: `1px solid ${S.border}` }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: S.muted }}>Nghỉ phép</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: S.blue }}>{stats.leave}</span>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: S.card, border: `1px solid ${S.border}` }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: S.muted }}>Làm từ xa</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: S.purple }}>{stats.wfh}</span>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: S.card, border: `1px solid ${S.border}` }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: S.muted }}>Vắng mặt</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: S.red }}>{stats.absent}</span>
          </div>
        </div>

        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: S.muted }}>
            {weekHeaders.map(day => <div key={day} className="py-1">{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square rounded-lg" style={{ background: S.isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}></div>;
              }

              const status = getStatus(day);
              const cfg = status ? attCfg[status] : null;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleCellClick(day)}
                  className="aspect-square rounded-lg p-2 flex flex-col justify-between items-start transition-all duration-150 hover:opacity-90 border text-left cursor-pointer"
                  style={{
                    background: cfg ? cfg.bg : (S.isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                    borderColor: cfg ? cfg.color : S.border,
                  }}
                >
                  <span className="text-xs font-bold font-mono" style={{ color: cfg ? cfg.color : S.text }}>{day}</span>
                  {cfg && (
                    <div className="text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ color: cfg.color, background: `${cfg.color}15` }}>
                      <span>{cfg.label}</span>
                      <span className="hidden xl:inline">{cfg.text}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl transition-all duration-200 animate-in zoom-in-95 duration-150"
               style={{ background: S.card, borderColor: S.border }}>
            <h4 className="text-sm font-bold mb-1" style={{ color: S.text }}>Điểm danh ngày {modalDay}/{month + 1}/{year}</h4>
            <p className="text-xs mb-4" style={{ color: S.muted }}>Nhân viên: {activeEmployee?.name}</p>
            
            <div className="space-y-2">
              {Object.entries(attCfg).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTempStatus(k)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border text-sm font-semibold transition-all duration-100 cursor-pointer"
                  style={{
                    borderColor: tempStatus === k ? v.color : S.border,
                    background: tempStatus === k ? v.bg : "transparent",
                    color: tempStatus === k ? v.color : S.sub
                  }}
                >
                  <span>{v.text}</span>
                  <span className="w-6 h-6 rounded flex items-center justify-center font-mono font-semibold" style={{ background: v.bg, color: v.color }}>{v.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer disabled:opacity-50"
                style={{ borderColor: S.border, color: S.sub }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveStatus}
                disabled={saving}
                className="flex-1 py-2 text-xs font-semibold text-white rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: S.green }}
              >
                {saving ? "Đang lưu..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HR: Leave ────────────────────────────────────────────────────────────────

function HRLeave() {
  const S = useS();
  const { leaveRequests, employees, user, apiFetch, refreshData } = useApi();
  const isOwner = user?.role === "OWNER";

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);

  const [empId, setEmpId] = useState<number>(0);
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("PENDING");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setModalMode("add");
    setSelectedLeave(null);
    setEmpId(employees[0]?.dbId || 0);
    setLeaveType("ANNUAL");
    setFromDate(new Date().toISOString().split("T")[0]);
    setToDate(new Date().toISOString().split("T")[0]);
    setReason("");
    setStatus("PENDING");
    setError("");
    setShowModal(true);
  };

  const openEdit = (r: any) => {
    setModalMode("edit");
    setSelectedLeave(r);
    setEmpId(r.employeeId);
    setLeaveType(r.typeCode);
    setFromDate(r.fromRaw.split("T")[0]);
    setToDate(r.toRaw.split("T")[0]);
    setReason(r.reason);
    setStatus(r.statusRaw);
    setError("");
    setShowModal(true);
  };

  const handleQuickApprove = async (r: any, approve: boolean) => {
    try {
      await apiFetch(`/api/hr/leaves/${r.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          approved: approve,
          reason: approve ? "Đã duyệt nhanh" : "Từ chối nhanh"
        })
      });
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật trạng thái yêu cầu.");
    }
  };

  const handleDelete = async (r: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu này?")) return;
    try {
      await apiFetch(`/api/hr/leaves/${r.id}`, {
        method: "DELETE"
      });
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Không thể xóa yêu cầu.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId) {
      setError("Vui lòng chọn nhân viên.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modalMode === "add") {
        await apiFetch("/api/hr/leaves", {
          method: "POST",
          body: JSON.stringify({
            EmployeeId: empId,
            LeaveType: leaveType,
            FromDate: fromDate,
            ToDate: toDate,
            Reason: reason
          })
        });
      } else {
        await apiFetch(`/api/hr/leaves/${selectedLeave.id}`, {
          method: "PUT",
          body: JSON.stringify({
            EmployeeId: empId,
            LeaveType: leaveType,
            FromDate: fromDate,
            ToDate: toDate,
            Reason: reason,
            Status: status
          })
        });
      }
      setShowModal(false);
      await refreshData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu yêu cầu nghỉ phép.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative gap-5">
      {/* Màn hình chính */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300">
        <SectionHeader action={isOwner ? <AddBtn label="Tạo yêu cầu" onClick={openAdd} /> : null}>
          <div className="text-sm" style={{ color: S.muted }}>{leaveRequests.length} yêu cầu nghỉ phép</div>
        </SectionHeader>
        <TableWrap>
          <thead>
            <tr>
              <Th>Mã</Th>
              <Th>Nhân viên</Th>
              <Th>Loại phép</Th>
              <Th>Từ ngày</Th>
              <Th>Đến ngày</Th>
              <Th>Số ngày</Th>
              <Th>Lý do</Th>
              <Th>Trạng thái</Th>
              {isOwner && <Th>Thao tác</Th>}
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map((r, i) => {
              const cfg = leaveCfg[r.status as keyof typeof leaveCfg] || { label: r.status, color: S.muted, bg: `${S.muted}20` };
              return (
                <Tr key={r.id} last={i === leaveRequests.length - 1}>
                  <Td mono>{r.id}</Td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: S.text }}>{r.employee}</td>
                  <Td>{r.type}</Td>
                  <Td mono>{r.from}</Td>
                  <Td mono>{r.to}</Td>
                  <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: S.text }}>{r.days}</td>
                  <td className="px-4 py-3 text-sm max-w-36 truncate" style={{ color: S.sub }}>{r.reason}</td>
                  <td className="px-4 py-3"><Badge label={cfg.label} color={cfg.color} bg={cfg.bg} /></td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.status === "pending" && (
                          <>
                            <button onClick={() => handleQuickApprove(r, true)} className="p-1 rounded transition-colors hover:bg-black/10" style={{ color: S.green }} title="Duyệt"><CheckCircle size={15} /></button>
                            <button onClick={() => handleQuickApprove(r, false)} className="p-1 rounded transition-colors hover:bg-black/10" style={{ color: S.red }} title="Từ chối"><XCircle size={15} /></button>
                          </>
                        )}
                        <button onClick={() => openEdit(r)} className="p-1 rounded transition-colors hover:bg-black/10" style={{ color: S.muted }} title="Sửa"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(r)} className="p-1 rounded transition-colors hover:bg-black/10 text-red-500 hover:text-red-600" style={{ color: S.red }} title="Xóa"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h4 className="text-base font-bold" style={{ color: S.text }}>
            {modalMode === "add" ? "Tạo yêu cầu nghỉ phép mới" : "Chỉnh sửa yêu cầu nghỉ phép"}
          </h4>
          <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-2 space-y-4">
          {modalMode === "add" && (
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Nhân viên</label>
              <select 
                value={empId} 
                onChange={e => setEmpId(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              >
                <option value={0}>-- Chọn nhân viên --</option>
                {employees.map(e => <option key={e.id} value={e.dbId}>{e.name} ({e.id})</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Loại nghỉ phép</label>
              <select 
                value={leaveType} 
                onChange={e => setLeaveType(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              >
                <option value="ANNUAL">Phép năm (ANNUAL)</option>
                <option value="SICK">Phép bệnh (SICK)</option>
                <option value="UNPAID">Nghỉ không lương (UNPAID)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Trạng thái duyệt</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
                disabled={modalMode === "add"}
              >
                <option value="PENDING">Chờ duyệt (PENDING)</option>
                <option value="APPROVED">Đã duyệt (APPROVED)</option>
                <option value="REJECTED">Từ chối (REJECTED)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Từ ngày</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Đến ngày</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Lý do nghỉ phép</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              placeholder="Ví dụ: Nghỉ khám bệnh, giải quyết việc gia đình..."
              className="w-full text-sm px-3 py-2 rounded-lg outline-none h-24 resize-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button 
              type="button" 
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 font-semibold"
              style={{ background: S.border, color: S.text }}
              disabled={saving}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 text-white flex items-center gap-1.5 font-semibold"
              style={{ background: S.green }}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── HR: Payroll ──────────────────────────────────────────────────────────────

function HRPayroll() {
  const S = useS();
  const { payrollData } = useApi();
  const totalNet = payrollData.reduce((s, e) => s + e.netSalary, 0);
  const totalDeduct = payrollData.reduce((s, e) => s + e.deduction, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Tổng quỹ lương T6" value={fmtM(totalNet) + " tr"} sub={payrollData.length + " nhân viên"} trend="neutral" />
        <KpiCard label="Lương trung bình" value={fmtM(totalNet / payrollData.length) + " tr"} sub="Đã trừ các khoản" trend="neutral" />
        <KpiCard label="Tổng khấu trừ" value={fmtM(totalDeduct) + " tr"} sub="BHXH, BHYT, BHTN" trend="down" />
      </div>
      <TableWrap>
        <thead><tr>{["Nhân viên", "Lương cơ bản", "Ngày làm / Tổng", "Phụ cấp", "Khấu trừ", "Thực lĩnh"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
        <tbody>
          {payrollData.map((e, i) => (
            <Tr key={e.id} last={i === payrollData.length - 1}>
              <td className="px-4 py-3">
                <div className="text-sm font-medium" style={{ color: S.text }}>{e.name}</div>
                <div className="text-xs font-mono" style={{ color: S.muted }}>{e.id}</div>
              </td>
              <Td mono>{fmt(e.baseSalary)}</Td>
              <td className="px-4 py-3 text-sm font-mono" style={{ color: S.text }}>{e.actualDays} / {e.workDays}</td>
              <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: S.green }}>+{fmt(e.allowance)}</td>
              <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: S.red }}>-{fmt(e.deduction)}</td>
              <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: S.text }}>{fmt(Math.round(e.netSalary))}</td>
            </Tr>
          ))}
          <Tr footer>
            <td className="px-4 py-3 text-sm font-bold" style={{ color: S.text }} colSpan={5}>Tổng cộng</td>
            <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: S.green }}>{fmt(Math.round(totalNet))}</td>
          </Tr>
        </tbody>
      </TableWrap>
    </div>
  );
}

// ─── INV: Categories ──────────────────────────────────────────────────────────

function InvCategories() {
  const S = useS();
  const { categories, apiFetch, refreshData, user } = useApi();
  const isOwner = user?.role === "OWNER";

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedCat, setSelectedCat] = useState<any>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setModalMode("add");
    setSelectedCat(null);
    setCode("");
    setName("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setModalMode("edit");
    setSelectedCat(c);
    setCode(c.code);
    setName(c.name);
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Vui lòng điền đầy đủ mã và tên nhóm hàng.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modalMode === "add") {
        await apiFetch("/api/inventory/categories", {
          method: "POST",
          body: JSON.stringify({
            Code: code.trim().toUpperCase(),
            Name: name.trim()
          })
        });
      } else {
        await apiFetch(`/api/inventory/categories/${selectedCat.dbId}`, {
          method: "PUT",
          body: JSON.stringify({
            Code: code.trim().toUpperCase(),
            Name: name.trim()
          })
        });
      }
      setShowModal(false);
      await refreshData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu nhóm hàng.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhóm hàng "${cat.name}"? Tác vụ này không thể hoàn tác.`)) return;
    try {
      await apiFetch(`/api/inventory/categories/${cat.dbId}`, {
        method: "DELETE"
      });
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Không thể xóa nhóm hàng.");
    }
  };

  const maxVal = Math.max(...categories.map(c => c.value), 1);

  return (
    <div className="flex h-full w-full overflow-hidden relative gap-5">
      {/* Màn hình chính */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300">
        <SectionHeader action={isOwner ? <AddBtn label="Thêm nhóm" onClick={openAdd} /> : null}>
          <div className="text-sm" style={{ color: S.muted }}>
            {categories.length} nhóm hàng — {categories.reduce((s, c) => s + c.products, 0)} sản phẩm
          </div>
        </SectionHeader>
        
        <div className="grid grid-cols-2 gap-4">
          {categories.map(c => (
            <div key={c.id} className="rounded-xl p-4 transition-all duration-200 cursor-pointer group"
              style={{ background: S.card, border: `1px solid ${S.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${S.green}50`}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = S.border}>
              
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: S.text }}>{c.name}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: S.muted }}>{c.code}</div>
                </div>
                
                {isOwner && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }} 
                      className="p-1.5 rounded transition-colors hover:bg-black/10" 
                      style={{ color: S.muted }} 
                      title="Sửa"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(c); }} 
                      className="p-1.5 rounded transition-colors hover:bg-black/10 text-red-500 hover:text-red-600" 
                      style={{ color: S.red }} 
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: S.sub }}>{c.products} sản phẩm</span>
                <span className="text-sm font-mono font-bold" style={{ color: S.green }}>{(c.value / 1000000).toFixed(1)} tr</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: S.border }}>
                <div className="h-full rounded-full" style={{ width: `${(c.value / maxVal) * 100}%`, background: S.green }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h4 className="text-base font-bold" style={{ color: S.text }}>
            {modalMode === "add" ? "Thêm nhóm hàng mới" : "Sửa thông tin nhóm hàng"}
          </h4>
          <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Mã nhóm hàng</label>
            <input 
              type="text" 
              value={code} 
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Ví dụ: THIT, FMCG, BEER..."
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              disabled={modalMode === "edit"}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Tên nhóm hàng</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="Ví dụ: Bia & Đồ uống"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button 
              type="button" 
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85"
              style={{ background: S.border, color: S.text }}
              disabled={saving}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 text-white flex items-center gap-1.5 font-semibold"
              style={{ background: S.green }}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INV: Products ────────────────────────────────────────────────────────────

function InvProducts() {
  const S = useS();
  const { products, categories, user, apiFetch, refreshData } = useApi();
  const isOwner = user?.role === "OWNER";

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedProd, setSelectedProd] = useState<any>(null);

  // Filter
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tất cả nhóm");

  // Form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [catCode, setCatCode] = useState("");
  const [unit, setUnit] = useState("Cái");
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [minStock, setMinStock] = useState(10);
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [supplier, setSupplier] = useState("");
  const [isFresh, setIsFresh] = useState(false);
  const [editReason, setEditReason] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !catCode) {
      setCatCode(categories[0].code);
    }
  }, [categories]);

  const openAdd = () => {
    setModalMode("add");
    setSelectedProd(null);
    setName("");
    setSku("");
    setBarcode("");
    setCatCode(categories[0]?.code || "");
    setUnit("Cái");
    setBuyPrice(0);
    setSellPrice(0);
    setMinStock(10);
    setBrand("");
    setImageUrl("");
    setSupplier("");
    setIsFresh(false);
    setEditReason("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setModalMode("edit");
    setSelectedProd(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode);
    setCatCode(p.categoryCode);
    setUnit(p.unit);
    setBuyPrice(p.buyPrice);
    setSellPrice(p.sellPrice);
    setMinStock(p.minStock);
    setBrand(p.brand || "");
    setImageUrl(p.imageUrl || "");
    setSupplier(p.suggestedSupplier || "");
    setIsFresh(p.isFresh || false);
    setEditReason("");
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim() || buyPrice < 0 || sellPrice < 0) {
      setError("Vui lòng nhập đầy đủ tên, đơn vị và giá hợp lệ.");
      return;
    }
    if (modalMode === "edit" && !editReason.trim()) {
      setError("Vui lòng nhập lý do chỉnh sửa sản phẩm.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        Name: name.trim(),
        Sku: sku.trim() || null,
        Barcode: barcode.trim() || null,
        CategoryCode: catCode,
        Unit: unit.trim(),
        BuyPrice: buyPrice,
        SellPrice: sellPrice,
        MinStock: minStock,
        Brand: brand.trim() || null,
        ImageUrl: imageUrl.trim() || null,
        SuggestedSupplier: supplier.trim() || null,
        IsFresh: isFresh,
        EditReason: modalMode === "edit" ? editReason.trim() : "Tạo mới sản phẩm"
      };

      if (modalMode === "add") {
        await apiFetch("/api/inventory/products", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch(`/api/inventory/products/${selectedProd.dbId}`, {
          method: "PUT",
          body: JSON.stringify({
            ...payload,
            Version: selectedProd.version
          })
        });
      }
      setShowModal(false);
      await refreshData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu sản phẩm.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${p.name}"? Tác vụ này không thể hoàn tác.`)) return;
    try {
      await apiFetch(`/api/inventory/products/${p.dbId}`, {
        method: "DELETE"
      });
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Không thể xóa sản phẩm.");
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.barcode.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === "Tất cả nhóm" || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex h-full w-full overflow-hidden relative gap-5">
      {/* Màn hình chính */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300">
        <SectionHeader action={isOwner ? <AddBtn label="Thêm sản phẩm" onClick={openAdd} /> : null}>
          <div className="flex gap-2">
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm, barcode..." 
              className="text-sm px-3 py-2 rounded-lg outline-none w-56 transition-colors duration-200"
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.text }} 
            />
            <select 
              value={selectedCat} 
              onChange={e => setSelectedCat(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg outline-none transition-colors duration-200 font-semibold"
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.sub }}
            >
              <option>Tất cả nhóm</option>
              {categories.map(c => <option key={c.id || c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </SectionHeader>
        <TableWrap>
          <thead>
            <tr>
              <Th>Barcode</Th>
              <Th>Tên sản phẩm</Th>
              <Th>Nhóm</Th>
              <Th>Đơn vị</Th>
              <Th>Tồn kho</Th>
              <Th>Giá nhập</Th>
              <Th>Giá bán</Th>
              <Th>Biên LN</Th>
              {isOwner && <Th>Thao tác</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const margin = p.buyPrice > 0 ? ((p.sellPrice - p.buyPrice) / p.buyPrice * 100).toFixed(0) : "0";
              const isLow = p.stock <= p.minStock;
              return (
                <Tr key={p.id} last={i === filtered.length - 1}>
                  <Td mono>{p.barcode}</Td>
                  <td className="px-4 py-3 text-sm font-medium max-w-44 truncate" style={{ color: S.text }}>{p.name}</td>
                  <Td>{p.category}</Td>
                  <Td>{p.unit}</Td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono font-bold" style={{ color: isLow ? S.red : S.text }}>{p.stock}</span>
                      {isLow && <AlertCircle size={12} style={{ color: S.red }} />}
                    </div>
                  </td>
                  <Td mono>{(p.buyPrice / 1000).toFixed(0)}k</Td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: S.text }}>{(p.sellPrice / 1000).toFixed(0)}k</td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: S.green }}>+{margin}%</td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEdit(p)} 
                          className="p-1 rounded transition-colors hover:bg-black/10" 
                          style={{ color: S.muted }} 
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p)} 
                          className="p-1 rounded transition-colors hover:bg-black/10 text-red-500 hover:text-red-600" 
                          style={{ color: S.red }} 
                          title="Xóa"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h4 className="text-base font-bold" style={{ color: S.text }}>
            {modalMode === "add" ? "Thêm sản phẩm mới" : "Sửa thông tin sản phẩm"}
          </h4>
          <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Tên sản phẩm</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="Ví dụ: Ba chỉ bò Mỹ"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Mã SKU sản phẩm</label>
              <input 
                type="text" 
                value={sku} 
                onChange={e => setSku(e.target.value.toUpperCase())}
                placeholder="Không bắt buộc"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
                disabled={modalMode === "edit"}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Thương hiệu</label>
              <input 
                type="text" 
                value={brand} 
                onChange={e => setBrand(e.target.value)}
                placeholder="Ví dụ: Coca-Cola, TH True..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>URL hình ảnh sản phẩm</label>
            <input 
              type="text" 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)}
              placeholder="Ví dụ: http://image.png"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Nhà cung cấp gợi ý</label>
              <input 
                type="text" 
                value={supplier} 
                onChange={e => setSupplier(e.target.value)}
                placeholder="Ví dụ: Minh Anh..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isFresh} 
                  onChange={e => setIsFresh(e.target.checked)}
                  className="w-4 h-4 rounded text-green-500 focus:ring-green-500"
                />
                <span className="text-xs font-semibold" style={{ color: S.text }}>Hàng tươi sống / ngắn ngày</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Nhóm hàng</label>
              <select 
                value={catCode} 
                onChange={e => setCatCode(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              >
                {categories.map(c => <option key={c.id || c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Đơn vị tính</label>
              <input 
                type="text" 
                value={unit} 
                onChange={e => setUnit(e.target.value)}
                placeholder="Ví dụ: Kg, Lon, Hộp..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Barcode (Mã vạch)</label>
              <input 
                type="text" 
                value={barcode} 
                onChange={e => setBarcode(e.target.value)}
                placeholder="Không bắt buộc"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Mức tồn tối thiểu</label>
              <input 
                type="number" 
                value={minStock} 
                onChange={e => setMinStock(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Giá mua trung bình</label>
              <input 
                type="number" 
                value={buyPrice} 
                onChange={e => setBuyPrice(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Giá bán</label>
              <input 
                type="number" 
                value={sellPrice} 
                onChange={e => setSellPrice(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-mono"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          </div>

          {modalMode === "edit" && (
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: S.muted }}>Lý do chỉnh sửa</label>
              <input 
                type="text" 
                value={editReason} 
                onChange={e => setEditReason(e.target.value)}
                placeholder="Nhập lý do thay đổi..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.text }}
              />
            </div>
          )}

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button 
              type="button" 
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85"
              style={{ background: S.border, color: S.text }}
              disabled={saving}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 text-white flex items-center gap-1.5 font-semibold"
              style={{ background: S.green }}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INV: Stock ───────────────────────────────────────────────────────────────

function InvStock() {
  const S = useS();
  const { stockTransactions, products, apiFetch, refreshData, user } = useApi();
  const [tab, setTab] = useState<"all" | "in" | "out">("all");
  const filtered = tab === "all" ? stockTransactions : stockTransactions.filter(t => t.type === tab);
  const totalIn = stockTransactions.filter(t => t.type === "in").reduce((s, t) => s + t.total, 0);
  const totalOut = stockTransactions.filter(t => t.type === "out").reduce((s, t) => s + t.total, 0);

  // In/Out Modals State
  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);

  // In Form State (Multi-line)
  const [inSupplier, setInSupplier] = useState("");
  const [inPaymentStatus, setInPaymentStatus] = useState<number>(3); // Default: Đã thanh toán (3)
  const [inNotes, setInNotes] = useState("");
  const [inLines, setInLines] = useState<any[]>([]);

  // Current In Line State
  const [selectedProdId, setSelectedProdId] = useState<number>(0);
  const [inQty, setInQty] = useState(10);
  const [inPrice, setInPrice] = useState(0);
  const [inMfg, setInMfg] = useState("");
  const [inExpiry, setInExpiry] = useState("");
  const [inLineNotes, setInLineNotes] = useState("");

  // Out Form State (Single product simple out)
  const [outProdId, setOutProdId] = useState<number>(0);
  const [outQty, setOutQty] = useState(1);
  const [outReason, setOutReason] = useState("Xuất hủy hàng hỏng");

  // Effect to populate default selected product
  useEffect(() => {
    if (products.length > 0) {
      if (!selectedProdId) setSelectedProdId(products[0].dbId);
      const inStockProds = products.filter(p => p.stock > 0);
      if (!outProdId && inStockProds.length > 0) setOutProdId(inStockProds[0].dbId);
    }
  }, [products]);

  // Effect to automatically pre-fill price when selecting product in Import tab
  useEffect(() => {
    if (selectedProdId) {
      const p = products.find(prod => prod.dbId === selectedProdId);
      if (p) {
        setInPrice(p.buyPrice);
      }
    }
  }, [selectedProdId, products]);

  const addInLine = () => {
    if (!selectedProdId) return;
    const p = products.find(prod => prod.dbId === selectedProdId);
    if (!p) return;
    
    // Check duplicate
    if (inLines.some(l => l.productId === selectedProdId)) {
      alert("Sản phẩm này đã có trong danh sách phiếu nhập.");
      return;
    }

    setInLines([...inLines, {
      productId: selectedProdId,
      productName: p.name,
      quantity: inQty,
      unitCost: inPrice,
      manufacturingDate: inMfg || null,
      expiryDate: inExpiry || null,
      notes: inLineNotes.trim() || null
    }]);

    // Reset line state
    setInLineNotes("");
  };

  const removeInLine = (index: number) => {
    setInLines(inLines.filter((_, i) => i !== index));
  };

  const handleInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inLines.length === 0) {
      alert("Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập.");
      return;
    }
    try {
      await apiFetch("/api/inventory/stock-receipts", {
        method: "POST",
        body: JSON.stringify({
          SupplierName: inSupplier.trim(),
          PaymentStatus: Number(inPaymentStatus),
          Notes: inNotes.trim() || null,
          Items: inLines.map(l => ({
            ProductId: l.productId,
            Quantity: l.quantity,
            UnitCost: l.unitCost,
            ManufacturingDate: l.manufacturingDate,
            ExpiryDate: l.expiryDate,
            Notes: l.notes
          }))
        })
      });
      setShowInModal(false);
      setInSupplier("");
      setInNotes("");
      setInLines([]);
      refreshData();
    } catch (err: any) {
      alert("Lỗi nhập kho: " + err.message);
    }
  };

  const handleOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outProdId) {
      alert("Vui lòng chọn sản phẩm cần xuất.");
      return;
    }
    const p = products.find(prod => prod.dbId === outProdId);
    if (p && outQty > p.stock) {
      alert(`Số lượng xuất (${outQty}) vượt quá tồn kho hiện tại (${p.stock}).`);
      return;
    }
    try {
      await apiFetch("/api/inventory/stock-issues", {
        method: "POST",
        body: JSON.stringify({
          ProductId: outProdId,
          Quantity: outQty,
          Reason: outReason.trim()
        })
      });
      setShowOutModal(false);
      setOutQty(1);
      setOutReason("Xuất hủy hàng hỏng");
      refreshData();
    } catch (err: any) {
      alert("Lỗi xuất kho: " + err.message);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative gap-5">
      {/* Màn hình chính */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Nhập kho hôm nay" value={fmtM(totalIn)} sub={stockTransactions.filter(t => t.type === "in").length + " phiếu nhập"} trend="up" />
          <KpiCard label="Xuất kho hôm nay" value={fmtM(totalOut)} sub={stockTransactions.filter(t => t.type === "out").length + " phiếu xuất"} trend="neutral" />
          <KpiCard label="Chênh lệch" value={fmtM(totalIn - totalOut)} sub="Nhập trừ xuất" trend="up" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 p-1 rounded-lg transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
            {([["all", "Tất cả"], ["in", "Nhập kho"], ["out", "Xuất kho"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-all duration-150"
                style={tab === key ? { background: S.green, color: "#fff" } : { color: S.muted }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.blue }}
              title="Xuất danh sách đang hiển thị ra Excel">
              <FileSpreadsheet size={13} />Xuất Excel
            </button>
            <button onClick={() => setShowInModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.sub }}>
              <ArrowDownToLine size={13} />Phiếu nhập
            </button>
            <button onClick={() => setShowOutModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90" style={{ background: S.green }}>
              <ArrowUpFromLine size={13} />Phiếu xuất
            </button>
          </div>
        </div>
        <TableWrap>
          <thead><tr>{["Phiếu", "Loại", "Ngày giờ", "Sản phẩm", "SL", "ĐVT", "Đơn giá", "Thành tiền", "Đối tác", "NV"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-6 text-xs" style={{ color: S.muted }}>Không tìm thấy giao dịch kho nào.</td>
              </tr>
            ) : (
              filtered.map((t, i) => (
                <Tr key={t.id} last={i === filtered.length - 1}>
                  <Td mono>{t.id}</Td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={t.type === "in" ? { background: `${S.green}18`, color: S.green } : { background: `${S.amber}18`, color: S.amber }}>
                      {t.type === "in" ? <ArrowDownToLine size={10} /> : <ArrowUpFromLine size={10} />}
                      {t.type === "in" ? "Nhập" : "Xuất"}
                    </div>
                  </td>
                  <Td mono>{t.date} {t.time}</Td>
                  <td className="px-4 py-3 text-sm font-medium max-w-40 truncate" style={{ color: S.text }}>{t.product}</td>
                  <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: S.text }}>{t.qty}</td>
                  <Td>{t.unit}</Td>
                  <Td mono>{(t.price / 1000).toFixed(0)}k</Td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: S.text }}>{(t.total / 1000000).toFixed(3)}tr</td>
                  <Td>{t.supplier}</Td>
                  <Td>{t.staff}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) - Phiếu Nhập */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showInModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h3 className="text-base font-bold" style={{ color: S.text }}>Lập phiếu nhập kho</h3>
          <button type="button" onClick={() => { setShowInModal(false); setInLines([]); }} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleInSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: S.sub }}>Nhà cung cấp</label>
            <input type="text" required value={inSupplier} onChange={e => setInSupplier(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: S.sub }}>Trạng thái thanh toán</label>
              <select value={inPaymentStatus} onChange={e => setInPaymentStatus(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-transparent font-semibold" style={{ borderColor: S.border, color: S.text }}>
                <option value={1}>Chưa thanh toán</option>
                <option value={2}>Thanh toán một phần</option>
                <option value={3}>Đã thanh toán</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: S.sub }}>Ghi chú phiếu nhập</label>
              <input type="text" value={inNotes} onChange={e => setInNotes(e.target.value)} placeholder="Không bắt buộc"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
            </div>
          </div>
          <div className="p-3 rounded-lg border space-y-3" style={{ borderColor: S.border, background: `${S.bg}40` }}>
            <div className="text-xs font-bold" style={{ color: S.text }}>Thêm sản phẩm nhập</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: S.muted }}>Sản phẩm</label>
                <select value={selectedProdId} onChange={e => setSelectedProdId(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }}>
                  {products.map(p => <option key={p.dbId} value={p.dbId}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: S.muted }}>Số lượng</label>
                <input type="number" min="1" value={inQty} onChange={e => setInQty(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: S.muted }}>Đơn giá mua (VNĐ)</label>
                <input type="number" min="0" value={inPrice} onChange={e => setInPrice(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: S.muted }}>Ngày sản xuất (NSX)</label>
                <input type="date" value={inMfg} onChange={e => setInMfg(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: S.muted }}>Ngày hết hạn (HSD)</label>
                <input type="date" value={inExpiry} onChange={e => setInExpiry(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: S.muted }}>Ghi chú dòng hàng</label>
                <input type="text" value={inLineNotes} onChange={e => setInLineNotes(e.target.value)} placeholder="Ví dụ: Quà tặng, lỗi nhẹ..."
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
              </div>
            </div>
            <button type="button" onClick={addInLine} className="w-full py-1.5 rounded text-xs font-semibold text-white cursor-pointer" style={{ background: S.blue }}>
              Thêm vào phiếu
            </button>
          </div>

          {/* Danh sách dòng tạm */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold" style={{ color: S.sub }}>Chi tiết phiếu nhập ({inLines.length})</div>
            <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1" style={{ borderColor: S.border }}>
              {inLines.length === 0 ? (
                <div className="text-center text-xs py-3" style={{ color: S.muted }}>Chưa có sản phẩm nào được thêm.</div>
              ) : (
                inLines.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded" style={{ background: S.bg }}>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-medium truncate" style={{ color: S.text }}>{l.productName}</div>
                      <div className="text-[10px]" style={{ color: S.muted }}>
                        SL: {l.quantity} × {fmt(l.unitCost)} {l.manufacturingDate ? `| NSX: ${l.manufacturingDate}` : ""} {l.expiryDate ? `| HSD: ${l.expiryDate}` : ""} {l.notes ? `| Note: ${l.notes}` : ""}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeInLine(idx)} className="text-red-500 font-bold px-1.5 py-0.5 hover:bg-red-500/10 rounded cursor-pointer">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button type="button" onClick={() => { setShowInModal(false); setInLines([]); }}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 font-semibold" style={{ background: S.border, color: S.text }}>Hủy</button>
            <button type="submit" className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-85 font-semibold" style={{ background: S.green }}>Lập phiếu & Nhập kho</button>
          </div>
        </form>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) - Phiếu Xuất */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showOutModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h3 className="text-base font-bold" style={{ color: S.text }}>Lập phiếu xuất kho</h3>
          <button type="button" onClick={() => setShowOutModal(false)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleOutSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: S.sub }}>Sản phẩm xuất</label>
            <select value={outProdId} onChange={e => setOutProdId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-transparent font-semibold" style={{ borderColor: S.border, color: S.text }}>
              {products.filter(p => p.stock > 0).map(p => <option key={p.dbId} value={p.dbId}>{p.name} (Tồn: {p.stock})</option>)}
              {products.filter(p => p.stock > 0).length === 0 && <option value={0}>Không có sản phẩm nào còn hàng</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: S.sub }}>Số lượng xuất</label>
            <input type="number" required min="1" value={outQty} onChange={e => setOutQty(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: S.sub }}>Lý do xuất kho</label>
            <input type="text" required value={outReason} onChange={e => setOutReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
          </div>
          
          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button type="button" onClick={() => setShowOutModal(false)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 cursor-pointer font-semibold" style={{ background: S.border, color: S.text }}>Hủy</button>
            <button type="submit" className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-85 cursor-pointer" style={{ background: S.green }}>Lập phiếu & Xuất kho</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INV: End of Day ──────────────────────────────────────────────────────────

function InvEOD() {
  const S = useS();
  const { products, apiFetch, refreshData, user } = useApi();
  const [loading, setLoading] = useState(false);
  const [todaySales, setTodaySales] = useState(0);
  const [todayTxCount, setTodayTxCount] = useState(0);
  const [expiringList, setExpiringList] = useState<any[]>([]);

  // Lấy ngày hiện tại
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  const todayIso = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const [isClosed, setIsClosed] = useState(() => {
    return localStorage.getItem(`eod_closed_${todayIso}`) === "true";
  });

  const lowStockItems = products.filter(p => p.stock <= p.minStock);

  const fetchEodData = async () => {
    setLoading(true);
    try {
      const revRes = await apiFetch(`/api/accounting/reports/daily-revenue?date=${todayIso}`);
      if (revRes) {
        setTodaySales(revRes.totalRevenue || 0);
        setTodayTxCount(revRes.transactionCount || 0);
      }
      
      const expRes = await apiFetch("/api/inventory/expiry-alerts?days=30");
      if (expRes) {
        setExpiringList(expRes);
      }
    } catch (err) {
      console.error("Failed to fetch EOD revenue or expiry data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEodData();
  }, []);

  const handleCloseDay = async () => {
    if (window.confirm("Bạn có chắc chắn muốn chốt ngày hôm nay và đóng kỳ kế toán hiện tại không?")) {
      setLoading(true);
      try {
        const periods = await apiFetch("/api/accounting/periods");
        const activePeriod = periods?.find((p: any) => !p.isClosed);

        if (activePeriod) {
          await apiFetch(`/api/accounting/periods/${activePeriod.id}/close`, {
            method: "POST"
          });
        }

        localStorage.setItem(`eod_closed_${todayIso}`, "true");
        setIsClosed(true);
        alert("Chốt sổ kết thúc ngày thành công! Dữ liệu kế toán và kho hàng đã được đồng bộ khóa sổ.");
        refreshData();
      } catch (err: any) {
        alert("Lỗi chốt sổ ngày: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const openingCash = 5000000;
  const cashPayments = todaySales; 
  const cardPayments = 0;
  const closingCash = openingCash + cashPayments;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-xl transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.green}30` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${S.green}20` }}>
          <Sun size={20} style={{ color: S.green }} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: S.text }}>Báo cáo kết thúc ngày {todayStr}</div>
          <div className="text-xs mt-0.5" style={{ color: S.muted }}>Chốt lúc 22:00 — Người thực hiện: {user?.fullName || "Chủ cửa hàng"}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isClosed ? (
            <Badge label="Đã chốt ngày" color={S.green} bg={`${S.green}18`} />
          ) : (
            <>
              <Badge label="Chưa chốt sổ" color={S.amber} bg={`${S.amber}18`} />
              <button disabled={loading} onClick={handleCloseDay} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer" style={{ background: S.green }}>
                {loading ? "Đang xử lý..." : "Chốt sổ & Đóng kỳ"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Tổng doanh thu" value={fmt(todaySales)} sub={todayTxCount + " giao dịch"} trend="up" accent={S.green} />
        <KpiCard label="Hoàn trả" value="0 đ" sub="Không có giao dịch trả hàng" trend="neutral" />
        <KpiCard label="Tiền mặt thu" value={fmt(cashPayments)} sub="0 đ thanh toán thẻ" trend="neutral" />
        <KpiCard label="Tồn quỹ cuối ngày" value={fmt(closingCash)} sub={"Mở đầu: " + fmt(openingCash)} trend="up" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: S.text }}>Hàng sắp hết tồn kho ({lowStockItems.length})</div>
          {lowStockItems.length === 0 ? (
            <div className="text-xs py-4 text-center" style={{ color: S.muted }}>Không có hàng hóa nào dưới mức an toàn.</div>
          ) : (
            lowStockItems.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < Math.min(lowStockItems.length, 5) - 1 ? `1px solid ${S.border}` : "none" }}>
                <AlertCircle size={14} style={{ color: S.amber }} />
                <span className="text-xs flex-1 truncate" style={{ color: S.text }}>{item.name}</span>
                <span className="text-xs font-mono font-bold mr-2" style={{ color: S.red }}>Tồn: {item.stock} {item.unit}</span>
              </div>
            ))
          )}
        </div>
        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: S.text }}>Hàng sắp/đã hết hạn sử dụng ({expiringList.length})</div>
          {expiringList.length === 0 ? (
            <div className="text-xs py-4 text-center" style={{ color: S.muted }}>Không có cảnh báo hạn sử dụng.</div>
          ) : (
            expiringList.slice(0, 5).map((item, i) => {
              const expDate = item.expiryDate ? item.expiryDate.split("-").reverse().join("/") : "";
              return (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < Math.min(expiringList.length, 5) - 1 ? `1px solid ${S.border}` : "none" }}>
                  <AlertCircle size={14} style={{ color: item.isExpired ? S.red : S.amber }} />
                  <span className="text-xs flex-1 truncate" style={{ color: S.text }}>{item.name}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: item.isExpired ? S.red : S.amber }}>
                    {item.isExpired ? `Hết Hạn (${expDate})` : `HSD: ${expDate}`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
        <div className="text-sm font-semibold mb-3" style={{ color: S.text }}>Tổng kết bán hàng hôm nay ({todayStr})</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Tổng số hóa đơn", todayTxCount + " hóa đơn"],
            ["Doanh thu bình quân/HĐ", todayTxCount > 0 ? fmt(Math.round(todaySales / todayTxCount)) : "0 đ"],
            ["Ngày làm việc", todayStr],
          ].map(([lbl, val]) => (
            <div key={lbl} className="p-3 rounded-lg border transition-colors duration-200" style={{ borderColor: S.border, background: S.bg }}>
              <div className="text-[10px] uppercase font-bold" style={{ color: S.muted }}>{lbl}</div>
              <div className="text-sm font-bold mt-1" style={{ color: S.text }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ACC: Accounts ────────────────────────────────────────────────────────────

function AccAccounts() {
  const S = useS();
  const { accounts } = useApi();
  const typeCfg: Record<string, { color: string; bg: string }> = {
    "Tài sản":     { color: S.blue,   bg: `${S.blue}18` },
    "Nợ phải trả": { color: S.red,    bg: `${S.red}18` },
    "Doanh thu":   { color: S.green,  bg: `${S.green}18` },
    "Chi phí":     { color: S.amber,  bg: `${S.amber}18` },
    "Thu nhập":    { color: S.purple, bg: `${S.purple}18` },
    "Vốn CSH":     { color: "#EC4899", bg: "#EC489918" },
  };
  return (
    <div className="space-y-4">
      <SectionHeader action={<AddBtn label="Thêm tài khoản" />}>
        <div className="text-sm" style={{ color: S.muted }}>{accounts.length} tài khoản kế toán</div>
      </SectionHeader>
      <TableWrap>
        <thead><tr>{["Số TK", "Tên tài khoản", "Phân loại", "Tính chất", "Số dư"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
        <tbody>
          {accounts.map((a, i) => {
            const cfg = typeCfg[a.type] || { color: S.muted, bg: `${S.muted}20` };
            return (
              <Tr key={a.code} last={i === accounts.length - 1}>
                <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: S.green }}>{a.code}</td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: S.text }}>{a.name}</td>
                <td className="px-4 py-3"><Badge label={a.type} color={cfg.color} bg={cfg.bg} /></td>
                <Td mono>{a.nature}</Td>
                <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: S.text }}>{fmt(a.balance)}</td>
              </Tr>
            );
          })}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ─── ACC: Reports ─────────────────────────────────────────────────────────────

const incomeStatement = [
  { label: "Doanh thu bán hàng (TK 511)", value: 862500000, positive: true, bold: false },
  { label: "Giá vốn hàng bán (TK 632)", value: -689000000, positive: false, bold: false },
  { label: "LỢI NHUẬN GỘP", value: 173500000, positive: true, bold: true },
  { label: "Chi phí quản lý (TK 642)", value: -98000000, positive: false, bold: false },
  { label: "Thu nhập khác (TK 711)", value: 5200000, positive: true, bold: false },
  { label: "LỢI NHUẬN TRƯỚC THUẾ", value: 80700000, positive: true, bold: true },
  { label: "Thuế TNDN (20%)", value: -16140000, positive: false, bold: false },
  { label: "LỢI NHUẬN SAU THUẾ", value: 64560000, positive: true, bold: true },
];

function AccReports() {
  const S = useS();
  const tt = TooltipStyle(S);
  const { accounts, incomeStatement } = useApi();
  const [reportType, setReportType] = useState<"income" | "balance">("income");
  const assetAccounts = accounts.filter(a => a.type === "Tài sản");
  const liabilityAccounts = accounts.filter(a => a.type === "Nợ phải trả" || a.type === "Vốn CSH");

  return (
    <div className="space-y-4">
      <div className="flex gap-0.5 p-1 rounded-lg w-fit transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
        <button onClick={() => setReportType("income")}
          className="px-4 py-2 rounded text-sm font-semibold transition-all duration-150"
          style={reportType === "income" ? { background: S.green, color: "#fff" } : { color: S.muted }}>
          KQHĐ Kinh doanh
        </button>
        <button onClick={() => setReportType("balance")}
          className="px-4 py-2 rounded text-sm font-semibold transition-all duration-150"
          style={reportType === "balance" ? { background: S.green, color: "#fff" } : { color: S.muted }}>
          Bảng cân đối kế toán
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          {reportType === "income" && (
            <div className="rounded-xl overflow-hidden transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
                <div className="text-sm font-bold" style={{ color: S.text }}>Báo cáo Kết quả Hoạt động Kinh doanh</div>
                <div className="text-xs mt-0.5" style={{ color: S.muted }}>Kỳ báo cáo: 01/06/2025 — 20/06/2025</div>
              </div>
              <div className="p-4 space-y-1">
                {incomeStatement.map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                    style={row.bold ? { background: S.isDark ? "#0D1220" : "#F1F5F9", borderLeft: `2px solid ${S.green}` } : {}}>
                    <span className={`text-sm ${row.bold ? "font-bold uppercase tracking-wide" : ""}`}
                      style={{ color: row.bold ? S.text : S.sub }}>{row.label}</span>
                    <span className="text-sm font-mono font-bold"
                      style={{ color: row.bold ? S.text : row.positive ? S.green : S.red }}>
                      {row.value < 0 ? "-" : ""}{fmt(Math.abs(row.value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {reportType === "balance" && (
            <div className="rounded-xl overflow-hidden transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
                <div className="text-sm font-bold" style={{ color: S.text }}>Bảng Cân đối Kế toán</div>
                <div className="text-xs mt-0.5" style={{ color: S.muted }}>Tại ngày: 20/06/2025</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-4" style={{ borderRight: `1px solid ${S.border}` }}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>TÀI SẢN</div>
                  {assetAccounts.map(a => (
                    <div key={a.code} className="flex justify-between py-2 text-sm" style={{ borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.sub }}>{a.name}</span>
                      <span className="font-mono font-semibold" style={{ color: S.text }}>{(a.balance / 1000000).toFixed(1)}tr</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2.5 text-sm font-bold" style={{ color: S.green }}>
                    <span>Tổng tài sản</span>
                    <span className="font-mono">{(assetAccounts.reduce((s, a) => s + a.balance, 0) / 1000000).toFixed(0)}tr</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>NGUỒN VỐN</div>
                  {liabilityAccounts.map(a => (
                    <div key={a.code} className="flex justify-between py-2 text-sm" style={{ borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.sub }}>{a.name}</span>
                      <span className="font-mono font-semibold" style={{ color: S.text }}>{(a.balance / 1000000).toFixed(1)}tr</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2.5 text-sm font-bold" style={{ color: S.green }}>
                    <span>Tổng nguồn vốn</span>
                    <span className="font-mono">{(liabilityAccounts.reduce((s, a) => s + a.balance, 0) / 1000000).toFixed(0)}tr</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl p-4 transition-colors duration-200" style={{ background: S.card, border: `1px solid ${S.border}` }}>
          <div className="text-sm font-semibold mb-0.5" style={{ color: S.text }}>Xu hướng doanh thu</div>
          <div className="text-xs mb-4" style={{ color: S.muted }}>H1/2025 — Triệu đồng</div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip {...tt} cursor={{ stroke: S.border }} />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke={S.green} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke={S.amber} strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2.5">
            {[
              { label: "Doanh thu H1", value: "3.782 tr", color: S.green },
              { label: "Lợi nhuận H1", value: "757 tr",  color: S.amber },
              { label: "Biên LN gộp",  value: "20.1%",   color: S.blue },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-xs">
                <span style={{ color: S.muted }}>{r.label}</span>
                <span className="font-mono font-bold" style={{ color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function LoginScreen() {
  const { login, loading } = useApi();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại.");
    }
  };

  const handlePreset = async (u: string) => {
    setUsername(u);
    setPassword("123456");
    setError(null);
    try {
      await login(u, "123456");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại.");
    }
  };

  const presets = [
    { label: "Chủ (Owner)", user: "owner", color: "#10B981" },
    { label: "Kế toán (Accountant)", user: "accountant", color: "#3B82F6" },
    { label: "Quản lý (Manager)", user: "manager", color: "#F59E0B" },
    { label: "Thủ kho (Warehouse)", user: "warehouse", color: "#8B5CF6" }
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-4 transition-colors duration-300" style={{ background: "#0B1120" }}>
      <div className="w-full max-w-md rounded-2xl p-8 border shadow-2xl transition-all duration-300 backdrop-blur-xl relative overflow-hidden" 
           style={{ background: "rgba(17, 24, 39, 0.8)", borderColor: "#1F2937" }}>
        
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-[60px] opacity-25" style={{ background: "#10B981" }}></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full blur-[60px] opacity-25" style={{ background: "#3B82F6" }}></div>

        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg" style={{ background: "linear-gradient(135deg, #10B981, #3B82F6)" }}>
            <Lock size={22} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">HỆ THỐNG ERP MINI</h2>
          <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>Đăng nhập để quản lý siêu thị</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          {error && (
            <div className="p-3 rounded-lg flex items-start gap-2 text-xs" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#EF4444" }}>
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "#94A3B8" }}>Tên tài khoản</label>
            <div className="relative">
              <span className="absolute left-3 top-3" style={{ color: "#64748B" }}><UserIcon size={14} /></span>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border transition-all duration-200 bg-gray-950 text-white placeholder-gray-600 focus:border-emerald-500"
                style={{ borderColor: "#1F2937" }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "#94A3B8" }}>Mật khẩu</label>
            <div className="relative">
              <span className="absolute left-3 top-3" style={{ color: "#64748B" }}><Lock size={14} /></span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border transition-all duration-200 bg-gray-950 text-white placeholder-gray-600 focus:border-emerald-500"
                style={{ borderColor: "#1F2937" }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
          >
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>

      </div>
    </div>
  );
}

function SysUsers() {
  const S = useS();
  const { apiFetch, user } = useApi();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState(""); // "" (All), "true", "false"

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form State
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/users";
      const params = [];
      if (search.trim()) params.push(`keyword=${encodeURIComponent(search.trim())}`);
      if (roleFilter) params.push(`role=${roleFilter}`);
      if (activeFilter) params.push(`isActive=${activeFilter}`);
      if (params.length > 0) url += `?${params.join("&")}`;
      const data = await apiFetch(url);
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, activeFilter]);

  const openAdd = () => {
    setModalMode("add");
    setSelectedUser(null);
    setUsername("");
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("EMPLOYEE");
    setIsActive(true);
    setReason("");
    setPassword("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setModalMode("edit");
    setSelectedUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setEmail(u.email);
    setPhone(u.phoneNumber || "");
    setRole(u.role);
    setIsActive(u.isActive);
    setReason("");
    setPassword("");
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !email.trim()) {
      setError("Vui lòng nhập đầy đủ các thông tin bắt buộc.");
      return;
    }
    if (modalMode === "add" && !password.trim()) {
      setError("Vui lòng nhập mật khẩu khởi tạo.");
      return;
    }
    if (modalMode === "edit" && !reason.trim()) {
      setError("Vui lòng nhập lý do cập nhật thông tin.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modalMode === "add") {
        await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify({
            Username: username.trim(),
            FullName: fullName.trim(),
            Email: email.trim(),
            PhoneNumber: phone.trim() || null,
            Role: role,
            IsActive: isActive,
            Password: password.trim()
          })
        });
      } else {
        await apiFetch(`/api/users/${selectedUser.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            FullName: fullName.trim(),
            Email: email.trim(),
            PhoneNumber: phone.trim() || null,
            Role: role,
            IsActive: isActive,
            Version: selectedUser.version,
            Reason: reason.trim() || "Cập nhật thông tin tài khoản",
            Password: password.trim() || null
          })
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi lưu thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (u: any) => {
    setDeleteUser(u);
    setDeleteReason("");
    setError("");
    setShowDeleteModal(true);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim()) {
      setError("Vui lòng nhập lý do xóa.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await apiFetch(`/api/users/${deleteUser.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          Reason: deleteReason.trim()
        })
      });
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi xóa tài khoản.");
    } finally {
      setDeleting(false);
    }
  };

  const roleMap: Record<string, { label: string; color: string; bg: string }> = {
    OWNER:           { label: "Chủ siêu thị",       color: S.red,    bg: `${S.red}18` },
    STORE_MANAGER:   { label: "Quản lý cửa hàng",   color: S.blue,   bg: `${S.blue}18` },
    WAREHOUSE_STAFF: { label: "Thủ kho",            color: S.purple, bg: `${S.purple}18` },
    CASHIER:         { label: "Thu ngân",           color: S.green,  bg: `${S.green}18` },
    SALES_STAFF:     { label: "Nhân viên bán hàng", color: S.amber,  bg: `${S.amber}18` },
    ACCOUNTANT:      { label: "Kế toán viên",       color: "#EC4899",bg: "#EC489918" },
    EMPLOYEE:        { label: "Nhân viên",          color: S.muted,  bg: `${S.muted}18` }
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative gap-5">
      {/* Màn hình chính */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300">
        <SectionHeader action={<AddBtn label="Thêm tài khoản" onClick={openAdd} />}>
          <div className="flex gap-2 flex-wrap items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo username, tên, email..."
              className="text-xs px-3 py-1.5 rounded-lg outline-none w-60 font-semibold"
              style={{ background: S.sidebar, border: `1px solid ${S.border}`, color: S.text }} />
            
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg outline-none font-semibold cursor-pointer"
              style={{ background: S.sidebar, border: `1px solid ${S.border}`, color: S.text }}>
              <option value="">Tất cả vai trò</option>
              <option value="OWNER">Chủ siêu thị</option>
              <option value="STORE_MANAGER">Quản lý cửa hàng</option>
              <option value="WAREHOUSE_STAFF">Thủ kho</option>
              <option value="CASHIER">Thu ngân</option>
              <option value="SALES_STAFF">Nhân viên bán hàng</option>
              <option value="ACCOUNTANT">Kế toán viên</option>
              <option value="EMPLOYEE">Nhân viên thường</option>
            </select>

            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg outline-none font-semibold cursor-pointer"
              style={{ background: S.sidebar, border: `1px solid ${S.border}`, color: S.text }}>
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đang bị khóa</option>
            </select>
          </div>
        </SectionHeader>

        <TableWrap>
          <thead>
            <tr>
              {["Tên đăng nhập", "Họ và tên", "Vai trò", "Email", "Số điện thoại", "Trạng thái", "Thao tác"].map(h => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-xs" style={{ color: S.muted }}>Đang tải dữ liệu...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-xs" style={{ color: S.muted }}>Không tìm thấy tài khoản nào.</td>
              </tr>
            ) : (
              users.map((u, i) => {
                const rCfg = roleMap[u.role] || { label: u.role, color: S.muted, bg: `${S.muted}18` };
                return (
                  <Tr key={u.id} last={i === users.length - 1}>
                    <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: S.green }}>{u.username}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: S.text }}>{u.fullName}</td>
                    <td className="px-4 py-3"><Badge label={rCfg.label} color={rCfg.color} bg={rCfg.bg} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: S.sub }}>{u.email}</td>
                    <Td mono>{u.phoneNumber || "—"}</Td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <Badge label="Hoạt động" color={S.green} bg={`${S.green}18`} />
                      ) : (
                        <Badge label="Khóa" color={S.red} bg={`${S.red}18`} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="p-1 rounded hover:bg-slate-700/10 dark:hover:bg-slate-300/10 transition-colors cursor-pointer" style={{ color: S.blue }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => openDelete(u)} className="p-1 rounded hover:bg-slate-700/10 dark:hover:bg-slate-300/10 transition-colors cursor-pointer" style={{ color: S.red }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </TableWrap>
      </div>

      {/* Drawer trượt dạng đẩy (Push Content Layout) */}
      <div className={`h-full flex flex-col border-l shadow-2xl transition-all duration-300 overflow-hidden ${
        showModal ? 'w-full sm:w-[35%] lg:w-[30%] opacity-100 p-6 border-l shadow-2xl' : 'w-0 opacity-0 p-0 border-l-0 shadow-none'
      }`} style={{ background: S.card, borderColor: S.border }}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: S.border }}>
          <h4 className="text-base font-bold" style={{ color: S.text }}>
            {modalMode === "add" ? "Thêm tài khoản mới" : "Cập nhật tài khoản"}
          </h4>
          <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: S.muted }}>✕ Đóng</button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-2 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: `${S.red}18`, color: S.red }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Tên đăng nhập</label>
              <input value={username} onChange={e => setUsername(e.target.value)} disabled={modalMode === "edit"}
                placeholder="Nhập username..."
                className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
                style={{ background: S.bg, borderColor: S.border, color: S.text }} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Họ và tên</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Nhập họ tên..."
                className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
                style={{ background: S.bg, borderColor: S.border, color: S.text }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="name@erpmini.vn"
                className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
                style={{ background: S.bg, borderColor: S.border, color: S.text }} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Số điện thoại</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Nhập SĐT..."
                className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
                style={{ background: S.bg, borderColor: S.border, color: S.text }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Vai trò</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all shadow-sm font-semibold"
                style={{ background: S.bg, borderColor: S.border, color: S.text }}>
                <option value="OWNER">Chủ siêu thị (OWNER)</option>
                <option value="STORE_MANAGER">Quản lý (STORE_MANAGER)</option>
                <option value="WAREHOUSE_STAFF">Thủ kho (WAREHOUSE_STAFF)</option>
                <option value="CASHIER">Thu ngân (CASHIER)</option>
                <option value="SALES_STAFF">Nhân viên bán hàng (SALES_STAFF)</option>
                <option value="ACCOUNTANT">Kế toán viên (ACCOUNTANT)</option>
                <option value="EMPLOYEE">Nhân viên khác (EMPLOYEE)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Trạng thái</label>
              <div className="flex items-center gap-2 h-[34px]">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="isActiveCheckbox" className="w-4 h-4 cursor-pointer" />
                <label htmlFor="isActiveCheckbox" className="text-xs font-semibold select-none cursor-pointer" style={{ color: S.text }}>Cho phép đăng nhập</label>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>
              {modalMode === "add" ? "Mật khẩu *" : "Mật khẩu mới (bỏ trống nếu giữ nguyên)"}
            </label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password"
              placeholder={modalMode === "add" ? "Nhập mật khẩu..." : "Nhập mật khẩu mới..."}
              className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
              style={{ background: S.bg, borderColor: S.border, color: S.text }} />
          </div>

          {modalMode === "edit" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Lý do cập nhật <span className="text-red-500">*</span></label>
              <input value={reason} onChange={e => setReason(e.target.value)} required
                placeholder="Nhập lý do cập nhật..."
                className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
                style={{ background: S.bg, borderColor: S.border, color: S.text }} />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor: S.border }}>
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 cursor-pointer font-semibold"
              style={{ background: S.border, color: S.text }}>Hủy</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-85 cursor-pointer"
              style={{ background: S.green, opacity: saving ? 0.7 : 1 }}>{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </form>
      </div>

      {/* Modal Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl transition-all duration-200 animate-in zoom-in-95 duration-150"
            style={{ background: S.card, borderColor: S.border }}>
            <h4 className="text-sm font-bold mb-2" style={{ color: S.text }}>Xác nhận xóa tài khoản</h4>
            
            <form onSubmit={handleDelete} className="space-y-4">
              {error && (
                <div className="p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: `${S.red}18`, color: S.red }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-xs font-medium" style={{ color: S.text }}>
                Bạn có chắc chắn muốn xóa tài khoản <strong style={{ color: S.red }}>{deleteUser?.username}</strong> ({deleteUser?.fullName})?
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Lý do xóa <span className="text-red-500">*</span></label>
                <input value={deleteReason} onChange={e => setDeleteReason(e.target.value)} required
                  placeholder="Nhập lý do xóa bắt buộc..."
                  className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
                  style={{ background: S.bg, borderColor: S.border, color: S.text }} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 cursor-pointer font-semibold"
                  style={{ background: S.border, color: S.text }}>Hủy</button>
                <button type="submit" disabled={deleting} className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-85 cursor-pointer"
                  style={{ background: S.red, opacity: deleting ? 0.7 : 1 }}>{deleting ? "Đang xóa..." : "Xóa"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SysAudit() {
  const S = useS();
  const { apiFetch } = useApi();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Xem chi tiết log
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const moduleTypes: Record<string, string> = {
    all: "",
    hr: "Employee,AttendanceRecord,LeaveRequest,PayrollRecord",
    inv: "Product,WarehouseReceipt,WarehouseIssue,ShrinkageRecord",
    pos: "PosTransaction,PosSession,PosRefund",
    acc: "JournalEntry,APInvoice,APPayment",
    sys: "User"
  };

  const actionLabels: Record<string, string> = {
    CREATE: "Tạo mới",
    UPDATE: "Cập nhật",
    SOFT_DELETE: "Xóa mềm",
    RESTORE: "Khôi phục",
    APPROVE: "Duyệt",
    REJECT: "Từ chối",
    LOCK: "Khóa",
    UNLOCK: "Mở khóa",
    REVERSAL: "Đảo bút toán",
    LOGIN: "Đăng nhập",
    LOGOUT: "Đăng xuất",
    LOGIN_FAILED: "Đăng nhập lỗi",
    PERMISSION_DENIED: "Bị từ chối"
  };

  const getActionBadge = (act: string) => {
    switch (act) {
      case "CREATE": return { color: S.blue, bg: `${S.blue}18` };
      case "UPDATE": return { color: S.amber, bg: `${S.amber}18` };
      case "SOFT_DELETE": return { color: S.red, bg: `${S.red}18` };
      case "APPROVE": return { color: S.green, bg: `${S.green}18` };
      case "REJECT": return { color: S.red, bg: `${S.red}18` };
      case "LOGIN": return { color: S.green, bg: `${S.green}18` };
      case "LOGIN_FAILED": return { color: S.red, bg: `${S.red}18` };
      default: return { color: S.muted, bg: `${S.muted}20` };
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const types = moduleTypes[moduleFilter];
      const query = new URLSearchParams();
      if (types) query.append("entityTypes", types);
      if (actionFilter !== "all") query.append("action", actionFilter);
      if (fromDate) query.append("from", fromDate);
      if (toDate) query.append("to", toDate);
      query.append("page", page.toString());
      query.append("limit", limit.toString());

      const res = await apiFetch(`/api/audit/all?${query.toString()}`);
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, moduleFilter, actionFilter, fromDate, toDate]);

  const handleExport = async () => {
    try {
      const types = moduleTypes[moduleFilter];
      const query = new URLSearchParams();
      if (types) query.append("entityTypes", types);
      if (actionFilter !== "all") query.append("action", actionFilter);
      if (fromDate) query.append("from", fromDate);
      if (toDate) query.append("to", toDate);
      query.append("page", "1");
      query.append("limit", "1000");

      const res = await apiFetch(`/api/audit/all?${query.toString()}`);
      const exportData = res.data || [];
      if (exportData.length === 0) {
        alert("Không có dữ liệu nhật ký hệ thống để xuất!");
        return;
      }

      const headers = ["Thời Gian", "Hành Động", "Phân Hệ", "Mã Đối Tượng", "Tên Đối Tác/Nhân Viên", "Mô Tả", "Tài Khoản", "IP"];
      const rows = exportData.map((l: any) => [
        new Date(l.createdAt).toLocaleString("vi-VN"),
        actionLabels[l.action] || l.action,
        l.entityType,
        l.entityId,
        l.entityLabel || "—",
        l.summary,
        l.userName,
        l.ipAddress || "—"
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any) => row.map((val: any) => {
          const str = String(val ?? "").replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        }).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      link.setAttribute("href", url);
      link.setAttribute("download", `Nhat_ky_he_thong_${dateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Lỗi xuất file: " + err.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border flex flex-wrap gap-4 items-end shadow-sm animate-in fade-in duration-150" style={{ background: S.card, borderColor: S.border }}>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Phân hệ nghiệp vụ</label>
          <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
            className="text-xs px-2.5 py-1.5 rounded-lg border outline-none font-semibold bg-transparent" style={{ borderColor: S.border, color: S.text }}>
            <option value="all">Tất cả nghiệp vụ</option>
            <option value="hr">Nhân sự & Lương</option>
            <option value="inv">Hàng hóa & Kho vận</option>
            <option value="pos">Bán lẻ POS</option>
            <option value="acc">Kế toán & Thu chi</option>
            <option value="sys">Tài khoản & Phân quyền</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Hành động</label>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="text-xs px-2.5 py-1.5 rounded-lg border outline-none font-semibold bg-transparent" style={{ borderColor: S.border, color: S.text }}>
            <option value="all">Tất cả hành động</option>
            {Object.entries(actionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Từ ngày</label>
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="text-xs px-2.5 py-1.5 rounded-lg border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Đến ngày</label>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="text-xs px-2.5 py-1.5 rounded-lg border outline-none bg-transparent" style={{ borderColor: S.border, color: S.text }} />
        </div>

        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer ml-auto" style={{ background: S.blue }}>
          <FileSpreadsheet size={13} />Xuất Nhật ký
        </button>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <TableWrap>
            <thead>
              <tr>
                <Th>Thời gian</Th>
                <Th>Tài khoản</Th>
                <Th>Hành động</Th>
                <Th>Đối tượng</Th>
                <Th>Mô tả thay đổi</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-6 text-xs" style={{ color: S.muted }}>Đang tải nhật ký hệ thống...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-xs" style={{ color: S.muted }}>Không tìm thấy nhật ký nào.</td></tr>
              ) : (
                logs.map((l, idx) => {
                  const badge = getActionBadge(l.action);
                  return (
                    <Tr key={l.id} last={idx === logs.length - 1} onClick={() => setSelectedLog(l)}
                      className={`cursor-pointer hover:opacity-90 ${selectedLog?.id === l.id ? "bg-slate-500/5" : ""}`}>
                      <Td mono>{new Date(l.createdAt).toLocaleString("vi-VN")}</Td>
                      <Td><strong>{l.userName}</strong></Td>
                      <td className="px-4 py-3">
                        <Badge label={actionLabels[l.action] || l.action} color={badge.color} bg={badge.bg} />
                      </td>
                      <Td mono className="text-xs">{l.entityType} ({l.entityId})</Td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: S.text }}>{l.summary}</td>
                      <Td mono>{l.ipAddress || "—"}</Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </TableWrap>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded border text-xs font-semibold disabled:opacity-50" style={{ borderColor: S.border, color: S.text }}>Trước</button>
              <span className="text-xs font-semibold" style={{ color: S.text }}>Trang {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded border text-xs font-semibold disabled:opacity-50" style={{ borderColor: S.border, color: S.text }}>Sau</button>
            </div>
          )}
        </div>

        {selectedLog && (
          <div className="w-80 rounded-xl p-4 border shadow-sm space-y-4 shrink-0 animate-in slide-in-from-right duration-150" style={{ background: S.card, borderColor: S.border }}>
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: S.border }}>
              <h5 className="text-xs font-bold" style={{ color: S.text }}>Chi tiết thay đổi dữ liệu</h5>
              <button onClick={() => setSelectedLog(null)} className="text-xs font-bold" style={{ color: S.muted }}>Đóng</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Đối tượng</span>
                <span className="text-xs font-semibold" style={{ color: S.text }}>{selectedLog.entityType} (Mã ID: {selectedLog.entityId})</span>
              </div>
              
              {selectedLog.entityLabel && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Nhãn đối tượng</span>
                  <span className="text-xs font-semibold" style={{ color: S.text }}>{selectedLog.entityLabel}</span>
                </div>
              )}

              {selectedLog.reason && (
                <div className="p-2.5 rounded-lg border text-xs" style={{ borderColor: S.border, background: `${S.amber}0c`, color: S.amber }}>
                  <strong>Lý do:</strong> {selectedLog.reason}
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: S.muted }}>Dữ liệu thuộc tính thay đổi</span>
                <div className="space-y-2 border rounded-lg p-2.5 max-h-64 overflow-y-auto" style={{ borderColor: S.border, background: S.bg }}>
                  {(() => {
                    let changedFields: any = null;
                    try {
                      const fieldsRaw = selectedLog.changedFields || "{}";
                      changedFields = typeof fieldsRaw === "string" ? JSON.parse(fieldsRaw) : fieldsRaw;
                    } catch (e) {
                      console.error("Failed to parse changedFields:", e);
                    }

                    if (!changedFields || Object.keys(changedFields).length === 0) {
                      return <span className="text-xs italic" style={{ color: S.muted }}>Không ghi nhận thuộc tính thay đổi (hoặc là thao tác ghi nhận toàn bộ thực thể).</span>;
                    }

                    return Object.entries(changedFields).map(([field, diff]: any) => {
                      const fromVal = diff?.from !== undefined && diff?.from !== null ? String(diff.from) : "null";
                      const toVal = diff?.to !== undefined && diff?.to !== null ? String(diff.to) : "null";
                      
                      return (
                        <div key={field} className="text-xs py-1 border-b last:border-b-0" style={{ borderColor: S.border }}>
                          <span className="font-semibold block truncate" style={{ color: S.text }} title={field}>{field}</span>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="line-through text-red-500 bg-red-500/10 px-1 rounded text-[10px]">{fromVal}</span>
                            <span style={{ color: S.muted }}>→</span>
                            <span className="text-green-500 bg-green-500/10 px-1 rounded text-[10px] font-bold">{toVal}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const S = useS();
  const { apiFetch } = useApi();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng điền đầy đủ các trường.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải từ 6 ký tự trở lên.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          OldPassword: oldPassword,
          NewPassword: newPassword
        })
      });
      setSuccess("Đổi mật khẩu thành công!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Đổi mật khẩu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl transition-all duration-200 animate-in zoom-in-95 duration-150"
        style={{ background: S.card, borderColor: S.border }}>
        <h4 className="text-sm font-bold mb-4" style={{ color: S.text }}>Đổi mật khẩu tài khoản</h4>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: `${S.red}18`, color: S.red }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: `${S.green}18`, color: S.green }}>
              <CheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Mật khẩu hiện tại</label>
            <input value={oldPassword} onChange={e => setOldPassword(e.target.value)} type="password" required
              placeholder="Nhập mật khẩu cũ..."
              className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
              style={{ background: S.bg, borderColor: S.border, color: S.text }} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Mật khẩu mới</label>
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" required
              placeholder="Nhập mật khẩu mới..."
              className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
              style={{ background: S.bg, borderColor: S.border, color: S.text }} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: S.muted }}>Xác nhận mật khẩu mới</label>
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" required
              placeholder="Xác nhận mật khẩu mới..."
              className="w-full text-xs px-3 py-2 rounded-lg outline-none font-semibold border transition-all"
              style={{ background: S.bg, borderColor: S.border, color: S.text }} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-85 cursor-pointer"
              style={{ background: S.border, color: S.text }}>Hủy</button>
            <button type="submit" disabled={saving || success !== ""} className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-85 cursor-pointer"
              style={{ background: S.green, opacity: (saving || success !== "") ? 0.7 : 1 }}>
              {saving ? "Đang lưu..." : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const { token, user } = useApi();
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const S = createS(isDark);

  if (!token) {
    return <LoginScreen />;
  }

  const renderView = () => {
    const role = user?.role;
    
    // Check permission
    const isAllowed = (v: View) => {
      if (v === "dashboard") return true;
      if (v === "hr-employees") return true;
      if (v === "hr-attendance" || v === "hr-leave" || v === "hr-payroll") {
        return role === "OWNER" || role === "ACCOUNTANT" || role === "STORE_MANAGER";
      }
      if (v === "inv-stock" || v === "inv-eod") {
        return role === "OWNER" || role === "STORE_MANAGER" || role === "WAREHOUSE_STAFF";
      }
      if (v === "inv-categories" || v === "inv-products") {
        return role === "OWNER" || role === "STORE_MANAGER" || role === "WAREHOUSE_STAFF" || role === "ACCOUNTANT";
      }
      if (v === "acc-accounts" || v === "acc-reports") {
        return role === "OWNER" || role === "ACCOUNTANT";
      }
      if (v === "sys-users") {
        return role === "OWNER";
      }
      if (v === "sys-audit") {
        return role === "OWNER" || role === "ACCOUNTANT";
      }
      return false;
    };

    if (!isAllowed(activeView)) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-3">
          <span className="text-sm font-semibold" style={{ color: S.text }}>Bạn không có quyền truy cập chức năng này.</span>
        </div>
      );
    }

    switch (activeView) {
      case "dashboard":      return <Dashboard />;
      case "hr-employees":   return <HREmployees />;
      case "hr-attendance":  return <HRAttendance />;
      case "hr-leave":       return <HRLeave />;
      case "hr-payroll":     return <HRPayroll />;
      case "inv-categories": return <InvCategories />;
      case "inv-products":   return <InvProducts />;
      case "inv-stock":      return <InvStock />;
      case "inv-eod":        return <InvEOD />;
      case "acc-accounts":   return <AccAccounts />;
      case "acc-reports":    return <AccReports />;
      case "sys-users":      return <SysUsers />;
      case "sys-audit":      return <SysAudit />;
    }
  };

  return (
    <ThemeCtx.Provider value={S}>
      <div className="flex h-screen overflow-hidden transition-colors duration-200" style={{ background: S.bg }}>
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar activeView={activeView} isDark={isDark} onToggleDark={() => setIsDark(d => !d)} onOpenChangePass={() => setShowChangePassModal(true)} />
          <main className="flex-1 overflow-y-auto p-5 transition-colors duration-200" style={{ background: S.bg }}>
            {renderView()}
          </main>
        </div>
      </div>
      {showChangePassModal && (
        <ChangePasswordModal onClose={() => setShowChangePassModal(false)} />
      )}
    </ThemeCtx.Provider>
  );
}

export default function App() {
  return (
    <ApiProvider>
      <AppContent />
    </ApiProvider>
  );
}
