import { esc } from "./util.js";
import { BG_L, BG_D, ACC, accent, clean } from "./theme.js";
import { evTime } from "./agenda.js";
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], DORD = [1, 2, 3, 4, 5, 6, 0];
export const SIAKAD_DEFAULT = "https://siakad.polinema.ac.id/beranda";
export const REMIND = [[-1, "Tanpa pengingat"], [0, "Tepat waktu"], [5, "5 menit sebelum"], [10, "10 menit sebelum"], [15, "15 menit sebelum"], [30, "30 menit sebelum"], [60, "1 jam sebelum"], [120, "2 jam sebelum"], [1440, "1 hari sebelum"]];
const remLabel = n => (REMIND.find(r => r[0] === +n) || [])[1] || "";
const opt = (list, v) => list.map(([k, t]) => `<option value="${k}"${String(k) === String(v) ? " selected" : ""}>${t}</option>`).join("");

/* ---------- Agenda (kalender) ---------- */
export function eventForm(x, id) {
  const w = String(x.when || ""), date = w.slice(0, 10), time = x.allDay ? "" : w.slice(11, 16);
  return `<form data-t="event" data-id="${id || ""}"><h2>${id ? "Ubah" : "Tambah"} agenda</h2>
  <label>Judul<input name="title" value="${esc(x.title || "")}" required maxlength="120" placeholder="mis. Rapat organisasi"></label>
  <label>Tanggal<input name="date" type="date" value="${esc(date)}" required></label>
  <label class="sw"><input type="checkbox" name="allDay"${x.allDay ? " checked" : ""}> Seharian (pengingat pukul 08:00)</label>
  <div class="fgrid"><label>Mulai<input name="time" type="time" value="${esc(time || "08:00")}"></label><label>Selesai (opsional)<input name="end" type="time" value="${esc(x.end || "")}"></label></div>
  <label>Tempat (opsional)<input name="place" value="${esc(x.place || "")}" maxlength="80"></label>
  <label>Catatan (opsional)<textarea name="note" rows="2" maxlength="500">${esc(x.note || "")}</textarea></label>
  <div class="fgrid"><label>Ulangi<select name="repeat">${opt([["", "Tidak"], ["daily", "Setiap hari"], ["weekly", "Setiap minggu"], ["monthly", "Setiap bulan"], ["yearly", "Setiap tahun"]], x.repeat || "")}</select></label>
  <label>Pengingat<select name="remind">${opt(REMIND, x.remind ?? 15)}</select></label></div>
  <div class="actions"><button class="btn ghost" value="cancel" formnovalidate>Batal</button><button class="btn" value="save">Simpan</button></div></form>`;
}
export function eventRow(x, ds) {
  const t = x.allDay ? "Seharian" : evTime(x), e = !x.allDay && x.end ? ` – ${esc(x.end)}` : "", rp = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan" }[x.repeat];
  return `<div class="item ev"><div class="dayb">${esc(t)}</div><div class="grow"><b>${esc(x.title)}</b><small>Agenda${e ? " " + e : ""}${x.place ? " · " + esc(x.place) : ""}${rp ? " · ↻ " + rp : ""}${x.remind >= 0 ? " · 🔔 " + remLabel(x.remind) : ""}</small></div>
  <div class="acts"><button class="ib" data-act="edit" data-id="${x.id}" aria-label="Ubah">✎</button><button class="ib" data-act="del" data-id="${x.id}" aria-label="Hapus">✕</button></div>${x.note ? `<p class="note">${esc(x.note)}</p>` : ""}</div>`;
}

