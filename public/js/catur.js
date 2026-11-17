// Teka-Teki Catur: 1000 level. Mesin catur lokal (js/chess.js), tema dan peringkat terhubung ke KampusPing.
import { Chess } from "./chess.js";
import * as T from "./theme.js";
import { deviceKey, raw } from "./store.js";
T.apply(T.load());
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const TT=[[0,"Pemula"],[900,"Pelajar"],[1200,"Klub"],[1500,"Ahli"],[1800,"Master Kandidat"],[2100,"Master"],[2400,"Grandmaster"]];
const title=r=>TT.filter(t=>r>=t[0]).pop()[1];
const ST=["Pemula","Menengah","Mahir","Ahli","Legenda"],SZ=200;
const V={p:1,n:3,b:3,r:5,q:9,k:0};
let S,PC={};
try{S=JSON.parse(localStorage.getItem("cp1"))}catch(e){}
try{PC=JSON.parse(localStorage.getItem("cp2p"))||{}}catch(e){}
if(!S||!S.lv)S={name:"Tamu"+(1000+Math.random()*9000|0),r:1000,lv:"0".repeat(1000),cur:1};
const save=()=>{try{localStorage.setItem("cp1",JSON.stringify(S))}catch(e){}};
const pcSave=()=>{try{localStorage.setItem("cp2p",JSON.stringify(PC))}catch(e){}};
const cnt=()=>(S.lv.match(/[12]/g)||[]).length;
const prate=L=>Math.round(500+L*2.4);
const open=L=>L==1||S.lv[L-2]!=="0";

