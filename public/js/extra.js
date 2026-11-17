import { esc } from "./util.js";
import { BG_L, BG_D, ACC, BGP, MASP, getImg, accent, clean } from "./theme.js";
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

/* ---------- Pengaturan: daftar ringkas + CTA, detail di lembar (sheet) ---------- */
const MODE = { light: "Terang", dark: "Gelap", auto: "Ikuti HP" };
const sheetBox = (t, body) => `<div class="sheet"><div class="row2"><h2>${t}</h2><button class="ib" data-act="sheetClose" aria-label="Tutup">✕</button></div>${body}</div>`;
const thumbBtn = (act, k, label, on, uri) => `<button class="thumb${on ? " on" : ""}" data-act="${act}" data-k="${esc(k)}"${uri ? ` style="background-image:url('${uri.replace(/'/g, "%27")}')"` : ""}><span>${esc(label)}</span></button>`;
function themeBody(c) {
  const u = clean(c.ui), dark = document.documentElement.dataset.theme === "dark", cur = accent(u, dark)[0], hasBg = u.bg === "u" ? !!getImg("bg") : !!u.bg, hasMas = u.mas === "u" ? !!getImg("mas") : !!u.mas;
  const chips = (act, list, sel) => Object.entries(list).map(([k, p]) => `<button class="chip${sel === k ? " on" : ""}" data-act="${act}" data-k="${k}"><i class="pv" style="background:linear-gradient(135deg,${p.ink},${p.surf2});border-color:${p.line}"></i>${p.n}</button>`).join("");
  const sw = Object.entries(ACC).map(([k, p]) => `<button class="swc${u.acc === k ? " on" : ""}" style="--c:${dark ? p.da : p.a}" data-act="uiAcc" data-k="${k}" aria-label="${p.n}" title="${p.n}"></button>`).join("");
  const seg = (act, list, v) => list.map(([k, t]) => `<button class="chip${v === k ? " on" : ""}" data-act="${act}" data-v="${k}">${t}</button>`).join("");
  const rg = (k, t, a, b, st, v) => `<label class="rg"><span>${t} <em>${v}</em></span><input type="range" data-ui="${k}" min="${a}" max="${b}" step="${st}" value="${v}"></label>`;
  const up = (kind, has) => `<label class="btn ghost" style="cursor:pointer">${has ? "Ganti gambar" : "Unggah gambar"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-up="${kind}" hidden></label>`;
  const myBg = getImg("bg"), myMas = getImg("mas");
  return `<div class="stack">
  <div class="tools" style="margin:0">${["light", "dark", "auto"].map(k => `<button class="chip${u.mode === k ? " on" : ""}" data-act="uiMode" data-k="${k}">${MODE[k]}</button>`).join("")}</div>
  <details open><summary>Warna</summary><div class="stack">
    <div><p class="lbl">Latar tema terang</p><div class="tools" style="margin:6px 0 0">${chips("uiBgL", BG_L, u.bgL)}</div></div>
    <div><p class="lbl">Latar tema gelap</p><div class="tools" style="margin:6px 0 0">${chips("uiBgD", BG_D, u.bgD)}</div></div>
    <div><p class="lbl">Warna aksen</p><div class="swrow">${sw}<label class="swc custom${ACC[u.acc] ? "" : " on"}" style="--c:${cur}" title="Warna sendiri"><input type="color" id="ui-acc" data-ui="acc" value="${cur}" aria-label="Pilih warna sendiri"><span>+</span></label></div></div></div></details>
  <details${hasBg ? " open" : ""}><summary>Gambar latar${hasBg ? " · aktif" : ""}</summary><div class="stack">
    <div class="thumbs">${thumbBtn("uiBg", "", "Tanpa", !u.bg)}${Object.entries(BGP).map(([k, p]) => thumbBtn("uiBg", "p:" + k, p.n, u.bg === "p:" + k, p.u())).join("")}${myBg ? thumbBtn("uiBg", "u", "Gambarmu", u.bg === "u", myBg) : ""}</div>
    <div class="actions" style="justify-content:flex-start">${up("bg", !!myBg)}${myBg ? '<button class="btn ghost" data-act="uiBgDel">Hapus gambarku</button>' : ""}</div>
    ${hasBg ? rg("bgDim", dark ? "Gelapkan gambar" : "Pudarkan gambar", 0, 80, 5, u.bgDim) + rg("bgBlur", "Blur", 0, 16, 2, u.bgBlur) + rg("cardOp", "Kepekatan kartu", 40, 100, 5, u.cardOp) : '<p class="muted" style="font-size:13px">Pilih gambar bawaan atau unggah fotomu (alam, kartun, karakter favorit). Gambar disimpan di perangkat ini saja.</p>'}</div></details>
  <details${hasMas ? " open" : ""}><summary>Karakter / maskot${hasMas ? " · aktif" : ""}</summary><div class="stack">
    <div class="thumbs sm">${thumbBtn("uiMas", "", "Tanpa", !u.mas)}${Object.entries(MASP).map(([k, p]) => thumbBtn("uiMas", "p:" + k, p.n, u.mas === "p:" + k, p.u())).join("")}${myMas ? thumbBtn("uiMas", "u", "Karakterku", u.mas === "u", myMas) : ""}</div>
    <div class="actions" style="justify-content:flex-start">${up("mas", !!myMas)}${myMas ? '<button class="btn ghost" data-act="uiMasDel">Hapus karakterku</button>' : ""}</div>
    <p class="muted" style="font-size:13px">Untuk karakter, pakai PNG dengan latar transparan agar menyatu dengan halaman.</p>
    ${hasMas ? `<div><p class="lbl">Posisi</p><div class="tools" style="margin:6px 0 0">${seg("uiMasPos", [["r", "Kanan bawah"], ["l", "Kiri bawah"]], u.masPos)}</div></div>` + rg("masSize", "Ukuran", 60, 320, 10, u.masSize) + rg("masOp", "Transparansi", 20, 100, 5, u.masOp) : ""}</div></details>
  <details><summary>Bentuk dan huruf</summary><div class="fgrid"><div><p class="lbl">Sudut kartu</p><div class="tools" style="margin:6px 0 0">${seg("uiR", [[8, "Tegas"], [18, "Normal"], [26, "Bulat"]], u.r).replace(/data-v="(\d+)"/g, 'data-v="$1"')}</div></div>
  <div><p class="lbl">Ukuran huruf</p><div class="tools" style="margin:6px 0 0">${seg("uiFs", [[14, "Kecil"], [15, "Normal"], [17, "Besar"]], u.fs)}</div></div></div></details>
  <div class="actions" style="justify-content:flex-start"><button class="btn ghost" data-act="uiReset">Kembalikan tema bawaan</button></div></div>`;
}
export const SHEETS = {
  theme: ["Tampilan dan tema", themeBody],
  notif: ["Notifikasi di perangkat ini", c => {
    const pm = { granted: "Diizinkan", denied: "Diblokir", default: "Belum diizinkan", unsupported: "Tidak didukung" }[c.perm] || "Belum diizinkan";
    return `<div class="stack"><div class="row2"><span>Izin notifikasi</span><span class="badge ${c.perm === "granted" ? "ok" : c.perm === "denied" ? "bad" : ""}">${pm}</span></div>
    <div class="actions" style="justify-content:flex-start">${c.perm === "granted" ? '<button class="btn" data-act="pushTest">Kirim notifikasi uji</button>' : c.perm === "denied" ? "" : '<button class="btn" data-act="push">Aktifkan notifikasi</button>'}</div>
    <p class="muted" style="font-size:13px">${c.perm === "denied" ? "Notifikasi diblokir. Buka Pengaturan HP, Aplikasi, KampusPing, Notifikasi, lalu izinkan." : "Di aplikasi Android: pastikan Notifikasi KampusPing aktif di Pengaturan HP dan penghemat baterai tidak membatasi aplikasi. Telegram tetap menjadi cadangan."}</p></div>`; }],
  remind: ["Jenis pengingat", c => {
    const p = c.me.prefs || {}, sw = (k, l) => `<label class="sw"><input type="checkbox" data-pref="${k}" ${p[k] !== false ? "checked" : ""}>${l}</label>`;
    return `<div class="stack">${sw("task", "Tugas (H-7, H-3, H-1, 3 jam)")}${sw("class", "Kuliah (30 menit sebelum)")}${sw("scholar", "Beasiswa (H-14 sampai H-1)")}${sw("event", "Agenda kalender (sesuai pengingat tiap agenda)")}${sw("report", "Ringkasan pagi dan laporan malam")}</div>`; }],
  tg: ["Kanal Telegram", c => `<div class="stack"><label>Telegram Chat ID (opsional)<input id="chat" value="${esc(c.me.tgChatId || "")}" placeholder="mis. 123456789" maxlength="20" inputmode="numeric"></label>
    <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveChat">Simpan Chat ID</button></div><p class="muted" style="font-size:13px">Pengingat juga dikirim lewat Telegram sebagai cadangan notifikasi HP.</p></div>`],
  siakad: ["Alamat SIAKAD", c => {
    const mine = c.me.siakad || "", def = c.cfg.siakadUrl || SIAKAD_DEFAULT;
    return `<div class="stack"><p class="muted">Tombol "Buka SIAKAD" di halaman Jadwal memakai alamat ini. Kosongkan untuk memakai bawaan admin.</p>
    <label>Alamat SIAKAD-ku (https)<input id="siakad" value="${esc(mine)}" maxlength="300" placeholder="${esc(def)}" inputmode="url"></label>
    <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveSiakad">Simpan</button>${mine ? '<button class="btn ghost" data-act="resetSiakad">Pakai bawaan admin</button>' : ""}</div><small class="muted">Bawaan admin: ${esc(def)}</small></div>`; }],
  sync: ["Kode sinkron", c => `<div class="stack"><p class="muted">Tanpa login, datamu terikat ke kode ini. Masukkan kode yang sama di perangkat lain untuk memakai data yang sama. Jangan dibagikan: siapa pun yang punya kode bisa melihat dan mengubah datamu.</p>
    <label>Kode perangkat ini<input id="key" readonly value="${esc(c.user.uid)}"></label><div class="actions" style="justify-content:flex-start"><button class="btn ghost" data-act="copyKey">Salin kode</button></div>
    <label>Pakai kode dari perangkat lain<input id="newkey" maxlength="64" placeholder="Tempel kode di sini" autocomplete="off"></label><button class="btn" data-act="useKey">Gunakan kode ini</button></div>`]
};
export const sheet = (k, c) => SHEETS[k] ? sheetBox(SHEETS[k][0], SHEETS[k][1](c)) : "";
export function settingsPage(c) {
  const u = clean(c.ui), p = c.me.prefs || {}, accN = ACC[u.acc]?.n || "Warna sendiri", pm = c.perm, key = c.user.uid;
  const on = ["task", "class", "scholar", "event", "report"].filter(k => p[k] !== false).length;
  const bgN = (document.documentElement.dataset.theme === "dark" ? BG_D[u.bgD] : BG_L[u.bgL]).n;
  const host = (() => { try { return new URL(c.me.siakad || c.cfg.siakadUrl || SIAKAD_DEFAULT).host; } catch { return "-"; } })();
  const row = (ic, t, sub, acts) => `<div class="srow"><span class="si">${ic}</span><div class="sbody"><b>${t}</b><small>${sub}</small></div><div class="sact">${acts}</div></div>`;
  const sh = (k, label, cls = "ghost") => `<button class="btn ${cls}" data-act="sheet" data-k="${k}">${label}</button>`;
  return `<div class="card slist">
  ${row("🎨", "Tampilan dan tema", `${MODE[u.mode]} · ${esc(bgN)} · aksen ${esc(accN)}${u.bg ? " · latar gambar" : ""}${u.mas ? " · karakter" : ""}`, sh("theme", "Atur", ""))}
  ${row("🔔", "Notifikasi HP", pm === "granted" ? "Aktif di perangkat ini" : pm === "denied" ? "Diblokir oleh HP" : pm === "unsupported" ? "Tidak didukung di browser ini" : "Belum diaktifkan", pm === "granted" ? '<button class="btn ghost" data-act="pushTest">Kirim uji</button>' : pm === "denied" ? sh("notif", "Cara memperbaiki") : pm === "unsupported" ? "" : '<button class="btn" data-act="push">Aktifkan</button>')}
  ${row("⏰", "Jenis pengingat", `${on} dari 5 jenis aktif`, sh("remind", "Atur"))}
  ${row("✈️", "Telegram", c.me.tgChatId ? "Terhubung · ID " + esc(c.me.tgChatId) : "Belum terhubung (cadangan pengingat)", sh("tg", c.me.tgChatId ? "Ubah" : "Hubungkan", c.me.tgChatId ? "ghost" : ""))}
  ${row("🎓", "Alamat SIAKAD", `${esc(host)}${c.me.siakad ? " · pilihanmu" : " · bawaan admin"}`, sh("siakad", "Ubah"))}
  ${row("💾", "Cadangan data", "Simpan atau pulihkan data ke perangkat lain", '<button class="btn ghost" data-act="export">Ekspor</button><label class="btn ghost" style="cursor:pointer">Impor<input type="file" accept="application/json" data-import="1" hidden></label>')}
  ${c.canInstall ? row("📲", "Pasang di HP", "Pakai seperti aplikasi, tanpa Play Store", '<button class="btn" data-act="install">Pasang</button>') : ""}
  ${row("🔑", "Kode sinkron", "Kode " + esc(key.slice(0, 4)) + "…" + esc(key.slice(-4)) + " · untuk pindah perangkat", '<button class="btn ghost" data-act="copyKey">Salin</button>' + sh("sync", "Ganti"))}
  </div>`;
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
  const warn = c.notesBlocked ? '<div class="banner" style="margin-bottom:12px">Database menolak catatan karena aturan terbaru belum aktif. Catatanmu <b>aman di perangkat ini</b> dan akan tersimpan otomatis setelah admin menjalankan <code>firebase deploy --only database</code>. <a href="cek.html">Periksa koneksi</a></div>' : "";
  return `${warn}<div class="nwrap${n ? " sel" : ""}"><aside class="ncats card"><h3>Inventaris</h3><div class="nside">${side}</div>
  <p class="muted nsum">${live.length} aktif · ${all.length - live.length} arsip · ${tw} kata</p><button class="btn ghost" data-act="noteExport" style="width:100%">Ekspor semua (.txt)</button></aside>
  <section class="nlistc"><div class="tools" style="margin:0 0 10px"><input class="search" id="nq" type="search" placeholder="Cari judul, isi, kategori..." value="${esc(c.noteQ || "")}" aria-label="Cari catatan">
  <select id="nsort" aria-label="Urutkan" style="width:auto">${opt([["upd", "Terakhir diubah"], ["new", "Terbaru dibuat"], ["az", "Judul A–Z"]], c.noteSort || "upd")}</select></div><div id="nlist" class="nlist">${noteList(c)}</div></section>${ed}</div>`;
}

export const chessTitle = r => [[0, "Pemula"], [900, "Pelajar"], [1200, "Klub"], [1500, "Ahli"], [1800, "Master Kandidat"], [2100, "Master"], [2400, "Grandmaster"]].filter(t => r >= t[0]).pop()[1];