/* ---------- Jadwal pribadi ---------- */
export function clsForm(x, id) {
  const own = x.own, mod = x.mod, isNew = !id;
  return `<form data-t="cls" data-id="${esc(id || "")}"><h2>${isNew ? "Tambah jadwal pribadi" : "Ubah jadwal"}</h2>
  ${!isNew && !own ? '<p class="muted" style="font-size:13px">Ini jadwal dari admin. Perubahan hanya berlaku untukmu dan tidak mengubah jadwal pengguna lain.</p>' : ""}
  <label>Mata kuliah / kegiatan<input name="title" value="${esc(x.title || "")}" required maxlength="100"></label>
  <label>Hari<select name="day">${opt(DORD.map(d => [d, DAYS[d]]), x.day ?? 1)}</select></label>
  <div class="fgrid"><label>Mulai<input name="time" type="time" value="${esc(x.time || "08:00")}" required></label><label>Selesai<input name="end" type="time" value="${esc(x.end || "")}"></label></div>
  <label>Ruang<input name="room" value="${esc(x.room || "")}" maxlength="60"></label><label>Dosen<input name="lecturer" value="${esc(x.lecturer || "")}" maxlength="80"></label>
  <div class="actions" style="justify-content:space-between;flex-wrap:wrap"><div class="actions">${isNew ? "" : `<button class="btn danger" value="del" formnovalidate>${own ? "Hapus" : "Sembunyikan"}</button>`}${mod ? '<button class="btn ghost" value="reset" formnovalidate>Kembalikan bawaan</button>' : ""}</div>
  <div class="actions"><button class="btn ghost" value="cancel" formnovalidate>Batal</button><button class="btn" value="save">Simpan</button></div></div></form>`;
}
export function schedTools(c) {
  const co = c.me.co || {}, n = Object.keys(co).length, hid = Object.values(co).filter(x => x.hide).length, own = Object.keys(c.me.cx || {}).length;
  return `<div class="tools"><button class="btn" data-act="clsAdd">+ Jadwal pribadi</button>${n ? `<button class="btn ghost" data-act="clsReset">Kembalikan jadwal admin${hid ? ` (${hid} disembunyikan)` : ""}</button>` : ""}${own || n ? `<small class="muted">Perubahanmu: ${n - hid} diubah, ${hid} disembunyikan, ${own} ditambah</small>` : '<small class="muted">Ketuk kelas untuk mengubahnya. Jadwal bawaan admin tetap utuh.</small>'}</div>`;
}
export function siakadCard(c) {
  const mine = /^https:\/\//.test(c.me.siakad || "") ? c.me.siakad : "", url = mine || (/^https:\/\//.test(c.cfg.siakadUrl || "") ? c.cfg.siakadUrl : SIAKAD_DEFAULT);
  return `<div class="card siakad"><div class="grow"><b>Presensi resmi kampus</b><p class="muted">Presensi yang sah dicatat di SIAKAD. ${mine ? "Memakai alamat SIAKAD pilihanmu." : "Memakai alamat bawaan admin."} <a href="#" data-act="nav" data-v="set" class="ul">Ubah alamat</a></p></div><a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buka SIAKAD</a></div>`;
}
export function siakadSettings(c) {
  const mine = c.me.siakad || "", def = c.cfg.siakadUrl || SIAKAD_DEFAULT;
  return `<div class="card stack"><h3>Alamat SIAKAD</h3><p class="muted">Tombol "Buka SIAKAD" di halaman Jadwal memakai alamat ini. Kosongkan untuk memakai bawaan admin.</p>
  <label>Alamat SIAKAD-ku (https)<input id="siakad" value="${esc(mine)}" maxlength="300" placeholder="${esc(def)}" inputmode="url"></label>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveSiakad">Simpan</button>${mine ? '<button class="btn ghost" data-act="resetSiakad">Pakai bawaan admin</button>' : ""}</div><small class="muted">Bawaan admin: ${esc(def)}</small></div>`;
}

