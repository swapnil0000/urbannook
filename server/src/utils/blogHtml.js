import sanitizeHtml from "sanitize-html";

// Blog post bodies are written in Admin → Blog (TipTap) and sanitised there on
// save (urbannook-admin/server/utils/blogHtml.js). The storefront runs the
// same rules again before serving them, so a bad row can never inject script.
// Keep the two files identical.
export const BLOG_HTML_OPTIONS = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "u", "s", "code", "pre",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  transformTags: {
    // External links open in a new tab and pass no ranking credit by default.
    a: (tagName, attribs) => {
      const href = attribs.href || "";
      const internal = /^https:\/\/(www\.)?urbannook\.in(\/|$)/i.test(href) || href.startsWith("/");
      return {
        tagName: "a",
        attribs: internal ? { href } : { href, target: "_blank", rel: "noopener nofollow" },
      };
    },
    h1: "h2", // the post title is the page's only H1
  },
};

export const cleanBlogHtml = (html = "") => sanitizeHtml(String(html), BLOG_HTML_OPTIONS);

// YouTube video id from a youtube.com/watch, youtu.be, /embed/ or /shorts/ URL
// (blog post videoUrl); null for anything else, so only YouTube is ever embedded.
export const youtubeId = (url = "") => {
  const m = String(url).trim().match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$/);
  return m ? m[1] : null;
};
