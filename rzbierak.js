(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

const $ = id => document.getElementById(NS + id);

// ✅ CLEAN
const cleanPlayer = str => str.replace(/\u00A0/g," ").trim();
const normTribe = str => str.replace(/\s/g,"").trim();

// ✅ SCRIPT OBJECT
const Script = {

results: [],
seen: new Set(),
targets: [],
sortKey: "points",
sortDir: "desc",

init(){

 document.getElementById(NS+"_overlay")?.remove();

 const el = document.createElement("div");
 el.id = NS+"_overlay";

 el.innerHTML = `
 <div style="
   position:fixed;inset:0;background:rgba(2,6,23,.75);
   display:flex;align-items:center;justify-content:center;
   z-index:999999;
 ">
  <div style="
   width:420px;background:white;border-radius:12px;
   border:2px solid #2563eb;padding:10px;
  ">
   <h3>Scavenge PRO</h3>

   <textarea id="${NS}_input" placeholder=":G:\n~G~"></textarea>

   <input id="${NS}_top" placeholder="Top X">
   <input id="${NS}_min" placeholder="Min Points">

   <button id="${NS}_start">START</button>

   <div style="background:#eee;margin-top:5px">
     <div id="${NS}_bar" style="height:6px;background:#2563eb;width:0"></div>
   </div>

   <div id="${NS}_log"></div>
  </div>
 </div>`;

 document.body.appendChild(el);

 $( "_start").onclick = ()=>this.start();
},

log(t){ $( "_log").innerText = t },
prog(p){ $( "_bar").style.width = p+"%" },

async fetchDoc(url){
 const r = await fetch(url);
 if(r.status===429){
  await new Promise(r=>setTimeout(r,1500));
  return this.fetchDoc(url);
 }
 return new DOMParser().parseFromString(await r.text(),"text/html");
},

async start(){

 this.results=[];
 this.seen=new Set();

 this.targets = $( "_input").value
  .split(/\n|\s/)
  .map(normTribe)
  .filter(Boolean);

 await this.scan();

 document.getElementById(NS+"_overlay").remove();
},

async scan(){

 for(let i=0;i<200;i++){

  const doc = await this.fetchDoc(
   `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`
  );

  const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

  rows.forEach(r=>{

   const td = r.querySelectorAll("td");
   if(td.length<5) return;

   const player = cleanPlayer(td[1].textContent);
   const tribeRaw = td[2].textContent.trim();
   const tribe = normTribe(tribeRaw);

   if(!this.targets.some(t=>tribe.includes(t))) return;

   if(this.seen.has(player)) return;
   this.seen.add(player);

   console.log("✅ MATCH:", player, "→", tribeRaw);

   this.results.push({
    rank: parseInt(td[0].innerText),
    player,
    ally: tribeRaw,
    points: parseInt(td[3].innerText.replace(/\./g,'')),
    time: td[4].innerText
   });

  });

  this.prog((i/200)*100);
  this.log(`Found: ${this.results.length}`);

  await new Promise(r=>setTimeout(r,250));
 }

 this.buildUI();
},

sort(){
 this.results.sort((a,b)=>{
  let A=a[this.sortKey], B=b[this.sortKey];
  if(typeof A==="string"){
   return this.sortDir==="asc"?A.localeCompare(B):B.localeCompare(A);
  }
  return this.sortDir==="asc"?A-B:B-A;
 });
},

buildUI(){

 let data=[...this.results];

 const top=parseInt($( "_top")?.value)||null;
 const min=parseInt($( "_min")?.value)||0;

 data=data.filter(x=>x.points>=min);

 this.sort();
 if(top) data=data.slice(0,top);

 // ✅ COLOR SYSTEM
 const palette=["#2563eb","#16a34a","#dc2626","#d97706","#7c3aed","#0ea5e9"];
 let colorMap={}, idx=0;

 const getColor=a=>{
  if(!colorMap[a]){
   colorMap[a]=palette[idx%palette.length];
   idx++;
  }
  return colorMap[a];
 };

 // ✅ ROWS
 let rows=data.map((p,i)=>{
  const color=getColor(p.ally);

  return `
   <tr style="background:${color}20">
    <td>${i+1}</td>
    <td>${p.rank}</td>
    <td>
      <a href="${baseUrl}?screen=info_player&name=${encodeURIComponent(p.player)}"
         target="_blank"
         style="color:${color};font-weight:bold;text-decoration:none">
       ${p.player}
      </a>
    </td>
    <td style="color:${color};font-weight:bold">${p.ally}</td>
    <td>${p.points.toLocaleString()}</td>
    <td>${p.time}</td>
   </tr>`;
 }).join("");

 // ✅ MODAL
 document.getElementById(NS+"_result")?.remove();

 const d=document.createElement("div");
 d.id=NS+"_result";

 d.style="
 position:fixed;inset:0;background:rgba(0,0,0,.8);
 display:flex;justify-content:center;align-items:center;
 z-index:999999;
 ";

 d.innerHTML=`
 <div style="width:90%;background:white;border-radius:10px">

  <div style="background:#2563eb;color:white;padding:10px;
   display:flex;justify-content:space-between">
   Results
   <button id="${NS}_close">✕</button>
  </div>

  <div style="padding:10px">

   <div style="display:flex;gap:5px">
    <button data-s="rank">Rank</button>
    <button data-s="player">Player</button>
    <button data-s="ally">Ally</button>
    <button data-s="points">Points</button>
    <button data-s="time">Time</button>
   </div>

   <div style="max-height:350px;overflow:auto">
    <table style="width:100%;border-collapse:collapse">
     <thead>
      <tr style="background:#eee">
       <th>#</th><th>Rank</th><th>Player</th><th>Ally</th><th>Points</th><th>Time</th>
      </tr>
     </thead>
     <tbody>${rows}</tbody>
    </table>
   </div>

   <div style="display:flex;gap:5px;margin-top:10px">
    <button id="${NS}_copy">Copy BBCode</button>
    <button id="${NS}_dl">Download</button>
    <button id="${NS}_close2">Close</button>
   </div>

  </div>
 </div>`;

 document.body.appendChild(d);

 // ✅ SORT
 document.querySelectorAll("[data-s]").forEach(btn=>{
  btn.onclick=()=>{
   const key=btn.dataset.s;
   this.sortDir=(this.sortKey===key&&this.sortDir==="desc")?"asc":"desc";
   this.sortKey=key;
   this.buildUI();
  };
 });

 document.getElementById(NS+"_close").onclick=()=>d.remove();
 document.getElementById(NS+"_close2").onclick=()=>d.remove();

 // ✅ BBCODE
 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 data.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 document.getElementById(NS+"_copy").onclick=()=>{
  navigator.clipboard.writeText(txt);
 };

 document.getElementById(NS+"_dl").onclick=()=>{
  const blob=new Blob([txt],{type:"text/plain"});
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
