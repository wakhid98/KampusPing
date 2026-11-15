// Tema yang bisa diatur pengguna. Disimpan di perangkat (localStorage) dan disinkronkan ke users/$uid/ui.
export const BG_L = {
  biru: { n: "Biru langit", ink: "#f3f7ff", surf: "#ffffff", surf2: "#eaf0ff", line: "#dbe4f5", tx: "#0f1b3d", mut: "#56648a" },
  krem: { n: "Krem hangat", ink: "#fbf7f0", surf: "#ffffff", surf2: "#f4ecdd", line: "#e7dcc9", tx: "#2a2118", mut: "#76685a" },
  mint: { n: "Mint segar", ink: "#f0faf6", surf: "#ffffff", surf2: "#e2f5ed", line: "#cfe8dd", tx: "#10261f", mut: "#546f64" },
  lavender: { n: "Lavender", ink: "#f6f3ff", surf: "#ffffff", surf2: "#ece6fb", line: "#ddd4f2", tx: "#1d1634", mut: "#675d85" },
  abu: { n: "Abu netral", ink: "#f4f5f7", surf: "#ffffff", surf2: "#eceef2", line: "#dde0e6", tx: "#17191f", mut: "#5e6472" }
};
export const BG_D = {
  midnight: { n: "Midnight", ink: "#0c1018", surf: "#151b28", surf2: "#1e2638", line: "#2b3550", tx: "#e9edf6", mut: "#9aa6c0" },
  slate: { n: "Slate", ink: "#0f1115", surf: "#181b21", surf2: "#222630", line: "#2f3440", tx: "#ecedf0", mut: "#a0a6b3" },
  amoled: { n: "AMOLED hitam", ink: "#000000", surf: "#0b0b0f", surf2: "#15151b", line: "#25252e", tx: "#f1f1f5", mut: "#9a9aa8" },
  hutan: { n: "Hutan", ink: "#0a1310", surf: "#111c18", surf2: "#192822", line: "#26382f", tx: "#e8f2ed", mut: "#93aa9f" },
  plum: { n: "Plum", ink: "#120e1b", surf: "#1b1526", surf2: "#261d36", line: "#35294b", tx: "#efeaf8", mut: "#aa9fc3" }
};
// a/b = aksen & pendamping untuk tema terang; da/db = untuk tema gelap (lebih terang agar kontras)
export const ACC = {
  biru: { n: "Biru", a: "#2563eb", b: "#0ea5e9", da: "#7c9cff", db: "#5fd0e0" },
  ungu: { n: "Ungu", a: "#7c3aed", b: "#c026d3", da: "#a78bfa", db: "#f0abfc" },
  hijau: { n: "Hijau", a: "#15803d", b: "#0d9488", da: "#4ade80", db: "#2dd4bf" },
  oranye: { n: "Oranye", a: "#c2410c", b: "#d97706", da: "#fb923c", db: "#fbbf24" },
  mawar: { n: "Mawar", a: "#be185d", b: "#e11d48", da: "#f472b6", db: "#fb7185" },
  teal: { n: "Teal", a: "#0f766e", b: "#0891b2", da: "#2dd4bf", db: "#67e8f9" }
};
export const DEF = { mode: "light", bgL: "biru", bgD: "midnight", acc: "biru", r: 18, fs: 15 };
const HEX = /^#[0-9a-fA-F]{6}$/;

export function clean(u) {
  const o = { ...DEF, ...(u || {}) };
  if (!["light", "dark", "auto"].includes(o.mode)) o.mode = DEF.mode;
  if (!BG_L[o.bgL]) o.bgL = DEF.bgL;
  if (!BG_D[o.bgD]) o.bgD = DEF.bgD;
  if (!ACC[o.acc] && !HEX.test(o.acc)) o.acc = DEF.acc;
  o.r = [8, 18, 26].includes(+o.r) ? +o.r : 18;
  o.fs = [14, 15, 17].includes(+o.fs) ? +o.fs : 15;
  return o;
}
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = h => { const [r, g, b] = rgb(h).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
function hsl(h) {
  const [r, g, b] = rgb(h), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let H = 0, S = 0; if (d) { S = d / (1 - Math.abs(2 * l - 1)); H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H = (H * 60 + 360) % 360; }
  return [H, S, l];
}
function hex([H, S, L]) {
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs((H / 60) % 2 - 1)), m = L - c / 2;
  const [r, g, b] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}
export function accent(u, dark) {
  if (ACC[u.acc]) { const p = ACC[u.acc]; return dark ? [p.da, p.db] : [p.a, p.b]; }
  const [H, S, L] = hsl(u.acc), L1 = dark ? Math.max(L, .66) : Math.min(L, .45), S1 = Math.max(S, .35);
  return [hex([H, S1, L1]), hex([(H + 28) % 360, S1, dark ? Math.max(L1, .68) : Math.min(L1 + .08, .5)])];
}
export const isDark = u => u.mode === "dark" || (u.mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);

export function apply(raw) {
  const u = clean(raw), dark = isDark(u), bg = dark ? BG_D[u.bgD] : BG_L[u.bgL], [a, b] = accent(u, dark), st = document.documentElement.style;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  for (const k of ["ink", "surf", "surf2", "line", "tx", "mut"]) st.setProperty("--" + k, bg[k]);
  st.setProperty("--acc", a); st.setProperty("--acc2", b); st.setProperty("--onacc", lum(a) > .38 ? "#0b1020" : "#ffffff");
  st.setProperty("--r", u.r + "px"); st.setProperty("--fs", u.fs + "px");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg.surf);
  return u;
}
export const load = () => { try { return clean(JSON.parse(localStorage.getItem("kp-ui") || "null")); } catch { return { ...DEF }; } };
export const save = u => { try { localStorage.setItem("kp-ui", JSON.stringify(u)); } catch { /* penyimpanan dinonaktifkan */ } };
export const preview = (p, dark) => dark ? [p.da, p.db] : [p.a, p.b];
