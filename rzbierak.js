(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

const $ = id => document.getElementById(NS + id);

// ✅ helpers
const cleanPlayer = str => str.replace(/\u00A0/g," ").trim();
const normTribe = str => str.replace(/\s/g,"").trim();

let sortKey = "points";
let sortDir = "desc";

// ✅ UI
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{position:fixed;inset:0;background:rgba(2,6,23,.75);display:flex;align-items:center;justify-content:center;z-index:999999;}
#${NS}_modal{width:420px;background:white;border-radius:12px;border:2px solid #2563eb;}
#${NS}_header{background:linear-gradient(#0b1f4d,#2563eb);color:white;padding:10px;}
#${NS}_body{padding:10px}
textarea{width:100%;height:80px}
button{width:100%;margin-top:6px;padding:6px}
#${NS}_bar{height:6px;background:#2563eb;width:0}
#${NS}_progress{background:#eee;margin-top:6px}
`;
document.head.appendChild(style);

const Script = {

results: [],
seen: new Set(),
targets: [],
found: 0,

init(){

 document.body.insertAdjacentHTML("beforeend",`
 <div id="${NS}_overlay">
 <div id="${NS}_modal">
  <div id="${NS}_header">Scavenge PRO</div>
  <div id="${NS}_body">

   <textarea id="${NS}_input" placeholder=":G:\n~G~"></textarea>

   <input id="${NS}_top" placeholder="Top X (optional)" style="width:100%;margin-top:4px"/>
   <input id="${NS}_min" placeholder="Min Points (optional)" style="width:100%;margin-top:4px"/>

   <button id="${NS}_start">START</button>

   <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
   <div id="${NS}_log"></div>

  </div>
 </div>
 </div>`);

 document.getElementById(NS+"_start").onclick = ()=>this.start();
},

log(t){ document.getElementById(NS+"_log").innerText = t },
prog(p){ document.getElementById(NS+"_bar").style.width = p+"%" },

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
 this.found = 0;

 this.targets = $( "_input").value
  .split(/\n|\s/)
  .map(normTribe)
  .filter(Boolean);

 await this.scan();
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

  await new Promise(r=>setTimeout(r,300));
 }

 this.buildUI();
},

// ✅ SORT
sortData(){

 this.results.sort((a,b)=>{

  let A = a[sortKey];
  let B = b[sortKey];

  if(sortKey==="player"||sortKey==="ally"||sortKey==="time"){
    return sortDir==="asc"
      ? A.localeCompare(B)
      : B.localeCompare(A);
  }

  return sortDir==="asc" ? A-B : B-A;
 });
},

buildUI(){

 const top = parseInt($( "_top").value) || null;
 const min = parseInt($( "_min").value.replace(/\./g,'')) || 0;

 this.results = this.results.filter(x => x.points >= min);

 this.sortData();

 if(top) this.results = this.results.slice(0, top);

 this.render();
},

render(){

 let html = `
<div id="${NS}_result" style="
 position:fixed;inset:0;background:rgba(0,0,0,.8);
 display:flex;justify-content:center;align-items:center;
 z-index:9999999;
">
 <div style="
  width:80%;background:white;border-radius:10px;overflow:hidden;
 ">

 <div style="background:#2563eb;color:white;padding:10px;">
  Results
 </div>

 <div style="padding:10px">

 <div style="display:flex;gap:5px;margin-bottom:5px">
  <button onclick="(${setSort.toString()})('rank')">Rank</button>
  <button onclick="(${setSort.toString()})('player')">Player</button>
  <button onclick="(${setSort.toString()})('ally')">Ally</button>
  <button onclick="(${setSort.toString()})('points')">Points</button>
  <button onclick="(${setSort.toString()})('time')">Time</button>
 </div>

 <textarea id="${NS}_out" style="width:100%;height:300px"></textarea>

 <div style="display:flex;gap:5px;margin-top:5px">
  <button onclick="navigator.clipboard.writeText(document.getElementById('${NS}_out').value)">Copy</button>
  <button onclick="download()">Download</button>
  <button onclick="document.getElementById('${NS}_result').remove()">Close</button>
 </div>

 </div>
 </div>
</div>
`;

 document.body.insertAdjacentHTML("beforeend", html);

 this.updateText();
},

updateText(){

 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 this.results.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 document.getElementById(NS+"_out").value = txt;
}

};

// ✅ sorting handler
function setSort(key){

 sortDir = (sortKey === key && sortDir==="desc") ? "asc" : "desc";
 sortKey = key;

 Script.sortData();
 Script.updateText();
}

// ✅ download
function download(){

 const txt = document.getElementById(NS+"_out").value;
 const blob = new Blob([txt],{type:"text/plain"});
 const a = document.createElement("a");

 a.href = URL.createObjectURL(blob);
 a.download = "ranking.txt";
 a.click();
}

Script.init();

} catch(e){
 console.error(e);
 alert(e.message);
}

})();
