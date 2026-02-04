import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL


const PAPER_BG_STYLE = {
  backgroundColor: "#f4e8d6",
  backgroundImage: `
    repeating-linear-gradient(#f4e8d6 0px, #f4e8d6 24px, #c0b3a3 25px),
    radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.1) 100%)
  `,
  boxShadow: "inset 0 0 50px rgba(62, 43, 30, 0.2)",
};

const NOISE_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
};

const STICKER_SHADOW = "shadow-[2px_4px_8px_rgba(0,0,0,0.15),1px_2px_3px_rgba(0,0,0,0.1)] border border-black/5";
const PHOTO_SHADOW = "shadow-[3px_5px_10px_rgba(0,0,0,0.2)] border-[3px] border-[#fffcf5]";

const ScrapbookRealism = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [pendingFiles, setPendingFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const fileInputRefs = useRef([]);

  const [apiData, setApiData] = useState({
    uploadedImagesUrl: [null, null, null],
    text1: "",
    text2: "",
  });

  const placeholders = [
    "https://via.placeholder.com/300x400/eaddca/5e4b3e?text=Tap+to+Add+Hug",
    "https://via.placeholder.com/300x300/eaddca/5e4b3e?text=Tap+to+Add+Kiss",
    "https://via.placeholder.com/400x300/eaddca/5e4b3e?text=Tap+to+Add+Fun"
  ];

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/nfc/data/${userId}`);
      if (res.data && res.data.success) {
        const { uploadedImagesUrl, uploadedText } = res.data.data;

        let imgArray = [null, null, null];
        if (uploadedImagesUrl && typeof uploadedImagesUrl === 'string') {
            const splitUrls = uploadedImagesUrl.split(',');
            imgArray = splitUrls.map(url => (url && url.trim() !== "") ? url : null);
        }
        
        console.log(res?.data?.data);
        while(imgArray.length < 3) imgArray.push(null);

        const txt1 = (uploadedText && uploadedText[0]) ? uploadedText[0] : "";
        const txt2 = (uploadedText && uploadedText[1]) ? uploadedText[1] : "";
        
        setApiData({ uploadedImagesUrl: imgArray, text1: txt1, text2: txt2 });

        const hasImages = imgArray.some(img => img !== null);
        const hasText = txt1 || txt2;

        if (!hasImages && !hasText) setIsLocked(true);
        else setIsLocked(false);
      }
    } catch (e) {
      console.log("New user or API error, treating as first time.");
      setIsLocked(true);
    }
  };

  const handleStartCreating = () => setIsLocked(false);

  const handleFileSelect = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingFiles(prev => ({ ...prev, [index]: file }));
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [index]: previewUrl }));
    }
  };

  const triggerFileInput = (index) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].click();
    }
  };

  const handleUpload = async () => {
    const hasNewFiles = Object.keys(pendingFiles).length > 0;
    const hasText = apiData.text1 || apiData.text2;

    if (!hasNewFiles && !hasText) return alert("Make some changes first! ✍️");

    setLoading(true);
    const fd = new FormData();

    Object.keys(pendingFiles).forEach(idx => {
      fd.append("images", pendingFiles[idx]);
      fd.append("indices", idx);
    });

    fd.append("text1", apiData.text1);
    fd.append("text2", apiData.text2);

    try {
      const res = await axios.post(`${API_BASE}/nfc/upload/${userId}`, fd);
      if (res.data && res.data.success) {
        const { uploadedImagesUrl } = res.data.data;
        
        let imgArray = [...apiData.uploadedImagesUrl];
        if (uploadedImagesUrl && typeof uploadedImagesUrl === 'string') {
             const splitUrls = uploadedImagesUrl.split(',');
             imgArray = splitUrls.map(url => (url && url.trim() !== "") ? url : null);
        }

        setApiData(prev => ({
            ...prev,
            uploadedImagesUrl: imgArray,
            text1: res.data.data.text1 || prev.text1,
            text2: res.data.data.text2 || prev.text2
        }));
        
        setPendingFiles({});
        setPreviews({});
        alert("Scrapbook Updated! ❤️");
      }
    } catch (e) {
      console.error(e);
      alert("Save failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (index) => {
    if (previews[index]) return previews[index];
    if (apiData.uploadedImagesUrl[index]) return apiData.uploadedImagesUrl[index];
    return placeholders[index];
  };

  if (!userId) return <div className="p-10 text-center font-['Patrick_Hand']">Invalid Link (No User ID)</div>;

  return (
    <div className="min-h-screen bg-[#d8c8b8] flex justify-center py-0 md:py-6 font-['Patrick_Hand'] text-[#3e2b1e]">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Cedarville+Cursive&family=Gloria+Hallelujah&family=Patrick+Hand&family=Permanent+Marker&family=Special+Elite&display=swap');`}
      </style>

      <div 
        className="relative w-full max-w-[420px] min-h-[880px] shadow-2xl overflow-hidden md:rounded-lg"
        style={PAPER_BG_STYLE}
      >
        
        {isLocked && (
            <div className="absolute inset-0 z-50 backdrop-blur-md bg-black/20 flex flex-col items-center justify-center animate-fadeIn">
                <div className="bg-[#fdfaf5] p-8 rounded-2xl shadow-2xl rotate-1 max-w-[80%] text-center border-2 border-[#e8b4b4]">
                    <h2 className="font-['Permanent_Marker'] text-3xl mb-4 text-[#c25e5e]">First Time?</h2>
                    <p className="font-['Patrick_Hand'] text-lg mb-6">Create your digital memory lane. Add photos and notes to start.</p>
                    <button 
                        onClick={handleStartCreating}
                        className="bg-gradient-to-r from-[#c25e5e] to-[#a84a4a] text-white px-8 py-3 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-transform"
                    >
                        Upload Your Feelings ✨
                    </button>
                </div>
            </div>
        )}

        {[0, 1, 2].map(idx => (
          <input
            key={idx}
            type="file"
            accept="image/*"
            className="hidden"
            ref={el => fileInputRefs.current[idx] = el}
            onChange={(e) => handleFileSelect(idx, e)}
          />
        ))}

        <div 
            className={`absolute top-[2%] left-[3%] bg-[#f4c2c2] p-3 rotate-[-3deg] text-[10px] text-center leading-tight font-['Cedarville_Cursive'] text-[#8b0000] w-28 ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          <span className="text-red-700 text-[8px]">♥</span> your smile is the most beautiful thing to me. <span className="text-red-700 text-[8px]">♥</span>
        </div>

        <div 
            className={`absolute top-[2%] left-[40%] bg-[#fdfaf5] p-2 rotate-[1deg] text-[11px] font-bold w-36 font-['Special_Elite'] opacity-95 ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          "What's meant to be will always find a way."
        </div>

        <div 
          onClick={() => !isLocked && triggerFileInput(0)}
          className={`absolute top-[3%] right-[-2%] w-[150px] h-[180px] bg-white p-1 rotate-[4deg] z-10 transition-transform ${PHOTO_SHADOW} ${!isLocked ? 'cursor-pointer hover:scale-105' : ''}`}
        >
          <img
            src={getImageSrc(0)}
            alt="Memory 1"
            className="w-full h-full object-cover brightness-90 contrast-110 sepia-[.2]"
          />
          {!isLocked && <div className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm">✏️</div>}
        </div>

        <div 
            className={`absolute top-[15%] left-[28%] bg-[#fdfaf5] px-2 py-1 rotate-[-2deg] text-[11px] font-['Patrick_Hand'] z-0 ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          "I love making you laugh because <span className="text-pink-600">🦋</span>
        </div>

        <div 
            className={`absolute top-[20%] left-[2%] bg-[#fdfaf5] rounded-sm p-2 w-36 text-[10px] rotate-[-4deg] font-['Patrick_Hand'] ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          And then you came along, and my life became beautiful.
        </div>

        <div className="absolute top-[20%] left-[50%] bg-[#fdfaf5] px-3 py-0.5 rounded-full border-2 border-[#3e2b1e] text-[10px] font-bold rotate-[4deg] font-['Patrick_Hand'] shadow-sm">
          I Love you, iDiot. ♡
        </div>

        <div className="absolute top-[25%] left-[12%] w-[75%] z-20 rotate-[-1deg]">
          <textarea
            value={apiData.text1}
            disabled={isLocked}
            onChange={(e) => setApiData({ ...apiData, text1: e.target.value })}
            placeholder={!isLocked ? "Tap to write something sweet..." : ""}
            className={`w-full bg-[#e8b4b4]/90 p-4 font-['Cedarville_Cursive'] text-2xl text-center text-[#5a3a3a] resize-none focus:ring-0 outline-none placeholder-[#a86b6b] ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
            rows="2"
          />
        </div>

        <div 
            className={`absolute top-[35%] left-[2%] bg-[#e6dcca] p-3 rounded-tl-lg rounded-br-lg w-28 text-[10px] font-['Special_Elite'] rotate-[-5deg] ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          I loved you with a thousand hearts.
        </div>

        <div className="absolute top-[41%] left-[5%] flex flex-col items-center rotate-[-2deg] z-0 opacity-90">
          <span className="text-lg font-['Special_Elite']">He was</span>
          <span className="bg-[#3e2b1e] text-[#fdfaf5] px-1 text-[8px] rounded-full my-0.5">my</span>
          <span className="font-['Permanent_Marker'] text-3xl">LOVE</span>
        </div>

        <div 
          onClick={() => !isLocked && triggerFileInput(1)}
          className={`absolute top-[40%] left-[25%] w-[130px] h-[160px] bg-white p-1 rotate-[-3deg] z-10 transition-transform ${PHOTO_SHADOW} ${!isLocked ? 'cursor-pointer hover:scale-105' : ''}`}
        >
          <img
            src={getImageSrc(1)}
            alt="Memory 2"
            className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.3]"
          />
           {!isLocked && <div className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm">✏️</div>}
        </div>

        <div className="absolute top-[37%] left-[58%] bg-[#c25e5e] text-white px-2 text-[9px] rotate-[5deg] font-bold shadow-sm z-20 opacity-95">
          "You're mine, Again."
        </div>
        <div className="absolute top-[39%] left-[60%] bg-[#a84a4a] text-white px-2 text-[9px] rotate-[-2deg] font-bold shadow-sm z-20">
          "You're mine."
        </div>

        <div className={`absolute top-[38%] right-[15%] font-['Special_Elite'] font-bold text-3xl bg-[#f5f0c8] px-1 rotate-2 z-0 ${STICKER_SHADOW}`}>
          Him
        </div>

        <div 
            className={`absolute top-[32%] right-[2%] bg-[#fdfaf5] p-2 rounded-sm w-32 text-[9px] rotate-[3deg] text-center font-['Patrick_Hand'] ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          I want to be with you till my last page.
        </div>

        <div className="absolute top-[43%] right-[2%] w-32 text-[9px] text-right font-['Special_Elite'] bg-[#fdfaf5]/80 p-1 rotate-1 shadow-sm">
          "I love you for all that you are, all that you have been..."
        </div>

        <div className="absolute top-[50%] left-[40%] text-[10px] bg-[#eaddca] p-1 rotate-[-2deg] font-['Patrick_Hand'] shadow-sm">
          How strange <br /> To dream of you
        </div>
        <div className="absolute top-[54%] left-[48%] text-3xl text-[#3e2b1e] rotate-[10deg] opacity-60">🖤</div>

        <div 
            className={`absolute top-[51%] right-[10%] bg-[#eaddca] p-2 text-[9px] w-28 text-center rotate-[-3deg] font-['Patrick_Hand'] ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          I ONLY WANT TWO THINGS IN THIS WORLD.
          <br />
          <span className="text-[#3e2b1e]/70 text-[8px]">I WANT YOU. AND I WANT US.</span>
        </div>

        <div 
          onClick={() => !isLocked && triggerFileInput(2)}
          className={`absolute top-[60%] right-[5%] w-[160px] h-[140px] bg-white p-1 rotate-[4deg] z-10 transition-transform ${PHOTO_SHADOW} ${!isLocked ? 'cursor-pointer hover:scale-105' : ''}`}
        >
          <img
            src={getImageSrc(2)}
            alt="Memory 3"
            className="w-full h-full object-cover brightness-95 contrast-110 sepia-[.2]"
          />
           {!isLocked && <div className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm">✏️</div>}
        </div>

        <div className="absolute top-[62%] left-[35%] bg-[#fdfaf5] border border-gray-300 px-2 text-[10px] rotate-[-5deg] font-['Patrick_Hand'] shadow-sm">
          "He's smiling, I'm melting."
        </div>

        <div className="absolute top-[66%] left-[30%] bg-[#f4e8d6] px-2 py-1 text-[10px] rotate-[2deg] shadow-sm font-['Patrick_Hand'] border border-gray-300/50">
          "My heart is, and always will be, yours"
        </div>

        <div 
            className={`absolute top-[70%] left-[2%] bg-[#f4e8d6] p-2 w-36 text-[9px] rotate-[-3deg] border-t-2 border-[#e8b4b4] font-['Patrick_Hand'] ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          "And I'd choose you; in a hundred lifetimes... I'd find you and I'd choose you."
          <span className="text-red-600 text-lg block text-right">💋</span>
        </div>

        <div className={`absolute top-[70%] left-[42%] bg-[#fdfaf5] w-6 text-[8px] text-center py-2 border border-gray-300 leading-3 font-['Special_Elite'] ${STICKER_SHADOW}`}>
          I<br />will<br />never<br />forget...
        </div>

        <div className="absolute top-[68%] left-[55%] bg-[#cbb09c] w-14 h-12 flex items-center text-center text-[7px] font-bold rounded-[50%] rotate-[10deg] shadow-sm p-1 font-['Patrick_Hand'] border border-[#3e2b1e]/20">
          you are my best beautiful season.
        </div>

        <div className="absolute top-[80%] right-[2%] w-[55%] z-20 rotate-[-1deg]">
          <textarea
            value={apiData.text2}
            disabled={isLocked}
            onChange={(e) => setApiData({ ...apiData, text2: e.target.value })}
            placeholder={!isLocked ? "Tap to write love note..." : ""}
            className={`w-full bg-[#fdfaf5]/95 p-3 font-['Cedarville_Cursive'] text-lg text-right text-[#3e2b1e] resize-none focus:ring-0 outline-none placeholder-gray-400 ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
            rows="4"
          />
        </div>

        <div 
            className="absolute bottom-[11%] left-[2%] bg-[#2e1b0e] text-[#fdfaf5] rounded-full w-20 h-20 flex items-center justify-center p-2 text-[8px] text-center shadow-lg rotate-[-5deg] font-['Patrick_Hand']"
            style={NOISE_STYLE}
        >
          I fell in love with you because you loved me when I couldn't love myself.
        </div>

        <div className="absolute bottom-[11%] left-[28%] bg-[#2e1b0e] text-[#fdfaf5] p-2 text-[9px] w-20 text-center font-['Cedarville_Cursive'] rotate-[3deg] shadow-md">
          I love you more than the miles between us. ♡
        </div>

        <div className="absolute bottom-[10%] left-[55%] text-3xl text-[#e8b4b4] opacity-80 animate-pulse">
          💖 <span className="text-xl">💕</span>
        </div>

        <div className="absolute bottom-[8%] left-[40%] bg-[#fdfaf5] px-2 border border-gray-300 text-[10px] rotate-2 font-['Patrick_Hand'] shadow-sm">
          "No storm can last forever."
        </div>

        <div 
            className="absolute bottom-[3%] left-[2%] bg-[#d0c8b8] p-2 w-40 font-['Permanent_Marker'] text-[11px] rotate-[-2deg] border-l-4 border-[#3e2b1e] shadow-sm"
            style={NOISE_STYLE}
        >
          I got lost in him, and it was exactly like being found.
        </div>

        <div 
            className={`absolute bottom-[4%] right-[2%] bg-[#e8eabb] px-2 py-1 text-[9px] font-bold rotate-[-1deg] w-36 text-center font-['Patrick_Hand'] opacity-90 ${STICKER_SHADOW}`}
            style={NOISE_STYLE}
        >
          You were all I could think about today.
        </div>
      </div>

      {!isLocked && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-['Patrick_Hand'] animate-fadeIn">
          <button
            onClick={handleUpload}
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