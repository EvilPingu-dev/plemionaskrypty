(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

// ✅ CLEAN (unicode safe)
const clean = (str) => {
    return str
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
};

const $ = (id) => document.getElementById(NS + id);

// ✅ UI STYLE
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{position:fixed;inset:0;background:rgba(2,6,23,.75);display:flex;justify-content:center;align-items:center;z-index:999999;}
#${NS}_modal{background:#fff;border-radius:12px;width:420px;border:2px solid #2563eb;}
#${NS}_header{padding:10px;background:linear-gradient(#0b1f4d,#2563eb);color:#fff;font-weight:bold;display:flex;justify-content:space-between;}
#${NS}_body{padding:10px}
textarea{width:100%;height:80px;border:1px solid #bfdbfe;border-radius:8px}
button{width:100%;margin-top:8px;padding:8px;background:#2563eb;color:#fff;border:none;border-radius:6px}
#${NS}_progress{height:6px;background:#eee;margin-top:6px}
#${NS}_bar{height:100%;width:0;background:#2563eb}
#${NS}_log{font-size:12px;margin-top:6px}
`;
document.head.appendChild(style);

// ✅ SCRIPT
const Script = {

target:{},
results:[],
seen:new Set(),
totalPlayers:0,
foundPlayers:0,

init(){

 document.getElementById(NS+"_overlay")?.remove();

 const el=document.createElement("div");
 el.id=NS+"_overlay";

 el.innerHTML=`
 <div id="${NS}_modal">
  <div id="${NS}_header">
    Scavenge PRO
    <button id="${NS}_close">✕</button>
  </div>
  <div id="${NS}_body">

   <textarea id="${NS}_input" placeholder=":G:\n~G~"></textarea>

   <button id="${NS}_start">START</button>

   <div id="${NS}_progress"><div id="${NS}_bar"></div></div>
   <div id="${NS}_log"></div>

  </div>
 </div>`;

 document.body.appendChild(el);

 document.getElementById(NS+"_close").onclick=()=>el.remove();
 document.getElementById(NS+"_start").onclick=()=>this.start();
},

log(t){ $( "_log").innerText=t; },
progress(p){ $( "_bar").style.width=p+"%"; },

async fetchDoc(url){
 const r=await fetch(url);
 const tx=await r.text();
 return new DOMParser().parseFromString(tx,"text/html");
},

// ✅ EXACT ALLY MATCH
async getAllyId(tag){

 const doc = await this.fetchDoc(`${baseUrl}?screen=ranking&mode=ally&name=${encodeURIComponent(tag)}`);

 const rows = doc.querySelectorAll("#ally_ranking_table tr");

 for(let r of rows){
  const link=r.querySelector("a[href*='info_ally']");
  if(!link) continue;

  const name=link.textContent.trim();

  if(clean(name)===clean(tag)){
    const id=new URLSearchParams(link.href.split("?")[1]).get("id");
    console.log("MATCHED:",tag,id);
    return id;
  }
 }

 console.log("NOT FOUND:",tag);
 return null;
},

// ✅ MEMBERS
async getMembers(tag){

 const id=await this.getAllyId(tag);
 if(!id) return [];

 const doc=await this.fetchDoc(`${baseUrl}?screen=ally&mode=members&id=${id}`);

 let arr=[];
 doc.querySelectorAll("#ally_content table tr").forEach((r,i)=>{
  if(i===0) return;
  const a=r.querySelector("a[href*='info_player']");
  if(a) arr.push(clean(a.textContent));
 });

 console.log("MEMBERS", tag, arr.length);
 return arr;
},

async start(){

 this.target={};
 this.results=[];
 this.seen=new Set();
 this.foundPlayers=0;

 const tags=$( "_input").value.split(/\n|\s/).map(x=>x.trim()).filter(Boolean);

 this.log("Loading members...");

 for(let t of tags){
  const members=await this.getMembers(t);
  for(let p of members){
    if(!this.target[p]) this.target[p]=[];
    this.target[p].push(t);
  }
 }

 this.totalPlayers=Object.keys(this.target).length;
 this.log(`Players loaded: ${this.totalPlayers}`);

 console.log("TARGET",this.target);

 await this.scan();
},

// ✅ PARALLEL SCAN
async scan(){

 const maxPages=200;
 const concurrency=5;
 let i=0;

 const worker = async () => {

  while(i<maxPages){
   const page=i++;

   const doc=await this.fetchDoc(`${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${page*25}`);

   const rows=doc.querySelectorAll("#in_a_day_ranking_table tr");

   rows.forEach(r=>{

    const td=r.querySelectorAll("td");
    if(td.length<5) return;

    const link=td[1].querySelector("a");
    if(!link) return;

    const playerRaw=link.textContent;
    const player=clean(playerRaw);

    if(!this.target[player]) return;
    if(this.seen.has(player)) return;

    this.seen.add(player);
    this.foundPlayers++;

    const allies=this.target[player].join(", ");

    this.results.push({
     rank:td[0].innerText,
     player:playerRaw.trim(),
     ally:allies,
     points:td[3].innerText,
     time:td[4].innerText
    });

   });

   this.progress((page/maxPages)*100);
   this.log(`Found ${this.foundPlayers} / ${this.totalPlayers}`);

   await new Promise(r=>setTimeout(r,30));
  }
 };

 await Promise.all(Array(concurrency).fill(0).map(()=>worker()));

 this.build();
},

build(){

 let list=this.results;

 list.sort((a,b)=>
  parseInt(b.points.replace(/\./g,''))-
  parseInt(a.points.replace(/\./g,''))
 );

 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 list.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 this.show(txt);
},

show(txt){

 const d=document.createElement("div");
 d.style="position:fixed;inset:0;background:black;display:flex;justify-content:center;align-items:center;z-index:999999";

 d.innerHTML=`
 <div style="background:white;width:80%;padding:10px">
  <textarea style="width:100%;height:400px">${txt}</textarea>
  <button onclick="this.parentElement.parentElement.remove()">Close</button>
 </div>
 `;

 document.body.appendChild(d);
}

};

Script.init();

} catch(e){
 console.error(e);
 alert("Error: "+e.message);
}

})();
