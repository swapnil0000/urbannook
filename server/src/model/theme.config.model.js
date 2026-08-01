import mongoose from "mongoose";

// Mirrored 1:1 from the admin repo's model (server/models/theme.config.model.js)
// so both apps read/write the same `themeconfigs` collection — this repo
// only ever reads, admin owns writes.
const colorTokensSchema = new mongoose.Schema(
  {
    colorPrimary: { type: String, required: true },
    colorSecondary: { type: String, required: true },
    colorAccent: { type: String, required: true },
    bgPrimary: { type: String, required: true },
    bgSecondary: { type: String, required: true },
    bgTertiary: { type: String, required: true },
    textPrimary: { type: String, required: true },
    textSecondary: { type: String, required: true },
    textMuted: { type: String, required: true },
    borderPrimary: { type: String, required: true },
    borderSecondary: { type: String, required: true },
    success: { type: String, required: true },
    warning: { type: String, required: true },
    error: { type: String, required: true },
    info: { type: String, required: true },
    headerBg: { type: String, required: true },
    headerText: { type: String, required: true },
    footerBg: { type: String, required: true },
    footerText: { type: String, required: true },
  },
  { _id: false },
);

const themeConfigSchema = new mongoose.Schema(
  {
    light: { type: colorTokensSchema, required: true },
    dark: { type: colorTokensSchema, required: true },
    defaultLight: { type: colorTokensSchema, required: true },
    defaultDark: { type: colorTokensSchema, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("ThemeConfig", themeConfigSchema);
