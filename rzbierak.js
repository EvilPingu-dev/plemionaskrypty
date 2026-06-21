(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

// ✅ helper
const $ = id => document.getElementById(NS + id);

// ✅ clean (nur für player)
const cleanPlayer = str =>
 str.replace(/\u00A0/g," ")
    .replace(/\s+/g," ")
    .trim();

// ✅ tribe normalize minimal
const normTribe = str =>
 str.replace(/\s/g,"").trim();

// ✅ LOG CONTROL
const DEBUG = true;
const DBG = (...args) => DEBUG && console.log(...args);

// ✅ UI
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;justify-content:center;align-items:center;z-index:999999;}
#${NS}_modal{background:white;padding:10px;width:420px;border-radius:10px;}
textarea{width:100%;height:80px}
button{width:100%;margin-top:6px}
#${NS}_bar{height:6px;background:#2563eb;width:0}
#${NS}_progress{background:#eee;margin-top:6px}
#${NS}_log{font-size:12px;margin-top:5px;max-height:120px;overflow:auto;border:1px solid #ddd;padding:4px;}
`;
document.head.appendChild(style);

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
   <textarea id="${NS}_input" placeholder=":G:\n~G~"></textarea>
   <button id="${NS}_start">START</button>
   <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
   <div id="${NS}_log"></div>
 </div>`;

 document.body.appendChild(el);

 $( "_start").onclick = ()=>this.start();
},

log(t){
 $( "_log").innerText = t + "\n" + $( "_log").innerText;
},

prog(p){ $( "_bar").style.width = p+"%" },

async fetchDoc(url){

 const r = await fetch(url);

 if(r.status === 429){
   DBG("⚠️ 429 hit, waiting...");
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

 DBG("🎯 TARGET TRIBES:", this.targets);
 this.log("Targets: " + this.targets.join(", "));

 await this.scan();
},

async scan(){

 for(let i=0;i<200;i++){

  const doc = await this.fetchDoc(
    `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`
  );

  const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

  if(rows.length <= 1) break;

  rows.forEach((r, idx)=>{

    const td = r.querySelectorAll("td");
    if(td.length < 5) return;

    const player = cleanPlayer(td[1].textContent);
    const tribeRaw = td[2].textContent.trim();
    const tribeNorm = normTribe(tribeRaw);

    const match = this.targets.some(t => tribeNorm.includes(t));

    // ✅ DEBUG FIRST 2 PAGES FULL
    if(i < 2){
      DBG({
        player,
        tribeRaw,
        tribeNorm,
        targets: this.targets,
        match
      });
    }

    // ✅ visual debug
    if(match){
      DBG("✅ MATCH:", player, "→", tribeRaw);
    } else if(i < 1){
      DBG("❌ SKIP:", player, "→", tribeRaw);
    }

    if(!match) return;

    if(this.seen.has(player)) return;
    this.seen.add(player);

    this.found++;

    this.results.push({
      rank: td[0].innerText,
      player,
      ally: tribeRaw,
      points: td[3].innerText,
      time: td[4].innerText
    });

  });

  this.log(`Found: ${this.found} | Page ${i}`);
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
``
