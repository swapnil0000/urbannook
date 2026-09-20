import { useState } from 'react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { usePasskeyRegisterOptionsMutation, usePasskeyRegisterVerifyMutation } from '../../../store/api/passkeyApi';
import { useUI } from '../../../hooks/useRedux';
import { isInAppBrowser } from '../../../utils/browserEnv';

/**
 * "Enable a passkey" card — drop into a logged-in surface (profile / settings).
 * Registers the current device's authenticator (Face ID / fingerprint / PIN) so
 * the user can sign in with one tap next time. Hidden on devices/browsers that
 * don't support WebAuthn (and inside in-app browsers, where it won't work).
 */
const PasskeyEnroll = () => {
  const { showNotification } = useUI();
  const [regOptions] = usePasskeyRegisterOptionsMutation();
  const [regVerify] = usePasskeyRegisterVerifyMutation();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const supported = typeof window !== 'undefined' && browserSupportsWebAuthn() && !isInAppBrowser();
  if (!supported) return null;

  const enroll = async () => {
    setBusy(true);
    try {
      const optsRes = await regOptions().unwrap();
      const attestation = await startRegistration({ optionsJSON: optsRes.data });
      await regVerify(attestation).unwrap();
      setDone(true);
      showNotification('Passkey enabled! Next time, sign in with Face ID / fingerprint.', 'success');
    } catch (err) {
      // User dismissed the OS prompt — stay silent
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return;
      showNotification(err?.data?.message || err?.message || 'Could not enable passkey', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-hair p-5 md:p-6 font-inter text-ink flex items-center gap-4">
      <div className="shrink-0 w-12 h-12 rounded-full bg-brand/10 grid place-items-center">
        <i className="fa-solid fa-fingerprint text-brand text-xl"></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="gl-lbl text-[10px] text-brand mb-1">Faster sign-in</p>
        <h3 className="font-archivo font-bold text-ink text-base leading-tight">Enable a passkey</h3>
        <p className="text-muted text-xs mt-0.5">Sign in with Face ID, fingerprint or your device PIN — no password.</p>
      </div>
      {done ? (
        <span className="shrink-0 gl-lbl text-[10px] text-save flex items-center gap-1.5">
          <i className="fa-solid fa-circle-check"></i> Enabled
        </span>
      ) : (
        <button
          onClick={enroll}
          disabled={busy}
          className="shrink-0 gl-press bg-brand text-white gl-lbl text-[10px] px-4 py-2.5 hover:bg-brandHi transition-colors disabled:opacity-50"
        >
          {busy ? 'Waiting...' : 'Enable'}
        </button>
      )}
    </div>
  );
};

export default PasskeyEnroll;
