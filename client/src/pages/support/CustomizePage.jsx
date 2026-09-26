import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../component/SEOHead';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useSubmitCustomizationMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the server's multer limit

const Field = ({ label, required, error, hint, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1 gl-lbl text-[10px] text-muted">
      {label} {required && <span className="text-brand normal-case">*</span>}
    </label>
    {children}
    {error ? (
      <p className="text-sale text-xs">{error}</p>
    ) : hint ? (
      <p className="text-faint text-xs">{hint}</p>
    ) : null}
  </div>
);

const inputCls =
  'w-full p-3.5 bg-white border border-hair rounded-xl text-sm text-ink outline-none transition-colors focus:border-ink';

/**
 * Customization request page.
 *
 * Every piece here is 3D-printed to order, so a custom colour, a name on the
 * side or an entirely different livery is a normal ask rather than an
 * exception — this is where that ask gets captured. It is deliberately a
 * page, not a modal: people arrive from the home page, from a product, and
 * from a shared link, and a request with a picture attached is not something
 * to write in a popup.
 *
 * Submissions are stored as Contact entries with the subject "Customization",
 * so they land in the same admin inbox as every other message.
 */
const CustomizePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useUI();
  const [submitCustomization, { isLoading }] = useSubmitCustomizationMutation();

  const { data: prodRes } = useGetProductsQuery({ page: 1, limit: 24 });
  // Only products an admin has flagged isCustomizable=true belong in this
  // form — the rest have no customization workflow behind them to fulfil a
  // request against.
  const products = useMemo(
    () => (prodRes?.data?.products || prodRes?.data?.listofPublishedProducts || []).filter((p) => p.isCustomizable),
    [prodRes],
  );

  /* Arriving from a product page preselects it, straight out of the URL at
     first render — doing it in an effect meant a frame of empty selects and
     an extra render for nothing. */
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    mobile: '',
    productId: params.get('product') || '',
    variantName: params.get('variant') || '',
    message: '',
  }));
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selected = products.find((p) => p.productId === form.productId);
  const variants = selected?.variantDetails || [];

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return setImage(null);
    if (!file.type.startsWith('image/')) {
      setErrors((x) => ({ ...x, image: 'That file is not an image.' }));
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((x) => ({ ...x, image: 'Please keep the picture under 5MB.' }));
      e.target.value = '';
      return;
    }
    setErrors((x) => ({ ...x, image: undefined }));
    setImage(file);
  };

  /* Mirrors the server's Joi schema, so a request is never sent only to bounce. */
  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) e.mobile = 'Please enter a valid 10-digit mobile number.';
    if (form.message.trim().length < 10) e.message = 'Tell us a little more — at least 10 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('email', form.email.trim());
    fd.append('mobile', form.mobile.trim());
    fd.append('message', form.message.trim());
    if (form.productId) {
      fd.append('productId', form.productId);
      fd.append('productName', selected?.productName || '');
    }
    if (form.variantName) fd.append('variantName', form.variantName);
    if (image) fd.append('image', image);

    try {
      const res = await submitCustomization(fd).unwrap();
      showNotification(res?.message || 'Request sent — we will get back to you.', 'success');
      setDone(true);
    } catch (err) {
      showNotification(err?.data?.message || 'Could not send your request. Please try again.', 'error');
    }
  };

  if (done) {
    return (
      <div className="bg-paper min-h-screen font-inter text-ink">
        <SEOHead title="Customization request sent — UrbanNook" url="/customize" />
        <section className="max-w-xl mx-auto px-5 py-24 md:py-32 text-center">
          <p className="gl-lbl text-brand mb-3">Request received</p>
          <h1 className="font-archivo text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            We&apos;ll be in touch.
          </h1>
          <p className="text-muted mt-5">
            Our team reads every customization request and replies on
            {' '}<b className="text-ink">{form.email.trim()}</b> — usually within a working day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/products')}
              className="gl-press bg-brand text-white font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-brandHi transition-colors"
            >
              Keep shopping
            </button>
            <button
              onClick={() => {
                setDone(false);
                setForm((f) => ({ ...f, message: '', variantName: '' }));
                setImage(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="gl-press border border-hair font-bold text-sm px-7 py-3.5 rounded-xl hover:border-ink transition-colors"
            >
              Send another
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-paper min-h-screen font-inter text-ink">
      <SEOHead
        title="Customize your piece — UrbanNook"
        description="Every UrbanNook piece is 3D-printed to order. Tell us the colour, the name or the livery you want and we'll quote it."
        url="/customize"
      />

      <section className="max-w-3xl mx-auto px-5 pt-24 md:pt-28 pb-6">
        <nav className="text-sm text-muted mb-6">
          <Link to="/" className="hover:text-ink">Home</Link> <span className="text-faint">/</span> Customize
        </nav>
        <p className="gl-lbl text-brand mb-3">Made to order · Any piece</p>
        <h1 className="font-archivo text-4xl md:text-6xl font-extrabold tracking-tight leading-[0.95]">
          Make it yours.
        </h1>
        <p className="text-muted mt-5 max-w-xl">
          Nothing here sits in a warehouse — every piece is printed once you order it. So a
          different colour, a name on the side, or a livery we don&apos;t stock is a normal
          ask. Tell us what you have in mind and we&apos;ll come back with what&apos;s
          possible and what it costs.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-5 pb-24">
        <form onSubmit={onSubmit} className="bg-white border border-hair p-6 md:p-9 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Your name" required error={errors.name}>
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Your name" />
            </Field>
            <Field label="Mobile" required error={errors.mobile}>
              <input className={inputCls} value={form.mobile} onChange={set('mobile')} placeholder="10-digit number" inputMode="numeric" />
            </Field>
          </div>

          <Field label="Email" required error={errors.email} hint="We reply here.">
            <input className={inputCls} value={form.email} onChange={set('email')} placeholder="you@email.com" type="email" />
          </Field>

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Which piece?" hint="Leave blank if you're not sure yet.">
              <select className={inputCls} value={form.productId} onChange={set('productId')}>
                <option value="">Not sure / something new</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>{p.productName}</option>
                ))}
              </select>
            </Field>
            <Field label="Variant" hint={variants.length ? 'Optional.' : 'Pick a piece first.'}>
              <select
                className={`${inputCls} disabled:opacity-50`}
                value={form.variantName}
                onChange={set('variantName')}
                disabled={!variants.length}
              >
                <option value="">Any / not sure</option>
                {variants.map((v) => (
                  <option key={v.sku || v.variantName} value={v.variantName}>{v.variantName}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="What would you like changed?"
            required
            error={errors.message}
            hint="Colour, text to print on it, size, a character or livery — the more detail the faster we can quote."
          >
            <textarea
              className={`${inputCls} min-h-[140px] resize-y`}
              value={form.message}
              onChange={set('message')}
              placeholder="e.g. The caliper lamp in matte black with 'ADITYA' printed on the disc."
            />
          </Field>

          <Field label="Reference picture" error={errors.image} hint="Optional · JPG or PNG · up to 5MB">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickImage}
                className="block text-sm text-muted file:mr-3 file:py-2.5 file:px-4 file:border file:border-hair file:bg-surface file:text-ink file:text-xs file:font-bold file:rounded-xl hover:file:border-ink file:cursor-pointer"
              />
              {image && (
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="gl-lbl text-[10px] text-faint hover:text-ink transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </Field>

          <div className="pt-1 flex items-center gap-4 flex-wrap">
            <button
              type="submit"
              disabled={isLoading}
              className="gl-press bg-brand text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-brandHi transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Sending…' : 'Send request'}
            </button>
            <span className="text-xs text-faint">No payment now — we quote first.</span>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CustomizePage;
