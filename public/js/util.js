export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// databaseURL tanpa garis miring di akhir (aman dipakai di semua halaman)
export const fbCfg = c => ({ ...c, databaseURL: (c.databaseURL || "").replace(/\/+$/, "") || undefined });
// Menjaga isian formulir dan fokus saat tampilan digambar ulang otomatis (mis. pembaruan data di latar).
export function keepForm(root, draw) {
  const a = document.activeElement, st = {};
  root.querySelectorAll("input[id],textarea[id],select[id]").forEach(el => { st[el.id] = el.type === "checkbox" ? el.checked : el.value; });
  const fid = a && root.contains(a) ? a.id : "", pos = fid && typeof a.selectionStart === "number" ? [a.selectionStart, a.selectionEnd] : null;
  draw();
  for (const [id, v] of Object.entries(st)) { const el = document.getElementById(id); if (!el || !root.contains(el)) continue; if (el.tagName === "SELECT" && ![...el.options].some(o => o.value === v)) continue; if (el.type === "checkbox") el.checked = v; else if (el.value !== v) el.value = v; }
  const el = fid && document.getElementById(fid); if (el && root.contains(el)) { el.focus(); if (pos) try { el.setSelectionRange(pos[0], pos[1]); } catch { /* tipe input tanpa seleksi */ } }
}
