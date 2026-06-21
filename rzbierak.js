javascript:(function () {

var currentUrl = window.location.href;
var yourVillage = currentUrl.substring(currentUrl.indexOf("village=")+8, currentUrl.indexOf("&"));
var world = currentUrl.substring(currentUrl.indexOf("://")+3, currentUrl.indexOf("."));
var baseUrl = "https://" + world + ".plemiona.pl";

var pressed = false;

function httpGet(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send(null);
    return xhr.responseText;
}

// 📦 Datenklasse
class ScavengeInfo {
    constructor(ranking, player, ally, points, time) {
        this.ranking = ranking;
        this.player = player;
        this.ally = ally;
        this.points = points;
        this.time = time;
    }
}

// 🧍 Mitglieder holen
function getAllyMembers(tag) {
    let url = `${baseUrl}/game.php?screen=ally&mode=members&tag=${tag}`;
    let html = httpGet(url);
    let doc = new DOMParser().parseFromString(html, "text/html");

    let members = [];
    let rows = doc.querySelectorAll("#ally_content table tr");

    rows.forEach((row, i) => {
        if (i === 0) return;
        let cols = row.getElementsByTagName("td");
        if (cols.length > 1) {
            members.push(cols[1].innerText.trim());
        }
    });

    return members;
}

// 🧠 Hauptlogik
function startScript() {

    if (pressed) return;

    let allyInput = document.getElementById("ScriptAlly").value.trim();
    if (!allyInput) {
        alert("Bitte Stammeskürzel eingeben!");
        return;
    }

    let allyTags = allyInput.split(" ");

    pressed = true;

    // 👉 alle Spieler sammeln
    let targetPlayers = new Set();

    allyTags.forEach(tag => {
        let members = getAllyMembers(tag);
        members.forEach(m => targetPlayers.add(m));
    });

    // 👉 Ranking scannen (kein fixes Limit)
    let results = [];
    let foundPlayers = new Set();

    for (let i = 0; i < 200; i++) {

        let url = `${baseUrl}/game.php?village=${yourVillage}&screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`;
        let html = httpGet(url);
        let doc = new DOMParser().parseFromString(html, "text/html");

        let rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

        if (rows.length <= 1) break;

        rows.forEach(row => {

            let cols = row.getElementsByTagName("td");
            if (cols.length < 5) return;

            let playerEl = cols[1].querySelector("a");
            if (!playerEl) return;

            let player = playerEl.innerText.trim();

            if (!targetPlayers.has(player)) return;

            let allyEl = cols[2].querySelector("a");
            if (!allyEl) return;

            let ally = allyEl.innerText.trim();
            let ranking = cols[0].innerText.trim();
            let points = cols[3].innerText.replace(/\./g,"");
            let time = cols[4].innerText.trim();

            results.push(new ScavengeInfo(ranking, player, ally, points, time));
            foundPlayers.add(player);
        });

        // ✅ STOP wenn alle gefunden
        if (foundPlayers.size === targetPlayers.size) break;
    }

    renderOutput(results, allyTags);
}

// 📊 Ausgabe
function renderOutput(results, allyTags) {

    let now = new Date();
    let text = `Ranking (${now.toLocaleDateString()})\n\n`;

    allyTags.forEach(tag => {

        let filtered = results.filter(r => r.ally === tag);

        text += `[spoiler=${tag}]\n`;
        text += `[table]\n`;
        text += `[**]LP[||]Rank[||]Spieler[||]Punkte[||]Zeit[/**]\n`;

        filtered.forEach((p, i) => {
            text += `[*][b]${i+1}[/b][|]${p.ranking}[|][player]${p.player}[/player][|][b]${p.points}[/b][|]${p.time}\n`;
        });

        text += `[/table]\n[/spoiler]\n\n`;
    });

    let ta = document.createElement("textarea");
    ta.style.width = "600px";
    ta.style.height = "300px";
    ta.value = text;

    document.getElementById("dudialog").appendChild(document.createElement("br"));
    document.getElementById("dudialog").appendChild(ta);
}

// 💬 UI Popup
Dialog.show("Scavenge Script",
    `<div id="dudialog">
        <b>Stämme eingeben (mit Leerzeichen):</b><br>
        <textarea id="ScriptAlly" style="width:95%;height:60px;"></textarea><br><br>
        <button onclick="startScript()">Start</button>
    </div>`
);

// global machen
window.startScript = startScript;

})();
