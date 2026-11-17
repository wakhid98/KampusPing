// Mesin catur ringkas (papan 0x88) dengan subset API chess.js 0.10, tanpa pustaka luar.
// Urutan langkah sengaja sama dengan chess.js agar puzzle yang dibangkitkan game identik.
const FILES = "abcdefgh", LET = [" ", "p", "n", "b", "r", "q", "k"], PC = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
const KN = [14, 31, 33, 18, -14, -31, -33, -18], BI = [15, 17, -15, -17], RO = [16, 1, -16, -1], QK = [15, 16, 17, 1, -15, -16, -17, -1];
const PAWN_D = [[16, 32, 15, 17], [-16, -32, -15, -17]]; // putih, hitam: maju 1, maju 2, tangkap kiri/kanan (urutan chess.js)
const CR = new Int8Array(128).fill(15); CR[0] = 13; CR[7] = 14; CR[4] = 12; CR[112] = 7; CR[119] = 11; CR[116] = 3;
const sqName = s => FILES[s & 7] + ((s >> 4) + 1), sqNum = n => (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97);
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export class Chess {
  constructor(fen) { this.load(fen || START); }
  load(fen) {
    const [pl, tn = "w", cs = "-", ep = "-", hm = "0", fm = "1"] = String(fen).trim().split(/\s+/);
    this.b = new Int8Array(128); this.k = [-1, -1];
    let r = 7, f = 0;
    for (const ch of pl) {
      if (ch === "/") { r--; f = 0; }
      else if (ch >= "1" && ch <= "8") f += +ch;
      else { const t = PC[ch.toLowerCase()], c = ch === ch.toLowerCase() ? 1 : 0, s = r * 16 + f; this.b[s] = t | (c << 3); if (t === 6) this.k[c] = s; f++; }
    }
    this.t = tn === "b" ? 1 : 0;
    this.cr = (cs.includes("K") ? 1 : 0) | (cs.includes("Q") ? 2 : 0) | (cs.includes("k") ? 4 : 0) | (cs.includes("q") ? 8 : 0);
    this.ep = ep === "-" ? -1 : sqNum(ep); this.hm = +hm || 0; this.fm = +fm || 1; this.h = []; this.mc = null;
    return true;
  }
  att(s, c) { // apakah petak s diserang warna c
    const b = this.b, hi = c << 3, pd = c ? [15, 17] : [-15, -17];
    for (const d of pd) { const q = s + d; if (!(q & 0x88) && b[q] === (1 | hi)) return true; }
    for (const d of KN) { const q = s + d; if (!(q & 0x88) && b[q] === (2 | hi)) return true; }
    for (const d of QK) { const q = s + d; if (!(q & 0x88) && b[q] === (6 | hi)) return true; }
    for (const d of BI) for (let q = s + d; !(q & 0x88); q += d) { const p = b[q]; if (p) { if (p === (3 | hi) || p === (5 | hi)) return true; break; } }
    for (const d of RO) for (let q = s + d; !(q & 0x88); q += d) { const p = b[q]; if (p) { if (p === (4 | hi) || p === (5 | hi)) return true; break; } }
    return false;
  }
  pm(out, f, t, c, last) {
    if ((t >> 4) === last) for (const pr of [5, 4, 3, 2]) out.push({ f, t, p: 1, c, pr, fl: c ? "pc" : "p" });
    else out.push({ f, t, p: 1, c, pr: 0, fl: c ? "c" : "n" });
  }
  gen() { // langkah pseudo-legal, urutan = chess.js (a8..h1)
    const b = this.b, us = this.t, them = us ^ 1, out = [], pd = PAWN_D[us], last = us ? 0 : 7, start = us ? 6 : 1;
    for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) {
      const s = r * 16 + f, p = b[s]; if (!p || (p >> 3) !== us) continue;
      const t = p & 7;
      if (t === 1) {
        let q = s + pd[0];
        if (!b[q]) { this.pm(out, s, q, 0, last); const q2 = s + pd[1]; if (r === start && !b[q2]) out.push({ f: s, t: q2, p: 1, c: 0, pr: 0, fl: "b" }); }
        for (let j = 2; j < 4; j++) {
          q = s + pd[j]; if (q & 0x88) continue; const x = b[q];
          if (x && (x >> 3) === them) this.pm(out, s, q, x & 7, last); else if (q === this.ep) out.push({ f: s, t: q, p: 1, c: 1, pr: 0, fl: "e" });
        }
      } else {
        const ds = t === 2 ? KN : t === 3 ? BI : t === 4 ? RO : QK, one = t === 2 || t === 6;
        for (const d of ds) for (let q = s + d; !(q & 0x88); q += d) {
          const x = b[q];
          if (!x) out.push({ f: s, t: q, p: t, c: 0, pr: 0, fl: "n" });
          else { if ((x >> 3) !== us) out.push({ f: s, t: q, p: t, c: x & 7, pr: 0, fl: "c" }); break; }
          if (one) break;
        }
      }
    }
    const ks = this.k[us], r0 = us ? 112 : 0, hi = us << 3;
    if (ks === r0 + 4) {
      if ((this.cr & (us ? 4 : 1)) && !b[r0 + 5] && !b[r0 + 6] && b[r0 + 7] === (4 | hi) && !this.att(r0 + 4, them) && !this.att(r0 + 5, them)) out.push({ f: ks, t: r0 + 6, p: 6, c: 0, pr: 0, fl: "k" });
      if ((this.cr & (us ? 8 : 2)) && !b[r0 + 3] && !b[r0 + 2] && !b[r0 + 1] && b[r0] === (4 | hi) && !this.att(r0 + 4, them) && !this.att(r0 + 3, them)) out.push({ f: ks, t: r0 + 2, p: 6, c: 0, pr: 0, fl: "q" });
    }
    return out;
  }
  mk(m) {
    const b = this.b, us = this.t, rec = { m, cap: b[m.t], cr: this.cr, ep: this.ep, hm: this.hm, mc: this.mc, cs: -1 };
    b[m.t] = m.pr ? (m.pr | (us << 3)) : b[m.f]; b[m.f] = 0;
    if (m.fl === "e") { const cs = m.t + (us ? 16 : -16); rec.cap = b[cs]; rec.cs = cs; b[cs] = 0; }
    else if (m.fl === "k") { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = 0; }
    else if (m.fl === "q") { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = 0; }
    if (m.p === 6) this.k[us] = m.t;
    this.cr &= CR[m.f] & CR[m.t];
    this.ep = m.fl === "b" ? (m.f + m.t) >> 1 : -1;
    this.hm = m.p === 1 || rec.cap ? 0 : this.hm + 1;
    if (us) this.fm++;
    this.t ^= 1; this.mc = null; this.h.push(rec);
  }
  un() {
    const r = this.h.pop(); if (!r) return null;
    const m = r.m, b = this.b; this.t ^= 1; const us = this.t;
    b[m.f] = m.pr ? (1 | (us << 3)) : b[m.t];
    if (m.fl === "e") { b[m.t] = 0; b[r.cs] = r.cap; } else b[m.t] = r.cap;
    if (m.fl === "k") { b[m.t + 1] = b[m.t - 1]; b[m.t - 1] = 0; }
    else if (m.fl === "q") { b[m.t - 2] = b[m.t + 1]; b[m.t + 1] = 0; }
    if (m.p === 6) this.k[us] = m.f;
    this.cr = r.cr; this.ep = r.ep; this.hm = r.hm; this.mc = r.mc; if (us) this.fm--;
    return true;
  }
  legal() { const out = [], us = this.t; for (const m of this.gen()) { this.mk(m); if (!this.att(this.k[us], us ^ 1)) out.push(m); this.un(); } return out; }
  hasLegal() { const us = this.t; for (const m of this.gen()) { this.mk(m); const ok = !this.att(this.k[us], us ^ 1); this.un(); if (ok) return true; } return false; }
  san(m, legal) {
    let s;
    if (m.fl === "k") s = "O-O"; else if (m.fl === "q") s = "O-O-O";
    else {
      if (m.p !== 1) {
        s = LET[m.p].toUpperCase(); let amb = false, sf = false, sr = false;
        for (const o of legal) if (o !== m && o.p === m.p && o.t === m.t) { amb = true; if ((o.f & 7) === (m.f & 7)) sf = true; if ((o.f >> 4) === (m.f >> 4)) sr = true; }
        if (amb) s += !sf ? FILES[m.f & 7] : !sr ? String((m.f >> 4) + 1) : sqName(m.f);
        if (m.c) s += "x";
      } else s = m.c ? FILES[m.f & 7] + "x" : "";
      s += sqName(m.t); if (m.pr) s += "=" + LET[m.pr].toUpperCase();
    }
    this.mk(m);
    if (this.att(this.k[this.t], this.t ^ 1)) s += this.hasLegal() ? "+" : "#";
    this.un();
    return s;
  }
  vm() { // langkah legal + SAN, di-cache per posisi
    if (this.mc) return this.mc;
    const r = this.legal(), c = this.t ? "b" : "w";
    const v = r.map(m => ({ color: c, from: sqName(m.f), to: sqName(m.t), flags: m.fl, piece: LET[m.p], san: this.san(m, r), ...(m.c ? { captured: LET[m.c] } : {}), ...(m.pr ? { promotion: LET[m.pr] } : {}) }));
    return this.mc = { v, r };
  }
  moves(o = {}) {
    let v = this.vm().v; if (o.square) v = v.filter(x => x.from === o.square);
    return o.verbose ? v.slice() : v.map(x => x.san);
  }
  move(x) {
    const c = this.vm(); let i = -1;
    if (typeof x === "string") { const y = x.replace(/[+#?!]+$/, ""); i = c.v.findIndex(m => m.san.replace(/[+#]$/, "") === y); }
    else if (x) i = c.v.findIndex(m => m.from === x.from && m.to === x.to && (m.promotion || "") === (x.promotion || (m.promotion ? "q" : "")));
    if (i < 0) return null;
    this.mk(c.r[i]); return c.v[i];
  }
  undo() { return this.un(); }
  turn() { return this.t ? "b" : "w"; }
  get(sq) { const p = this.b[sqNum(sq)]; return p ? { type: LET[p & 7], color: p >> 3 ? "b" : "w" } : null; }
  fen() {
    let s = "";
    for (let r = 7; r >= 0; r--) { let e = 0; for (let f = 0; f < 8; f++) { const p = this.b[r * 16 + f]; if (!p) e++; else { if (e) { s += e; e = 0; } const l = LET[p & 7]; s += p >> 3 ? l : l.toUpperCase(); } } if (e) s += e; if (r) s += "/"; }
    const cr = (this.cr & 1 ? "K" : "") + (this.cr & 2 ? "Q" : "") + (this.cr & 4 ? "k" : "") + (this.cr & 8 ? "q" : "");
    return `${s} ${this.t ? "b" : "w"} ${cr || "-"} ${this.ep >= 0 ? sqName(this.ep) : "-"} ${this.hm} ${this.fm}`;
  }
  in_check() { return this.att(this.k[this.t], this.t ^ 1); }
  in_checkmate() { return this.in_check() && !this.hasLegal(); }
  in_stalemate() { return !this.in_check() && !this.hasLegal(); }
  insufficient_material() {
    const cnt = [0, 0, 0, 0, 0, 0, 0], bc = []; let n = 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p) { n++; cnt[p & 7]++; if ((p & 7) === 3) bc.push(((s >> 4) + (s & 7)) & 1); } }
    if (n === 2) return true;
    if (n === 3 && (cnt[2] === 1 || cnt[3] === 1)) return true;
    if (cnt[3] === n - 2) { const z = bc.reduce((a, x) => a + x, 0); return z === 0 || z === bc.length; }
    return false;
  }
  key() {
    const f = this.fen().split(" "); let ep = "-";
    if (this.ep >= 0) for (const d of this.t ? [15, 17] : [-15, -17]) { const q = this.ep + d; if (!(q & 0x88) && this.b[q] === (1 | (this.t << 3))) ep = f[3]; }
    return f[0] + f[1] + f[2] + ep;
  }
  in_threefold_repetition() {
    if (this.hm < 8) return false;
    const n = Math.min(this.hm, this.h.length), ks = [this.key()], back = [];
    for (let i = 0; i < n; i++) { back.push(this.h[this.h.length - 1].m); this.un(); ks.push(this.key()); }
    while (back.length) this.mk(back.pop());
    return ks.filter(k => k === ks[0]).length >= 3;
  }
  in_draw() { return this.hm >= 100 || this.in_stalemate() || this.insufficient_material() || this.in_threefold_repetition(); }
  game_over() { return this.hm >= 100 || !this.hasLegal() || this.insufficient_material() || this.in_threefold_repetition(); }
}
