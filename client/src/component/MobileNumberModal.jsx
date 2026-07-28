import { useState, useEffect } from "react";

const MobileNumberModal = ({
  showMobileModal,
  setShowMobileModal,
  userProfile,
  onSaveMobileNumber,
  showNotification,
  isSaving = false,
}) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [errors, setErrors] = useState("");

  useEffect(() => {
    if (showMobileModal) {
      setMobileNumber("");
      setErrors("");
    }
  }, [showMobileModal]);

  const validateMobileNumber = (mobile) => {
    const mobileRegex = /^[6-9][0-9]{9}$/;
    return mobileRegex.test(mobile.trim());
  };

  const stripCountryCode = (mobile) => {
    const trimmed = mobile?.trim();
    if (trimmed.startsWith("+91")) {
      return trimmed.substring(3);
    } else if (trimmed.startsWith("91") && trimmed.length === 12) {
      return trimmed.substring(2);
    }
    return trimmed;
  };

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(value);
    if (errors) setErrors("");
  };

  const handleSave = async () => {
    const strippedValue = stripCountryCode(mobileNumber);

    if (!strippedValue.trim()) {
      setErrors("Please enter a mobile number");
      return;
    }

    if (!validateMobileNumber(strippedValue)) {
      setErrors("Please enter a valid Indian mobile number (starts with 6-9)");
      return;
    }

    try {
      await onSaveMobileNumber(strippedValue);
      setShowMobileModal(false);
    } catch (error) {
      setErrors(error || "Failed to save mobile number");
    }
  };

  const handleClose = () => {
    setShowMobileModal(false);
    setMobileNumber("");
    setErrors("");
  };

  if (!showMobileModal) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 pb-20 sm:pb-0"
      onClick={handleClose}
    >
      {/* Modal Wrapper - Positioned above sticky footer on mobile */}
      <div 
        className="bg-white w-full max-w-md rounded-t-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col transform transition-all duration-300 translate-y-0 scale-100 max-h-[90vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="font-serif text-ink text-lg sm:text-xl">
              Add Mobile Number
            </h3>
            <p className="text-[10px] text-brand uppercase tracking-widest mt-0.5 font-bold">
              Required for delivery coordination
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Name Display */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-brand font-bold">
              Full Name
            </label>
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-ink text-sm font-medium">
              {userProfile?.userName || userProfile?.name || "N/A"}
            </div>
          </div>

          {/* Email Display */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-brand font-bold">
              Email Address
            </label>
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-ink text-sm font-medium">
              {userProfile?.userEmail || userProfile?.email || "N/A"}
            </div>
          </div>

          {/* Mobile Number Input */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-brand font-bold">
              Mobile Number *
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={handleMobileChange}
              placeholder="Enter 10-digit mobile number"
              maxLength="10"
              className={`w-full bg-white border rounded-xl p-4 text-sm text-ink
                focus:outline-none transition-all placeholder:text-gray-400
                ${errors ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-brand"}`}
              disabled={isSaving}
            />
            {errors && (
              <p className="text-[10px] text-red-500 ml-1 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation text-[8px]"></i>
                {errors}
              </p>
            )}
            <p className="text-[10px] text-gray-500 ml-1">
              <i className="fa-solid fa-info-circle text-[8px] mr-1"></i>
              This will be saved to your profile
            </p>
          </div>

          {/* Save Button - Only button in modal */}
          <button
            onClick={handleSave}
            disabled={isSaving || !mobileNumber}
            className="w-full py-3 px-4 bg-brand text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brandHi transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileNumberModal;
