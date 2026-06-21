(async function () {

try {

const NS = "rzb";
const baseUrl = location.origin + "/game.php";

// ✅ CLEAN
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

// ✅ UI
const style = document.createElement("style");
style.textContent = `
#${NS}_overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;justify-content:center;align-items:center;z-index:999999;}
#${NS}_modal{background:white;padding:10px;width:400px;border-radius:10px;}
textarea{width:100%;height:80px;}
button{margin-top:8px;width:100%;}
`;
document.head.appendChild(style);

const Script = {

target:{},
results:[],
seen:new Set(),

init(){

 document.getElementById(NS+"_overlay")?.remove();

 const el=document.createElement("div");
 el.id=NS+"_overlay";

 el.innerHTML=`
 <div id="${NS}_modal">
  <h3>Scavenge Ranking</h3>
  <textarea id="${NS}_input"></textarea>
  <button id="${NS}_btn">START</button>
  <div id="${NS}_log"></div>
 </div>
 `;

 document.body.appendChild(el);

 document.getElementById(NS+"_btn").onclick=()=>this.start();
},

log(t){ $( "_log").innerText=t },

async fetchDoc(url){
 const r=await fetch(url);
 const tx=await r.text();
 return new DOMParser().parseFromString(tx,"text/html");
},

// ✅ GET ALLY ID FROM TAG
async getAllyId(tag){

 const url = `${baseUrl}?screen=ranking&mode=ally&name=${encodeURIComponent(tag)}`;
 const doc = await this.fetchDoc(url);

 const link = doc.querySelector("#ally_ranking_table a[href*='info_ally']");

 if(!link) return null;

 const id = new URLSearchParams(link.href.split("?")[1]).get("id");

 console.log("ALLY ID:", tag, id);

 return id;
},

// ✅ MEMBERS VIA ID
async getMembers(tag){

 const id = await this.getAllyId(tag);
 if(!id) return [];

 const url = `${baseUrl}?screen=ally&mode=members&id=${id}`;
 const doc = await this.fetchDoc(url);

 let arr=[];

 doc.querySelectorAll("#ally_content table tr").forEach((row,i)=>{
  if(i===0) return;

  const link=row.querySelector("a[href*='info_player']");
  if(link) arr.push(clean(link.textContent));
 });

 console.log("MEMBERS:", tag, arr.length);

 return arr;
},

async start(){

 this.target={};
 this.results=[];
 this.seen=new Set();

 const input=$( "_input").value;

 const tags=input.split(/\n|\s/).map(x=>x.trim()).filter(Boolean);

 this.log("Loading tribes...");

 for(let t of tags){

  const members=await this.getMembers(t);

  for(let p of members){
    if(!this.target[p]) this.target[p]=[];
    this.target[p].push(t);
  }
 }

 console.log("TARGET:",this.target);

 await this.scan();
},

async scan(){

 for(let i=0;i<200;i++){

  this.log("Scanning "+i);

  const doc=await this.fetchDoc(`${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`);

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

   const allies=this.target[player].join(", ");

   this.results.push({
    rank:td[0].innerText,
    player:playerRaw.trim(),
    ally:allies,
    points:td[3].innerText,
    time:td[4].innerText
   });

  });

 }

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
 </div>
 `;

 document.body.appendChild(d);
}

};

Script.init();

} catch(e){
 console.error(e);
 alert(e.message);
}

})();
