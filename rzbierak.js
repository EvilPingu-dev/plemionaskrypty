buildUI(){

 const top = parseInt($( "_top")?.value) || null;
 const min = parseInt($( "_min")?.value) || 0;

 let data = this.results.filter(x=>x.points>=min);

 this.sort();
 if(top) data = data.slice(0, top);

 document.getElementById(NS+"_result")?.remove();

 // ✅ COLOR SYSTEM
 this.allyColors = {};
 this.colorIndex = 0;

 const palette = [
  "#2563eb","#16a34a","#dc2626","#d97706",
  "#7c3aed","#0ea5e9","#9333ea","#f59e0b"
 ];

 const getColor = (ally) => {
  if(!this.allyColors[ally]){
    this.allyColors[ally] = palette[this.colorIndex % palette.length];
    this.colorIndex++;
  }
  return this.allyColors[ally];
 };

 // ✅ TABLE ROWS
 let rowsHTML = data.map((p,i)=>{

  const color = getColor(p.ally);

  return `
   <tr style="background:${color}20">
     <td>${i+1}</td>
     <td>${p.rank}</td>

     <!-- ✅ CLICKABLE PLAYER -->
     <td>
       <a href="/game.php?screen=info_player&name=${encodeURIComponent(p.player)}"
          target="_blank"
          style="color:${color};font-weight:bold;text-decoration:none;">
         ${p.player}
       </a>
     </td>

     <td style="color:${color};font-weight:bold">
       ${p.ally}
     </td>

     <td>${p.points.toLocaleString()}</td>
     <td>${p.time}</td>
   </tr>
  `;
 }).join("");

 const d = document.createElement("div");
 d.id = NS+"_result";

 d.style = `
 position:fixed;inset:0;background:rgba(0,0,0,.8);
 display:flex;justify-content:center;align-items:center;
 z-index:999999;
 `;

 d.innerHTML = `
 <div style="width:90%;background:white;border-radius:10px;overflow:hidden">

  <div style="background:#2563eb;color:white;padding:10px;
   display:flex;justify-content:space-between">
   Results
   <button id="${NS}_close">✕</button>
  </div>

  <div style="padding:10px">

   <div style="display:flex;gap:5px;margin-bottom:8px">
    <button data-sort="rank">Rank</button>
    <button data-sort="player">Player</button>
    <button data-sort="ally">Ally</button>
    <button data-sort="points">Points</button>
    <button data-sort="time">Time</button>
   </div>

   <div style="max-height:350px;overflow:auto;">
    <table style="width:100%;border-collapse:collapse;text-align:left">
      <thead>
        <tr style="background:#f3f4f6">
          <th>#</th>
          <th>Rank</th>
          <th>Player</th>
          <th>Ally</th>
          <th>Points</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
   </div>

   <div style="display:flex;gap:5px;margin-top:10px">
    <button id="${NS}_copy">Copy BBCode</button>
    <button id="${NS}_download">Download</button>
    <button id="${NS}_close2">Close</button>
   </div>

  </div>
 </div>
 `;

 document.body.appendChild(d);

 // ✅ sort buttons
 document.querySelectorAll(`[data-sort]`).forEach(btn=>{
  btn.onclick = () => {
   const key = btn.dataset.sort;

   this.sortDir = (this.sortKey===key && this.sortDir==="desc") ? "asc" : "desc";
   this.sortKey = key;

   this.buildUI();
  };
 });

 // ✅ close
 document.getElementById(NS+"_close").onclick = ()=>d.remove();
 document.getElementById(NS+"_close2").onclick = ()=>d.remove();

 // ✅ BBCode build (unchanged)
 let txt="[table]\n";
 txt+="[**]LP[||]Rank[||]Player[||]Ally[||]Points[||]Time[/**]\n";

 data.forEach((p,i)=>{
  txt+=`[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][ally]${p.ally}[/ally][|][b]${p.points}[/b][|]${p.time}\n`;
 });

 txt+="[/table]";

 document.getElementById(NS+"_copy").onclick = ()=>{
  navigator.clipboard.writeText(txt);
 };

 document.getElementById(NS+"_download").onclick = ()=>{
  const blob = new Blob([txt], {type:"text/plain"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="ranking.txt";
  a.click();
 };
}
