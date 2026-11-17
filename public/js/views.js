import { esc } from "./util.js";
import * as G from "./pages.js";
import * as X from "./extra.js";
import { effCourses, eventsOn, evTime, ymd } from "./agenda.js";
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAME = { task: "Tugas", class: "Jadwal", scholar: "Beasiswa", cal: "Agenda", event: "Agenda", note: "Catatan" };
const NAV = [["home", "Beranda"], ["task", "Tugas"], ["class", "Jadwal"], ["cal", "Kalender"], ["note", "Catatan"], ["scholar", "Beasiswa"], ["ipk", "Nilai"], ["catur", "Catur"], ["set", "Atur"]];
const P = { catur: '<circle cx="12" cy="6.5" r="3"/><path d="M9.5 11h5M10 11c0 4-1.5 5-2.5 7.5h9C15.500 16 14 15 14 11M6 21h12"/>', home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', task: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  class: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  scholar: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  ipk: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', set: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', check: '<path d="M5 12l5 5 9-10"/>',
  theme: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>' };
const ic = n => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const ms = x => Date.parse(x.when + ":00+07:00");
const fmt = x => new Date(ms(x)).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const rel = t => { const d = t - Date.now(), a = Math.abs(d), h = a / 36e5, s = h < 1 ? Math.round(a / 6e4) + " menit" : h < 24 ? Math.round(h) + " jam" : Math.round(h / 24) + " hari"; return d < 0 ? ["Lewat " + s, "bad"] : [s + " lagi", h < 24 ? "warn" : "ok"]; };
const activeCourses = c => effCourses(c.courses, c.me, c.cfg.activeSemester || "");
const by = (c, t) => (t === "class" ? activeCourses(c) : c.items).filter(x => x.type === t && !x.done);
export const lists = items => [...new Set(["Utama", ...items.filter(x => x.type === "task").map(x => x.list || "Utama")])];
export function shell(c) {
  const link = cl => NAV.map(([k, n]) => `<button class="${cl}${k === c.view ? " on" : ""}" data-act="${k === "catur" ? "catur" : "nav"}" data-v="${k}" aria-label="${n}">${ic(k)}<span>${n}</span></button>`).join("");
  const body = c.view === "home" ? home(c) : c.view === "set" ? settings(c) : c.view === "cal" ? cal(c) : c.view === "class" ? schedule(c) : c.view === "note" ? X.notes(c) : c.view === "ipk" ? G.ipk(c) : listPage(c);
  const add = NAME[c.view] && c.view !== "class" ? `<button class="btn" data-act="add" data-t="${c.view === "cal" ? "event" : c.view}">${ic("plus")}<span>${c.view === "note" ? "Catatan baru" : c.view === "cal" ? "Agenda" : "Tambah"}</span></button>` : "";
  return `<header class="top"><div class="brand"><span class="logo">K</span>KampusPing</div><nav class="nv">${link("nl")}</nav><div class="actions"><button class="ib" data-act="theme" aria-label="Ganti tema">${ic("theme")}</button>${add}</div></header>${c.slow && !c.conn ? '<div class="banner">Belum terhubung ke database. Perubahan akan tersimpan saat tersambung. <a href="cek.html">Periksa koneksi</a></div>' : ""}
  <main class="page${c.view === "class" ? " wide" : ""}">${c.view === "home" ? "" : `<h1 class="ttl">${c.view === "set" ? "Pengaturan" : NAV.find(n => n[0] === c.view)[1]}</h1>`}${body}</main>
  <footer class="foot"><span>© 2026 KampusPing · Pengingat kuliah gratis</span><a href="admin.html">Dasbor admin</a></footer><nav class="tabs">${link("tb")}</nav>`;
}
function home(c) {
  const now = Date.now(), tasks = by(c, "task").sort((a, b) => ms(a) - ms(b)), wk = tasks.filter(x => ms(x) - now < 6048e5), W = new Date(now + 252e5), C = 276.5;
  const load = wk.reduce((s, x) => s + (+x.weight || 1), 0), lv = load < 6 ? ["Aman", "var(--ok)"] : load < 12 ? ["Padat", "var(--warn)"] : ["Overload", "var(--bad)"];
  const cls = by(c, "class").filter(x => x.day === W.getUTCDay()).sort((a, b) => a.time.localeCompare(b.time)), due = tasks.filter(x => ms(x) - now < 864e5), todayEv = eventsOn(c.items, W.toISOString().slice(0, 10));
  const hm = x => new Date(ms(x)).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).replace(".", ":");
  const ag = [...cls.map(x => ({ t: x.time, n: x.title, s: x.room || "Kuliah", k: "acc" })), ...todayEv.map(x => ({ t: x.allDay ? "00:00" : evTime(x), n: x.title, s: x.allDay ? "Seharian" : x.place || "Agenda", k: "acc" })), ...due.map(x => { const r = rel(ms(x)); return { t: hm(x), n: x.title, s: r[0], k: r[1] }; })].sort((a, b) => a.t.localeCompare(b.t));
  const sch = by(c, "scholar").sort((a, b) => ms(a) - ms(b))[0], h = W.getUTCHours(), hi = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  const ds = new Date(now).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
  const all = Object.values(c.me.attend || {}).flatMap(o => Object.values(o)), pct = all.length ? Math.round(all.filter(v => v === "h").length / all.length * 100) + "%" : "-";
  const st = (n, l) => `<div class="st"><b>${n}</b><span>${l}</span></div>`;
  return `${c.perm === "default" && c.isApp ? '<div class="card notice"><div class="grow"><b>Aktifkan notifikasi</b><p class="muted">Agar pengingat jadwal dan tugas masuk ke HP-mu.</p></div><button class="btn" data-act="push">Aktifkan</button></div>' : ""}<section class="hero"><p>${ds}</p><h1>${hi}, ${esc(c.user.displayName?.split(" ")[0] || "kamu")}.<br>Kuliah jadi lebih mudah dalam satu genggaman.</h1>
  <p class="lead">Hari ini ada ${cls.length} kelas, ${todayEv.length} agenda, dan ${due.length} tugas yang perlu perhatianmu.</p><div class="actions" style="justify-content:flex-start"><button class="btn light" data-act="add" data-t="task">+ Tambah tugas</button><button class="btn ghostw" data-act="add" data-t="event">+ Agenda</button><button class="btn ghostw" data-act="nav" data-v="cal">Lihat kalender</button></div></section>
  <section class="stats">${st(tasks.length, "tugas aktif")}${st(cls.length, "kelas hari ini")}${st(pct, "kehadiran")}${st(c.me.streak || 0, "streak hari")}</section>
  <form class="qa" id="qa"><input id="qa-t" maxlength="120" placeholder="Tambah tugas cepat: Laporan fisika besok 23.59" aria-label="Tambah tugas cepat" autocomplete="off"><button class="btn">Tambah</button></form>
  <div class="grid">${c.cfg.announce?.text ? `<div class="card s6 ann"><h3>Pengumuman</h3><p>${esc(c.cfg.announce.text)}</p></div>` : ""}
  <div class="card s4"><h3>Agenda hari ini</h3>${ag.map(a => `<div class="ag"><span class="tm">${a.t}</span><b>${esc(a.n)}</b><span class="badge ${a.k}">${esc(a.s)}</span></div>`).join("") || '<p class="muted">Agenda kosong. Nikmati harimu, atau mulai tugas berikutnya.</p>'}</div>
  <div class="card s2"><h3>Beban minggu ini</h3><div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="rg"/><circle cx="50" cy="50" r="44" class="rv" style="stroke:${lv[1]};stroke-dasharray:${(Math.min(load / 12, 1) * C).toFixed(1)} ${C}"/></svg><div><b style="color:${lv[1]}">${lv[0]}</b><small>${wk.length} tugas</small></div></div></div>
  <div class="card s4"><h3>Tugas terdekat</h3>${tasks.slice(0, 4).map(x => `<div class="row2" style="padding:6px 0"><b>${esc(x.title)}</b><small class="muted">${fmt(x)}</small></div>`).join("") || '<p class="muted">Belum ada tugas. Coba kolom tambah cepat di atas.</p>'}</div>
  <div class="card s2"><h3>Radar Beasiswa</h3>${sch ? `<b>${esc(sch.title)}</b><p class="muted">tutup ${fmt(sch)}</p><p class="muted">Berikutnya: ${esc(sch.step || "lengkapi berkas")}</p>` : '<p class="muted">Belum ada beasiswa yang dipantau.</p>'}</div>
  ${chessCard(c)}${rekap(c)}</div>`;
}
const chessCard = c => { const ch = c.me.chess, r = ch?.r || 1000, n = ch ? (String(ch.lv || "").match(/[12]/g) || []).length : 0;
  return `<div class="card s6 chessc"><div class="grow"><h3>♟ Teka-Teki Catur</h3><p class="muted">${ch ? `${X.chessTitle(r)} · skor ${r} · ${n} dari 1000 level selesai` : "1000 level teka-teki catur dengan skor dan peringkat antar pengguna."}</p></div><button class="btn" data-act="catur">${ch ? "Lanjut main" : "Mulai main"}</button></div>`; };
