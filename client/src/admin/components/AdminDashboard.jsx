import axios from "axios";
import { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [joinedwaitlist, setJoinedWaitList] = useState([]);
  const [searcheUser, setSearchUser] = useState("");
  useEffect(() => {
    const handleGetJoinedUserWaitList = async () => {
      const res = await axios.get(
        `http://localhost:8000/api/v1/admin/joinedwaitlist`,
        {
          withCredentials: true,
        }
      );

      setJoinedWaitList(res?.data?.data?.joinedUserWaitList);
    };
    handleGetJoinedUserWaitList();
  }, []);

  const handleSearchJoinedUser = () => {
    const search = searcheUser.toLowerCase();
    return joinedwaitlist.filter((user) => {
      const name = user?.userName?.toLowerCase() || "";
      const email = user?.userEmail?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  };
  const filteredUsers = handleSearchJoinedUser();
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Joined Waitlist Users{" "}
          <span className="text-indigo-600">({joinedwaitlist?.length})</span>
        </h1>

        {joinedwaitlist?.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-400">
            No users have joined the waitlist yet.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search users..."
                value={searcheUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full md:w-1/3 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {filteredUsers?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map((user, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {user?.userName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <h2 className="text-lg font-semibold text-gray-800">
                            {user?.userName}
                          </h2>
                          <p className="text-gray-500 text-sm">
                            {user?.userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs uppercase tracking-wider text-gray-400">
                          Waitlist User
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {" "}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {joinedwaitlist.map((user, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {user?.userName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <h2 className="text-lg font-semibold text-gray-800">
                            {user?.userName}
                          </h2>
                          <p className="text-gray-500 text-sm">
                            {user?.userEmail}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs uppercase tracking-wider text-gray-400">
                          Waitlist User
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