/* ---------- Tampilan ---------- */
export function appearance(c) {
  const u = clean(c.ui), dark = document.documentElement.dataset.theme === "dark", cur = accent(u, dark)[0];
  const chips = (act, list, sel) => Object.entries(list).map(([k, p]) => `<button class="chip${sel === k ? " on" : ""}" data-act="${act}" data-k="${k}"><i class="pv" style="background:linear-gradient(135deg,${p.ink},${p.surf2});border-color:${p.line}"></i>${p.n}</button>`).join("");
  const sw = Object.entries(ACC).map(([k, p]) => `<button class="swc${u.acc === k ? " on" : ""}" style="--c:${dark ? p.da : p.a}" data-act="uiAcc" data-k="${k}" aria-label="${p.n}" title="${p.n}"></button>`).join("");
  const seg = (act, list, v) => list.map(([k, t]) => `<button class="chip${+v === k ? " on" : ""}" data-act="${act}" data-v="${k}">${t}</button>`).join("");
  return `<div class="card stack"><h3>Tampilan</h3>
  <div><p class="lbl">Mode</p><div class="tools" style="margin:6px 0 0">${[["light", "Terang"], ["dark", "Gelap"], ["auto", "Ikuti HP"]].map(([k, t]) => `<button class="chip${u.mode === k ? " on" : ""}" data-act="uiMode" data-k="${k}">${t}</button>`).join("")}</div></div>
  <div><p class="lbl">Latar tema terang</p><div class="tools" style="margin:6px 0 0">${chips("uiBgL", BG_L, u.bgL)}</div></div>
  <div><p class="lbl">Latar tema gelap</p><div class="tools" style="margin:6px 0 0">${chips("uiBgD", BG_D, u.bgD)}</div></div>
  <div><p class="lbl">Warna aksen</p><div class="swrow">${sw}<label class="swc custom${ACC[u.acc] ? "" : " on"}" style="--c:${cur}" title="Warna sendiri"><input type="color" id="ui-acc" data-ui="acc" value="${cur}" aria-label="Pilih warna sendiri"><span>+</span></label></div></div>
  <div class="fgrid"><div><p class="lbl">Sudut kartu</p><div class="tools" style="margin:6px 0 0">${seg("uiR", [[8, "Tegas"], [18, "Normal"], [26, "Bulat"]], u.r)}</div></div>
  <div><p class="lbl">Ukuran huruf</p><div class="tools" style="margin:6px 0 0">${seg("uiFs", [[14, "Kecil"], [15, "Normal"], [17, "Besar"]], u.fs)}</div></div></div>
  <div class="actions" style="justify-content:flex-start"><button class="btn ghost" data-act="uiReset">Kembalikan tema bawaan</button></div></div>`;
}

