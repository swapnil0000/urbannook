import { Outlet } from "react-router-dom";
import AdminSideBar from "../components/AdminSideBar.jsx";

const AdminLayout = () => {
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* ===== SIDEBAR ===== */}
      <AdminSideBar />

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
