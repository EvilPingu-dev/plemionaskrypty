(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

const $ = id => document.getElementById(NS + id);

const cleanPlayer = str => str.replace(/\u00A0/g," ").trim();
const normTribe = str => str.replace(/\s/g,"").trim();

const Script = {

results: [],
seen: new Set(),
targets: [],
top: null,
min: 0,
sortKey: "points",
sortDir: "desc",

init(){
 document.getElementById(NS+"_overlay")?.remove();

 const el = document.createElement("div");
 el.id = NS+"_overlay";

 el.innerHTML = `
 <div style="position:fixed;inset:0;background:rgba(2,6,23,.75);
 display:flex;align-items:center;justify-content:center;z-index:999999">
  <div style="width:420px;background:white;border-radius:12px;border:2px solid #2563eb;overflow:hidden">

   <div style="background:linear-gradient(#0b1f4d,#2563eb);
    color:white;padding:10px;display:flex;justify-content:space-between">
    Scavenge PRO
    <button id="${NS}_close_start" style="background:none;border:none;color:white;font-size:16px">✕</button>
   </div>

   <div style="padding:10px">

    <textarea id="${NS}_input" placeholder=":G:\n~G~"
     style="width:100%;height:80px;border-radius:6px;border:1px solid #ccc;padding:6px"></textarea>

    <div style="display:flex;gap:6px;margin-top:6px">
      <input id="${NS}_top" placeholder="Top X" style="flex:1;padding:6px">
      <input id="${NS}_min" placeholder="Min Points" style="flex:1;padding:6px">
    </div>

    <button id="${NS}_start" style="
      margin-top:8px;width:100%;padding:8px;
      background:#2563eb;color:white;border:none;border-radius:6px;font-weight:bold">
      START
    </button>

    <div style="background:#eee;margin-top:8px">
      <div id="${NS}_bar" style="height:6px;background:#2563eb;width:0"></div>
    </div>

    <div id="${NS}_log" style="font-size:12px;margin-top:6px"></div>

   </div>
  </div>
 </div>`;

 document.body.appendChild(el);

 $( "_start").onclick = ()=>this.start();
 document.getElementById(NS+"_close_start").onclick = ()=>el.remove();
},

log(t){ $( "_log").innerText = t },
prog(p){ $( "_bar").style.width = p+"%" },

async fetchDoc(url){
 const r = await fetch(url);
 if(r.status === 429){
  await new Promise(r=>setTimeout(r,1500));
  return this.fetchDoc(url);
 }
 return new DOMParser().parseFromString(await r.text(),"text/html");
},

async start(){

 this.results = [];
 this.seen = new Set();

 this.targets = $( "_input").value
  .split(/\n|\s/)
  .map(normTribe)
  .filter(Boolean);

 this.top = parseInt($( "_top").value) || null;
 this.min = parseInt($( "_min").value) || 0;

 await this.scan();

 document.getElementById(NS+"_overlay").remove();
},

async scan(){

 for(let i=0;i<200;i++){

  if(this.top && this.results.length >= this.top) break;

  const doc = await this.fetchDoc(
   `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`
  );

  const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

  rows.forEach(r=>{

   const td = r.querySelectorAll("td");
   if(td.length < 5) return;

   const points = parseInt(td[3].innerText.replace(/\./g,''));
   if(points < this.min) return;

   const player = cleanPlayer(td[1].textContent);
   const tribeRaw = td[2].textContent.trim();
   const tribe = normTribe(tribeRaw);

   if(!this.targets.some(t=>tribe.includes(t))) return;
   if(this.seen.has(player)) return;

   this.seen.add(player);

   this.results.push({
    rank: parseInt(td[0].innerText),
    player,
    ally: tribeRaw,
    points,
    time: td[4].innerText
   });

  });

  this.prog((i/200)*100);
  this.log(`Found: ${this.results.length}`);

  await new Promise(r=>setTimeout(r,250));
 }

 this.buildUI();
},

sort(data){

 data.sort((a,b)=>{
  const A = a[this.sortKey];
  const B = b[this.sortKey];

  if(typeof A === "string"){
   return this.sortDir==="asc" ? A.localeCompare(B) : B.localeCompare(A);
  }

  return this.sortDir==="asc" ? A-B : B-A;
 });
},

buildUI(){

 let data = [...this.results];

 if(this.top) data = data.slice(0,this.top);

 this.sort(data);

 const colors=["#2563eb","#16a34a","#dc2626","#d97706"];
 let map={}, idx=0;

 const getColor=a=>{
  if(!map[a]){ map[a]=colors[idx%colors.length]; idx++; }
  return map[a];
 };

 let rows = data.map((p,i)=>{
  const c = getColor(p.ally);

  return `
  <tr style="background:${c}20">
   <td>${i+1}</td>
   <td>${p.rank}</td>
   <td><a href="${baseUrl}?screen=info_player&name=${encodeURIComponent(p.player)}"
       target="_blank" style="color:${c};font-weight:bold">${p.player}</a></td>
   <td style="color:${c}">${p.ally}</td>
   <td>${p.points}</td>
   <td>${p.time}</td>
  </tr>`;
 }).join("");

 document.getElementById(NS+"_result")?.remove();

 const d = document.createElement("div");
 d.id = NS+"_result";

 d.innerHTML = `
 <div style="position:fixed;inset:0;background:rgba(2,6,23,.8);
 display:flex;align-items:center;justify-content:center">

  <div style="
   width:90%;
   max-width:1000px;
   max-height:80vh;
   background:white;
   border-radius:12px;
   overflow:hidden;
  ">

   <div style="background:#2563eb;color:white;padding:10px;
    display:flex;justify-content:space-between">
    Results
    <button id="${NS}_close" style="background:none;border:none;color:white">✕</button>
   </div>

   <div style="padding:10px;overflow:auto;max-height:70vh">

    <table style="width:100%;border-collapse:collapse">
     <tr style="background:#eee">
      <th>#</th><th>Rank</th><th>Player</th><th>Ally</th><th>Points</th><th>Time</th>
     </tr>
     ${rows}
    </table>

    <div style="margin-top:10px;display:flex;gap:5px">
     <button id="${NS}_copy">Copy</button>
     <button id="${NS}_download">Download</button>
    </div>

   </div>
  </div>
 </div>`;

 document.body.appendChild(d);

 document.getElementById(NS+"_close").onclick = ()=>d.remove();

 // ✅ BBCode export
 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 data.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 document.getElementById(NS+"_copy").onclick = ()=>{
  navigator.clipboard.writeText(txt);
 };

 document.getElementById(NS+"_download").onclick = ()=>{
  const blob = new Blob([txt], {type:"text/plain"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="ranking.txt";
  a.click();
 };

}

};

Script.init();

} catch(e){
 console.error(e);
 alert(e.message);
}

})();
