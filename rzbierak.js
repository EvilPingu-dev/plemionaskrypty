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
sortKey: "points",
sortDir: "desc",

// ✅ START UI CLEAN
init(){

 document.getElementById(NS+"_overlay")?.remove();

 const el = document.createElement("div");
 el.id = NS+"_overlay";

 el.innerHTML = `
 <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:999999">
   <div style="width:420px;background:white;border-radius:10px;padding:12px">

     <h3>Scavenge PRO</h3>

     <textarea id="${NS}_input" placeholder=":G:\n~G~" style="width:100%;height:80px"></textarea>

     <input id="${NS}_top" placeholder="Top X" style="width:100%;margin-top:5px">
     <input id="${NS}_min" placeholder="Min Points" style="width:100%;margin-top:5px">

     <button id="${NS}_start" style="width:100%;margin-top:8px">START</button>

     <div style="background:#eee;margin-top:6px">
       <div id="${NS}_bar" style="height:6px;background:#2563eb;width:0"></div>
     </div>

     <div id="${NS}_log" style="margin-top:5px;font-size:12px"></div>

   </div>
 </div>`;

 document.body.appendChild(el);

 document.getElementById(NS+"_start").onclick = ()=>this.start();
},

log(t){ $( "_log").innerText = t },
prog(p){ $( "_bar").style.width = p+"%" },

async fetchDoc(url){
 const r = await fetch(url);
 if(r.status === 429){
   await new Promise(r=>setTimeout(r,1500));
   return this.fetchDoc(url);
 }
 const text = await r.text();
 return new DOMParser().parseFromString(text,"text/html");
},

async start(){

 this.results = [];
 this.seen = new Set();

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

  rows.forEach(r => {

   const td = r.querySelectorAll("td");
   if(td.length < 5) return;

   const player = cleanPlayer(td[1].textContent);
   const tribeRaw = td[2].textContent.trim();
   const tribe = normTribe(tribeRaw);

   if(!this.targets.some(t => tribe.includes(t))) return;

   if(this.seen.has(player)) return;

   this.seen.add(player);

   console.log("✅ MATCH:", player, "→", tribeRaw);

   this.results.push({
    rank: parseInt(td[0].innerText),
    player: player,
    ally: tribeRaw,
    points: parseInt(td[3].innerText.replace(/\./g,'')),
    time: td[4].innerText
   });

  });

  this.prog(i/200*100);
  this.log("Found: " + this.results.length);

  await new Promise(r=>setTimeout(r,250));
 }

 this.buildUI();
},

sort(){

 this.results.sort((a,b)=>{

  const A = a[this.sortKey];
  const B = b[this.sortKey];

  if(typeof A === "string"){
   return this.sortDir==="asc"
    ? A.localeCompare(B)
    : B.localeCompare(A);
  }

  return this.sortDir==="asc" ? A-B : B-A;
 });
},

buildUI(){

 let data = [...this.results];

 this.sort();

 const top = parseInt($( "_top")?.value)||null;
 const min = parseInt($( "_min")?.value)||0;

 data = data.filter(x => x.points >= min);

 if(top) data = data.slice(0, top);

 const colors = ["#2563eb","#16a34a","#dc2626","#d97706"];
 let colorMap = {}, idx=0;

 const getColor = a => {
  if(!colorMap[a]){
   colorMap[a] = colors[idx % colors.length];
   idx++;
  }
  return colorMap[a];
 };

 let rows = data.map((p,i)=>{
  const color = getColor(p.ally);

  return `
  <tr style="background:${color}20">
   <td>${i+1}</td>
   <td>${p.rank}</td>
   <td>
    ${baseUrl}?screen=info_player&name=${encodeURIComponent(p.player)} target="_blank" style="color:${color}">
     ${p.player}
    </a>
   </td>
   <td>${p.ally}</td>
   <td>${p.points}</td>
   <td>${p.time}</td>
  </tr>`;
 }).join("");

 const d = document.createElement("div");
 d.id = NS+"_result";

 d.style="position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center";

 d.innerHTML = `
 <div style="width:80%;background:white;padding:10px">

  <button id="${NS}_close">Close</button>

  <table style="width:100%;margin-top:5px">
   <tr>
    <th>#</th><th>Rank</th><th>Player</th><th>Ally</th><th>Points</th><th>Time</th>
   </tr>
   ${rows}
  </table>

 </div>`;

 document.body.appendChild(d);

 document.getElementById(NS+"_close").onclick = ()=>d.remove();

}

};

Script.init();

} catch(e){
 console.error(e);
 alert(e.message);
}

})();
