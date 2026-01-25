import { NavLink, useLocation } from "react-router-dom";

const allLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/total-products", label: "Products" },
  { to: "/admin/joined-waitlist", label: "Waitlist Users" },
];

const AdminSidebar = () => {
  const location = useLocation();

  // Check if current page is dashboard
  const isDashboard = location.pathname === "/admin/dashboard";

  // Only show "Dashboard" link on product/waitlist pages
  const linksToShow = isDashboard
    ? [] // no links on dashboard itself
    : allLinks; // show all links on other pages

  return (
    <aside className="w-64 bg-white border-r hidden md:flex flex-col">
      <div className="px-6 py-5 font-bold text-xl border-b">
        Admin Panel
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {linksToShow.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-lg text-sm font-medium transition
               ${isActive ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`
            }
          >
            {l.label}
          </NavLink>
        ))}

        {/* Logout button only on dashboard */}
        {isDashboard && (
          <button className="mt-4 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">
            Logout
          </button>
        )}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
