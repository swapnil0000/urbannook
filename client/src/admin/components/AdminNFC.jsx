import { useState } from "react";
import axios from "axios";

const AdminNFC = () => {
  const [loading, setLoading] = useState(false);
  const [nfcList, setNfcList] = useState([]);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const domainBaseUrl = import.meta.env.VITE_DOMAIN_BASE_URL
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  };

  const handleCopyLink = (userId) => {
    if (!userId) return;
    const fullLink = `${domainBaseUrl}/nfc/home/${userId}`;
    navigator.clipboard.writeText(fullLink);
    showToast("Full Link Copied! 🔗", "success");
  };

  // --- API: GENERATE ---
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/admin/nfc/generate-id`, {
        withCredentials: true,
      });

      if (res.data.success) {
        const list = res.data.data.updatedList || [];
        setNfcList(list);
        showToast("New NFC Tag Generated!", "success");
      }
    } catch (error) {
      console.error(error);
      showToast("Generation Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- API: (Activate) ---
  const handleUseTag = async (userId) => {
    try {
      const res = await axios.post(
        `${apiBaseUrl}/admin/nfc/assign`,
        { userId },
        { withCredentials: true }
      );

      if (res.status === 200 || res.data.success) {
        showToast("Tag Activated!", "success");
        // Update Local State: Set isAssigned to TRUE
        setNfcList((prevList) =>
          prevList.map((item) =>
            item.userId === userId ? { ...item, isAssigned: true } : item
          )
        );
      }
    } catch (error) {
      console.error(error);
      showToast("Activation Failed", "error");
    }
  };

  // --- API: Pause (Deactivate) ---
  const handlePauseTag = async (userId) => {
    try {
      const res = await axios.post(
        `${apiBaseUrl}/admin/nfc/pause`,
        { userId },
        { withCredentials: true }
      );

      if (res.status === 200 || res.data.success) {
        showToast("Tag Paused & Available!", "success");
        // Update Local State: Set isAssigned to FALSE (Back to Available)
        setNfcList((prevList) =>
          prevList.map((item) =>
            item.userId === userId ? { ...item, isAssigned: false } : item
          )
        );
      }
    } catch (error) {
      console.error(error);
      showToast("Pause Failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-700 pb-20">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
            NFC Admin{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Console
            </span>
          </h1>
          <p className="text-slate-500 font-medium">
            Manage physical tags and digital identities
          </p>
        </div>

        {toast.show && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-500 animate-slideIn
            ${
              toast.type === "success"
                ? "bg-white/90 border border-emerald-100 text-emerald-800 shadow-emerald-100"
                : "bg-white/90 border border-rose-100 text-rose-800 shadow-rose-100"
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full 
              ${toast.type === "success" ? "bg-emerald-100" : "bg-rose-100"}`}
            >
              {toast.type === "success" ? "✓" : "✕"}
            </div>
            <div>
              <p className="font-bold text-sm">
                {toast.type === "success" ? "Success" : "Action Failed"}
              </p>
              <p className="text-xs opacity-90">{toast.message}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-lg mb-12">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`group w-full py-5 px-6 rounded-2xl font-bold text-xl shadow-xl shadow-indigo-200/50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 border border-white/50
              ${
                loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-400/50 hover:-translate-y-1"
              }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-6 w-6 text-indigo-200"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Generating ID...</span>
              </>
            ) : (
              <>
                <span>Generate New NFC ID</span>
                <div className="bg-white/20 p-1 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white group-hover:rotate-12 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    ></path>
                  </svg>
                </div>
              </>
            )}
          </button>
        </div>

        {nfcList.length > 0 && (
          <div className="w-full max-w-5xl animate-fadeIn">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-indigo-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Generated IDs
                </h2>
                <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-full font-extrabold border border-indigo-100">
                  {nfcList.length}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/2">
                        User ID / Link
                      </th>
                      <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {nfcList.map((item) => (
                      <tr
                        key={item.userId}
                        className="group hover:bg-indigo-50/30 transition-colors"
                      >
                        {/* ID Column */}
                        <td className="p-6">
                          <div className="flex flex-col gap-2">
                            {/* Row 1: ID and Copy Button */}
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-slate-700 font-mono">
                                {item.userId}
                              </span>

                              <button
                                onClick={() => handleCopyLink(item.userId)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-all border border-slate-200 hover:border-indigo-200 group/btn"
                                title="Copy Full Link"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                  ></path>
                                </svg>
                                <span className="text-[10px] font-bold">
                                  Copy Link
                                </span>
                              </button>
                            </div>

                            <span className="text-xs text-indigo-400 truncate max-w-[250px] font-mono opacity-80">
                              {domainBaseUrl}/nfc/home/{item.userId}
                            </span>
                          </div>
                        </td>

                        <td className="p-6 text-center">
                          {item.isAssigned ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ASSIGNED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              AVAILABLE
                            </span>
                          )}
                        </td>

                        <td className="p-6 text-right">
                          {item.isAssigned ? (
                            <button
                              onClick={() => handlePauseTag(item.userId)}
                              className="px-5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 font-bold text-xs shadow-sm hover:bg-rose-50 hover:shadow-md hover:border-rose-300 transition-all transform active:scale-95 inline-flex items-center gap-2"
                            >
                              <span>Pause</span>
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                ></path>
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUseTag(item.userId)}
                              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-md shadow-slate-200 hover:shadow-xl hover:bg-indigo-600 transition-all transform active:scale-95 inline-flex items-center gap-2"
                            >
                              <span>Use</span>
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                                ></path>
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNFC;