export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// databaseURL tanpa garis miring di akhir (aman dipakai di semua halaman)
export const fbCfg = c => ({ ...c, databaseURL: (c.databaseURL || "").replace(/\/+$/, "") || undefined });
