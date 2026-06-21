(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

// ✅ CLEAN (unicode + NBSP fix)
const clean = (str) => {
    return str
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
};

// helper
const $ = (id) => document.getElementById(NS + id);

// ✅ STYLE
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{
 position:fixed;inset:0;background:rgba(2,6,23,.75);
 display:flex;align-items:center;justify-content:center;
 z-index:9999999;font-family:Inter,Segoe UI;
}
#${NS}_modal{
 width:440px;background:#fff;border-radius:14px;
 border:2px solid #2563eb;overflow:hidden;
}
#${NS}_header{
 padding:12px;color:#fff;
 background:linear-gradient(180deg,#0b1f4d,#2563eb);
 display:flex;justify-content:space-between;
}
#${NS}_body{padding:12px}
#${NS}_body textarea{
 width:100%;height:90px;padding:8px;
 border-radius:8px;border:1px solid #bfdbfe;
}
#${NS}_btn{
 width:100%;margin-top:10px;padding:8px;
 border-radius:8px;border:none;
 background:linear-gradient(180deg,#2563eb,#1e3a8a);
 color:#fff;font-weight:bold;
}
#${NS}_log{font-size:12px;margin-top:8px;}
#${NS}_bar{height:6px;background:#2563eb;width:0%;}
#${NS}_progress{background:#e5e7eb;margin-top:8px;}
`;
document.head.appendChild(style);

// ✅ SCRIPT
const Script = {

target: {},     // player -> [tribes]
results: [],
seen: new Set(),

init(){

 document.getElementById(NS+"_overlay")?.remove();

 const el = document.createElement("div");
 el.id = NS+"_overlay";

 el.innerHTML = `
 <div id="${NS}_modal">
  <div id="${NS}_header">Scavenge Ranking PRO
   <button id="${NS}_close">✕</button>
  </div>
  <div id="${NS}_body">

   <textarea id="${NS}_input"
    placeholder="One tribe per line&#10;:G:&#10;~G~"></textarea>

   <button id="${NS}_btn">START</button>

   <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
   <div id="${NS}_log"></div>

  </div>
 </div>
 `;

 document.body.appendChild(el);

 document.getElementById(NS+"_close").onclick = ()=>el.remove();
 document.getElementById(NS+"_btn").onclick = ()=>this.start();
},

log(t){ $( "_log").innerText = t; },
progress(p){ document.getElementById(NS+"_bar").style.width = p+"%"; },

async fetchDoc(url){
 const r = await fetch(url);
 const tx = await r.text();
 return new DOMParser().parseFromString(tx,"text/html");
},

// ✅ MEMBERS
async getMembers(tag){

 const url = `${baseUrl}?screen=ally&mode=members&tag=${tag}`;
 const doc = await this.fetchDoc(url);

 let arr = [];

 doc.querySelectorAll("#ally_content table tr").forEach((row,i)=>{
  if(i===0) return;

  const link = row.querySelector("a[href*='info_player']");
  if(link){
    arr.push(clean(link.textContent));
  }
 });

 console.log("MEMBERS:", tag, arr.slice(0,5));
 return arr;
},

async start(){

 let input = $( "_input").value;

 let tags = input
  .split(/\n|\s/)
  .map(t=>t.trim())
  .filter(Boolean);

 this.log("Loading members...");

 for(let t of tags){

  let members = await this.getMembers(t);

  for(let p of members){

    if(!this.target[p]) this.target[p] = [];
    this.target[p].push(t); // ✅ mehrere tribes speichern

  }
 }

 console.log("TARGET SAMPLE:", this.target);

 this.scan();
},

async scan(){

 for(let i=0;i<200;i++){

  this.log("Scanning "+i);
  this.progress((i/200)*100);

  const doc = await this.fetchDoc(
   `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`
  );

  const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");
  if(rows.length<=1) break;

  rows.forEach(r=>{

   const td = r.querySelectorAll("td");
   if(td.length<5) return;

   const link = td[1].querySelector("a");
   if(!link) return;

   const playerClean = clean(link.textContent);

   // ✅ MATCH
   if(!this.target[playerClean]) return;

   // ✅ DUPLICATE CHECK
   if(this.seen.has(playerClean)) return;
   this.seen.add(playerClean);

   const allies = this.target[playerClean].join(", ");

   this.results.push({
    rank: td[0].innerText,
    player: link.textContent.trim(),
    ally: allies,
    points: td[3].innerText,
    time: td[4].innerText
   });

  });

  await new Promise(r=>setTimeout(r,60));
 }

 this.build();
},

build(){

 let list = this.results;

 list.sort((a,b)=>
  parseInt(b.points.replace(/\./g,'')) -
  parseInt(a.points.replace(/\./g,''))
 );

 this.log("Found "+list.length+" players");

 let txt = "[table]\n";
 txt += "[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 list.forEach((p,i)=>{
  txt += `[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt += "[/table]";

 this.show(txt);
},

show(txt){

 const div = document.createElement("div");

 div.style = `
 position:fixed;inset:0;background:black;
 display:flex;align-items:center;justify-content:center;
 z-index:99999999;
 `;

 div.innerHTML = `
 <div style="background:white;width:80%;padding:10px">
  <textarea style="width:100%;height:400px">${txt}</textarea>
  <button onclick="this.parentElement.parentElement.remove()">Close</button>
 </div>
 `;

 document.body.appendChild(div);
}

};

Script.init();

} catch(e){
 console.error(e);
 alert("Error: "+e.message);
}

})();
