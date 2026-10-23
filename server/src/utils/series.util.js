// Which franchise an item belongs to, from its variant / product name. Powers
// the series collection pages (/category/demon-slayer, /category/one-piece,
// /category/video-game-swords …), built next to the productCategory pages in
// category.util.js.
//
// Shoppers search three ways: by series ("demon slayer katana"), by character
// ("zenitsu sword") and by sword name ("enma", "kusanagi"), so each series
// lists its characters AND its named swords. Anime and video games are kept
// apart (`kind`): a game sword (Vergil's Yamato) is not an anime katana.
//
// Adding a character = one keyword here; unmatched items simply stay out of
// every series page. Page copy (titles, intros) per slug lives in
// client/src/pages/shop/CategoryPage.jsx and Admin → SEO Pages.

export const SERIES = [
  {
    slug: "demon-slayer", name: "Demon Slayer", kind: "anime",
    keywords: ["demon slayer", "kimetsu", "nichirin", "tanjiro", "nezuko", "zenitsu", "inosuke", "giyu", "rengoku", "sanemi",
      "kokushibo", "yoriichi", "muichiro", "shinobu", "tengen", "mitsuri", "obanai", "gyomei", "akaza", "kanao", "genya"],
  },
  {
    slug: "one-piece", name: "One Piece", kind: "anime",
    keywords: ["one piece", "zoro", "enma", "shusui", "wado", "kitetsu", "yubashiri", "luffy", "law kikoku", "kikoku",
      "trafalgar", "sanji", "diable jambe", "shanks", "mihawk", "yoru", "roger", "ace"],
  },
  {
    slug: "naruto", name: "Naruto", kind: "anime",
    keywords: ["naruto", "sasuke", "kusanagi", "kakashi", "itachi", "minato", "kunai", "zabuza", "kubikiribocho", "asuma",
      "pain six paths", "nagato", "madara", "obito", "boruto"],
  },
  { slug: "bleach", name: "Bleach", kind: "anime", keywords: ["bleach", "ichigo", "zangetsu", "aizen", "byakuya", "kenpachi"] },
  { slug: "dragon-ball", name: "Dragon Ball", kind: "anime", keywords: ["dragon ball", "goku", "vegeta", "gohan", "frieza"] },
  { slug: "jujutsu-kaisen", name: "Jujutsu Kaisen", kind: "anime", keywords: ["jujutsu", "gojo", "sukuna", "yuji", "megumi"] },
  {
    // Games: one page for all of them — each game alone has too few items to be
    // worth its own page (see MIN_INDEXABLE_ITEMS).
    slug: "video-game-swords", name: "Video Game Swords", kind: "game",
    keywords: ["devil may cry", "vergil", "yamato", "dante", "ghost of tsushima", "jin sakai", "sakai"],
  },
];

const norm = (s) => ` ${String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/** The series an item belongs to (first match wins), or null. Whole words only. */
export const seriesOf = (...texts) => {
  const hay = norm(texts.filter(Boolean).join(" "));
  return SERIES.find((s) => s.keywords.some((k) => hay.includes(norm(k)))) || null;
};
