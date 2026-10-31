import { getSupportWhatsAppUrl, onSupportWhatsAppClick } from '../../utils/contactHelper';

/**
 * One quiet line under the buy buttons: "Questions about this product? Chat on
 * WhatsApp". Opens our support chat directly (no wa.me landing page) with the
 * product, variant and link already typed, so the team knows what is being
 * asked about. Those messages land in the admin WhatsApp inbox; replies reach
 * the shopper on WhatsApp.
 */
const ProductQuestions = ({ productName, variantName, url, className = '' }) => {
  const subject = `${productName}${variantName && variantName !== productName ? ` (${variantName})` : ''}`;
  const message = `Hi Urban Nook! I have a question about ${subject}:\n\n${url}`;
  return (
    <a
      href={getSupportWhatsAppUrl(message)}
      onClick={onSupportWhatsAppClick(message)}
      rel="noopener noreferrer"
      className={`group flex items-center justify-center gap-2 text-[13px] text-muted ${className}`}
    >
      <i className="fa-brands fa-whatsapp text-[17px] text-[#25D366]" aria-hidden="true" />
      <span>
        Questions about this product?{' '}
        <span className="font-bold text-ink underline decoration-[#25D366] decoration-2 underline-offset-4 group-hover:text-[#128C7E]">Chat on WhatsApp</span>
      </span>
      <i className="fa-solid fa-chevron-right text-[10px] text-ink/60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  );
};

export default ProductQuestions;
