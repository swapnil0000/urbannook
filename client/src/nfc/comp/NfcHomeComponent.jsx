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
    const [toast, setToast] = useState({ show: false, message: "", type: "" });

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
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_BASE}/nfc/data/${userId}`);

            if (res.data?.data?.isAssigned === false) {
                setUserDetails({ isLocked: true, isAssigned: false });
                return;
            }

            if (res.data && res.data.success) {
                const { uploadedImagesUrl, uploadedText } = res.data.data;

                let imgArray = [null, null, null];
                if (uploadedImagesUrl && typeof uploadedImagesUrl === "string") {
                    const splitUrls = uploadedImagesUrl.split(",");
                    imgArray = splitUrls.map((url) =>
                        url && url.trim() !== "" ? url : null
                    );
                }
                while (imgArray.length < 3) imgArray.push(null);

                const txt1 = uploadedText && uploadedText[0] ? uploadedText[0] : "";
                const txt2 = uploadedText && uploadedText[1] ? uploadedText[1] : "";

                setApiData({ uploadedImagesUrl: imgArray, text1: txt1, text2: txt2 });

                const hasImages = imgArray.some((img) => img !== null);
                const hasText = txt1 || txt2;

                setUserDetails({
                    isLocked: !hasImages && !hasText,
                    isAssigned: true,
                });
            }
        } catch {
            console.log("Error or New User");
            setUserDetails({ isLocked: true, isAssigned: true });
        }
    };

    const handleStartCreating = () =>
        setUserDetails({ ...userDetails, isLocked: false });

    const handleFileSelect = (index, e) => {
        const file = e.target.files?.[0];
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
            fileInputRefs.current[index]?.click();
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
            fd.append("images", pendingFiles[Number(idx)]);
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
                        url && url.trim() !== "" ? url : null
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
                "error"
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
                <div className="bg-[#fdfaf5] p-8 rounded-lg shadow-2xl text-center border-2 border-[#c25e5e]/40 max-w-sm mx-4 rotate-1">
                    <div className="text-4xl mb-2">🚫</div>
                    <h2 className="font-['Permanent_Marker'] text-2xl text-[#8b0000] mb-2">
                        Account Paused
                    </h2>
                    <p className="text-lg text-[#3e2b1e] mb-4">
                        Your User ID has been paused. You cannot access or edit memories right
                        now.
                    </p>
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-sm font-bold text-[#8b0000]">
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
                {`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Dancing+Script:wght@400;600&family=Kalam:wght@300;400;700&family=Nothing+You+Could+Do&family=Patrick+Hand&family=Permanent+Marker&family=Sacramento&family=Shadows+Into+Light&family=Special+Elite&display=swap');`}
                {`.noise-bg{background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");}`}
                {`.font-handwritten{font-family:'Kalam',cursive;}`}
                {`.font-script{font-family:'Caveat',cursive;}`}
                {`.font-handwriting{font-family:'Shadows Into Light',cursive;}`}
            </style>

            {/* Toast */}
            {toast.show && (
                <div
                    className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl border-2 font-bold animate-bounce
          ${toast.type === "success" ? "bg-[#eaddca] text-green-800 border-green-700" : "bg-[#D1C4C4] text-red-900 border-red-800"}`}
                >
                    {toast.message}
                </div>
            )}

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[60] bg-[#3e2b1e]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#fdfaf5] w-full max-w-xs p-6 rounded-xl shadow-2xl border-4 border-[#eaddca] relative">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            className="absolute top-2 right-3 text-gray-400 hover:text-[#8b0000] font-bold text-xl"
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

                                <div className="flex justify-between items-center mt-2 border-t border-gray-200 pt-2">
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
                                    className="w-full bg-[#8b0000] text-white py-2 rounded-lg font-bold shadow-md hover:opacity-90 transition-all mb-2"
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

            {/* Main Scrapbook */}
            <div
                className="relative w-full max-w-[420px] min-h-[min(880px,90dvh)] shadow-2xl overflow-hidden rounded-lg"
                style={{
                    backgroundColor: "#f4e8d6",
                    backgroundImage:
                        "repeating-linear-gradient(#f4e8d6 0px, #f4e8d6 24px, #c0b3a3 25px), radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.1) 100%)",
                    boxShadow: "inset 0 0 50px rgba(62,43,30,0.2)",
                }}
            >
                {/* Locked Overlay */}
                {userDetails?.isLocked && (
                    <div className="absolute inset-0 z-50 backdrop-blur-md bg-[#3e2b1e]/20 flex flex-col items-center justify-center animate-fadeIn">
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

                {/* Hidden file inputs */}
                {[0, 1, 2].map((idx) => (
                    <input
                        key={idx}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                            fileInputRefs.current[idx] = el;
                        }}
                        onChange={(e) => handleFileSelect(idx, e)}
                    />
                ))}

                {/* ===== SCRAPBOOK ELEMENTS ===== */}

                <div className=" absolute w-[150px] ">
                    <img
                        src="/templates/ticket.png"
                        alt="MegetImageSrcmory 2"
                        className=""
                    />
                </div>
                {/* <div className={`absolute top-[2%] left-[3%] bg-[#D1C4C4] p-2 sm:p-3 rotate-[-3deg] text-[9px] sm:text-[10px] text-center leading-tight text-[#3e2b1e] w-24 sm:w-28 z-0 ${STICKER_SHADOW} noise-bg`}>
                    your smile is the most beautiful thing to me.
                </div> */}

                {/* "What's meant to be" note */}
                <div className={`absolute top-[2%] left-[40%] bg-[#fdfaf5] p-2 rotate-[1deg] text-[10px] sm:text-[11px] font-bold w-36 sm:w-40 font-['Special_Elite'] opacity-95 z-0 ${STICKER_SHADOW} noise-bg`}>
                    What&apos;s meant to be will always find a way. <span aria-hidden>✨</span>
                </div>

                {/* <div className="absolute top-[4%] right-[2%] bg-[#fdfaf5] px-2 sm:px-3 py-1 rounded-full border-2 border-[#3e2b1e] text-[9px] sm:text-[10px] font-bold rotate-[1deg] font-handwritten shadow-sm z-0">
                    I love you baby ♥ <span aria-hidden>💖</span>
                </div> */}

                {/* <div className="absolute top-[8%] left-[25%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[2deg] font-handwriting shadow-sm border border-[#e8b4b4]/50 z-0 w-28 sm:w-32">
          You make me happy in a way no one else can. <span aria-hidden>💕</span>
        </div> */}

                {/* "You're the reason" olive note */}
                <div className="absolute top-[10%] left-[2%] bg-[#e8eabb]/95 px-4 py-2 text-[8px] sm:text-[9px] rotate-[-5deg] font-handwriting shadow-sm border border-[#c0b3a3]/40 z-0 w-28">
                    You&apos;re the reason why I&apos;m smiling again. <span aria-hidden>✨</span>
                </div>


                <div className=" absolute w-25 h-auto top-[13%] left-[27%]">
                    <img
                        src="/templates/cat.png"
                        alt="MegetImageSrcmory 2"
                        className=""
                    />
                </div>


                   <div className=" absolute w-20 h-auto top-[78%] left-[31%]">
                    <img
                        src="/templates/penguin.png"
                        alt="MegetImageSrcmory 2"
                        className=""
                    />
                </div>

                {/* <div className={`absolute top-[10%]  max-w-16 left-[31%] bg-[#fdfaf5] px-2 py-1 rotate-[-2deg] text-[10px] sm:text-[11px] font-handwritten z-0 ${STICKER_SHADOW} noise-bg`}>
          I love making you laugh because{" "}
          <span className="text-[#c25e5e]">🦋</span>
        </div> */}

                {/* <div className={`absolute top-[18%] left-[2%] bg-[#fdfaf5] min-w-22  rounded-sm p-1 w-25 text-[9px] sm:text-[10px] rotate-[-1deg] font-handwriting z-0 ${STICKER_SHADOW} noise-bg`}>
          And then you came along, and my life became beautiful. <span aria-hidden>🌸</span>
        </div> */}
                <div className=" absolute w-25 h-auto top-[18%] left-[2%]">
                    <img
                        src="/templates/love.png"
                        alt="MegetImageSrcmory 2"
                        className=""
                    />
                </div>

                <div
                    onClick={() => !userDetails?.isLocked && triggerFileInput(0)}
                    className={`absolute top-[6%] right-[2%] w-[200px] sm:w-[200px] h-[200px] sm:h-[200px] bg-white p-1 rotate-[5deg] z-10 transition-transform ${PHOTO_SHADOW} ${!userDetails?.isLocked ? "cursor-pointer hover:scale-105 ring-2 ring-[#c25e5e]/40 hover:ring-[#c25e5e]/70" : ""}`}
                >
                    <img
                        src={getImageSrc(0)}
                        alt="Memory 1"
                        className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.3]"
                    />
                    {!userDetails?.isLocked && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[#3e2b1e]/60 text-white text-[8px] font-['Patrick_Hand'] py-1 text-center leading-tight">
                            📷 Tap to change photo
                        </div>
                    )}
                </div>

                {/* <div className="absolute top-[38%] right-[8%] bg-[#c25e5e] text-white px-2 py-1 rounded-full text-[8px] sm:text-[9px] rotate-[5deg] font-bold font-handwritten shadow-sm z-0">
          I would Cuddle you so hard <span aria-hidden>💕</span>
        </div> */}

                {/* <div className={`absolute top-[30%] right-[2%] bg-[#fdfaf5] p-2 rounded-sm w-32 text-[8px] sm:text-[9px] rotate-[3deg] text-center font-handwriting z-0 ${STICKER_SHADOW} noise-bg`}>
          I want to be with you till my last page. <span aria-hidden>♥</span>
        </div> */}

                {/* <div className="absolute top-[32%] left-[27%] bg-[#eaddca]/95 px-2 py-1 text-[8px] sm:text-[9px] rotate-[-3deg] font-handwritten shadow-sm border border-[#c0b3a3]/50 z-0 w-28">
                    you are my sun, my moon, and all of my stars. <span aria-hidden>🌙</span> <span aria-hidden>⭐</span>
                </div> */}

                <div className={`absolute top-[25%] left-[2%] bg-[#e6dcca] p-3 rounded-tl-lg rounded-br-lg w-28 text-[10px] font-['Special_Elite'] rotate-[-5deg] z-0 ${STICKER_SHADOW} noise-bg`}>
                    I loved you with a thousand hearts. <span aria-hidden>♥</span>
                </div>

                {/* <div className=" absolute w-25  h-auto top-[45%] right-[5%]">
            <img
            src="/templates/breaking.png"
            alt="MegetImageSrcmory 2"
            className=""
          />
        </div> */}


                <div className=" absolute max-w-10 max-h-10 top-[26%] left-[35%]">
                    <img
                        src="/templates/heart.png"
                        alt="MegetImageSrcmory 2"
                        className=""
                    />
                </div>


                {/* <div className="absolute top-[36%] left-[50%] flex flex-col items-center rotate-[-2deg] z-0 opacity-90">
          <span className="text-lg font-['Special_Elite']">He was</span>
          <span className="bg-[#3e2b1e] text-[#fdfaf5] px-1 text-[8px] rounded-full my-0.5">
            my
          </span>
          <span className="font-['Permanent_Marker'] text-3xl">LOVE</span>{" "}
          <span className="text-lg" aria-hidden>🖤</span>
        </div> */}

                <div className="absolute top-[33%] left-[58%] bg-[#c25e5e] text-white px-2 text-[9px] rotate-[5deg] font-bold shadow-sm z-0 opacity-95">
                    You&apos;re mine, Again. <span aria-hidden>🧿</span>
                </div>
                <div className="absolute top-[35%] left-[59%] bg-[#a84a4a] text-white px-2 text-[9px] rotate-[-2deg] font-bold shadow-sm z-0">
                    You&apos;re mine. <span aria-hidden>💖</span>
                </div>

                {/* <div className="absolute top-[40%] right-[2%] w-32 text-[8px] sm:text-[9px] text-right font-handwriting bg-[#fdfaf5]/80 p-1 rotate-1 shadow-sm z-0">
          I love you for all that you are, all that you have been and all that you will be. <span aria-hidden>🧿</span>
        </div> */}

                {/* <div className="absolute top-[42%] left-[28%] bg-[#fdfaf5] px-2 py-1 text-[9px] sm:text-[10px] rotate-[-2deg] font-handwritten border border-gray-300 shadow-sm z-0 w-36">
          Your arms feel more like home than any house ever did. <span aria-hidden>💕</span>
        </div> */}

                {/* <div className="absolute top-[44%] left-[2%] bg-[#f4e8d6] px-2 py-1 text-[8px] sm:text-[9px] rotate-[-1deg] font-handwriting shadow-sm border border-[#e8b4b4]/40 z-0 w-28">
          I love you, and that&apos;s the beginning and end of everything. <span aria-hidden>♥</span>
        </div> */}

                {/* <div className="absolute top-[48%] left-[38%] text-[9px] sm:text-[10px] bg-[#eaddca] p-1 rotate-[-2deg] font-handwritten shadow-sm z-0">
          How strange <br /> To dream of you <span aria-hidden>🖤</span>
        </div> */}
                <div className="absolute top-[50%] left-[48%] text-2xl sm:text-3xl text-[#3e2b1e] rotate-[10deg] opacity-60 z-0" aria-hidden>
                    🖤
                </div>

                {/* <div className="absolute top-[52%] left-[2%] bg-[#f5f0e8] px-2 py-1 text-[8px] sm:text-[9px] rotate-[-1deg] font-handwriting shadow-sm border border-[#c0b3a3]/40 z-0">
          <span aria-hidden>🌸</span> us <span aria-hidden>🌸</span>
        </div> */}

                {/* <div className="absolute top-[54%] right-[2%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[1deg] font-handwritten shadow-sm border border-[#e8b4b4]/50 z-0 w-28">
          A million times over, I will always choose you. <span aria-hidden>💖</span>
        </div> */}

                {/* Editable text2 - sticker style */}
                <div className="absolute top-[40%] right-[19%] w-28 z-20 rotate-[-5deg]">
                    {/* {!userDetails?.isLocked && (
                        <p className="text-[8px] text-[#c25e5e] font-['Patrick_Hand'] mb-0.5 flex items-center gap-1 animate-pulse">
                            ✏️ edit
                        </p>
                    )} */}
                    {userDetails?.isLocked ? (
                        <div className={`bg-[#eaddca] p-2 text-[8px] sm:text-[9px] text-center font-handwritten ${STICKER_SHADOW} noise-bg`}>
                            {apiData.text2 || (<>I ONLY WANT TWO THINGS IN THIS WORLD.<br /><span className="text-[#3e2b1e]/70 text-[7px] sm:text-[8px]">I WANT YOU. AND I WANT US. <span aria-hidden>💕</span></span></>)}
                        </div>
                    ) : (
                        <textarea
                            value={apiData.text2}
                            onChange={(e) => setApiData({ ...apiData, text2: e.target.value })}
                            placeholder="Write something sweet... 💕"
                            className={`w-full bg-[#eaddca] p-1 text-[12px] sm:text-[13px] text-center text-[#3e2b1e] resize-none outline-none focus:ring-1 focus:ring-[#c25e5e]/50  ring-[#c25e5e]/30 placeholder-[#3e2b1e]/50 ${STICKER_SHADOW} noise-bg`}
                            rows="3"
                        />
                    )}
                </div>

                  <div className=" absolute max-w-40 h-auto top-[30%] left-[80%]">
                    <img
                        src="/templates/butterfly.png"
                        alt="MegetImageSrcmory 2"
                        className="object-cover"
                    />
                </div>

                <div className=" absolute max-w-25 max-h-25 top-[43%] left-[80%]">
                    <img
                        src="/templates/vector.png"
                        alt="MegetImageSrcmory 2"
                        className=""
                    />
                </div>

                {/* <div className=" absolute w-20 h-20 top-[50%] right-[0%]">
            <img

            src="/templates/vertical.png"
            alt="MegetImageSrcmory 2"
            className=" object-cover "
          />
        </div> */}


                <div className=" absolute w-40 h-auto top-[51%] right-[5%]">
                    <img

                        src="/templates/memories.png"
                        alt="MegetImageSrcmory 2"
                        className=" object-cover "
                    />
                </div>


                <div className=" absolute w-52 h-auto bottom-[0%] right-[30%]">
                    <img

                        src="/templates/text.png"
                        alt="MegetImageSrcmory 2"
                        className=" object-cover "
                    />
                </div>


                <div className=" absolute w-28 h-auto top-[70%] right-[75%] z-10">
                    <img

                        src="/templates/flower.png"
                        alt="MegetImageSrcmory 2"
                        className=" object-cover "
                    />
                </div>


                 <div className=" absolute w-[130px] h-auto bottom-[10px] right-[0%]">
                    <img

                        src="/templates/last.png"
                        alt="MegetImageSrcmory 2"
                        className=" object-cover "
                    />
                </div>


                 <div className=" absolute w-[130px] h-auto top-[0px] right-[0%]">
                    <img

                        src="/templates/hearts.png"
                        alt="MegetImageSrcmory 2"
                        className=" object-cover "
                    />
                </div>



                {/* PHOTO 2 - Bottom right */}
                <div
                    onClick={() => !userDetails?.isLocked && triggerFileInput(1)}
                    className={`absolute top-[64%] right-[2%] w-[200px] sm:w-[200px] h-[200px] sm:h-[200px] bg-white p-1 rotate-[5deg] z-10 transition-transform ${PHOTO_SHADOW} ${!userDetails?.isLocked ? "cursor-pointer hover:scale-105 ring-2 ring-[#c25e5e]/40 hover:ring-[#c25e5e]/70" : ""}`}
                >
                    <img
                        src={getImageSrc(1)}
                        alt="Memory 2"
                        className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.3]"
                    />
                    {!userDetails?.isLocked && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[#3e2b1e]/60 text-white text-[8px] font-['Patrick_Hand'] py-1 text-center leading-tight">
                            📷 Tap to change photo
                        </div>
                    )}
                </div>



                {/* PHOTO 3 - Center */}

                <div className=" absolute w-[130px] h-auto top-[40%] left-[0%]">
                  <img

                      src="/templates/dil3.png"
                        alt="MegetImageSrcmory 2"
                      className=" object-cover "
                  />
                </div>

                <div
                    onClick={() => !userDetails?.isLocked && triggerFileInput(2)}
                    className={`absolute top-[35%] left-[4%] w-[200px] sm:w-[200px] h-[200px] sm:h-[200px] bg-white p-1 rotate-[-5deg] z-10 transition-transform ${PHOTO_SHADOW} ${!userDetails?.isLocked ? "cursor-pointer hover:scale-105 ring-2 ring-[#c25e5e]/40 hover:ring-[#c25e5e]/70" : ""}`}
                >
                    <img
                        src={getImageSrc(2)}
                        alt="Memory 3"
                        className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.2]"
                    />
                    {!userDetails?.isLocked && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[#3e2b1e]/60 text-white text-[8px] font-['Patrick_Hand'] py-1 text-center leading-tight">
                            📷 Tap to change photo
                        </div>
                    )}
                </div>

                {/* Editable textarea 1 - removed, now inline in sticker below */}

                {/* Editable textarea 2 */}
                {/* <div className="absolute top-[72%] right-[2%] w-[48%] z-20 rotate-[1deg]">
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
        </div> */}

                {/* Dark circle "I fell in love" */}
                <div className="absolute bottom-[13%] left-[60px] bg-[#2e1b0e] text-[#fdfaf5] rounded-full w-20 h-20 sm:w-20 sm:h-20 flex items-center justify-center p-1.5 sm:p-2 text-[7px] sm:text-[8px] text-center shadow-lg rotate-[-5deg] font-handwriting z-0 noise-bg">
                    I fell in love with you because you loved me when I couldn&apos;t love myself. <span aria-hidden>♡</span>
                </div>
                {/* Hearts */}
                <div className="absolute bottom-[12%] left-[52%] text-2xl sm:text-3xl text-[#e8b4b4] opacity-80 animate-pulse z-0" aria-hidden>
                    💖 <span className="text-lg sm:text-xl">💕</span>
                </div>

                <div className="absolute bottom-[16%] right-[12%] bg-[#fdfaf5] px-2 py-1 text-[8px] sm:text-[9px] rotate-[5deg] font-script shadow-sm border border-[#e8b4b4]/50 z-0">
                    <span aria-hidden>🧿</span> forever
                </div>

                <div className="absolute bottom-[10%] left-[22%] bg-[#fdfaf5] px-2 border border-gray-300 text-[9px] sm:text-[10px] rotate-2 font-handwritten shadow-sm z-0">
                    No storm can last forever. <span aria-hidden>✨</span>
                </div>

                {/* Editable text1 - sticker style */}
                <div className="absolute bottom-[26%] left-[10%] w-36 sm:w-40 z-20">
                    {/* {!userDetails?.isLocked && (
                        <p className="text-[8px] text-[#c25e5e] font-['Patrick_Hand'] mb-0.5 flex items-center gap-1 animate-pulse">
                            ✏️ edit
                        </p>
                    )} */}
                    {userDetails?.isLocked ? (
                        <div className="bg-[#d0c8b8] p-2 font-['Permanent_Marker'] text-[10px] sm:text-[11px] rotate-[0deg] border-l-4 border-[#3e2b1e] shadow-sm noise-bg">
                            {apiData.text1 || "I got lost in him, and it was the kind of lost that's exactly like being found. 🧿"}
                        </div>
                    ) : (
                        <textarea
                            value={apiData.text1}
                            onChange={(e) => setApiData({ ...apiData, text1: e.target.value })}
                            placeholder="Write your feelings here... 🧿"
                            className="w-full bg-[#d0c8b8] p-2 text-[12px] sm:text-[13px] text-[#3e2b1e] rotate-[0deg] border-l-4 border-[#3e2b1e] shadow-sm noise-bg resize-none outline-none focus:ring-1 focus:ring-[#c25e5e]/50 ring-1 ring-[#c25e5e]/30 placeholder-[#3e2b1e]/50"
                            rows="4"
                        />
                    )}
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