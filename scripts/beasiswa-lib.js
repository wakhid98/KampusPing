// Pencarian beasiswa otomatis: ambil berita/feed, baca tanggal (hari, bulan, tahun), simpan yang masih aktif.
const BL = { januari: 1, jan: 1, februari: 2, pebruari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, aug: 8, september: 9, sept: 9, sep: 9, oktober: 10, okt: 10, oct: 10, november: 11, nov: 11, desember: 12, des: 12, dec: 12 };
const MON = Object.keys(BL).sort((a, b) => b.length - a.length).join("|");
const p2 = n => String(n).padStart(2, "0"), dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const mkd = (y, m, d) => `${y}-${p2(m)}-${p2(Math.max(1, Math.min(d, dim(y, m))))}`; // 31 Juni -> 30 Juni
export const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const DD = "(\\d{1,2})(?:\\s*(?:st|nd|rd|th))?", YY = "(?:\\s+(\\d{4}))?", SEP = "(?:-|s\\.?\\s?d\\.?|hingga|sampai|dan|&)";
const R_CROSS = () => new RegExp(`\\b${DD}\\s+(${MON})\\b\\.?${YY}\\s*${SEP}\\s*${DD}\\s+(${MON})\\b\\.?${YY}`, "g");
const R_SAME = () => new RegExp(`\\b${DD}\\s*${SEP}\\s*${DD}\\s+(${MON})\\b\\.?${YY}`, "g");
const R_ONE = () => new RegExp(`\\b${DD}\\s+(${MON})\\b\\.?${YY}`, "g");
const R_NUM = /\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/g, R_MY = () => new RegExp(`(?:hingga|sampai|akhir|ditutup)\\s+(?:bulan\\s+)?(${MON})\\s+(20\\d{2})`, "g");
const ANN = /(pengumuman|diumumkan|seleksi|wawancara|\btes\b|ujian|verifikasi|\bhasil\b|interview|sanggah|banding|perkuliahan)/, REG = /(pendaftaran|mendaftar|daftar|registrasi|batas|ditutup|penutupan|deadline|paling lambat|diperpanjang|periode|dibuka)/, CUE = /(hingga|sampai|s\.?\s?d\.?|batas|ditutup|deadline|paling lambat|diperpanjang|closing|berakhir)/, START = /(mulai|sejak|dari)\s*(tanggal\s*)?$/;
const norm = s => String(s || "").toLowerCase().replace(/[\u2013\u2014\u2011]/g, "-").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
const infer = (mon, y, pub, today) => { if (y) return +y; const ref = pub || today, ry = +ref.slice(0, 4), rm = +ref.slice(5, 7); return mon < rm - 1 ? ry + 1 : ry; };
// Mencari batas pendaftaran. Mengembalikan { d: "YYYY-MM-DD", ap: perkiraan? } atau null.
export function findDeadline(text, { pub = "", today }) {
  const t = norm(text), c = [], seen = new Set();
  const add = (i, d, s, ap = false) => { if (d && s > 0) c.push({ d, s, ap, k: i + d }); };
  const sc = (i, intrinsic) => { const c80 = t.slice(Math.max(0, i - 80), i), c45 = c80.slice(-45); if (ANN.test(c45)) return 0; if (START.test(c80.slice(-20))) return 0; return REG.test(c80) ? 3 : intrinsic || (CUE.test(c45) ? 2 : 1); };
  for (const m of t.matchAll(R_CROSS())) { const mon = BL[m[5]], y = infer(mon, m[6] || m[3], pub, today); add(m.index, mkd(y, mon, +m[4]), sc(m.index, 2)); seen.add(m.index); }
  for (const m of t.matchAll(R_SAME())) { const mon = BL[m[3]]; add(m.index, mkd(infer(mon, m[4], pub, today), mon, +m[2]), sc(m.index, 2)); }
  for (const m of t.matchAll(R_ONE())) { const mon = BL[m[2]]; add(m.index, mkd(infer(mon, m[3], pub, today), mon, +m[1]), sc(m.index)); }
  for (const m of t.matchAll(R_NUM)) add(m.index, +m[2] >= 1 && +m[2] <= 12 ? mkd(+m[3], +m[2], +m[1]) : "", sc(m.index));
  for (const m of t.matchAll(R_MY())) { const mon = BL[m[1]], y = +m[2]; add(m.index, mkd(y, mon, 31), 2, true); }
  const lo = addDays(pub || today, -10), hi = addDays(today, 540), ok = c.filter(x => x.d >= lo && x.d <= hi);
  if (!ok.length) return null;
  const top = Math.max(...ok.map(x => x.s)), best = ok.filter(x => x.s === top).map(x => x.d).sort().at(-1);
  return { d: best, ap: top < 3 || ok.some(x => x.d === best && x.ap) };
}
const dec = s => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
const strip = s => dec(dec(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const tag = (b, n) => { const m = b.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i")); return m ? m[1] : ""; };
const isoDate = s => { const t = Date.parse(dec(s)); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };
export function parseFeed(xml) {
  return [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(([b]) => ({
    title: strip(tag(b, "title")), link: dec(tag(b, "link")) || (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "",
    pub: isoDate(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date")), src: strip(tag(b, "source")), desc: strip(tag(b, "description") || tag(b, "summary")) })).filter(x => x.title && x.link);
}
export const realUrl = l => { try { const u = new URL(l); return /bing\.com$/.test(u.hostname) && u.searchParams.get("url") ? u.searchParams.get("url") : l; } catch { return l; } };
export function htmlText(html) {
  const b = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ").replace(/<\/(p|div|li|h\d|tr|section|article)>|<br\s*\/?>/gi, "\n");
  return dec(b.replace(/<[^>]+>/g, " ")).split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(l => l && !/^(baca juga|baca selengkapnya|lihat juga|simak juga|terkait|berita terkait)/i.test(l)).join("\n").slice(0, 4000);
}
export const metaPub = html => { const m = html.match(/(?:article:published_time|datePublished|pubdate)["'\s:=]+(?:content=["'])?(20\d{2}-\d{2}-\d{2})/i); return m ? m[1] : ""; };
export function listLinks(html, base) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = strip(m[2]); if (!/beasiswa/i.test(text) || text.length < 15) continue;
    try { const u = new URL(m[1], base); if (!/^https?:$/.test(u.protocol) || seen.has(u.href)) continue; seen.add(u.href); out.push({ title: text, link: u.href, pub: "", src: "", desc: "" }); } catch { /* tautan tidak valid */ }
  }
  return out;
}
const UG = /\b(s1|d4|d-iv|d3|d-iii|sarjana|diploma|vokasi|politeknik|mahasiswa)\b/i, PG = /\b(s2|s3|magister|doktor|pascasarjana|master|phd)\b/i;
export function evaluate(cand, text, today) {
  const title = cand.title;
  if (!/beasiswa|scholarship/i.test(title)) return null;
  if (/\b(guru|gtk|paud|tenaga pendidik)\b/i.test(title)) return null;
  if (/\b(pemkot|pemkab|pemprov|pemerintah (kota|kabupaten|provinsi))\b/i.test(title) && !/(jawa timur|jatim|trenggalek)/i.test(title)) return null;
  if (PG.test(title) && !UG.test(title) && !UG.test(text.slice(0, 1500))) return null;
  const dl = findDeadline(`${title}. ${text}`, { pub: cand.pub, today }), y = +today.slice(0, 4);
  let host = ""; try { host = new URL(cand.link).hostname.replace(/^www\./, ""); } catch { /* abaikan */ }
  const base = { t: title.slice(0, 200), u: cand.link.slice(0, 500), s: (cand.src || host).slice(0, 60), p: cand.pub || "" };
  if (dl) return dl.d < today ? null : { ...base, d: dl.d, ap: dl.ap };
  return cand.pub && cand.pub >= addDays(today, -30) && new RegExp(`${y}|${y + 1}`).test(title) ? { ...base, d: "", ap: false } : null;
}
const key = t => norm(t).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(w => w && !/^(dibuka|resmi|cek|syarat|ini|simak|jadwal|dan|cara|daftar|pendaftaran|tahun|untuk|bagi|yang|di|ke|dengan|kuliah|gratis)$/.test(w) && !/^20\d\d$/.test(w)).slice(0, 5).join(" ");
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }
export const defaultSources = y => [`beasiswa S1 D4 dibuka pendaftaran ${y}`, `beasiswa mahasiswa ${y} pendaftaran dibuka`, `beasiswa teknik elektronika politeknik ${y}`, `beasiswa unggulan ${y}`].flatMap(q => [
  { name: "Bing Berita", url: `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=id&cc=ID` },
  { name: "Google Berita", url: `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:30d")}&hl=id&gl=ID&ceid=ID:id` }]);
export async function collect({ sources, get, today, log = () => {} }) {
  const status = {}, cands = [], seenUrl = new Set();
  for (const s of sources) {
    const st = status[s.name] ||= { ok: false, items: 0, kept: 0 };
    try {
      const body = await get(s.url), items = /<(rss|feed|rdf)[\s>]/i.test(body.slice(0, 600)) ? parseFeed(body) : listLinks(body, s.url);
      st.ok = true; log(`[${s.name}] ${items.length} item`);
      for (const it of items) { const link = realUrl(it.link); if (seenUrl.has(link) || !/beasiswa|scholarship/i.test(it.title)) continue; if (it.pub && it.pub < addDays(today, -150)) continue; seenUrl.add(link); st.items++; cands.push({ ...it, link, from: s.name, src: it.src || "" }); }
    } catch (e) { log(`[${s.name}] gagal: ${e.message}`); }
  }
  cands.sort((a, b) => (b.pub || "").localeCompare(a.pub || "")); const top = cands.slice(0, 45);
  const res = await pool(top, 5, async c => {
    let text = c.desc || "", pub = c.pub;
    if (!/news\.google\.com/.test(c.link)) { try { const html = await get(c.link); text = htmlText(html) || text; pub = pub || metaPub(html); } catch (e) { log(`  halaman gagal: ${c.link} (${e.message})`); } }
    return { e: evaluate({ ...c, pub }, text, today), from: c.from };
  });
  const byKey = new Map();
  for (const { e, from } of res) { if (!e) continue; status[from].kept++; const k = key(e.t) || e.u, old = byKey.get(k); if (!old || (e.p || "") > (old.p || "")) byKey.set(k, e); }
  return { entries: [...byKey.values()].sort((a, b) => (a.d || "9999").localeCompare(b.d || "9999")), status };
}
