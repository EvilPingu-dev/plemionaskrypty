(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

// ✅ helper
const $ = id => document.getElementById(NS + id);

// ✅ clean
const cleanPlayer = str =>
 str.replace(/\u00A0/g," ")
    .replace(/\s+/g," ")
    .trim();

const normTribe = str =>
 str.replace(/\s/g,"").trim();

// ✅ DEBUG (nur MATCH behalten)
const logMatch = (...args) => console.log("✅ MATCH:", ...args);

// ✅ UI (wieder hübsch 😄)
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{
 position:fixed;inset:0;background:rgba(2,6,23,.75);
 display:flex;align-items:center;justify-content:center;
 z-index:9999999;font-family:Inter,Segoe UI;
}
#${NS}_modal{
 width:420px;background:#fff;border-radius:12px;
 border:2px solid #2563eb;overflow:hidden;
}
#${NS}_header{
 padding:10px;color:#fff;
 background:linear-gradient(180deg,#0b1f4d,#2563eb);
 display:flex;justify-content:space-between;
}
#${NS}_body{padding:10px}
#${NS}_body textarea{
 width:100%;height:80px;padding:6px;
 border-radius:6px;border:1px solid #bfdbfe;
}
#${NS}_btn{
 width:100%;margin-top:8px;padding:8px;
 border-radius:6px;border:none;
 background:#2563eb;color:#fff;font-weight:bold;
}
#${NS}_progress{height:6px;background:#eee;margin-top:6px}
#${NS}_bar{height:100%;width:0;background:#2563eb}
#${NS}_log{font-size:12px;margin-top:5px}
`;
document.head.appendChild(style);

// ✅ SCRIPT
const Script = {

results: [],
seen: new Set(),
targets: [],
found: 0,

init(){

 document.getElementById(NS+"_overlay")?.remove();

 const el = document.createElement("div");
 el.id = NS+"_overlay";

 el.innerHTML = `
 <div id="${NS}_modal">
  <div id="${NS}_header">
    Scavenge PRO
    <button id="${NS}_close">✕</button>
  </div>
  <div id="${NS}_body">

   <textarea id="${NS}_input" placeholder=":G:\n~G~"></textarea>

   <button id="${NS}_btn">START</button>

   <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
   <div id="${NS}_log"></div>

  </div>
 </div>`;

 document.body.appendChild(el);

 document.getElementById(NS+"_close").onclick = ()=>el.remove();
 document.getElementById(NS+"_btn").onclick = ()=>this.start();
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
 this.found = 0;

 this.targets = $( "_input").value
  .split(/\n|\s/)
  .map(x=>normTribe(x))
  .filter(Boolean);

 this.log("Scanning...");

 await this.scan();
},

async scan(){

 for(let i=0;i<200;i++){

  const doc = await this.fetchDoc(
    `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`
  );

  const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");
  if(rows.length <= 1) break;

  rows.forEach(r=>{

    const td = r.querySelectorAll("td");
    if(td.length < 5) return;

    const player = cleanPlayer(td[1].textContent);
    const tribeRaw = td[2].textContent.trim();
    const tribe = normTribe(tribeRaw);

    if(!this.targets.some(t => tribe.includes(t))) return;

    if(this.seen.has(player)) return;
    this.seen.add(player);

    logMatch(player, "→", tribeRaw); // ✅ EINZIGER DEBUG

    this.found++;

    this.results.push({
      rank: td[0].innerText,
      player,
      ally: tribeRaw,
      points: td[3].innerText,
      time: td[4].innerText
    });

  });

  this.log(`Found: ${this.found}`);
  this.prog((i/200)*100);

  await new Promise(r=>setTimeout(r,300));
 }

 this.build();
},

build(){

 this.results.sort((a,b)=>
  parseInt(b.points.replace(/\./g,'')) -
  parseInt(a.points.replace(/\./g,''))
 );

 let txt = "[table]\n";
 txt += "[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 this.results.forEach((p,i)=>{
  txt += `[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt += "[/table]";

 this.show(txt);
},

show(txt){

 const d=document.createElement("div");

 d.style="position:fixed;inset:0;background:black;display:flex;justify-content:center;align-items:center;z-index:999999";

 d.innerHTML=`
 <div style="background:white;width:80%;padding:10px">
   <textarea style="width:100%;height:400px">${txt}</textarea>
 </div>`;

 document.body.appendChild(d);
}

};

Script.init();

} catch(e){
 console.error(e);
 alert(e.message);
}

})();
