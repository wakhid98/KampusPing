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
export const DEF = { mode: "light", bgL: "biru", bgD: "midnight", acc: "biru", r: 18, fs: 15, bg: "", bgDim: 25, bgBlur: 0, cardOp: 82, mas: "", masPos: "r", masSize: 140, masOp: 100 };
const HEX = /^#[0-9a-fA-F]{6}$/;

export function clean(u) {
  const o = { ...DEF, ...(u || {}) };
  if (!["light", "dark", "auto"].includes(o.mode)) o.mode = DEF.mode;
  if (!BG_L[o.bgL]) o.bgL = DEF.bgL;
  if (!BG_D[o.bgD]) o.bgD = DEF.bgD;
  if (!ACC[o.acc] && !HEX.test(o.acc)) o.acc = DEF.acc;
  o.r = [8, 18, 26].includes(+o.r) ? +o.r : 18;
  o.fs = [14, 15, 17].includes(+o.fs) ? +o.fs : 15;
  o.bg = o.bg === "u" || /^p:[a-z]{2,12}$/.test(o.bg) && BGP[o.bg.slice(2)] ? o.bg : "";
  o.mas = o.mas === "u" || /^p:[a-z]{2,12}$/.test(o.mas) && MASP[o.mas.slice(2)] ? o.mas : "";
  const n = (v, a, b, d) => Number.isFinite(+v) ? Math.min(b, Math.max(a, Math.round(+v))) : d;
  o.bgDim = n(o.bgDim, 0, 80, 25); o.bgBlur = n(o.bgBlur, 0, 16, 0); o.cardOp = n(o.cardOp, 40, 100, 82);
  o.masPos = o.masPos === "l" ? "l" : "r"; o.masSize = n(o.masSize, 60, 320, 140); o.masOp = n(o.masOp, 20, 100, 100);
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
  layers(u, dark, bg);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg.surf);
  return u;
}
export const load = () => { try { return clean(JSON.parse(localStorage.getItem("kp-ui") || "null")); } catch { return { ...DEF }; } };
export const save = u => { try { localStorage.setItem("kp-ui", JSON.stringify(u)); } catch { /* penyimpanan dinonaktifkan */ } };
export const preview = (p, dark) => dark ? [p.da, p.db] : [p.a, p.b];

