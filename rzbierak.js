(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

const $ = id => document.getElementById(NS + id);

const cleanPlayer = str => str.replace(/\u00A0/g," ").trim();
const normTribe = str => str.replace(/\s/g,"").trim();

let Script; // ✅ accessible globally

// ✅ STYLE
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{position:fixed;inset:0;background:rgba(2,6,23,.75);display:flex;align-items:center;justify-content:center;z-index:999999;}
#${NS}_modal{width:420px;background:white;border-radius:12px;border:2px solid #2563eb;}
#${NS}_header{background:#2563eb;color:white;padding:10px;}
#${NS}_body{padding:10px}
textarea{width:100%;height:80px}
button{margin:4px 0;padding:6px;width:100%}
#${NS}_bar{height:6px;background:#2563eb;width:0}
#${NS}_progress{background:#eee;margin-top:6px}
`;
document.head.appendChild(style);

Script = {

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
 <div id="${NS}_modal">
  <div id="${NS}_header">Scavenge PRO</div>
  <div id="${NS}_body">

   <textarea id="${NS}_input" placeholder=":G:\n~G~"></textarea>
   <input id="${NS}_top" placeholder="Top X">
   <input id="${NS}_min" placeholder="Min Points">

   <button id="${NS}_start">START</button>

   <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
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

 this.results = [];
 this.seen = new Set();

 this.targets = $( "_input").value
  .split(/\n|\s/)
  .map(normTribe)
  .filter(Boolean);

 await this.scan();

 // ✅ CLOSE START WINDOW
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

// ✅ SORT
sort(){

 this.results.sort((a,b)=>{

  let A = a[this.sortKey];
  let B = b[this.sortKey];

  if(typeof A === "string"){
   return this.sortDir==="asc"
    ? A.localeCompare(B)
    : B.localeCompare(A);
  }

  return this.sortDir==="asc" ? A-B : B-A;
 });
},

buildUI(){

 const top = parseInt($( "_top")?.value) || null;
 const min = parseInt($( "_min")?.value) || 0;

 let data = this.results.filter(x=>x.points>=min);

 this.sort();
 if(top) data = data.slice(0, top);

 // ✅ RESULT UI
 document.getElementById(NS+"_result")?.remove();

 const d = document.createElement("div");
 d.id = NS+"_result";

 d.style = `
 position:fixed;inset:0;background:rgba(0,0,0,.8);
 display:flex;justify-content:center;align-items:center;
 z-index:999999;
 `;

 d.innerHTML = `
 <div style="width:80%;background:white;border-radius:10px">
  
  <div style="background:#2563eb;color:white;padding:10px;
   display:flex;justify-content:space-between">
   Results
   <button id="${NS}_close">✕</button>
  </div>

  <div style="padding:10px">

   <div style="display:flex;gap:5px">
    <button data-sort="rank">Rank</button>
    <button data-sort="player">Player</button>
    <button data-sort="ally">Ally</button>
    <button data-sort="points">Points</button>
    <button data-sort="time">Time</button>
   </div>

   <textarea id="${NS}_out" style="width:100%;height:300px"></textarea>

   <div style="display:flex;gap:5px">
    <button id="${NS}_copy">Copy</button>
    <button id="${NS}_download">Download</button>
    <button id="${NS}_close2">Close</button>
   </div>

  </div>

 </div>
 `;

 document.body.appendChild(d);

 // ✅ EVENTS FIXED
 document.querySelectorAll(`[data-sort]`).forEach(btn=>{
  btn.onclick = () => {
   const key = btn.dataset.sort;

   this.sortDir = (this.sortKey===key && this.sortDir==="desc") ? "asc" : "desc";
   this.sortKey = key;

   this.buildUI();
  };
 });

 document.getElementById(NS+"_close").onclick = ()=>d.remove();
 document.getElementById(NS+"_close2").onclick = ()=>d.remove();

 document.getElementById(NS+"_copy").onclick = ()=>{
   navigator.clipboard.writeText($( "_out").value);
 };

 document.getElementById(NS+"_download").onclick = ()=>{
   const blob = new Blob([$( "_out").value], {type:"text/plain"});
   const a=document.createElement("a");
   a.href=URL.createObjectURL(blob);
   a.download="ranking.txt";
   a.click();
 };

 // ✅ BUILD TEXT
 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 data.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 document.getElementById(NS+"_out").value = txt;

}

};

Script.init();

} catch(e){
 console.error(e);
 alert(e.message);
}

})();