/* ===== Pembuat puzzle: partai swa-main yang masuk akal, lalu kesalahan lawan dicari hukumannya ===== */
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function win(c,n){
  const ms=c.moves();
  if(ms.some(s=>s.endsWith("#")))return true;
  if(n<2)return false;
  for(const m of ms){
    if(!m.endsWith("+"))continue;
    c.move(m);
    const ok=c.moves().every(d=>{c.move(d);const w=win(c,n-1);c.undo();return w});
    c.undo();
    if(ok)return true;
  }
  return false;
}
function bal(c,me){let s=0;for(const ch of c.fen().split(" ")[0]){const l=ch.toLowerCase();if(/[a-z]/i.test(ch))s+=(ch===l?-1:1)*V[l]}return me==="w"?s:-s}
/* nilai bersih bagi pemain me jika memainkan m: balasan terbaik lawan, lalu tangkapan terbaik saya */
function val(c,m,me){
  const b0=bal(c,me);c.move(m);
  const rs=c.moves({verbose:true});
  if(!rs.length){const mt=c.in_checkmate();c.undo();return[mt?99:0,null]}
  let w=1e9,wr=null;
  for(const r of rs){
    c.move(r);const b=bal(c,me);let top=b;
    for(const f of c.moves({verbose:true})){
      if(!f.captured)continue;
      c.move(f);const back=c.moves({verbose:true}).some(x=>x.to===f.to&&x.captured);c.undo();
      top=Math.max(top,b+V[f.captured]-(back?V[f.piece]:0));
    }
    c.undo();
    if(top<w){w=top;wr=r}
  }
  c.undo();return[w-b0,wr];
}
function pick(c,r,bl,i){
  const ms=c.moves({verbose:true});
  if(bl)return ms[r()*ms.length|0];
  const sc=ms.map(m=>{let s=r()*2;
    if(m.captured)s+=V[m.captured]*1.3-V[m.piece]*.3;
    if(m.san.includes("+"))s+=.7;if(m.promotion)s+=8;
    if(m.flags.includes("k")||m.flags.includes("q"))s+=3;
    if(i<14&&"nbq".includes(m.piece)&&"18".includes(m.from[1]))s+=2.5;
    if(i<14&&m.piece==="p"&&"de".includes(m.from[0]))s+=1.5;
    return[s,m]}).sort((a,b)=>b[0]-a[0]).slice(0,4);
  for(const[,m]of sc){
    c.move(m);
    const lost=c.moves({verbose:true}).some(x=>x.captured&&x.to===m.to);
    c.undo();
    if(!lost||V[m.piece]<=(m.captured?V[m.captured]:0))return m;
  }
  return sc[0][1];
}
function matPuz(c,mg){
  const me=c.turn();
  const ms=c.moves({verbose:true}).filter(m=>m.captured||m.san.includes("+")).sort((a,b)=>(V[b.captured]||0)-(V[a.captured]||0)).slice(0,6);
  if(ms.length<1)return null;
  const vs=ms.map(m=>[val(c,m,me)[0],m]).sort((a,b)=>b[0]-a[0]);
  if(vs[0][0]<3||vs[0][0]>=99)return null;
  if(vs[1]&&vs[0][0]-vs[1][0]<mg)return null;
  return{g:vs[0][0],bf:vs[0][1].from,bt:vs[0][1].to};
}
function gen(L){
  const r=rng(L*7919+101),x=r();
  const th=L<=200?(x<.6?1:0):L<=400?(x<.5?1:0):L<=600?(x<.65?2:0):L<=800?(x<.45?2:x<.75?3:0):(x<.7?3:0),mm=14+Math.floor(L/40),mg=L<400?2:L<700?3:4,ck=1+Math.floor(L/200);
  const t0=performance.now();let fb=null;
  for(let g=0;g<60&&performance.now()-t0<2200+L;g++){
    const c=new Chess();
    for(let i=0;i<80&&!c.game_over();i++){
      const bl=i>=12&&r()<.07;
      c.move(pick(c,r,bl,i));
      if(c.game_over()||i<10)continue;
      if(!fb&&win(c,1))fb={fen:c.fen(),th:1};
      if(th){if(c.moves().length>=mm&&(th>1||c.moves().filter(s=>/[+#]/.test(s)).length>=ck)&&win(c,th)&&(th===1||!win(c,th-1)))return{fen:c.fen(),th}}
      else if(bl&&c.moves().length>=mm){const p=matPuz(c,mg);if(p)return{fen:c.fen(),th:0,...p}}
    }
  }
  return fb||{fen:"6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1",th:1};
}

/* ===== Papan ===== */
let C,me,flip,k,done,failed,hinted,sel,last,hintSq,busy=true,cur=S.cur||1,puz,stage=0,replay=false;
function draw(){
  let h="";
  const tg=sel?C.moves({square:sel,verbose:true}):[];
  for(let ri=0;ri<8;ri++)for(let fi=0;fi<8;fi++){
    const r=flip?ri:7-ri,f=flip?7-fi:fi,sq="abcdefgh"[f]+(r+1),p=C.get(sq),t=tg.find(m=>m.to===sq);
    let cl="sq "+((r+f)%2?"l":"d");
    if(last&&last.includes(sq))cl+=" lm";
    if(sel===sq)cl+=" sl";
    if(hintSq===sq)cl+=" hn";
    if(t)cl+=" tg"+(p?" oc":"");
    h+=`<div class="${cl}" data-sq="${sq}">${p?`<svg class="pc ${p.color}" viewBox="0 0 24 24"><use href="#p${p.type}"/></svg>`:""}</div>`;
  }
  $("#bd").innerHTML=h;
}
const msg=(t,c)=>{const m=$("#msg");m.textContent=t;m.className=c||""};
const flash=t=>{const e=$("#fl");e.textContent=t;e.className="on";setTimeout(()=>e.className="",1800)};
function rate(res){
  const E=1/(1+Math.pow(10,(prate(cur)-S.r)/400)),d=Math.round(32*(res-E));
  S.r=Math.max(100,S.r+d);return d;
}
const setLv=ch=>{S.lv=S.lv.slice(0,cur-1)+ch+S.lv.slice(cur)};
function head(){
  $("#rt").textContent=S.r;$("#rk").textContent=title(S.r);$("#sv").textContent=cnt()+" selesai";
  $("#hn").textContent="Petunjuk "+(S.h|0);$("#nm").value=S.name;
}
function grid(){
  let h="";
  for(let L=stage*SZ+1;L<=stage*SZ+SZ;L++){
    const c=S.lv[L-1],cl=(c!=="0"?"c"+c:"")+(L===cur?" cu":"");
    h+=`<button class="${cl}" data-l="${L}"${open(L)?"":" disabled"}>${L}</button>`;
  }
  const g=$("#grid");g.innerHTML=h;const cu=g.querySelector(".cu");if(cu)g.scrollTop=Math.max(0,cu.offsetTop-g.clientHeight/2);
  $("#st").innerHTML=ST.map((n,i)=>{
    const d=(S.lv.slice(i*SZ,i*SZ+SZ).match(/[123]/g)||[]).length;
    return `<option value="${i}"${i===stage?" selected":""}${open(i*SZ+1)?"":" disabled"}>Tahap ${i+1}: ${n} · level ${i*SZ+1}-${i*SZ+SZ} (${d}/${SZ})</option>`}).join("");
}
const THM=t=>t?"Skakmat dalam "+t+" langkah":"Menangkan material";
function go(L){
  if(L<1||L>1000||!open(L))return;
  cur=L;S.cur=L;stage=Math.floor((L-1)/SZ);save();busy=true;
  $("#ttl").textContent="Level "+L+" · rating puzzle "+prate(L);
  msg("Menyusun puzzle…");$("#bn").disabled=true;grid();
  setTimeout(()=>{
    if(!PC[L]){PC[L]=gen(L);pcSave()}
    puz=PC[L];begin();
  },40);
}
function begin(){
  C=new Chess(puz.fen);me=C.turn();flip=me==="b";k=puz.th;
  replay=S.lv[cur-1]!=="0";const a=S.att&&S.att.l===cur?S.att:{};failed=!!a.f;hinted=!!a.h;done=false;sel=last=hintSq=null;busy=false;
  $("#ttl").textContent="Level "+cur+" · "+THM(puz.th)+" · rating puzzle "+prate(cur);
  msg((me==="w"?"Putih":"Hitam")+" jalan. "+(puz.th?"Temukan mat dalam "+puz.th+" langkah.":"Temukan langkah yang memenangkan material.")+(replay?" Level ulangan: skor tidak berubah.":""));
  $("#bh").disabled=$("#bs").disabled=false;$("#bn").disabled=true;
  head();grid();draw();
}
function chk(){
  if(C.in_checkmate())return true;
  if(C.game_over()||k<2)return false;
  return C.moves().every(s=>{C.move(s);const w=win(C,k-1);C.undo();return w});
}
function penalty(){
  if(replay||failed)return 0;
  failed=true;S.att={l:cur,f:true,h:hinted};const d=rate(0);save();head();push();return d;
}
function bad(){const d=penalty();msg("Bukan langkah terbaik."+(d?" Skor "+d+".":"")+" Coba lagi.","no")}
function finish(t){
  done=true;busy=false;
  const clean=!replay&&!failed&&!hinted,d=clean?rate(1):0;
  if(!replay)setLv(clean?"1":"2");S.att=null;save();head();grid();push();
  msg(t+" "+(clean?"Skor +"+d+".":replay?"Level ulangan: skor tidak berubah.":"Selesai tanpa tambahan skor."),"ok");
  $("#bn").disabled=cur>=1000;$("#bh").disabled=$("#bs").disabled=true;
}
function click(sq){
  const p=C.get(sq);
  if(sel){const mv=C.moves({square:sel,verbose:true}).find(m=>m.to===sq&&(!m.promotion||m.promotion==="q"));if(mv)return play(mv);}
  sel=p&&p.color===me?sq:null;draw();
}
function play(mv){
  sel=hintSq=null;
  if(!puz.th){
    const[v,rp]=val(C,mv,me);
    C.move(mv);last=[mv.from,mv.to];
    if(v<puz.g-1&&!C.in_checkmate()){C.undo();last=null;draw();return bad()}
    busy=true;draw();
    if(C.in_checkmate())return finish("Skakmat!");
    setTimeout(()=>{if(rp&&!C.game_over()){C.move(rp);last=[rp.from,rp.to]}draw();finish("Material dimenangkan.")},500);
    return;
  }
  C.move(mv);last=[mv.from,mv.to];
  if(!chk()){C.undo();last=null;draw();return bad()}
  if(C.in_checkmate()){draw();return finish("Skakmat!")}
  busy=true;draw();msg("Benar, lanjutkan…","ok");
  setTimeout(()=>{
    const rs=C.moves({verbose:true});let pk=rs[0];
    if(k>2)for(const d of rs){C.move(d);const w=win(C,k-2);C.undo();if(!w){pk=d;break}}
    C.move(pk);last=[pk.from,pk.to];k--;busy=false;
    msg("Lanjutkan: mat dalam "+k+" langkah.","ok");draw();
  },400);
}
function best(){
  if(!puz.th)return{from:puz.bf};
  for(const m of C.moves({verbose:true})){C.move(m);const ok=chk();C.undo();if(ok)return m}
}
function ask(t,cb){$("#mt").textContent=t;$("#md").hidden=false;$("#my").onclick=()=>{$("#md").hidden=true;cb()};$("#mn").onclick=()=>{$("#md").hidden=true};$("#my").focus()}
$("#bd").onclick=e=>{const el=e.target.closest("[data-sq]");if(el&&!busy&&!done)click(el.dataset.sq)};
$("#bh").onclick=()=>{
  if(busy||done)return;
  const show=()=>{const m=best();if(!m)return;hintSq=m.from;
    if(!hinted){hinted=true;if(!replay){S.h=(S.h|0)+1;S.att={l:cur,f:failed,h:true};save();head()}flash("Tanpa skor")}
    draw();msg("Petunjuk: gerakkan bidak di petak biru."+(replay?"":" Level ini tidak menambah skor."))};
  if(hinted||replay)show();else ask("Pakai petunjuk? Skor tidak berkurang, tetapi level ini tidak akan menambah skor.",show);
};
$("#br").onclick=()=>{if(!busy)begin()};
$("#bs").onclick=()=>{if(busy||done)return;ask(replay?"Lewati level ini?":"Lewati level ini? Skor akan berkurang dan level ditandai dilewati.",()=>{penalty();if(!replay)setLv("3");S.att=null;save();head();go(cur+1)})};
$("#bn").onclick=()=>go(cur+1);
$("#grid").onclick=e=>{const b=e.target.closest("[data-l]");if(b)go(+b.dataset.l)};
$("#st").onchange=e=>{stage=+e.target.value;grid()};
$("#nm").onchange=e=>{S.name=e.target.value.trim().slice(0,20)||S.name;save();head();push()};
$("#t1").onclick=()=>tab(1);$("#t2").onclick=()=>tab(2);
function tab(n){if(n===2)loadLB();$("#p1").hidden=n!==1;$("#p2").hidden=n!==2;$("#t1").className=n===1?"on":"";$("#t2").className=n===2?"on":""}

/* ===== Peringkat antar pengguna KampusPing (Firebase) + sinkron progres antar perangkat ===== */
const UIDK=deviceKey();let PID="",LB=null,LBerr=false,pushT=0,lbT=0;
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
/* Kunci peringkat = hash dari kode perangkat, sehingga kode pribadi tidak pernah ditampilkan ke pengguna lain. */
const ident=async()=>PID||(PID=(await sha("kp-rank:"+UIDK)).slice(0,32));
function renderLB(){
  const mine={id:PID||"me",name:S.name,rating:S.r,solved:cnt()};
  let rows=LB?LB.filter(x=>x.id!==PID):[];rows.push(mine);
  rows.sort((a,b)=>b.rating-a.rating||b.solved-a.solved);
  const top=rows.slice(0,25),pos=rows.indexOf(mine);
  $("#lb").innerHTML=top.map((x,i)=>row(x,i+1)).join("")+(pos>=25?row(mine,pos+1):"");
  function row(x,n){return `<tr class="${x===mine?"me2":""}"><td>${n}</td><td>${esc(x.name||"Pemain")}<br><small>${title(x.rating||0)}</small></td><td>${x.solved||0}</td><td>${x.rating}</td></tr>`}
  $("#lbn").textContent=LB?"25 teratas dari semua pengguna KampusPing. Memakai petunjuk membuat level tidak menambah skor.":LBerr?"Peringkat belum bisa dimuat. Menampilkan skor Anda saja.":"Memuat peringkat…";
}
async function loadLB(){
  try{const o=await raw("GET","rank?orderBy=%22rating%22&limitToLast=25");LB=Object.entries(o||{}).map(([id,x])=>({id,...x}));LBerr=false}catch(e){LBerr=true}
  renderLB();
}
function push(){
  renderLB();clearTimeout(pushT);
  pushT=setTimeout(async()=>{
    S.t=Date.now();save();
    try{
      await ident();
      await raw("PUT",`users/${UIDK}/chess`,{name:S.name,r:S.r,cur:S.cur||1,h:S.h|0,lv:S.lv,t:S.t});
      await raw("PUT",`rank/${PID}`,{name:S.name,rating:S.r,solved:cnt(),t:S.t});
      LBerr=false;if(!$("#p2").hidden)loadLB();
    }catch(e){LBerr=true;renderLB()}
  },1200);
}
async function pull(){ /* ambil progres tersimpan; pakai yang lebih maju antara perangkat ini dan database */
  try{
    const c=await raw("GET",`users/${UIDK}/chess`);
    if(c&&typeof c.lv==="string"&&c.lv.length===1000&&/^[0-3]+$/.test(c.lv)){
      const n=(c.lv.match(/[12]/g)||[]).length;
      if(n>cnt()||(n===cnt()&&(c.t||0)>(S.t||0))){S={...S,name:c.name||S.name,r:c.r||S.r,lv:c.lv,cur:c.cur||1,h:c.h|0,t:c.t||0};save()}
      else if(n<cnt())push();
    }else push();
  }catch(e){LBerr=true}
}
head();renderLB();
(async()=>{
  try{await Promise.race([ident().then(pull),new Promise(r=>setTimeout(r,2500))])}catch(e){}
  cur=S.cur||1;if(!open(cur))cur=1;head();renderLB();go(cur);loadLB();
  setInterval(()=>{if(!document.hidden&&!$("#p2").hidden)loadLB()},30000);
})();
