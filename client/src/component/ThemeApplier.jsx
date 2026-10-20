import { useEffect } from "react";
import { useGetThemeConfigQuery } from "../store/api/themeApi";

// Maps theme.config token keys (as stored/edited in the admin panel) to the
// CSS custom property names already defined in client/src/index.css.
const TOKEN_TO_CSS_VAR = {
  colorPrimary: "--color-primary",
  colorSecondary: "--color-secondary",
  colorAccent: "--color-accent",
  bgPrimary: "--color-bg-primary",
  bgSecondary: "--color-bg-secondary",
  bgTertiary: "--color-bg-tertiary",
  textPrimary: "--color-text-primary",
  textSecondary: "--color-text-secondary",
  textMuted: "--color-text-muted",
  borderPrimary: "--color-border-primary",
  borderSecondary: "--color-border-secondary",
  success: "--color-success",
  warning: "--color-warning",
  error: "--color-error",
  info: "--color-info",
  headerBg: "--color-header-bg",
  headerText: "--color-header-text",
  footerBg: "--color-footer-bg",
  footerText: "--color-footer-text",
};

const STORAGE_KEY = "un_theme_config";
const DARK_STYLE_TAG_ID = "admin-theme-dark-vars";

function applyLight(tokens) {
  if (!tokens) return;
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(TOKEN_TO_CSS_VAR)) {
    if (tokens[key]) root.style.setProperty(cssVar, tokens[key]);
  }
}

function applyDark(tokens) {
  if (!tokens) return;
  // Dark tokens live under a [data-theme="dark"] selector in index.css, not
  // on :root, so they can't be set via documentElement.style.setProperty
  // (that only ever affects :root/inline styles). Inject/update a small
  // stylesheet instead.
  const decls = Object.entries(TOKEN_TO_CSS_VAR)
    .filter(([key]) => tokens[key])
    .map(([key, cssVar]) => `${cssVar}: ${tokens[key]};`)
    .join(" ");

  let styleTag = document.getElementById(DARK_STYLE_TAG_ID);
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = DARK_STYLE_TAG_ID;
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `[data-theme="dark"] { ${decls} }`;
}

function applyTheme(theme) {
  if (!theme) return;
  applyLight(theme.light);
  applyDark(theme.dark);
}

// Applies admin-controlled theme colors on top of the storefront's hardcoded
// CSS defaults. Not lazy-loaded (unlike most global components in App.jsx)
// since it should run as early as possible to avoid a flash of the default
// theme on repeat visits.
export default function ThemeApplier() {
  // Synchronously apply any previously-cached theme on first render, before
  // the network request below resolves.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) applyTheme(JSON.parse(cached));
    } catch {
      // Corrupt cache — ignore, defaults from index.css still apply.
    }
  }, []);

  const { data: themeRes } = useGetThemeConfigQuery();
  const theme = themeRes?.data;

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // Storage full/unavailable — theme still applied for this session.
    }
  }, [theme]);

  return null;
}
