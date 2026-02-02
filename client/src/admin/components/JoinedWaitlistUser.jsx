import axios from "axios";
import { useEffect, useMemo, useState } from "react";

/* ================= IST FORMATTER ================= */
const formatIST = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const JoinedWaitlistUser = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/admin/joined/waitlist`, {
          withCredentials: true,
        });
        setUsers(res?.data?.data?.joinedUserWaitList || []);
      } catch (err) {
        setError("Failed to load waitlist users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [apiBaseUrl]);

  /* ================= SORT + SEARCH ================= */
  const filteredUsers = useMemo(() => {
    let list = [...users];

    // 🔥 Latest joined first
    list.sort((a, b) => {
      const t1 = new Date(a.createdAt).getTime();
      const t2 = new Date(b.createdAt).getTime();

      if (t1 !== t2) return t2 - t1; // latest first
      return b._id.localeCompare(a._id); // fallback (VERY IMPORTANT)
    });

    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u?.userName?.toLowerCase().includes(q) ||
        u?.userEmail?.toLowerCase().includes(q),
    );
  }, [search, users]);

  /* ================= UI STATES ================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading waitlist users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Joined Waitlist Users{" "}
          <span className="text-indigo-600">({filteredUsers.length})</span>
        </h1>

        {users.length > 0 && (
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 md:mt-0 w-full md:w-80 px-4 py-2 border rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        )}
      </div>

      {/* EMPTY STATES */}
      {users.length === 0 && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          No users have joined the waitlist yet.
        </div>
      )}

      {users.length > 0 && filteredUsers.length === 0 && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          No users found.
        </div>
      )}

      {/* USERS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <UserCard key={user._id} user={user} />
        ))}
      </div>
    </div>
  );
};

/* ================= USER CARD ================= */

const UserCard = ({ user }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
          {user?.userName?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {user?.userName || "Unknown User"}
          </h2>
          <p className="text-sm text-gray-500">
            {user?.userEmail || "No email"}
          </p>

          {/* 🕒 IST Timestamp */}
          <p className="text-xs text-gray-400 mt-1">
            Joined on {formatIST(user?.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <span className="text-xs uppercase tracking-wider text-gray-400">
          Waitlist User
        </span>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          Active
        </span>
      </div>
    </div>
  );
};

export default JoinedWaitlistUser;
