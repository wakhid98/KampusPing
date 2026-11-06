import { esc } from "./gate.js";
import * as G from "./pages.js";
export const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAME = { task: "Tugas", class: "Jadwal", scholar: "Beasiswa" };
const NAV = [["home", "Beranda"], ["task", "Tugas"], ["class", "Jadwal"], ["scholar", "Beasiswa"], ["fokus", "Fokus"], ["ipk", "Nilai"], ["set", "Pengaturan"]];
const P = { home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', task: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  class: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', scholar: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  set: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', check: '<path d="M5 12l5 5 9-10"/>', fokus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>', ipk: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' };
const ic = n => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
export const ms = x => Date.parse(x.when + ":00+07:00");
export const fmt = x => new Date(ms(x)).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const rel = t => { const d = t - Date.now(), a = Math.abs(d), h = a / 36e5, s = h < 1 ? Math.round(a / 6e4) + " menit" : h < 24 ? Math.round(h) + " jam" : Math.round(h / 24) + " hari"; return d < 0 ? ["Lewat " + s, "bad"] : [s + " lagi", h < 24 ? "warn" : "ok"]; };
export const login = G.login;
export function shell(c) {
  const nav = cl => NAV.map(([k, n]) => `<button class="${cl}${k === c.view ? " on" : ""}" data-act="nav" data-v="${k}">${ic(k)}<span>${n}</span></button>`).join("");
  const body = c.view === "home" ? home(c) : c.view === "set" ? settings(c) : c.view === "fokus" ? G.fokus(c) : c.view === "ipk" ? G.ipk(c) : listPage(c);
  const add = NAME[c.view] && (c.view !== "class" || c.admin) ? `<button class="btn" data-act="add" data-t="${c.view}">${ic("plus")}Tambah</button>` : "";
  return `<div class="shell"><aside><div class="brand"><span class="logo">K</span>KampusPing</div>${nav("nv")}<div class="grow"></div><div class="me">${esc(c.user.displayName || c.user.email)}${c.admin ? " · Admin" : ""}</div></aside>
  <main><header class="top"><h1>${NAV.find(n => n[0] === c.view)[1]}</h1>${add}</header><div class="page">${body}</div></main><nav class="tabs">${nav("tb")}</nav></div>`;
}
const by = (c, t) => (t === "class" ? c.courses : c.items).filter(x => x.type === t && !x.done);
function home(c) {
  const tasks = by(c, "task").sort((a, b) => ms(a) - ms(b)), wk = tasks.filter(x => ms(x) - Date.now() < 6048e5);
  const load = wk.reduce((s, x) => s + (+x.weight || 1), 0), lv = load < 6 ? ["hijau", "Aman"] : load < 12 ? ["kuning", "Padat"] : ["merah", "Overload"];
  const dow = new Date(Date.now() + 252e5).getUTCDay(), cls = by(c, "class").filter(x => x.day === dow).sort((a, b) => a.time.localeCompare(b.time));
  const sch = by(c, "scholar").sort((a, b) => ms(a) - ms(b))[0];
  const li = (x, s) => `<div class="row2"><b>${esc(x.title)}</b><small class="muted">${s}</small></div>`;
  return `<p class="muted" style="margin-bottom:14px">Halo, ${esc(c.user.displayName?.split(" ")[0] || "kamu")}. Hari ini mau mulai dari mana?</p><div class="grid">${c.cfg.announce?.text ? `<div class="card s6 ann"><h3>Pengumuman</h3><p>${esc(c.cfg.announce.text)}</p></div>` : ""}
  <div class="card big s3"><h3>Streak aksi</h3><div class="num" style="color:var(--sig)">${c.me.streak || 0} hari</div><p class="muted">Rekor ${c.me.best || 0} hari</p></div>
  <div class="card s3"><h3>Beban minggu ini</h3><div class="num ${lv[0]}">${lv[1]}</div><p class="muted">${wk.length} tugas jatuh tempo dalam 7 hari</p></div>
  <div class="card s4"><h3>Tugas terdekat</h3><div class="stack">${tasks.slice(0, 4).map(x => li(x, fmt(x))).join("") || '<p class="muted">Belum ada tugas.</p>'}</div></div>
  <div class="card s2"><h3>Kuliah hari ini</h3><div class="stack">${cls.map(x => li(x, x.time)).join("") || '<p class="muted">Tidak ada kelas.</p>'}</div></div>
  <div class="card s6"><h3>Radar Beasiswa</h3>${sch ? li(sch, "tutup " + fmt(sch)) + `<p class="muted">Berikutnya: ${esc(sch.step || "lengkapi berkas")}</p>` : '<p class="muted">Belum ada beasiswa yang dipantau.</p>'}</div></div>`;
}
function listPage(c) {
  const chips = c.view === "class" ? "" : [["active", "Aktif"], ["done", "Selesai"], ["all", "Semua"]].map(([k, n]) => `<button class="chip${c.flt === k ? " on" : ""}" data-act="flt" data-f="${k}">${n}</button>`).join("");
  return `<div class="tools"><input class="search" id="q" type="search" placeholder="Cari..." value="${esc(c.q)}" aria-label="Cari">${chips}</div><div id="rows">${rows(c)}</div>`;
}
export function rows(c) {
  const t = c.view, q = c.q.toLowerCase();
  let a = (t === "class" ? c.courses : c.items).filter(x => x.type === t && (t === "class" || c.flt === "all" || (c.flt === "done") === !!x.done));
  a = a.filter(x => (x.title + (x.course || "") + (x.room || "")).toLowerCase().includes(q));
  a.sort((x, y) => t === "class" ? x.day - y.day || x.time.localeCompare(y.time) : ms(x) - ms(y));
  if (!a.length) return `<div class="empty"><p>${c.q ? "Tidak ada hasil." : "Belum ada " + NAME[t].toLowerCase() + "."}</p>${c.q ? "" : `<button class="btn" data-act="add" data-t="${t}">${ic("plus")}Tambah ${NAME[t].toLowerCase()}</button>`}</div>`;
  return a.map(x => {
    const r = t !== "class" && !x.done ? rel(ms(x)) : null, W = ["", "Ringan", "Sedang", "Berat"][x.weight] || "";
    const meta = t === "class" ? `${x.time}${x.room ? " · " + esc(x.room) : ""}${x.lecturer ? " · " + esc(x.lecturer) : ""}` : `${esc(x.course || "")}${x.course ? " · " : ""}${fmt(x)}`;
    return `<div class="item${x.done ? " is-done" : ""}">${t !== "class" ? `<button class="ck" data-act="done" data-id="${x.id}" data-to="${!x.done}" aria-label="${x.done ? "Batalkan selesai" : "Tandai selesai"}">${x.done ? ic("check") : ""}</button>` : `<div class="dayb">${DAYS[x.day].slice(0, 3)}</div>`}
    <div class="grow"><b>${esc(x.title)}</b><small>${meta}</small></div>${W && !x.done ? `<span class="badge">${W}</span>` : ""}${r ? `<span class="badge ${r[1]}">${r[0]}</span>` : ""}
    ${t !== "class" || c.admin ? `<button class="ib" data-act="edit" data-id="${x.id}" aria-label="Ubah">${ic("edit")}</button><button class="ib" data-act="del" data-id="${x.id}" aria-label="Hapus">${ic("trash")}</button>` : ""}</div>`;
  }).join("");
}
const f = (l, n, v, a = "") => `<label>${l}<input name="${n}" value="${esc(v ?? "")}" ${a}></label>`;
const sel = (l, n, opts, v) => `<label>${l}<select name="${n}">${opts.map(([k, t]) => `<option value="${k}"${String(k) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
export function form(t, x, id) {
  const F = { task: f("Judul", "title", x.title, "required") + f("Mata kuliah", "course", x.course) + f("Deadline", "when", x.when, 'type="datetime-local" required') + sel("Bobot", "weight", [[1, "Ringan"], [2, "Sedang"], [3, "Berat"]], x.weight || 1) + f("Langkah pertama (10 menit)", "step", x.step),
    class: f("Mata kuliah", "title", x.title, "required") + sel("Hari", "day", DAYS.map((d, i) => [i, d]), x.day ?? 1) + f("Jam mulai", "time", x.time, 'type="time" required') + f("Ruang", "room", x.room) + f("Dosen", "lecturer", x.lecturer),
    scholar: f("Nama beasiswa", "title", x.title, "required") + f("Tanggal penutupan", "when", x.when, 'type="datetime-local" required') + f("Berkas berikutnya yang disiapkan", "step", x.step) }[t];
  return `<form data-t="${t}" data-id="${id || ""}"><h2>${id ? "Ubah" : "Tambah"} ${NAME[t].toLowerCase()}</h2>${F}<div class="actions"><button class="btn ghost" value="cancel" formnovalidate>Batal</button><button class="btn" value="save">Simpan</button></div></form>`;
}
function settings(c) {
  const p = c.me.prefs || {}, on = k => p[k] !== false ? "checked" : "";
  const sw = (k, l) => `<label class="sw"><input type="checkbox" data-pref="${k}" ${on(k)}>${l}</label>`;
  return `<div class="stack">
  <div class="card stack"><h3>Akun</h3><div class="row2"><span>${esc(c.user.email || "")}</span><button class="btn ghost" data-act="out">Keluar</button></div></div>
  <div class="card stack"><h3>Kanal notifikasi</h3>${f("Telegram Chat ID (opsional)", "chat", c.me.tgChatId, 'id="chat" placeholder="mis. 123456789"')}
   <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveChat">Simpan Chat ID</button><button class="btn ghost" data-act="push">Aktifkan notifikasi web</button></div></div>
  <div class="card stack"><h3>Jenis pengingat</h3>${sw("task", "Tugas (H-7, H-3, H-1, 3 jam)")}${sw("class", "Kuliah (30 menit sebelum)")}${sw("scholar", "Beasiswa (H-14 sampai H-1)")}${sw("report", "Ringkasan pagi dan laporan malam")}</div>
  <div class="card stack"><h3>Gerbang Aksi</h3>${sel("Durasi sesi", "gm", [[5, "5 menit"], [10, "10 menit"], [15, "15 menit"], [25, "25 menit"]], p.gateMin || 10).replace("<select", '<select data-gm="1"')}</div>
  ${G.adminCard(c)}<div class="card stack"><h3>Data</h3><button class="btn danger" data-act="clearDone">Hapus semua item yang sudah selesai</button></div></div>`;
}
