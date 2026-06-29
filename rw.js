(async function () {

const NS = "sup_";
const baseUrl = location.origin + "/game.php";

const Script = {

results: [],
seen: new Set(),

init(){

document.getElementById(NS+"overlay")?.remove();

const div = document.createElement("div");

div.id = NS+"overlay";

div.innerHTML = `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:999999;">
<div style="width:420px;background:white;border-radius:10px;padding:15px;">

<h2>Support Ranking PRO</h2>

<textarea id="${NS}tribes"
style="width:100%;height:80px;"
placeholder="MILF3&#10;Cart3l"></textarea>

<div style="margin-top:8px;">
<input id="${NS}top" placeholder="Top X" style="width:48%;">
<input id="${NS}min" placeholder="Min Points" style="width:48%;">
</div>

<button id="${NS}start"
style="width:100%;margin-top:10px;">
START
</button>

<div style="background:#ddd;margin-top:10px;">
<div id="${NS}bar"
style="height:6px;background:#2563eb;width:0%;">
</div>
</div>

<div id="${NS}log"
style="margin-top:8px;font-size:12px;">
Ready
</div>

</div>
</div>
`;

document.body.appendChild(div);

document.getElementById(NS+"start").onclick =
()=>this.start();

},

log(txt){
document.getElementById(NS+"log").innerText = txt;
},

prog(v){
document.getElementById(NS+"bar").style.width = v+"%";
},

async fetchDoc(url){

const r = await fetch(url);

return new DOMParser()
.parseFromString(await r.text(),"text/html");

},

async start(){

this.results = [];
this.seen = new Set();

this.targets =
document.getElementById(NS+"tribes")
.value
.split(/\n|\s/)
.map(x=>x.trim())
.filter(Boolean);

this.top =
parseInt(
document.getElementById(NS+"top").value
) || 0;

this.min =
parseInt(
document.getElementById(NS+"min").value
) || 0;

await this.scan();

document.getElementById(NS+"overlay")?.remove();

this.showResults();

},

async scan(){

for(let page=0; page<200; page++){

if(this.top && this.results.length >= this.top)
break;

const doc = await this.fetchDoc(
`${baseUrl}?village=${game_data.village.id}&screen=ranking&mode=kill_player&type=support&offset=${page*25}`
);

const table =
[...doc.querySelectorAll("table.vis")]
.find(t=>{

const h =
[...t.querySelectorAll("th")]
.map(x=>x.textContent.trim());

return h.includes("Ranking")
&& h.includes("Nazwa")
&& h.includes("Plemię")
&& h.includes("Pokonany");

});

if(!table) break;

const rows = table.querySelectorAll("tr");

let found = 0;

rows.forEach(r=>{

const td = r.querySelectorAll("td");

if(td.length !== 4)
return;

found++;

const rank =
parseInt(td[0].textContent.trim());

const player =
td[1]
.querySelector("a")
?.textContent
.trim();

const ally =
td[2]
.querySelector("a")
?.textContent
.trim() || "";

const points =
parseInt(
td[3]
.textContent
.replace(/\./g,"")
.trim()
);

if(points < this.min)
return;

if(this.targets.length){

const ok =
this.targets.some(
t=>ally.includes(t)
);

if(!ok)
return;
}

if(this.seen.has(player))
return;

this.seen.add(player);

this.results.push({
rank,
player,
ally,
points
});

});

this.log(
`Page ${page+1} | Found ${this.results.length}`
);

this.prog((page/200)*100);

if(found === 0)
break;

await new Promise(r=>setTimeout(r,250));
}

},

showResults(){

this.results.sort(
(a,b)=>b.points-a.points
);

const bbcode =
this.results.map((p,i)=>
`${i+1}. ${p.player} | ${p.ally} | ${p.points}`
).join("\n");

const htmlRows =
this.results.map((p,i)=>`
<tr>
<td>${i+1}</td>
<td>${p.rank}</td>
<td>${p.player}</td>
<td>${p.ally}</td>
<td>${p.points}</td>
</tr>
`).join("");

const div =
document.createElement("div");

div.innerHTML = `
<div style="
position:fixed;
inset:0;
background:rgba(0,0,0,.8);
z-index:999999;
display:flex;
justify-content:center;
align-items:center;
">

<div style="
background:white;
width:90%;
max-width:1000px;
max-height:80vh;
overflow:auto;
padding:15px;
">

<h2>Support Results (${this.results.length})</h2>

<button id="${NS}copy">
Copy
</button>

<button id="${NS}download">
Download
</button>

<table border="1"
style="width:100%;margin-top:10px;">
<tr>
<th>#</th>
<th>Rank</th>
<th>Player</th>
<th>Ally</th>
<th>Points</th>
</tr>

${htmlRows}

</table>

</div>
</div>
`;

document.body.appendChild(div);

document.getElementById(NS+"copy")
.onclick = ()=>
navigator.clipboard.writeText(bbcode);

document.getElementById(NS+"download")
.onclick = ()=>{

const blob =
new Blob([bbcode],
{type:"text/plain"});

const a =
document.createElement("a");

a.href =
URL.createObjectURL(blob);

a.download =
"support_ranking.txt";

a.click();

};

}

};

Script.init();

})();
