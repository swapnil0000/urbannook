import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { useCookies } from "react-cookie";
const AdminDashboard = () => {
  const [open, setOpen] = useState(false);
  const [, , removeCookie] = useCookies(["cookie-name"]);
  const navigate = useNavigate();

  const navItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      route: "/admin/dashboard",
    },
    {
      label: "Joined Waitlist",
      icon: <Users size={18} />,
      route: "/admin/joined-waitlist",
    },
    {
      label: "Products",
      icon: <Package size={18} />,
      route: "/admin/total-products",
    },
    {
      label: "Orders",
      icon: <ShoppingBag size={18} />,
      route: "/admin/orders",
    },
  ];

  const NavButton = ({ item, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-black transition font-medium w-full"
    >
      {item.icon}
      {item.label}
    </button>
  );

  const handleLogout = () => {
  removeCookie("adminAccessToken", { path: "/" });
  navigate("/admin/login");
};

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* ================= MOBILE HEADER ================= */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
        <h2 className="font-bold text-lg">UrbanNook</h2>
        <button onClick={() => setOpen(true)}>
          <Menu />
        </button>
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">UrbanNook</h2>
              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavButton
                  key={item.route}
                  item={item}
                  onClick={() => {
                    navigate(item.route);
                    setOpen(false);
                  }}
                />
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-10 flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-semibold w-full"
            >
              <LogOut size={18} />
              Logout
            </button>
          </aside>
        </div>
      )}

      {/* ================= DESKTOP LAYOUT ================= */}
      <div className="flex">
        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
              <p className="text-gray-500 mt-1">
                Manage users, products and orders
              </p>
            </div>

            {/* ACTION CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <ActionCard
                title="Joined Waitlist"
                description="View and manage waitlist users"
                icon={<Users />}
                onClick={() => navigate("/admin/joined-waitlist")}
              />
              <ActionCard
                title="Products"
                description="Create & update products"
                icon={<Package />}
                onClick={() => navigate("/admin/total-products")}
              />
              <ActionCard
                title="Orders"
                description="Track orders & payments"
                icon={<ShoppingBag />}
                onClick={() => navigate("/admin/orders")}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ================= ACTION CARD ================= */
const ActionCard = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="group bg-white border rounded-2xl p-6 text-left shadow-sm hover:shadow-lg transition-all"
  >
    <div className="flex justify-between items-center mb-5">
      <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition">
        {icon}
      </div>
      <ArrowRight className="text-gray-400 group-hover:text-black group-hover:translate-x-1 transition" />
    </div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="text-gray-500 text-sm mt-1">{description}</p>
  </button>
);

export default AdminDashboard;