/* ---------- Notepad ---------- */
export const NCOL = { "": "Tanpa warna", y: "Kuning", g: "Hijau", b: "Biru", p: "Merah muda", v: "Ungu" };
export const noteArr = me => Object.entries(me.notes || {}).map(([id, x]) => ({ id, ...x }));
const words = s => (String(s).trim().match(/\S+/g) || []).length;
const dt = t => t ? new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }) : "";
const head = n => n.title?.trim() || String(n.body || "").trim().split("\n")[0].slice(0, 60) || "Tanpa judul";
export function noteFilter(c) {
  const q = (c.noteQ || "").toLowerCase(), cat = c.noteCat || "*all";
  let a = noteArr(c.me).filter(n => cat === "*arch" ? n.arch : !n.arch && (cat === "*all" || (cat === "*pin" ? n.pin : (n.cat || "") === cat)));
  if (q) a = a.filter(n => (n.title + " " + n.body + " " + (n.cat || "")).toLowerCase().includes(q));
  const s = c.noteSort || "upd";
  a.sort((x, y) => (y.pin ? 1 : 0) - (x.pin ? 1 : 0) || (s === "az" ? head(x).localeCompare(head(y), "id") : s === "new" ? (y.c || 0) - (x.c || 0) : (y.t || 0) - (x.t || 0)));
  return a;
}
export function noteList(c) {
  const a = noteFilter(c);
  if (!a.length) return `<div class="empty"><p>${c.noteQ ? "Tidak ada catatan yang cocok." : c.noteCat === "*arch" ? "Arsip kosong." : "Belum ada catatan di sini."}</p></div>`;
  return a.map(n => `<button class="nc nc-${n.color || "n"}${n.id === c.noteSel ? " on" : ""}" data-act="noteOpen" data-id="${esc(n.id)}"><span class="nct"><b>${n.pin ? "📌 " : ""}${esc(head(n))}</b><small>${dt(n.t)}</small></span>
  <span class="ncs">${esc(String(n.body || "").replace(/\s+/g, " ").slice(0, 90)) || "<i>Kosong</i>"}</span>${n.cat ? `<span class="badge">${esc(n.cat)}</span>` : ""}</button>`).join("");
}
export function notes(c) {
  const all = noteArr(c.me), live = all.filter(n => !n.arch), cats = {};
  live.forEach(n => { const k = n.cat || ""; if (k) cats[k] = (cats[k] || 0) + 1; });
  const cat = c.noteCat || "*all", n = c.me.notes?.[c.noteSel] ? { id: c.noteSel, ...c.me.notes[c.noteSel] } : null;
  const side = [["*all", "Semua catatan", live.length], ["*pin", "Disematkan", live.filter(x => x.pin).length], ...Object.keys(cats).sort((a, b) => a.localeCompare(b, "id")).map(k => [k, k, cats[k]]), ["*arch", "Arsip", all.length - live.length]]
    .map(([k, t, m]) => `<button class="chip nl2${cat === k ? " on" : ""}" data-act="noteCat" data-k="${esc(k)}"><span>${k.startsWith("*") ? "" : "🗂 "}${esc(t)}</span><em>${m}</em></button>`).join("");
  const tw = live.reduce((s, x) => s + words(x.body), 0);
  const ed = n ? `<div class="ned card"><div class="row2"><button class="ib nback" data-act="noteBack" aria-label="Kembali">‹</button><div class="acts">
    <button class="chip${n.pin ? " on" : ""}" data-act="notePin">📌 ${n.pin ? "Disematkan" : "Sematkan"}</button><button class="chip" data-act="noteArch">${n.arch ? "Keluarkan dari arsip" : "Arsipkan"}</button><button class="chip" data-act="noteCopy">Salin</button><button class="chip" data-act="noteDel">Hapus</button></div></div>
    <input id="nt-title" data-note="1" class="nti" value="${esc(n.title || "")}" maxlength="100" placeholder="Judul catatan" aria-label="Judul">
    <div class="nmeta"><label>Kategori<input id="nt-cat" data-note="1" list="ncats" value="${esc(n.cat || "")}" maxlength="30" placeholder="mis. Kuliah, Pribadi"></label><datalist id="ncats">${Object.keys(cats).map(k => `<option value="${esc(k)}">`).join("")}</datalist>
    <div><p class="lbl">Warna label</p><div class="swrow" style="margin-top:6px">${Object.entries(NCOL).map(([k, t]) => `<button class="swc nsw nc-${k || "n"}${(n.color || "") === k ? " on" : ""}" data-act="noteColor" data-k="${k}" aria-label="${t}" title="${t}"></button>`).join("")}</div></div></div>
    <textarea id="nt-body" data-note="1" class="ntb" maxlength="10000" placeholder="Tulis di sini..." aria-label="Isi catatan">${esc(n.body || "")}</textarea>
    <small class="muted" id="nt-count">${words(n.body)} kata · ${String(n.body || "").length}/10000 karakter · diubah ${dt(n.t)} · tersimpan otomatis</small></div>`
    : `<div class="ned empty"><p>Pilih catatan di daftar, atau buat yang baru.</p><button class="btn" data-act="noteNew">+ Catatan baru</button></div>`;
  return `<div class="nwrap${n ? " sel" : ""}"><aside class="ncats card"><h3>Inventaris</h3><div class="nside">${side}</div>
  <p class="muted nsum">${live.length} aktif · ${all.length - live.length} arsip · ${tw} kata</p><button class="btn ghost" data-act="noteExport" style="width:100%">Ekspor semua (.txt)</button></aside>
  <section class="nlistc"><div class="tools" style="margin:0 0 10px"><input class="search" id="nq" type="search" placeholder="Cari judul, isi, kategori..." value="${esc(c.noteQ || "")}" aria-label="Cari catatan">
  <select id="nsort" aria-label="Urutkan" style="width:auto">${opt([["upd", "Terakhir diubah"], ["new", "Terbaru dibuat"], ["az", "Judul A–Z"]], c.noteSort || "upd")}</select></div><div id="nlist" class="nlist">${noteList(c)}</div></section>${ed}</div>`;
}