/* ---------- Gambar latar & maskot ---------- */
const svg = (w, h, body) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${body}</svg>`);
const stars = (n, seed, w, h) => { let a = seed, o = ""; const r = () => (a = (a * 16807) % 2147483647) / 2147483647; for (let i = 0; i < n; i++) o += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h * .8).toFixed(0)}" r="${(r() * 2 + .6).toFixed(1)}" fill="#fff" opacity="${(r() * .6 + .4).toFixed(2)}"/>`; return o; };
const tree = (x, y, s, c) => `<path d="M${x} ${y - 90 * s} l${30 * s} ${60 * s} h${-18 * s} l${24 * s} ${50 * s} h${-72 * s} l${24 * s} ${-50 * s} h${-18 * s}z" fill="${c}"/>`;
export const BGP = {
  alam: { n: "Alam", u: () => svg(1600, 900, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ecbff"/><stop offset="1" stop-color="#e8f6ff"/></linearGradient></defs><rect width="1600" height="900" fill="url(#s)"/><circle cx="1280" cy="170" r="70" fill="#fff6c9"/><circle cx="1280" cy="170" r="110" fill="#fff6c9" opacity=".35"/><path d="M0 560 L260 280 L420 430 L620 220 L880 520 L1010 400 L1250 560 L1600 330 V900 H0z" fill="#9fb7d6"/><path d="M620 220 L560 290 L610 275 L650 310 L690 270 L720 285z" fill="#fff" opacity=".9"/><path d="M0 650 Q300 520 620 650 T1250 640 T1600 600 V900 H0z" fill="#6fbf73"/><path d="M0 760 Q400 650 800 760 T1600 730 V900 H0z" fill="#4da35a"/>${tree(180, 740, 1.1, "#2f7d3c")}${tree(300, 770, .8, "#2f7d3c")}${tree(1320, 760, 1.2, "#2f7d3c")}${tree(1450, 790, .9, "#2f7d3c")}<ellipse cx="380" cy="140" rx="90" ry="26" fill="#fff" opacity=".85"/><ellipse cx="450" cy="120" rx="60" ry="24" fill="#fff" opacity=".85"/><ellipse cx="900" cy="90" rx="100" ry="26" fill="#fff" opacity=".8"/>`) },
  hutan: { n: "Hutan", u: () => svg(1600, 900, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9f2c9"/><stop offset="1" stop-color="#7fc08a"/></linearGradient></defs><rect width="1600" height="900" fill="url(#s)"/><circle cx="260" cy="150" r="60" fill="#fffbe0" opacity=".9"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => tree(80 + i * 190, 600, 1.9, "#4f9a5c")).join("")}${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => tree(i * 180 + 20, 760, 2.4, "#2f7d45")).join("")}<rect y="780" width="1600" height="120" fill="#1f5f33"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => tree(i * 230 + 100, 900, 2.8, "#154a27")).join("")}`) },
  senja: { n: "Senja", u: () => svg(1600, 900, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a6b"/><stop offset=".45" stop-color="#d9648a"/><stop offset=".75" stop-color="#ffb36b"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient></defs><rect width="1600" height="900" fill="url(#s)"/><circle cx="800" cy="560" r="150" fill="#fff0c4"/><rect y="560" width="1600" height="340" fill="#2b3a67"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${700 - i * 20}" y="${580 + i * 40}" width="${200 + i * 40}" height="8" rx="4" fill="#ffe3a8" opacity="${.8 - i * .1}"/>`).join("")}<path d="M0 560 L180 470 L330 540 L520 450 L700 560z M1000 560 L1200 440 L1400 540 L1600 470 V560z" fill="#1c1f45"/>${stars(60, 7, 1600, 300)}`) },
  angkasa: { n: "Angkasa", u: () => svg(1600, 900, `<defs><radialGradient id="s" cx=".7" cy=".3" r="1"><stop offset="0" stop-color="#3b2a8a"/><stop offset="1" stop-color="#070b24"/></radialGradient><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9b6b"/><stop offset="1" stop-color="#b13b7e"/></linearGradient></defs><rect width="1600" height="900" fill="url(#s)"/>${stars(160, 11, 1600, 900)}<circle cx="1180" cy="300" r="120" fill="url(#p)"/><ellipse cx="1180" cy="300" rx="210" ry="40" fill="none" stroke="#ffd6a8" stroke-width="10" opacity=".8" transform="rotate(-18 1180 300)"/><circle cx="300" cy="640" r="60" fill="#e8ecff"/><circle cx="280" cy="620" r="12" fill="#c9cff0"/><circle cx="325" cy="660" r="16" fill="#c9cff0"/>`) },
  imut: { n: "Imut (kartun)", u: () => svg(1600, 900, `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6ea"/><stop offset="1" stop-color="#d9d4ff"/></linearGradient><pattern id="p" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M50 70c-18-24 14-40 22-16 8-24 40-8 22 16l-22 24z" fill="#ff8fb8" opacity=".75"/><path d="M150 40l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#ffe27a" opacity=".9"/><g fill="#fff" opacity=".9"><circle cx="130" cy="150" r="16"/><circle cx="152" cy="144" r="20"/><circle cx="176" cy="152" r="14"/><rect x="118" y="150" width="70" height="16" rx="8"/></g><circle cx="40" cy="160" r="6" fill="#8fd3ff"/><circle cx="90" cy="120" r="4" fill="#b9a2ff"/></pattern></defs><rect width="1600" height="900" fill="url(#s)"/><rect width="1600" height="900" fill="url(#p)"/>`) }
};
const face = `<circle cx="78" cy="108" r="7" fill="#1d1d2b"/><circle cx="122" cy="108" r="7" fill="#1d1d2b"/><circle cx="80" cy="106" r="2.4" fill="#fff"/><circle cx="124" cy="106" r="2.4" fill="#fff"/><circle cx="62" cy="124" r="9" fill="#ff8fa8" opacity=".6"/><circle cx="138" cy="124" r="9" fill="#ff8fa8" opacity=".6"/><path d="M92 124q8 8 16 0" fill="none" stroke="#1d1d2b" stroke-width="3" stroke-linecap="round"/>`;
export const MASP = {
  kucing: { n: "Kucing", u: () => svg(200, 200, `<path d="M40 70L52 22l38 28zM160 70L148 22l-38 28z" fill="#f59e42" stroke="#9a5412" stroke-width="5" stroke-linejoin="round"/><path d="M54 52l-4-16 20 14zM146 52l4-16-20 14z" fill="#ffb8c8"/><ellipse cx="100" cy="112" rx="68" ry="58" fill="#ffb45c" stroke="#9a5412" stroke-width="5"/><path d="M88 62v14M100 58v16M112 62v14" stroke="#c46a12" stroke-width="5" stroke-linecap="round"/>${face}<path d="M94 118l6 6 6-6z" fill="#ff7b9a"/><path d="M42 118l24 4M42 130l24-2M158 118l-24 4M158 130l-24-2" stroke="#7a4310" stroke-width="2.5" stroke-linecap="round"/>`) },
  awan: { n: "Awan", u: () => svg(200, 200, `<g fill="#fff" stroke="#8fb4e8" stroke-width="5"><circle cx="70" cy="110" r="38"/><circle cx="108" cy="86" r="46"/><circle cx="142" cy="116" r="36"/><rect x="44" y="110" width="124" height="40" rx="20"/></g><g fill="#fff"><circle cx="70" cy="112" r="35"/><circle cx="108" cy="88" r="43"/><circle cx="142" cy="118" r="33"/><rect x="47" y="113" width="118" height="34" rx="17"/></g>${face.replace(/cy="108"/g, 'cy="118"').replace(/cy="106"/g, 'cy="116"').replace(/cy="124"/g, 'cy="132"').replace("M92 124q8 8 16 0", "M92 134q8 8 16 0")}`) },
  bintang: { n: "Bintang", u: () => svg(200, 200, `<path d="M100 16l26 58 62 6-46 42 14 62-56-32-56 32 14-62-46-42 62-6z" fill="#ffd84d" stroke="#c98a00" stroke-width="6" stroke-linejoin="round"/>${face.replace(/cy="108"/g, 'cy="100"').replace(/cy="106"/g, 'cy="98"').replace(/cy="124"/g, 'cy="116"').replace("M92 124q8 8 16 0", "M92 116q8 8 16 0")}`) }
};
const IMG = { bg: "kp-bgimg", mas: "kp-masimg" };
export const getImg = k => { try { return localStorage.getItem(IMG[k]) || ""; } catch { return ""; } };
export function setImg(k, v) { try { if (v) localStorage.setItem(IMG[k], v); else localStorage.removeItem(IMG[k]); return true; } catch { return false; } }
// Kecilkan gambar unggahan agar muat di penyimpanan perangkat; PNG/WebP/GIF dipertahankan transparansinya untuk maskot.
export function fileToData(file, kind) {
  return new Promise((ok, no) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return no(new Error("Pilih gambar PNG, JPG, WebP, atau GIF."));
    const url = URL.createObjectURL(file), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); no(new Error("Gambar tidak bisa dibaca.")); };
    im.onload = () => {
      URL.revokeObjectURL(url);
      let max = kind === "bg" ? 1600 : 480; const keep = kind === "mas" && /png|webp|gif/.test(file.type), lim = kind === "bg" ? 1.3e6 : 6e5;
      for (let i = 0; i < 6; i++) {
        const sc = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        const d = keep ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", .82);
        if (d.length <= lim || i === 5) return d.length <= lim * 1.6 ? ok(d) : no(new Error("Gambar terlalu besar. Pilih yang lebih kecil."));
        max = Math.round(max * .75);
      }
    };
    im.src = url;
  });
}
function layers(u, dark, bg) {
  const html = document.documentElement, st = html.style;
  let src = u.bg === "u" ? getImg("bg") : u.bg ? BGP[u.bg.slice(2)].u() : "", ms = u.mas === "u" ? getImg("mas") : u.mas ? MASP[u.mas.slice(2)].u() : "";
  let el = document.getElementById("bgimg"), mc = document.getElementById("mascot");
  if (src) {
    if (!el) { el = document.createElement("div"); el.id = "bgimg"; el.setAttribute("aria-hidden", "true"); document.body.prepend(el); }
    const o = u.bgDim / 100, ov = dark ? `rgb(0 0 0 / ${o})` : `rgb(255 255 255 / ${o})`;
    el.style.backgroundImage = `linear-gradient(${ov},${ov}),url("${src}")`; el.style.filter = u.bgBlur ? `blur(${u.bgBlur}px)` : "none"; el.style.inset = u.bgBlur ? `-${u.bgBlur * 2}px` : "0";
    html.dataset.wall = "1";
    const m = `color-mix(in srgb, ${bg.surf} ${u.cardOp}%, transparent)`, m2 = `color-mix(in srgb, ${bg.surf2} ${Math.min(100, u.cardOp + 8)}%, transparent)`;
    st.setProperty("--surf", m); st.setProperty("--surf2", m2);
  } else { el?.remove(); delete html.dataset.wall; }
  if (ms) {
    if (!mc) { mc = document.createElement("img"); mc.id = "mascot"; mc.alt = ""; mc.setAttribute("aria-hidden", "true"); document.body.append(mc); }
    if (mc.dataset.s !== ms) { mc.src = ms; mc.dataset.s = ms; }
    mc.style.width = u.masSize + "px"; mc.style.opacity = u.masOp / 100; mc.dataset.pos = u.masPos;
  } else mc?.remove();
}
