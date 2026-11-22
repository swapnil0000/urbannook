// Loaded only for an Admin preview fragment. Normal shopper PDPs do not fetch
// this module or install preview listeners.
export function attachPdpPreview({ nonce, productId, onDraft }) {
  const acceptPreview = (event) => {
    const host = (() => { try { return new URL(event.origin).hostname; } catch { return ''; } })();
    const trusted = host === 'localhost' || host === '127.0.0.1' || host === 'urbannook-store-zeta.vercel.app' || host === 'urbannook.in' || host.endsWith('.urbannook.in');
    if (!trusted || event.source !== window.parent || event.data?.type !== 'UN_PDP_PREVIEW' || event.data.nonce !== nonce || event.data.productId !== productId) return;
    if (event.data.product && typeof event.data.product === 'object' && !Array.isArray(event.data.product)) {
      onDraft(event.data.product, typeof event.data.variantName === 'string' ? event.data.variantName : '');
    }
  };
  const block = (event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const blockActivation = (event) => { if (event.key === 'Enter' || event.key === ' ') block(event); };
  window.addEventListener('message', acceptPreview);
  document.addEventListener('click', block, true);
  document.addEventListener('submit', block, true);
  document.addEventListener('keydown', blockActivation, true);
  window.parent.postMessage({ type: 'UN_PDP_PREVIEW_READY', nonce, productId }, '*');
  return () => {
    window.removeEventListener('message', acceptPreview);
    document.removeEventListener('click', block, true);
    document.removeEventListener('submit', block, true);
    document.removeEventListener('keydown', blockActivation, true);
  };
}
