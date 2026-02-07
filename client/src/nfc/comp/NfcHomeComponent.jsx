import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const STICKER_SHADOW =
  "shadow-[2px_4px_8px_rgba(0,0,0,0.15),1px_2px_3px_rgba(0,0,0,0.1)] border border-black/5";
const PHOTO_SHADOW =
  "shadow-[3px_5px_10px_rgba(0,0,0,0.2)] border-[3px] border-[#fffcf5]";

const ScrapbookRealism = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(false);

  // Updated state to handle 'null' (loading) vs 'false' (paused)
  const [userDetails, setUserDetails] = useState({
    isLocked: true,
    isAssigned: null,
  });

  const [pendingFiles, setPendingFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const fileInputRefs = useRef([]);

  const [apiData, setApiData] = useState({
    uploadedImagesUrl: [null, null, null],
    text1: "",
    text2: "",
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [changePassData, setChangePassData] = useState({
    current: "",
    new: "",
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" }); // 'success' or 'error'

  const placeholders = [
    "https://via.placeholder.com/300x400/eaddca/5e4b3e?text=Tap+to+Add+Hug",
    "https://via.placeholder.com/300x300/eaddca/5e4b3e?text=Tap+to+Add+Kiss",
    "https://via.placeholder.com/400x300/eaddca/5e4b3e?text=Tap+to+Add+Fun",
  ];

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/nfc/data/${userId}`);

      if (res.data?.data?.isAssigned === false) {
        setUserDetails({
          isLocked: true,
          isAssigned: false, // Explicitly false means PAUSED
        });
        return;
      }

      if (res.data && res.data.success) {
        const { uploadedImagesUrl, uploadedText } = res.data.data;

        let imgArray = [null, null, null];
        if (uploadedImagesUrl && typeof uploadedImagesUrl === "string") {
          const splitUrls = uploadedImagesUrl.split(",");
          imgArray = splitUrls.map((url) =>
            url && url.trim() !== "" ? url : null,
          );
        }
        while (imgArray.length < 3) imgArray.push(null);

        const txt1 = uploadedText && uploadedText[0] ? uploadedText[0] : "";
        const txt2 = uploadedText && uploadedText[1] ? uploadedText[1] : "";

        setApiData({ uploadedImagesUrl: imgArray, text1: txt1, text2: txt2 });

        const hasImages = imgArray.some((img) => img !== null);
        const hasText = txt1 || txt2;

        setUserDetails({
          isLocked: !hasImages && !hasText, // Lock only if empty
          isAssigned: true,
        });
      }
    } catch (e) {
      console.log("Error or New User");
      setUserDetails({ isLocked: true, isAssigned: true });
    }
  };

  const handleStartCreating = () =>
    setUserDetails({ ...userDetails, isLocked: false });

  const handleFileSelect = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast(`Image too large! Max size is ${MAX_FILE_SIZE_MB}MB`, "error");
        e.target.value = ""; 
        return;
      }

      setPendingFiles((prev) => ({ ...prev, [index]: file }));
      const previewUrl = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [index]: previewUrl }));
    }
  };

  const triggerFileInput = (index) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].click();
    }
  };

  const handleSaveClick = () => {
    const hasNewFiles = Object.keys(pendingFiles).length > 0;
    const hasText = apiData.text1 || apiData.text2;

    if (!hasNewFiles && !hasText) return alert("Make some changes first! ✍️");

    setPasswordInput("");
    setIsChangePasswordMode(false);
    setShowPasswordModal(true);
  };

  const handleChangePasswordSubmit = async () => {
    const { current, new: newPass } = changePassData;

    if (!current || !newPass) {
      return showToast("Please fill both fields", "error");
    }

    // Rules: Min 4, Max 6, 1 Upper, 1 Lower, 1 Num, 1 Special
    if (newPass.length < 4 || newPass.length > 6) {
      return showToast("Password must be 4 to 6 characters long", "error");
    }
    
    const hasUpperCase = /[A-Z]/.test(newPass);
    const hasLowerCase = /[a-z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPass);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return showToast("Must contain 1 Upper, 1 Lower, 1 Number & 1 Special Char", "error");
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/nfc/change-password`, {
        userId,
        password: changePassData.current,
        newPass: changePassData.new,
      });

      if (res.data.success) {
        showToast("Password Changed Successfully! 🔐", "success");
        setIsChangePasswordMode(false); 
        setChangePassData({ current: "", new: "" });
      } else {
        showToast(res.data.message || "Failed to change password", "error");
      }
    } catch (e) {
      showToast(e.response?.data?.message || "Server Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!passwordInput) return showToast("Please enter password", "error");

    setLoading(true);
    const fd = new FormData();

    Object.keys(pendingFiles).forEach((idx) => {
      fd.append("images", pendingFiles[idx]);
      fd.append("indices", idx);
    });

    fd.append("text1", apiData.text1);
    fd.append("text2", apiData.text2);
    fd.append("password", passwordInput);

    try {
      const res = await axios.post(`${API_BASE}/nfc/upload/${userId}`, fd);
      if (res.data && res.data.success) {
        setShowPasswordModal(false); 

        const { uploadedImagesUrl } = res.data.data;
        let imgArray = [...apiData.uploadedImagesUrl];
        if (uploadedImagesUrl && typeof uploadedImagesUrl === "string") {
          const splitUrls = uploadedImagesUrl.split(",");
          imgArray = splitUrls.map((url) =>
            url && url.trim() !== "" ? url : null,
          );
        }

        setApiData((prev) => ({
          ...prev,
          uploadedImagesUrl: imgArray,
          text1: res.data.data.text1 || prev.text1,
          text2: res.data.data.text2 || prev.text2,
        }));

        setPendingFiles({});
        setPreviews({});
        showToast("Scrapbook Updated! ❤️", "success");
      } else {
        showToast(res.data.message || "Incorrect Password", "error");
      }
    } catch (e) {
      console.error(e);
      showToast(
        e.response?.data?.message || "Incorrect Password or Error",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (index) => {
    if (previews[index]) return previews[index];
    if (apiData.uploadedImagesUrl[index])
      return apiData.uploadedImagesUrl[index];
    return placeholders[index];
  };

  if (!userId)
    return (
      <div className="p-10 text-center font-['Patrick_Hand']">
        Invalid Link (No User ID)
      </div>
    );

  if (userDetails.isAssigned === false) {
    return (
      <div className="min-h-screen bg-[#d8c8b8] flex justify-center items-center font-['Patrick_Hand']">
        <div className="bg-[#fdfaf5] p-8 rounded-lg shadow-2xl text-center border-2 border-red-300 max-w-sm mx-4 transform rotate-1">
          <div className="text-4xl mb-2">🚫</div>
          <h2 className="font-['Permanent_Marker'] text-2xl text-red-800 mb-2">
            Account Paused
          </h2>
          <p className="text-lg text-[#3e2b1e] mb-4">
            Your User ID has been paused. You cannot access or edit memories right
            now.
          </p>
          <div className="bg-red-50 p-3 rounded border border-red-100 text-sm font-bold text-red-700">
            Please Contact Admin
          </div>
        </div>
      </div>
    );
  }

  if (userDetails.isAssigned === null) {
    return (
      <div className="min-h-screen bg-[#d8c8b8] flex justify-center items-center font-['Patrick_Hand']">
        <div className="text-xl text-[#3e2b1e] animate-pulse">
          Loading Memories...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d8c8b8] flex justify-center items-center py-4 sm:py-6 md:py-6 font-['Patrick_Hand'] text-[#3e2b1e] px-2 sm:px-4">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Cedarville+Cursive&family=Dancing+Script:wght@400;600&family=Kalam:wght@300;400;700&family=Nothing+You+Could+Do&family=Patrick+Hand&family=Permanent+Marker&family=Sacramento&family=Shadows+Into+Light&family=Special+Elite&display=swap');`}
        {`.noise-bg{background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");}`}
        {`.font-handwritten{font-family:'Kalam',cursive;}`}
        {`.font-script{font-family:'Caveat',cursive;}`}
        {`.font-handwriting{font-family:'Shadows Into Light',cursive;}`}
      </style>

      {toast.show && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl border-2 font-bold animate-bounce
          ${toast.type === "success" ? "bg-[#eaddca] text-green-800 border-green-700" : "bg-[#f4c2c2] text-red-900 border-red-800"}`}
        >
          {toast.message}
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#fffefb] w-full max-w-xs p-6 rounded-xl shadow-2xl border-4 border-[#eaddca] relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-red-500 font-bold text-xl"
            >
              &times;
            </button>

            <div className="text-center mb-4">
              <h3 className="font-['Permanent_Marker'] text-2xl text-[#8b0000]">
                {isChangePasswordMode ? "Change Password" : "Secret Code"}
              </h3>
              {!isChangePasswordMode && (
                <p className="text-[10px] text-gray-500 font-bold mt-1">
                  Note: We recommend changing your default password for security.
                </p>
              )}
            </div>

            {!isChangePasswordMode ? (
              <>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full bg-[#f4f4f4] border-b-2 border-gray-300 p-2 text-center text-xl font-['Special_Elite'] outline-none focus:border-[#8b0000] mb-4"
                />
                <button
                  onClick={handleConfirmUpload}
                  disabled={loading}
                  className="w-full bg-[#3e2b1e] text-[#fdfaf5] py-2 rounded-lg font-bold shadow-md hover:bg-black transition-all mb-3"
                >
                  {loading ? "Verifying..." : "Unlock & Save"}
                </button>

                <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => setIsChangePasswordMode(true)}
                    className="text-xs text-blue-600 underline font-bold"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => showToast("Contact Admin to reset", "error")}
                    className="text-xs text-gray-400 underline"
                  >
                    Forgot?
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="password"
                  placeholder="Current Password"
                  value={changePassData.current}
                  onChange={(e) =>
                    setChangePassData({
                      ...changePassData,
                      current: e.target.value,
                    })
                  }
                  className="w-full bg-[#f4f4f4] border border-gray-200 p-2 text-sm font-['Special_Elite'] outline-none mb-2 rounded"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={changePassData.new}
                  onChange={(e) =>
                    setChangePassData({
                      ...changePassData,
                      new: e.target.value,
                    })
                  }
                  className="w-full bg-[#f4f4f4] border border-gray-200 p-2 text-sm font-['Special_Elite'] outline-none mb-4 rounded"
                />
                <button
                  onClick={handleChangePasswordSubmit}
                  disabled={loading}
                  className="w-full bg-[#8b0000] text-white py-2 rounded-lg font-bold shadow-md hover:bg-[#600000] transition-all mb-2"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
                <button
                  onClick={() => setIsChangePasswordMode(false)}
                  className="w-full text-xs text-gray-500 underline"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="relative w-full max-w-[420px] min-h-[min(880px,90dvh)] shadow-2xl overflow-hidden rounded-lg md:rounded-lg bg-[#f4e8d6] [background-image:repeating-linear-gradient(#f4e8d6_0px,#f4e8d6_24px,#c0b3a3_25px),radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)] [box-shadow:inset_0_0_50px_rgba(62,43,30,0.2)]"
      >
        {userDetails?.isLocked && (
          <div className="absolute inset-0 z-50 backdrop-blur-md bg-black/20 flex flex-col items-center justify-center animate-fadeIn">
            <div className="bg-[#fdfaf5] p-8 rounded-2xl shadow-2xl rotate-1 max-w-[80%] text-center border-2 border-[#e8b4b4]">
              <h2 className="font-['Permanent_Marker'] text-3xl mb-4 text-[#c25e5e]">
                First Time?
              </h2>
              <p className="font-['Patrick_Hand'] text-lg mb-6">
                Create your digital memory lane. Add photos and notes to start.
              </p>
              <button
                onClick={handleStartCreating}
                className="bg-gradient-to-r from-[#c25e5e] to-[#a84a4a] text-white px-8 py-3 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-transform"
              >
                Upload Your Feelings ✨
              </button>
            </div>
          </div>
        )}

        {[0, 1, 2].map((idx) => (
          <input
            key={idx}
            type="file"
            accept="image/*"
            className="hidden"
            ref={(el) => (fileInputRefs.current[idx] = el)}
            onChange={(e) => handleFileSelect(idx, e)}
          />
        ))}

        <div
          className={`absolute top-[2%] left-[3%] bg-[#f4c2c2] p-2 sm:p-3 rotate-[-3deg] text-[9px] sm:text-[10px] text-center leading-tight font-['Kalam'] text-[#8b0000] w-24 sm:w-28 z-0 ${STICKER_SHADOW} noise-bg`}
        >
          <span className="text-red-700 text-[8px]">♥</span> your smile is the
          most beautiful thing to me.{" "}
          <span className="text-red-700 text-[8px]">♥</span>
        </div>

        <div
          className={`absolute top-[2%] left-[32%] bg-[#fdfaf5] p-2 rotate-[1deg] text-[10px] sm:text-[11px] font-bold w-36 sm:w-40 font-['Special_Elite'] opacity-95 z-0 ${STICKER_SHADOW} noise-bg`}
        >
          What&apos;s meant to be will always find a way. <span aria-hidden>✨</span>
        </div>

        <div
          onClick={() => !userDetails?.isLocked && triggerFileInput(0)}
          className={`absolute top-[3%] left-[2%] w-[120px] sm:w-[140px] h-[155px] sm:h-[180px] bg-white p-1 rotate-[-4deg] z-10 transition-transform ${PHOTO_SHADOW} ${!userDetails?.isLocked ? "cursor-pointer hover:scale-105 ring-2 ring-[#c25e5e]/40 hover:ring-[#c25e5e]/70" : ""}`}
        >
          <img
            src={getImageSrc(0)}
            alt="Memory 1"
            className="w-full h-full object-cover brightness-90 contrast-110 sepia-[.2]"
          />
          {!userDetails?.isLocked && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-['Patrick_Hand'] py-1 text-center">
              📷 Tap to change photo
            </div>
          )}
        </div>

        <div className="absolute top-[4%] right-[2%] bg-[#fdfaf5] px-2 sm:px-3 py-1 rounded-full border-2 border-[#3e2b1e] text-[9px] sm:text-[10px] font-bold rotate-[4deg] font-['Kalam'] shadow-sm z-0">
          I love you baby ♥ <span aria-hidden>💖</span>
        </div>

        <div className="absolute top-[6%] left-[38%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[2deg] font-handwriting shadow-sm border border-[#e8b4b4]/50 z-0 w-28 sm:w-32">
          You make me happy in a way no one else can. <span aria-hidden>💕</span>
        </div>
        <div className="absolute top-[12%] left-[22%] bg-amber-50/95 px-2 py-1 rounded-lg text-[9px] font-['Kalam'] rotate-[-6deg] shadow-sm border border-amber-200/60 z-0">
          <span aria-hidden>🧿</span> lucky us
        </div>
        <div className="absolute top-[14%] right-[28%] bg-[#fdfaf5] px-2 py-0.5 text-[9px] rotate-[8deg] font-['Dancing_Script'] shadow-sm border border-[#e8b4b4]/50 z-0">
          ✨ always ✨
        </div>
        <div className="absolute top-[16%] left-[2%] bg-[#e8eabb]/95 px-2 py-1 text-[8px] sm:text-[9px] rotate-[-5deg] font-handwriting shadow-sm border border-[#c0b3a3]/40 z-0 w-28">
          You&apos;re the reason why I&apos;m smiling again. <span aria-hidden>✨</span>
        </div>

        <div
          className={`absolute top-[18%] left-[28%] bg-[#fdfaf5] px-2 py-1 rotate-[-2deg] text-[10px] sm:text-[11px] font-['Kalam'] z-0 ${STICKER_SHADOW} noise-bg`}
        >
          I love making you laugh because{" "}
          <span className="text-pink-600">🦋</span>
        </div>

        <div
          className={`absolute top-[22%] left-[2%] bg-[#fdfaf5] rounded-sm p-2 w-36 text-[9px] sm:text-[10px] rotate-[-4deg] font-handwriting z-0 ${STICKER_SHADOW} noise-bg`}
        >
          And then you came along, and my life became beautiful. <span aria-hidden>🌸</span>
        </div>

        <div className="absolute top-[22%] left-[48%] bg-[#fdfaf5] px-3 py-0.5 rounded-full border-2 border-[#3e2b1e] text-[9px] sm:text-[10px] font-bold rotate-[4deg] font-['Kalam'] shadow-sm z-0">
          I Love you, iDiot. ♡
        </div>
        <div className="absolute top-[24%] right-[18%] bg-[#f5f0e8] px-2 py-1 text-[8px] sm:text-[9px] rotate-[6deg] font-handwriting shadow-sm border border-[#c0b3a3]/50 z-0 w-24">
          The most beautiful part is, I wasn&apos;t even looking when I found you. <span aria-hidden>🧿</span>
        </div>

        <div
          onClick={() => !userDetails?.isLocked && triggerFileInput(1)}
          className={`absolute top-[8%] right-[2%] w-[140px] sm:w-[160px] h-[100px] sm:h-[120px] bg-white p-1 rotate-[4deg] z-10 transition-transform ${PHOTO_SHADOW} ${!userDetails?.isLocked ? "cursor-pointer hover:scale-105 ring-2 ring-[#c25e5e]/40 hover:ring-[#c25e5e]/70" : ""}`}
        >
          <img
            src={getImageSrc(1)}
            alt="Memory 2"
            className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.3]"
          />
          {!userDetails?.isLocked && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-['Patrick_Hand'] py-1 text-center leading-tight">
              📷 Tap to change photo
            </div>
          )}
        </div>

        <div className="absolute top-[28%] right-[8%] bg-[#c25e5e] text-white px-2 py-1 rounded-full text-[8px] sm:text-[9px] rotate-[5deg] font-bold font-['Kalam'] shadow-sm z-0">
          I would Cuddle you so hard <span aria-hidden>💕</span>
        </div>

        <div
          className={`absolute top-[30%] right-[2%] bg-[#fdfaf5] p-2 rounded-sm w-32 text-[8px] sm:text-[9px] rotate-[3deg] text-center font-handwriting z-0 ${STICKER_SHADOW} noise-bg`}
        >
          I want to be with you till my last page. <span aria-hidden>♥</span>
        </div>
        <div className="absolute top-[32%] left-[38%] bg-[#eaddca]/95 px-2 py-1 text-[8px] sm:text-[9px] rotate-[-3deg] font-['Kalam'] shadow-sm border border-[#c0b3a3]/50 z-0 w-28">
          you are my sun, my moon, and all of my stars. <span aria-hidden>🌙</span> <span aria-hidden>⭐</span>
        </div>

        <div
          className={`absolute top-[32%] left-[2%] bg-[#e6dcca] p-3 rounded-tl-lg rounded-br-lg w-28 text-[10px] font-['Special_Elite'] rotate-[-5deg] z-0 ${STICKER_SHADOW} noise-bg`}
        >
          I loved you with a thousand hearts. <span aria-hidden>♥</span>
        </div>

        <div className="absolute top-[36%] left-[5%] flex flex-col items-center rotate-[-2deg] z-0 opacity-90">
          <span className="text-lg font-['Special_Elite']">He was</span>
          <span className="bg-[#3e2b1e] text-[#fdfaf5] px-1 text-[8px] rounded-full my-0.5">
            my
          </span>
          <span className="font-['Permanent_Marker'] text-3xl">LOVE</span> <span className="text-lg" aria-hidden>🖤</span>
        </div>

        <div className="absolute top-[35%] left-[52%] bg-[#c25e5e] text-white px-2 text-[9px] rotate-[5deg] font-bold shadow-sm z-0 opacity-95">
          You&apos;re mine, Again. <span aria-hidden>🧿</span>
        </div>
        <div className="absolute top-[37%] left-[54%] bg-[#a84a4a] text-white px-2 text-[9px] rotate-[-2deg] font-bold shadow-sm z-0">
          You&apos;re mine. <span aria-hidden>💖</span>
        </div>

        <div
          className={`absolute top-[36%] right-[18%] font-['Special_Elite'] font-bold text-3xl bg-[#f5f0c8] px-1 rotate-2 z-0 ${STICKER_SHADOW} noise-bg`}
        >
          Him <span aria-hidden>♡</span>
        </div>

        <div className="absolute top-[40%] right-[2%] w-32 text-[8px] sm:text-[9px] text-right font-handwriting bg-[#fdfaf5]/80 p-1 rotate-1 shadow-sm z-0">
          I love you for all that you are, all that you have been and all that you will be. <span aria-hidden>🧿</span>
        </div>

        <div className="absolute top-[42%] left-[28%] bg-[#fdfaf5] px-2 py-1 text-[9px] sm:text-[10px] rotate-[-2deg] font-['Kalam'] border border-gray-300 shadow-sm z-0 w-36">
          Your arms feel more like home than any house ever did. <span aria-hidden>💕</span>
        </div>
        <div className="absolute top-[44%] left-[2%] bg-[#f4e8d6] px-2 py-1 text-[8px] sm:text-[9px] rotate-[-4deg] font-handwriting shadow-sm border border-[#e8b4b4]/40 z-0 w-28">
          I love you, and that&apos;s the beginning and end of everything. <span aria-hidden>♥</span>
        </div>

        <div className="absolute top-[48%] left-[38%] text-[9px] sm:text-[10px] bg-[#eaddca] p-1 rotate-[-2deg] font-['Kalam'] shadow-sm z-0">
          How strange <br /> To dream of you <span aria-hidden>🖤</span>
        </div>
        <div className="absolute top-[50%] left-[48%] text-2xl sm:text-3xl text-[#3e2b1e] rotate-[10deg] opacity-60 z-0" aria-hidden>
          🖤
        </div>
        <div className="absolute top-[52%] left-[2%] bg-[#f5f0e8] px-2 py-1 text-[8px] sm:text-[9px] rotate-[-4deg] font-handwriting shadow-sm border border-[#c0b3a3]/40 z-0">
          <span aria-hidden>🌸</span> us <span aria-hidden>🌸</span>
        </div>
        <div className="absolute top-[54%] right-[2%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[4deg] font-['Kalam'] shadow-sm border border-[#e8b4b4]/50 z-0 w-28">
          A million times over, I will always choose you. <span aria-hidden>💖</span>
        </div>

        <div
          className={`absolute top-[46%] right-[10%] bg-[#eaddca] p-2 text-[8px] sm:text-[9px] w-28 text-center rotate-[-3deg] font-['Kalam'] z-0 ${STICKER_SHADOW} noise-bg`}
        >
          I ONLY WANT TWO THINGS IN THIS WORLD.
          <br />
          <span className="text-[#3e2b1e]/70 text-[7px] sm:text-[8px]">
            I WANT YOU. AND I WANT US. <span aria-hidden>💕</span>
          </span>
        </div>

        <div className="absolute top-[58%] right-[2%] w-32 text-[8px] sm:text-[9px] text-right font-handwriting bg-[#fdfaf5] p-1 rotate-1 shadow-sm z-0">
          You give me feeling I can&apos;t put into words. <span aria-hidden>🦋</span>
        </div>
        <div className="absolute top-[56%] left-[2%] bg-[#e8b4b4]/70 px-2 py-1 text-[8px] sm:text-[9px] rotate-[-6deg] font-['Kalam'] shadow-sm border border-[#c25e5e]/30 z-0 w-24">
          I will never forget the moment I realized I loved you. <span aria-hidden>🧿</span>
        </div>

        <div
          onClick={() => !userDetails?.isLocked && triggerFileInput(2)}
          className={`absolute top-[48%] left-[28%] w-[110px] sm:w-[130px] h-[140px] sm:h-[165px] bg-white p-1 rotate-[-2deg] z-10 transition-transform ${PHOTO_SHADOW} ${!userDetails?.isLocked ? "cursor-pointer hover:scale-105 ring-2 ring-[#c25e5e]/40 hover:ring-[#c25e5e]/70" : ""}`}
        >
          <img
            src={getImageSrc(2)}
            alt="Memory 3"
            className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.2]"
          />
          {!userDetails?.isLocked && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-['Patrick_Hand'] py-1 text-center leading-tight">
              📷 Tap to change photo
            </div>
          )}
        </div>

        <div className="absolute top-[60%] left-[32%] bg-[#fdfaf5] border border-gray-300 px-2 text-[9px] sm:text-[10px] rotate-[-5deg] font-handwriting shadow-sm z-0">
          He&apos;s smiling, I&apos;m melting. <span aria-hidden>💕</span>
        </div>

        <div className="absolute top-[62%] left-[28%] bg-[#f4e8d6] px-2 py-1 text-[9px] sm:text-[10px] rotate-[2deg] shadow-sm font-['Kalam'] border border-gray-300/50 z-0">
          My heart is, and always will be, yours <span aria-hidden>♥</span>
        </div>
        <div className="absolute top-[64%] right-[28%] bg-[#f5f0e8] px-2 py-1 text-[8px] sm:text-[9px] rotate-[3deg] font-handwriting shadow-sm border border-[#c0b3a3]/50 z-0 w-28">
          I fell in love with the way you touched me without using your hands. <span aria-hidden>✨</span>
        </div>

        <div
          className={`absolute top-[64%] left-[2%] bg-[#fdfaf5] w-6 text-[8px] text-center py-2 border border-gray-300 leading-3 font-['Special_Elite'] z-0 ${STICKER_SHADOW} noise-bg`}
        >
          I<br />will<br />never<br />forget... <span aria-hidden>🧿</span>
        </div>

        <div className="absolute top-[64%] left-[12%] bg-[#e8b4b4]/80 w-24 text-[8px] text-center py-1 rounded-full font-['Dancing_Script'] shadow-sm z-0 border border-[#c25e5e]/30">
          you are my most beautiful someone. o.s. <span aria-hidden>🌸</span>
        </div>

        <div
          className={`absolute top-[68%] left-[22%] bg-[#f4e8d6] p-2 w-36 text-[8px] sm:text-[9px] rotate-[-3deg] border-t-2 border-[#e8b4b4] font-['Kalam'] z-0 ${STICKER_SHADOW} noise-bg`}
        >
          And I&apos;d choose you; in a hundred lifetimes... I&apos;d find you and I&apos;d choose you.
          <span className="text-lg block text-right" aria-hidden>🧿</span>
        </div>

        <div className="absolute top-[72%] left-[2%] w-[48%] z-20 rotate-[-1deg]">
          {!userDetails?.isLocked && (
            <p className="text-[9px] text-[#c25e5e] font-['Patrick_Hand'] mb-1 flex items-center gap-1 animate-pulse">
              ✏️ You can edit this
            </p>
          )}
          <textarea
            value={apiData.text1}
            disabled={userDetails?.isLocked}
            onChange={(e) => setApiData({ ...apiData, text1: e.target.value })}
            placeholder={!userDetails?.isLocked ? "You are my forever." : ""}
            className={`w-full bg-[#e8b4b4]/90 p-3 sm:p-4 font-script text-xl sm:text-2xl text-center text-[#5a3a3a] resize-none focus:ring-2 focus:ring-[#c25e5e]/50 outline-none placeholder-[#a86b6b] ${STICKER_SHADOW} noise-bg ${!userDetails?.isLocked ? "ring-2 ring-[#c25e5e]/30" : ""}`}
            rows="3"
          />
        </div>

        <div className="absolute top-[72%] right-[2%] w-[48%] z-20 rotate-[1deg]">
          {!userDetails?.isLocked && (
            <p className="text-[9px] text-[#c25e5e] font-['Patrick_Hand'] mb-1 flex items-center gap-1 justify-end animate-pulse">
              ✏️ You can edit this
            </p>
          )}
          <textarea
            value={apiData.text2}
            disabled={userDetails?.isLocked}
            onChange={(e) => setApiData({ ...apiData, text2: e.target.value })}
            placeholder={!userDetails?.isLocked ? "I'll hold you in my heart, till I can hold you in my arms." : ""}
            className={`w-full bg-[#eaddca]/95 p-3 font-handwritten text-base sm:text-lg text-right text-[#3e2b1e] resize-none focus:ring-2 focus:ring-[#c25e5e]/50 outline-none placeholder-gray-500 leading-relaxed ${STICKER_SHADOW} noise-bg ${!userDetails?.isLocked ? "ring-2 ring-[#c25e5e]/30" : ""}`}
            rows="3"
          />
        </div>

        <div
          className="absolute bottom-[14%] left-[2%] bg-[#2e1b0e] text-[#fdfaf5] rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1.5 sm:p-2 text-[7px] sm:text-[8px] text-center shadow-lg rotate-[-5deg] font-handwriting z-0 noise-bg"
        >
          I fell in love with you because you loved me when I couldn&apos;t love myself. <span aria-hidden>♡</span>
        </div>

        <div className="absolute bottom-[14%] left-[26%] bg-[#2e1b0e] text-[#fdfaf5] p-2 text-[8px] sm:text-[9px] w-20 text-center font-['Kalam'] rotate-[3deg] shadow-md z-0">
          I love you more ♡ than the miles ♡ between us. ♡
        </div>
        <div className="absolute bottom-[18%] left-[38%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[-2deg] font-handwriting shadow-sm border border-[#e8b4b4]/50 z-0 w-28">
          Cheers to love, laughter, and growing stronger together ♡ <span aria-hidden>🧿</span>
        </div>

        <div className="absolute bottom-[12%] left-[52%] text-2xl sm:text-3xl text-[#e8b4b4] opacity-80 animate-pulse z-0" aria-hidden>
          💖 <span className="text-lg sm:text-xl">💕</span>
        </div>
        <div className="absolute bottom-[16%] right-[12%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[5deg] font-['Caveat'] shadow-sm border border-[#e8b4b4]/50 z-0">
          <span aria-hidden>🧿</span> forever
        </div>

        <div className="absolute bottom-[10%] left-[38%] bg-[#fdfaf5] px-2 border border-gray-300 text-[9px] sm:text-[10px] rotate-2 font-['Kalam'] shadow-sm z-0">
          No storm can last forever. <span aria-hidden>✨</span>
        </div>

        <div
          className={`absolute bottom-[4%] left-[2%] bg-[#d0c8b8] p-2 w-36 sm:w-40 font-['Permanent_Marker'] text-[10px] sm:text-[11px] rotate-[-2deg] border-l-4 border-[#3e2b1e] shadow-sm z-0 noise-bg`}
        >
          I got lost in him, and it was the kind of lost that&apos;s exactly like being found. <span aria-hidden>🧿</span>
        </div>

        <div
          className={`absolute bottom-[4%] right-[2%] bg-[#e8eabb] px-2 py-1 text-[8px] sm:text-[9px] font-bold rotate-[-1deg] w-36 text-center font-handwriting opacity-90 z-0 ${STICKER_SHADOW} noise-bg`}
        >
          You were all I could think about today. <span aria-hidden>💕</span>
        </div>

        <div className="absolute bottom-[8%] right-[22%] bg-[#b8d4e8]/90 px-2 py-1 text-[8px] sm:text-[9px] rotate-1 font-['Kalam'] shadow-sm z-0 border border-[#7eb8da]/50">
          I still remember the first day I saw you. <span aria-hidden>✨</span>
        </div>
        <div className="absolute bottom-[6%] left-[28%] bg-[#f4e8d6] px-2 py-1 text-[8px] sm:text-[9px] rotate-[4deg] font-handwriting shadow-sm border border-[#c0b3a3]/50 z-0 w-28">
          Forever & always, with you. <span aria-hidden>🧿</span> <span aria-hidden>♡</span>
        </div>
      </div>

      {!userDetails?.isLocked && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-['Patrick_Hand'] animate-fadeIn">
          <button
            onClick={handleSaveClick}
            disabled={loading}
            className="bg-gradient-to-r from-[#c25e5e] to-[#a84a4a] text-[#fdfaf5] px-6 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all flex items-center gap-2 text-sm border border-[#3e2b1e]/20"
          >
            {loading ? "Saving..." : "Save Memories ✨"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ScrapbookRealism;