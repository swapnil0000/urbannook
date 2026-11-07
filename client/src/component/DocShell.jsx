/** Shared shell for the text pages (FAQs, shipping & exchange, cancellation, privacy, terms): paper page, mono eyebrow,
 *  Archivo heading, an optional one-line sub / "last updated" line, then the page's own content in a calm reading column.
 *  The pages keep their exact wording; only the frame and the type scale come from here (see `.rd-doc*` in index.css). */
const DocShell = ({ eyebrow, title, sub, meta, wide = false, children }) => (
  <div className="rd-doc bg-paper text-ink font-inter selection:bg-brand selection:text-white">
    <div className={`rd-doc-wrap${wide ? ' rd-doc-wrap--wide' : ''}`}>
      <header className="rd-doc-head">
        <p className="rd-eyebrow font-mono uppercase text-muted">{eyebrow}</p>
        <h1 className="rd-h2 font-archivo text-ink">{title}</h1>
        {sub && <p className="rd-sub font-inter text-muted">{sub}</p>}
        {meta && <p className="rd-doc-meta font-mono uppercase text-muted">{meta}</p>}
      </header>
      <div className="rd-doc-body">{children}</div>
    </div>
  </div>
);

export default DocShell;
