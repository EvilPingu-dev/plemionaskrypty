(async function () {

try {

const url = location.origin + "/game.php?screen=ranking&mode=kill_player&type=support";

console.log("🚀 DEBUG START:", url);

const res = await fetch(url);
const html = await res.text();

const doc = new DOMParser().parseFromString(html, "text/html");

// 👉 versuche beide Tabellen (wichtig!)
let tables = [
 doc.querySelector("#ranking_table"),
 doc.querySelector("#in_a_day_ranking_table")
].filter(Boolean);

if(tables.length === 0){
 console.log("❌ KEINE TABELLE GEFUNDEN");
 return;
}

// 👉 nimm erste gefundene
const table = tables[0];
const rows = table.querySelectorAll("tr");

console.log("✅ TABLE FOUND");
console.log("ROWS:", rows.length);

// ✅ jede Zeile auseinandernehmen
rows.forEach((row, i) => {

 const td = row.querySelectorAll("td");

 if(td.length === 0) return;

 console.log("-----");
 console.log("ROW:", i);
 console.log("TD COUNT:", td.length);

 td.forEach((cell, idx) => {
  console.log(`td[${idx}]:`, cell.textContent.trim());
 });

});

} catch(e){
 console.error("💥 ERROR:", e);
}

})();
``
