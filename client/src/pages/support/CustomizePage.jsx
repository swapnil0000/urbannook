import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../component/SEOHead';
import DocShell from '../../component/DocShell';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useSubmitCustomizationMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the server's multer limit

const Field = ({ id, label, required, error, hint, children }) => (
  <div className="rd-fld">
    <label htmlFor={id} className="font-mono uppercase text-muted">
      {label} {required && <span className="rd-fld-opt" aria-hidden="true">*</span>}
    </label>
    {children}
    {error ? (
      <p className="rd-fld-err" role="alert">{error}</p>
    ) : hint ? (
      <p className="rd-fld-hint font-inter text-muted">{hint}</p>
    ) : null}
  </div>
);

const inputCls = 'rd-input font-inter text-ink';

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
     first render - doing it in an effect meant a frame of empty selects and
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
    if (form.message.trim().length < 10) e.message = 'Tell us a little more - at least 10 characters.';
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
      showNotification(res?.message || 'Request sent - we will get back to you.', 'success');
      setDone(true);
    } catch (err) {
      showNotification(err?.data?.message || 'Could not send your request. Please try again.', 'error');
    }
  };

  if (done) {
    return (
      <DocShell
        eyebrow="Request received"
        title="We'll be in touch."
        sub={<>Our team reads every customization request and replies on <b className="text-ink">{form.email.trim()}</b> - usually within a working day.</>}
      >
        <SEOHead title="Customization request sent" url="/customize" noIndex />
        <div className="rd-cz-actions">
          <button type="button" onClick={() => navigate('/products')} className="rd-btn font-inter">Keep shopping</button>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setForm((f) => ({ ...f, message: '', variantName: '' }));
              setImage(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
            className="rd-cz-link font-inter text-ink"
          >
            Send another
          </button>
        </div>
      </DocShell>
    );
  }

  return (
    <DocShell
      eyebrow="Made to order · Any piece"
      title="Make it yours."
      sub="Nothing here sits in a warehouse - every piece is printed once you order it. So a different colour, a name on the side, or a livery we don't stock is a normal ask. Tell us what you have in mind and we'll come back with what's possible and what it costs."
    >
      <SEOHead
        title="Customize your piece"
        description="Every UrbanNook piece is 3D-printed to order. Tell us the colour, the name or the livery you want and we'll quote it."
        url="/customize"
      />

      <nav className="rd-crumb font-mono uppercase text-muted" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">Customize</span>
      </nav>

      <form onSubmit={onSubmit} className="rd-ct-form rd-cz-form" noValidate>
        <div className="rd-ct-row">
          <Field id="cz-name" label="Your name" required error={errors.name}>
            <input id="cz-name" className={inputCls} value={form.name} onChange={set('name')} placeholder="Your name" autoComplete="name" />
          </Field>
          <Field id="cz-mobile" label="Mobile" required error={errors.mobile}>
            <input id="cz-mobile" className={inputCls} value={form.mobile} onChange={set('mobile')} placeholder="10-digit number" inputMode="numeric" autoComplete="tel-national" />
          </Field>
        </div>

        <Field id="cz-email" label="Email" required error={errors.email} hint="We reply here.">
          <input id="cz-email" className={inputCls} value={form.email} onChange={set('email')} placeholder="you@email.com" type="email" autoComplete="email" />
        </Field>

        <div className="rd-ct-row">
          <Field id="cz-piece" label="Which piece?" hint="Leave blank if you're not sure yet.">
            <select id="cz-piece" className={`${inputCls} rd-input--select`} value={form.productId} onChange={set('productId')}>
              <option value="">Not sure / something new</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>{p.productName}</option>
              ))}
            </select>
          </Field>
          <Field id="cz-variant" label="Variant" hint={variants.length ? 'Optional.' : 'Pick a piece first.'}>
            <select id="cz-variant" className={`${inputCls} rd-input--select`} value={form.variantName} onChange={set('variantName')} disabled={!variants.length}>
              <option value="">Any / not sure</option>
              {variants.map((v) => (
                <option key={v.sku || v.variantName} value={v.variantName}>{v.variantName}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id="cz-message"
          label="What would you like changed?"
          required
          error={errors.message}
          hint="Colour, text to print on it, size, a character or livery - the more detail the faster we can quote."
        >
          <textarea
            id="cz-message"
            className={`${inputCls} rd-input--area`}
            value={form.message}
            onChange={set('message')}
            placeholder="e.g. The caliper lamp in matte black with 'ADITYA' printed on the disc."
          />
        </Field>

        <Field id="cz-image" label="Reference picture" error={errors.image} hint="Optional · JPG or PNG · up to 5MB">
          <div className="rd-cz-file">
            <input id="cz-image" ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="font-inter text-muted" />
            {image && (
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="rd-cz-link font-mono uppercase text-muted"
              >
                Remove
              </button>
            )}
          </div>
        </Field>

        <div className="rd-cz-actions">
          <button type="submit" disabled={isLoading} className="rd-btn font-inter">{isLoading ? 'Sending…' : 'Send request'}</button>
          <span className="rd-fld-hint font-inter text-muted">No payment now - we quote first.</span>
        </div>
      </form>
    </DocShell>
  );
};

export default CustomizePage;
