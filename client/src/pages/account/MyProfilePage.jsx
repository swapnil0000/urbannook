import { useEffect, useState, useCallback, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useUI } from '../../hooks/useRedux';
import { ACCOUNT_PROFILE as C } from '../../content/homeRedesign';
import { useGetUserProfileQuery, useUpdateUserProfileMutation } from '../../store/api/userApi';
import PasskeyEnroll from '../../component/layout/auth/PasskeyEnroll';

const MyProfilePage = () => {
  const { user } = useAuth();
  const { showNotification } = useUI();
  const [isEditing, setIsEditing] = useState(false);

  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } = useGetUserProfileQuery();
  const [updateUserProfile, { isLoading: updating }] = useUpdateUserProfileMutation();

  const [formData, setFormData] = useState(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      userName: localUser.name || localUser.userName || '',
      userEmail: localUser.email || localUser.userEmail || '',
      userMobileNumber: localUser.mobile ? String(localUser.mobile) : (localUser.userMobileNumber ? String(localUser.userMobileNumber) : ''),
      userAddress: localUser.address || localUser.userAddress || '',
      userPinCode: localUser.pincode || localUser.userPinCode || ''
    };
  });

  // Store original data to compare changes
  const [originalData, setOriginalData] = useState(formData);

  // Load Profile Logic (Kept Original)
  const loadProfile = useCallback(async () => {
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user?.email || localUser?.email;
      if (!userEmail) return;

      const result = await refetchProfile();
      const profileData = result.data?.data || result.data;

      setFormData(prev => ({
        userName: profileData?.name || profileData?.userName || prev.userName,
        userEmail: profileData?.email || profileData?.userEmail || prev.userEmail,
        userMobileNumber: profileData?.mobileNumber ? String(profileData.mobileNumber) : (profileData?.userMobileNumber ? String(profileData.userMobileNumber) : prev.userMobileNumber),
        userPinCode: profileData?.pinCode || profileData?.userPinCode || prev.userPinCode
      }));
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, [refetchProfile, user]);

  useEffect(() => {
    if (userProfileData?.data) {
      const profileData = userProfileData.data;
      const newFormData = {
        userName: profileData?.data?.name || "",
        userEmail: profileData?.data?.email || "",
        userMobileNumber: profileData?.data?.mobileNumber ? String(profileData.data.mobileNumber) : "",
        userPinCode: profileData?.data?.pinCode || profileData?.userPinCode || ""
      };
      setFormData(newFormData);
      setOriginalData(newFormData); // Store original data for comparison
    } else if (!profileLoading && (user?.email || JSON.parse(localStorage.getItem('user') || '{}')?.email)) {
      loadProfile();
    }
  }, [user, loadProfile, userProfileData, profileLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validation for pin code - only allow 6 digits
    if (name === 'userPinCode') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 6) {
        setFormData({ ...formData, [name]: numericValue });
      }
      return;
    }
    
    // Validation for mobile number - only allow 10 digits
    if (name === 'userMobileNumber') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setFormData({ ...formData, [name]: numericValue });
      }
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      // Pin code, when given, is exactly 6 digits
      if (formData.userPinCode && !/^\d{6}$/.test(String(formData.userPinCode).trim())) {
        showNotification('Pin code must be exactly 6 digits', 'error');
        return;
      }

      // Validate mobile number if provided
      if (formData.userMobileNumber) {
        const mobileStr = String(formData.userMobileNumber).trim();
        if (mobileStr.length !== 10 || !/^\d{10}$/.test(mobileStr)) {
          showNotification('Mobile number must be exactly 10 digits', 'error');
          return;
        }
      }

      // Map frontend field names to backend field names
      const fieldMapping = {
        userName: 'name',
        userEmail: 'email',
        userMobileNumber: 'mobileNumber',
        userPinCode: 'pinCode'
      };

      // Check if any data has actually changed
      const hasChanges = Object.keys(formData).some(key => {
        const currentValue = String(formData[key] || '').trim();
        const originalValue = String(originalData[key] || '').trim();
        return currentValue !== originalValue;
      });

      if (!hasChanges) {
        showNotification('No changes detected', 'info');
        setIsEditing(false);
        return;
      }

      // Filter out empty values and map to backend field names
      const updateData = Object.entries(formData).reduce((acc, [key, value]) => {
        // Only process fields that have a mapping (backend supports)
        if (fieldMapping[key]) {
          const backendKey = fieldMapping[key];
          const stringValue = String(value || '').trim();
          const originalValue = String(originalData[key] || '').trim();
          
          // Only include fields that have changed
          if (stringValue !== originalValue) {
            // For name and email, only send if not empty
            if (backendKey === 'name' || backendKey === 'email') {
              if (stringValue !== '') {
                acc[backendKey] = value;
              }
            } 
            // For mobileNumber and pinCode, always send (allows clearing)
            else if (backendKey === 'mobileNumber' || backendKey === 'pinCode') {
              // Send empty string for cleared fields, or the actual value
              acc[backendKey] = stringValue === '' ? null : (backendKey === 'mobileNumber' ? String(value) : value);
            }
          }
        }
        return acc;
      }, {});

      // Ensure at least one field is being updated
      if (Object.keys(updateData).length === 0) {
        showNotification('No changes to save', 'info');
        setIsEditing(false);
        return;
      }

      await updateUserProfile(updateData).unwrap();
      showNotification('Profile updated successfully', 'success');
      setIsEditing(false);
      
      // Update original data with new values
      setOriginalData(formData);
      refetchProfile();
    } catch (error) {
      showNotification(error?.data?.message || 'Failed to update profile', 'error');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const profileFields = [
    { label: C.fields.name, name: 'userName', value: formData.userName, type: 'text', autoComplete: 'name' },
    { label: C.fields.email, name: 'userEmail', value: formData.userEmail, type: 'email', disabled: true },
    // Mobile is editable for everyone (Google sign-ins need to add it, others can change it)
    { label: C.fields.mobile, name: 'userMobileNumber', value: formData.userMobileNumber, type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national', placeholder: C.mobileHint },
    { label: C.fields.pincode, name: 'userPinCode', value: formData.userPinCode, type: 'text', inputMode: 'numeric', autoComplete: 'postal-code', placeholder: C.pincodeHint },
  ];
  const shownName = formData.userName || user?.name || '';
  const initial = (shownName || formData.userEmail || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="bg-paper text-ink font-inter selection:bg-brand selection:text-white">
    <div className="rd-acct">
      <Suspense fallback={<div className="grid place-items-center py-24"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
        <header className="rd-acct-head">
          <p className="rd-eyebrow font-mono uppercase text-muted">{C.eyebrow}</p>
          <h1 className="rd-h2 font-archivo text-ink">{C.heading}</h1>
          <p className="rd-sub font-inter text-muted">{C.sub}</p>
        </header>

        <div className="rd-acct-grid">
          {/* identity + shortcuts */}
          <aside className="rd-acct-side bg-ink text-paper">
            <span className="rd-acct-avatar font-archivo" aria-hidden="true">{initial}</span>
            <p className="rd-acct-name font-archivo text-paper">{shownName || C.noName}</p>
            {formData.userEmail && <p className="rd-acct-mail font-inter text-paper/60">{formData.userEmail}</p>}
            <nav className="rd-acct-links" aria-label={C.linksLabel}>
              {C.links.map((l) => (
                <Link key={l.to} to={l.to} className="font-mono uppercase text-paper">{l.label} <span aria-hidden="true">→</span></Link>
              ))}
            </nav>
          </aside>

          <div className="rd-acct-main">
            {/* details */}
            <section className="rd-acct-card" aria-label={C.cardTitle}>
              <div className="rd-acct-card-head">
                <h2 className="font-mono uppercase text-ink">{C.cardTitle}</h2>
                {!isEditing && (
                  <button type="button" onClick={() => setIsEditing(true)} className="rd-acct-btn rd-acct-btn--ghost font-inter">{C.edit}</button>
                )}
              </div>
              <div className="rd-acct-fields">
                {profileFields.map((f) => {
                  const editable = isEditing && !f.disabled;
                  const id = `acct-${f.name}`;
                  return (
                    <div key={f.name} className="rd-acct-field">
                      <label htmlFor={editable ? id : undefined} className="rd-acct-label font-mono uppercase text-muted">
                        {f.label}{f.disabled && <span className="rd-acct-lock"> · {C.locked}</span>}
                      </label>
                      {editable ? (
                        <input
                          id={id}
                          type={f.type}
                          name={f.name}
                          value={f.value}
                          onChange={handleInputChange}
                          placeholder={f.placeholder}
                          inputMode={f.inputMode}
                          autoComplete={f.autoComplete}
                          className="rd-acct-input font-inter text-ink"
                        />
                      ) : (
                        <p className={`rd-acct-value font-archivo ${f.name === 'userEmail' ? 'truncate' : ''}`}>
                          {f.value || <span className="rd-acct-empty font-inter text-muted">{C.notSet}</span>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {isEditing && (
                <div className="rd-acct-actions">
                  <button type="button" onClick={handleSave} disabled={updating} className="rd-acct-btn rd-acct-btn--solid font-inter">
                    {updating ? C.saving : C.save}
                  </button>
                  <button type="button" onClick={handleCancel} disabled={updating} className="rd-acct-btn rd-acct-btn--ghost font-inter">{C.cancel}</button>
                </div>
              )}
            </section>

            {/* Passkey enrollment - enable Face ID / fingerprint sign-in */}
            <PasskeyEnroll />
          </div>
        </div>
      </Suspense>
    </div>
    </div>
  );
};

export default MyProfilePage;