function cal(c) {
  const W = new Date(Date.now() + 252e5), base = new Date(Date.UTC(W.getUTCFullYear(), W.getUTCMonth() + (c.calOff || 0), 1)), y = base.getUTCFullYear(), m = base.getUTCMonth(), p = n => String(n).padStart(2, "0");
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), today = W.toISOString().slice(0, 10), sel = c.calSel || today, ev = {}, wd = new Set(activeCourses(c).map(x => x.day));
  c.items.filter(x => x.type !== "event" && x.when && !x.done).forEach(x => (ev[x.when.slice(0, 10)] ||= []).push(x));
  const days = Array.from({ length: dim }, (_, i) => {
    const k = `${y}-${p(m + 1)}-${p(i + 1)}`, dw = (base.getUTCDay() + i) % 7, e = ev[k] || [], ae = eventsOn(c.items, k);
    const dots = `${wd.has(dw) ? '<i class="dotk"></i>' : ""}${e.some(x => x.type === "task") ? '<i class="dott"></i>' : ""}${e.some(x => x.type === "scholar") ? '<i class="dotb"></i>' : ""}${ae.length ? '<i class="dote"></i>' : ""}`;
    return `<button class="cd${k === today ? " today" : ""}${k === sel ? " sel" : ""}${dw === 0 ? " min" : ""}" data-act="calDay" data-d="${k}"><span>${i + 1}</span><em class="dots">${dots}</em></button>`;
  });
  const dow = new Date(sel + "T00:00:00Z").getUTCDay(), list = [...eventsOn(c.items, sel).map(x => X.eventRow(x, sel)), ...(ev[sel] || []).map(x => `<div class="item"><div class="grow"><b>${esc(x.title)}</b><small>${x.type === "scholar" ? "Beasiswa" : "Tugas"} · ${fmt(x)}</small></div></div>`),
    ...activeCourses(c).filter(x => x.day === dow).sort((a, b) => a.time.localeCompare(b.time)).map(x => `<div class="item"><div class="dayb">${esc(x.time)}</div><div class="grow"><b>${esc(x.title)}</b><small>Kuliah${x.room ? " · " + esc(x.room) : ""}</small></div></div>`)];
  return `<div class="calwrap"><div class="card calc"><div class="row2"><button class="ib" data-act="calNav" data-n="-1" aria-label="Bulan lalu">‹</button><b class="mon">${base.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" })}</b><button class="ib" data-act="calNav" data-n="1" aria-label="Bulan depan">›</button></div>
  <div class="cal">${["M", "S", "S", "R", "K", "J", "S"].map(d => `<b>${d}</b>`).join("")}${Array(base.getUTCDay()).fill("<span></span>").join("")}${days.join("")}</div>
  <div class="row2"><button class="chip" data-act="calToday">Hari ini</button><small class="muted leg"><i class="dotk"></i>kuliah <i class="dott"></i>tugas <i class="dotb"></i>beasiswa <i class="dote"></i>agenda</small></div></div>
  <div><div class="row2" style="margin:0 0 10px"><h3 class="muted" style="margin:0;font-weight:600">${DAYS[dow]}, ${sel.split("-").reverse().join("/")}</h3><button class="btn ghost" data-act="add" data-t="event">+ Agenda</button></div>${list.join("") || '<div class="empty">Tidak ada agenda di hari ini.</div>'}</div></div>`;
}
const hue = s => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7);
const mins = t => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
const hhmm = n => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const endOf = x => { const a = mins(x.time), b = x.end ? mins(x.end) : 0; return b > a ? b : a + 100; };
const range = x => `${x.time}${x.end && mins(x.end) > mins(x.time) ? " – " + x.end : ""}`;
function lanes(cs) { // kelas yang waktunya bertumpuk dibagi ke jalur berdampingan
  const out = []; let cluster = [], cEnd = 0;
  const flush = () => { const k = Math.max(1, ...cluster.map(o => o.l + 1)); cluster.forEach(o => { o.k = k; }); out.push(...cluster); cluster = []; };
  for (const x of cs) {
    const st = mins(x.time); if (cluster.length && st >= cEnd) flush();
    const used = cluster.filter(o => endOf(o.x) > st).map(o => o.l); let l = 0; while (used.includes(l)) l++;
    cluster.push({ x, l }); cEnd = Math.max(cEnd, endOf(x));
  }
  if (cluster.length) flush(); return out;
}
function schedule(c) {
  const sems = [...c.sems].sort((a, b) => a.order - b.order), sel = c.semSel || c.cfg.activeSemester || "", W = new Date(Date.now() + 252e5), td = W.getUTCDay(), nowM = W.getUTCHours() * 60 + W.getUTCMinutes();
  const noSem = !sems.length || !sel, list = effCourses(c.courses, c.me, noSem ? "" : sel), order = [1, 2, 3, 4, 5, 6, 0], byTime = (a, b) => a.time.localeCompare(b.time);
  const dsel = order.includes(c.schDay ?? td) ? (c.schDay ?? td) : order[0];
  const mon = new Date(Date.UTC(W.getUTCFullYear(), W.getUTCMonth(), W.getUTCDate() - ((td + 6) % 7))), dd = d => new Date(mon.getTime() + ((d + 6) % 7) * 864e5);
  const dl = d => dd(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }), evs = d => eventsOn(c.items, ymd(dd(d)));
  const evb = order.flatMap(d => evs(d).filter(x => !x.allDay).map(x => ({ id: x.id, title: x.title, day: d, time: evTime(x), end: x.end || "", room: x.place || "", ev: true }))), all = [...list, ...evb];
  const chips = sems.length > 1 ? `<div class="tools">${sems.map(s => `<button class="chip${s.id === sel ? " on" : ""}" data-act="semSel" data-s="${esc(s.id)}">${esc(s.name)}${s.id === c.cfg.activeSemester ? " · aktif" : ""}</button>`).join("")}</div>` : sems.length ? `<p class="muted" style="margin-bottom:10px">${esc(sems[0].name)}</p>` : "";
  const isActive = noSem || !c.cfg.activeSemester || sel === c.cfg.activeSemester, tcs = isActive ? list.filter(x => x.day === td).sort(byTime) : [], nextI = tcs.findIndex(x => mins(x.time) > nowM);
  const pres = tcs.length ? `<div class="card pres"><div class="sc-h"><h3 style="margin:0">Presensi hari ini · ${DAYS[td]}</h3><small class="muted">Catatan pribadi, bukan presensi resmi</small></div>${tcs.map((x, i) => `<div class="pr"><div class="prt">${esc(range(x))}</div><div class="grow"><b>${esc(x.title)}</b><small>${[x.room, x.lecturer].filter(Boolean).map(esc).join(" · ")}</small></div>${nowM >= mins(x.time) && nowM < endOf(x) ? '<span class="badge ok">Berlangsung</span>' : i === nextI ? '<span class="badge acc">Berikutnya</span>' : ""}${attChips(c, x)}</div>`).join("")}</div>` : "";
  let body = '<div class="empty"><p>Belum ada jadwal kuliah. Jadwal bawaan diisi admin, dan kamu bisa menambah jadwal pribadi.</p></div>';
  if (all.length) {
    const s0 = Math.floor(Math.min(...all.map(x => mins(x.time))) / 60) * 60, e0 = Math.ceil(Math.max(...all.map(endOf)) / 60) * 60;
    const hours = Array.from({ length: (e0 - s0) / 60 + 1 }, (_, i) => `<span style="top:calc(${i * 60}*var(--px))">${hhmm(s0 + i * 60)}</span>`).join("");
    const adl = d => evs(d).filter(x => x.allDay).map(x => `<small class="adl" data-act="edit" data-id="${x.id}">📅 ${esc(x.title)}</small>`).join("");
    const blk = ({ x, l, k }) => `<article class="tc${k > 1 ? " half" : ""}${x.ev ? " ev" : ""}" role="button" tabindex="0" data-act="${x.ev ? "edit" : "clsEdit"}" data-id="${esc(x.id)}" style="--h:${hue(x.title)};--s:${mins(x.time) - s0};--d:${endOf(x) - mins(x.time)};--l:${l};--k:${k}"><span class="tm2">${esc(range(x))}</span><b>${esc(x.title)}</b>${x.room ? `<small>${esc(x.room)}</small>` : ""}${x.lecturer ? `<small>${esc(x.lecturer)}</small>` : ""}</article>`;
    const tt = `<div class="tt" style="--n:${order.length};--tot:${e0 - s0}"><div class="tt-h"></div>${order.map(d => `<div class="tt-h${d === td ? " today" : ""}">${DAYS[d]}<small>${dl(d)}</small>${adl(d)}</div>`).join("")}<div class="tt-t">${hours}</div>
    ${order.map(d => `<div class="tt-c${d === td ? " today" : ""}">${lanes(all.filter(x => x.day === d).sort(byTime)).map(blk).join("")}${d === td && isActive && nowM >= s0 && nowM <= e0 ? `<i class="now" style="top:calc(${nowM - s0}*var(--px))"></i>` : ""}</div>`).join("")}</div>`;
    const card = x => `<article class="cls" role="button" tabindex="0" data-act="clsEdit" data-id="${esc(x.id)}" style="--h:${hue(x.title)}"><div class="ct">${esc(range(x))}</div><b>${esc(x.title)}</b><small>${[x.room, x.lecturer].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</small>${x.own ? '<span class="badge acc">Pribadi</span> ' : x.mod ? '<span class="badge warn">Diubah</span> ' : ""}${pctOf(c, x) === null ? "" : `<span class="badge ${pctOf(c, x) < 75 ? "bad" : "ok"}">Kehadiran ${pctOf(c, x)}%</span>`}</article>`;
    const ecard = x => `<article class="cls evc" role="button" tabindex="0" data-act="edit" data-id="${x.id}" style="--h:265"><div class="ct">${x.allDay ? "Seharian" : esc(range({ time: evTime(x), end: x.end }))}</div><b>${esc(x.title)}</b><small>${esc(x.place || "Agenda pribadi")}</small><span class="badge acc">Agenda</span></article>`;
    const col = d => { const m = [...list.filter(x => x.day === d).map(x => [x.time, card(x)]), ...evs(d).map(x => [x.allDay ? "00:00" : evTime(x), ecard(x)])].sort((a, b) => a[0].localeCompare(b[0]));
      return `<section class="col${d === td ? " today" : ""}" data-d="${d}"><h3>${DAYS[d]}${d === td ? " · hari ini" : ""}<small>${dl(d)}</small></h3>${m.map(z => z[1]).join("") || '<p class="muted none">Tidak ada kuliah atau agenda</p>'}</section>`; };
    body = `<div class="dtabs">${order.map(d => `<button class="chip${d === dsel ? " on" : ""}${d === td ? " tdy" : ""}" data-act="schDay" data-d="${d}">${DAYS[d].slice(0, 3)}</button>`).join("")}</div><div class="wk" data-sel="${dsel}">${order.map(col).join("")}</div>${tt}`;
  }
  return `${X.schedTools(c)}${chips}${pres}${body}${X.siakadCard(c)}`;
}
function listPage(c) {
  const t = c.view, chip = ([k, n]) => `<button class="chip${c.flt === k ? " on" : ""}" data-act="flt" data-f="${k}">${n}</button>`;
  const fc = [["active", "Aktif"], ["done", "Selesai"], ["all", "Semua"]].map(chip).join("");
  const ls = t !== "task" ? "" : [["*all", "Semua daftar"], ["*star", "★ Berbintang"], ...lists(c.items).map(l => [l, esc(l)])].map(([l, n]) => `<button class="chip${c.lst === l ? " on" : ""}" data-act="lst" data-l="${esc(l)}">${n}</button>`).join("");
  const clr = c.items.some(x => x.type === t && x.done) ? '<button class="btn ghost" data-act="clearDone">Hapus yang selesai</button>' : "";
  return `${t === "scholar" ? scholarCard(c) : ""}<div class="tools"><input class="search" id="q" type="search" placeholder="Cari..." value="${esc(c.q)}" aria-label="Cari">${fc}</div>${ls || clr ? `<div class="tools">${ls}${clr}</div>` : ""}<div id="rows">${rows(c)}</div>`;
}
function scholarCard(c) {
  const have = new Set(c.items.filter(x => x.type === "scholar").map(x => x.title.toLowerCase())), td = new Date(Date.now() + 252e5).toISOString().slice(0, 10);
  const L = c.scholars.filter(s => !s.d || s.d >= td).sort((a, b) => (a.d || "9999").localeCompare(b.d || "9999")).slice(0, 15);
  const up = c.smeta.updated ? new Date(c.smeta.updated).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB" : "";
  const row = s => {
    const r = s.d ? rel(Date.parse(s.d + "T23:59:00+07:00")) : null, url = /^https?:\/\//.test(s.u) ? s.u : "";
    const tutup = s.d ? "Tutup " + new Date(s.d + "T12:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) + (s.ap ? " (perkiraan)" : "") : "Tanggal belum terdeteksi, cek situs resmi";
    return `<div class="sc"><div class="sc-m"><b>${esc(s.t)}</b><small>${esc(s.s || "")} · ${tutup}${r ? ` <span class="badge ${r[1]}">${r[0]}</span>` : ""}</small></div>
    <div class="sc-a">${url ? `<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buka</a>` : ""}${s.d ? (have.has(s.t.toLowerCase().slice(0, 120)) ? '<span class="badge ok">Dipantau</span>' : `<button class="btn" data-act="track" data-id="${esc(s.id)}">Pantau</button>`) : ""}</div></div>`;
  };
  return `<div class="card" style="margin-bottom:16px"><div class="sc-h"><h3 style="margin:0">Beasiswa aktif, dicarikan otomatis</h3><small class="muted">${up ? "Diperbarui " + up : "Belum ada pembaruan"}</small></div>${L.map(row).join("") || '<p class="muted">Belum ada hasil. Pencarian berjalan otomatis tiap pagi dan setiap kali web diperbarui.</p>'}<small class="muted" style="display:block;margin-top:10px">Diambil otomatis dari berita dan sumber terbuka. Selalu cek situs resmi sebelum mendaftar.</small></div>`;
}
function attChips(c, x) {
  const td = new Date(Date.now() + 252e5).toISOString().slice(0, 10), rec = (c.me.attend || {})[x.id] || {}, v = Object.values(rec), pct = v.length ? Math.round(v.filter(s => s === "h").length / v.length * 100) : null;
  return `<div class="prc">${["h", "i", "s", "a"].map(k => `<button class="chip${rec[td] === k ? " on" : ""}" data-act="att" data-id="${x.id}" data-s="${k}">${{ h: "Hadir", i: "Izin", s: "Sakit", a: "Alpa" }[k]}</button>`).join("")}${pct === null ? "" : `<span class="badge ${pct < 75 ? "bad" : "ok"}">${pct}% (${v.length}x)</span>`}</div>`;
}
const pctOf = (c, x) => { const v = Object.values((c.me.attend || {})[x.id] || {}); return v.length ? Math.round(v.filter(s => s === "h").length / v.length * 100) : null; };
function rekap(c) {
  const wk = Date.now() - 6048e5, done = c.items.filter(x => x.done && x.doneAt > wk).length, st = (n, l) => `<div class="st"><b>${n}</b><span>${l}</span></div>`;
  return `<div class="card s6"><h3>Rekap aktivitas 7 hari</h3><div class="mini">${st(done, "tugas selesai")}${st(Object.keys(c.me.notes || {}).length, "catatan")}${st(c.me.best || 0, "rekor streak")}</div></div>`;
}
const subKeys = o => Object.entries(o || {}).sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)));
export function rows(c) {
  const t = c.view, q = c.q.toLowerCase();
  let a = c.items.filter(x => x.type === t && (c.flt === "all" || (c.flt === "done") === !!x.done));
  if (t === "task" && c.lst === "*star") a = a.filter(x => x.star); else if (t === "task" && c.lst && c.lst !== "*all") a = a.filter(x => (x.list || "Utama") === c.lst);
  a = a.filter(x => (x.title + (x.course || "") + (x.note || "")).toLowerCase().includes(q));
  a.sort((x, y) => (y.star ? 1 : 0) - (x.star ? 1 : 0) || ms(x) - ms(y));
  if (!a.length) return `<div class="empty"><p>${c.q ? "Tidak ada hasil." : "Belum ada " + NAME[t].toLowerCase() + "."}</p>${c.q ? "" : `<button class="btn" data-act="add" data-t="${t}">${ic("plus")}Tambah ${NAME[t].toLowerCase()}</button>`}</div>`;
  return a.map(x => {
    const r = !x.done ? rel(ms(x)) : null, W = ["", "Ringan", "Sedang", "Berat"][x.weight] || "", rp = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" }[x.repeat];
    const meta = `${x.course ? esc(x.course) + " · " : ""}${fmt(x)}${x.list && x.list !== "Utama" ? " · " + esc(x.list) : ""}`;
    const sb = x.subs ? `<div class="subs">${subKeys(x.subs).map(([k, s]) => `<button class="sub${s.d ? " d" : ""}" data-act="sub" data-id="${x.id}" data-k="${esc(k)}">${s.d ? "☑" : "☐"} ${esc(s.t)}</button>`).join("")}</div>` : "";
    return `<div class="item${x.done ? " is-done" : ""}"><button class="ck" data-act="done" data-id="${x.id}" data-to="${!x.done}" aria-label="${x.done ? "Batalkan selesai" : "Tandai selesai"}">${x.done ? ic("check") : ""}</button>
    <div class="grow"><b>${esc(x.title)}</b><small>${meta}</small></div>
    <div class="acts">${r ? `<span class="badge ${r[1]}">${r[0]}</span>` : ""}${W && !x.done ? `<span class="badge">${W}</span>` : ""}${rp ? `<span class="badge">↻ ${rp}</span>` : ""}${t === "task" ? `<button class="ib star${x.star ? " on" : ""}" data-act="star" data-id="${x.id}" aria-label="Bintang">${x.star ? "★" : "☆"}</button>` : ""}
    ${x.link && /^https:\/\//.test(x.link) ? `<a class="ib" href="${esc(x.link)}" target="_blank" rel="noopener noreferrer" aria-label="Buka tautan">↗</a>` : ""}<button class="ib" data-act="edit" data-id="${x.id}" aria-label="Ubah">${ic("edit")}</button><button class="ib" data-act="del" data-id="${x.id}" aria-label="Hapus">${ic("trash")}</button></div>
    ${x.note ? `<p class="note">${esc(x.note)}</p>` : ""}${sb}</div>`;
  }).join("");
}
const f = (l, n, v, a = "") => `<label>${l}<input name="${n}" value="${esc(v ?? "")}" ${a} maxlength="120"></label>`;
const sel = (l, n, opts, v) => `<label>${l}<select name="${n}">${opts.map(([k, t]) => `<option value="${k}"${String(k) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
export function form(t, x, id, ls = []) {
  if (t === "event") return X.eventForm(x, id);
  if (t === "cls") return X.clsForm(x, id);
  const F = { task: f("Judul", "title", x.title, "required") + f("Mata kuliah", "course", x.course) + f("Deadline", "when", x.when, 'type="datetime-local" required') + sel("Bobot", "weight", [[1, "Ringan"], [2, "Sedang"], [3, "Berat"]], x.weight || 1)
    + `<label>Daftar<input name="list" value="${esc(x.list || "Utama")}" list="dl" maxlength="40"><datalist id="dl">${ls.map(l => `<option value="${esc(l)}">`).join("")}</datalist></label>`
    + sel("Ulangi", "repeat", [["", "Tidak"], ["daily", "Setiap hari"], ["weekly", "Setiap minggu"], ["monthly", "Setiap bulan"]], x.repeat || "")
    + f("Langkah pertama (10 menit)", "step", x.step) + f("Tautan lampiran (https)", "link", x.link, 'type="url" maxlength="300" placeholder="https://"')
    + `<label>Catatan<textarea name="note" rows="2" maxlength="500">${esc(x.note || "")}</textarea></label><label>Sub-tugas (satu per baris)<textarea name="subs" rows="3">${esc(subKeys(x.subs).map(([, s]) => s.t).join("\n"))}</textarea></label><label class="sw"><input type="checkbox" name="star"${x.star ? " checked" : ""}> Beri bintang</label>`,
    scholar: f("Nama beasiswa", "title", x.title, "required") + f("Tanggal penutupan", "when", x.when, 'type="datetime-local" required') + f("Berkas berikutnya yang disiapkan", "step", x.step) }[t];
  return `<form data-t="${t}" data-id="${id || ""}"><h2>${id ? "Ubah" : "Tambah"} ${NAME[t].toLowerCase()}</h2>${F}<div class="actions"><button class="btn ghost" value="cancel" formnovalidate>Batal</button><button class="btn" value="save">Simpan</button></div></form>`;
}
const settings = c => X.settingsPage(c);
