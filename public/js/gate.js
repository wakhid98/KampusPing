import { patchMe } from "./store.js";
const wib = off => new Date(Date.now() + 7 * 36e5 - off).toISOString().slice(0, 10);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const needGate = me => me.lastDone !== wib(0);
// Gerbang Aksi: dashboard terkunci sampai timer 10 menit selesai + catatan diisi.
export function runGate(el, uid, me, task, onDone) {
  let left = 600;
  el.hidden = false;
  el.innerHTML = `<div class="gate-card"><h1>Mulai dulu. Dashboard menyusul.</h1>
  <p class="muted">Satu tugas, 10 menit. Timer berhenti kalau kamu pindah tab.</p>
  <div class="focus"><b>${esc(task.title)}</b><small>${esc(task.step || "Kerjakan bagian pertama saja")}</small></div>
  <div class="clock" id="clock">10:00</div>
  <button class="btn big" id="go">Mulai 10 menit</button>
  <div id="after" hidden style="display:none;gap:12px"><textarea id="note" rows="3" placeholder="Apa yang barusan kamu kerjakan?"></textarea>
  <button class="btn big" id="fin" disabled>Buka dashboard</button></div></div>`;
  const q = s => el.querySelector(s), tick = () => { q("#clock").textContent = `${String(left / 60 | 0).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`; };
  q("#go").onclick = e => {
    e.target.disabled = true;
    const t = setInterval(() => {
      if (!document.hidden) left--;
      tick();
      if (left <= 0) { clearInterval(t); q("#after").hidden = false; q("#after").style.display = "grid"; q("#go").hidden = true; }
    }, 1000);
  };
  q("#note").oninput = e => q("#fin").disabled = e.target.value.trim().length < 5;
  q("#fin").onclick = async () => {
    const streak = me.lastDone === wib(864e5) ? (me.streak || 0) + 1 : 1;
    const upd = { lastDone: wib(0), streak, best: Math.max(me.best || 0, streak), lastNote: q("#note").value.trim() };
    await patchMe(uid, upd); Object.assign(me, upd); el.hidden = true; onDone();
  };
}
