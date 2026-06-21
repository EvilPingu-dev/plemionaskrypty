(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

// ✅ CLEAN FUNCTION (FIXT DEIN PROBLEM)
const clean = (str) => {
    return str
        .replace(/\u00A0/g, " ")   // NBSP fix
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
};

// ✅ helper
const $ = (id) => document.getElementById(NS + id);

// ✅ STYLE (modern blue UI)
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{
 position:fixed;inset:0;background:rgba(2,6,23,.75);
 display:flex;align-items:center;justify-content:center;
 z-index:9999999;font-family:Inter,Segoe UI,Arial;
}
#${NS}_modal{
 width:440px;background:#fff;border-radius:14px;
 border:2px solid #2563eb;overflow:hidden;
 box-shadow:0 20px 50px rgba(0,0,0,.5);
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
#${NS}_log{
 font-size:12px;margin-top:8px;
 min-height:18px;color:#1e3a8a;
}
#${NS}_btn{
 width:100%;margin-top:10px;padding:8px;
 border-radius:8px;border:none;
 background:linear-gradient(180deg,#2563eb,#1e3a8a);
 color:#fff;font-weight:bold;cursor:pointer;
}
#${NS}_progress{
 height:6px;background:#e5e7eb;border-radius:4px;
 margin-top:8px;overflow:hidden;
}
#${NS}_bar{
 height:100%;width:0%;
 background:#2563eb;
 transition:width .2s;
}
`;
document.head.appendChild(style);

// ✅ MAIN SCRIPT
const Script = {

target: new Set(),
found: new Set(),
results: [],
debugOnce: false,

init(){

 document.getElementById(NS+"_overlay")?.remove();

 const overlay = document.createElement("div");
 overlay.id = NS+"_overlay";

 overlay.innerHTML = `
  <div id="${NS}_modal">
   <div id="${NS}_header">
    <span>Scavenge Ranking PRO</span>
    <button id="${NS}_close">✕</button>
   </div>
   <div id="${NS}_body">

    <textarea id="${NS}_input"
     placeholder="One tribe per line&#10;~G~&#10;ABC"></textarea>

    <button id="${NS}_btn">START</button>

    <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
    <div id="${NS}_log"></div>

   </div>
  </div>
 `;

 document.body.appendChild(overlay);

 document.getElementById(NS+"_close").onclick = ()=>overlay.remove();
 document.getElementById(NS+"_btn").onclick = ()=>this.start();
},

log(t){ $( "_log").innerText = t; },

progress(p){
 document.getElementById(NS+"_bar").style.width = p + "%";
},

async fetchDoc(url){
 const r = await fetch(url);
 const tx = await r.text();
 return new DOMParser().parseFromString(tx,"text/html");
},

async getMembers(tag){

 const url = `${baseUrl}?screen=ally&mode=members&tag=${tag}`;
 const doc = await this.fetchDoc(url);

 let arr=[];

 doc.querySelectorAll("#ally_content table tr").forEach((r,i)=>{
  if(i===0) return;
  let td=r.querySelectorAll("td");
  if(td[1]){
    const name = clean(td[1].textContent);
    arr.push(name);
  }
 });

 return arr;
},

async start(){

 let input = $( "_input").value;

 if(!input.trim()){
  alert("Enter tribe tags!");
  return;
 }

 let tags = input
  .split(/\n|\s/)
  .map(t=>t.replace(/[\[\]]/g,"").trim())
  .filter(Boolean);

 this.log("Loading members...");

 for(let t of tags){
  let m = await this.getMembers(t);
  m.forEach(x => this.target.add(x));
 }

 this.log(`Players loaded: ${this.target.size}`);

 // DEBUG MEMBERS
 console.log("=== MEMBERS ===");
 console.log([...this.target].slice(0,10));

 await this.scan();
},

async scan(){

 for(let i=0;i<200;i++){

  this.log(`Scanning page ${i}`);
  this.progress((i/200)*100);

  const url = `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`;
  const doc = await this.fetchDoc(url);

  const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");
  if(rows.length<=1) break;

  rows.forEach(r=>{

   const td=r.querySelectorAll("td");
   if(td.length<5) return;

   const player = clean(td[1].textContent);

   if(!this.debugOnce){
    console.log("=== DEBUG FIRST ROW ===");
    console.log("RAW:", td[1].innerHTML);
    console.log("CLEAN:", player);
    this.debugOnce = true;
   }

   if(!this.target.has(player)) return;

   let ally = td[2].textContent.trim().replace(/[\[\]]/g,"");

   this.results.push({
    rank: td[0].innerText,
    player,
    ally,
    points: td[3].innerText,
    time: td[4].innerText
   });

   this.found.add(player);
  });

  if(this.found.size===this.target.size) break;

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

 this.log(`Found ${list.length} players in ranking`);

 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 list.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 this.show(txt);
},

show(txt){

 const div=document.createElement("div");

 div.style=`
  position:fixed;inset:0;background:black;
  display:flex;justify-content:center;align-items:center;
  z-index:99999999;
 `;

 div.innerHTML=`
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
 alert("Script Error: "+e.message);
}

})();
