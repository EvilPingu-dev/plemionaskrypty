(async function () {

try {

const namespace = "ScavengeRanking";

const Helper = {
    id: (name) => `${namespace}_${name}`,
    el: (name) => document.getElementById(`${namespace}_${name}`)
};

// ✅ FIXED BASE URL
const baseUrl = location.origin + "/game.php";

const Script = {

    target: new Set(),
    found: new Set(),
    results: [],

    async init() {
        this.createUI();
    },

    createUI() {

        const overlay = document.createElement("div");
        overlay.id = Helper.id("overlay");

        overlay.style = `
            position:fixed;inset:0;
            background:rgba(0,0,0,0.6);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:999999;
        `;

        overlay.innerHTML = `
            <div style="background:white;padding:15px;border-radius:10px;width:400px">
                <h3>Scavenge Ranking</h3>

                <textarea id="${Helper.id("input")}" 
                placeholder="TAG1 TAG2"
                style="width:100%;height:60px"></textarea>

                <br><br>
                <button id="${Helper.id("start")}">Start</button>
                <div id="${Helper.id("log")}" style="margin-top:10px;font-size:12px"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        Helper.el("start").onclick = () => this.start();
    },

    log(msg){
        Helper.el("log").innerText = msg;
    },

    async fetchDoc(url){

        const res = await fetch(url);
        const text = await res.text();

        return new DOMParser().parseFromString(text,"text/html");
    },

    async getMembers(tag){

        // ✅ FIX: richtiger URL builder
        const url = `${baseUrl}?screen=ally&mode=members&tag=${tag}`;
        const doc = await this.fetchDoc(url);

        let arr = [];

        doc.querySelectorAll("#ally_content table tr").forEach((r,i)=>{
            if(i===0) return;
            let td = r.querySelectorAll("td");
            if(td[1]) arr.push(td[1].innerText.trim());
        });

        return arr;
    },

    async start(){

        const input = Helper.el("input").value.trim();
        if(!input){
            alert("Tags eingeben!");
            return;
        }

        let tags = input.split(" ");

        this.log("Lade Mitglieder...");

        for(let t of tags){
            let m = await this.getMembers(t);
            m.forEach(x=>this.target.add(x));
        }

        this.log(`Spieler: ${this.target.size}`);

        await this.scan(tags);
    },

    async scan(tags){

        for(let i=0;i<200;i++){

            this.log(`Ranking Seite ${i}`);

            const url = `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`;

            const doc = await this.fetchDoc(url);
            const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

            if(rows.length <= 1) break;

            rows.forEach(r=>{

                let td = r.querySelectorAll("td");
                if(td.length < 5) return;

                const player = td[1].innerText.trim();
                if(!this.target.has(player)) return;

                this.results.push({
                    rank: td[0].innerText,
                    player: player,
                    ally: td[2].innerText.trim(),
                    points: td[3].innerText,
                    time: td[4].innerText
                });

                this.found.add(player);
            });

            if(this.found.size === this.target.size) break;

            await new Promise(r => setTimeout(r, 80));
        }

        this.build(tags);
    },

    build(tags){

        let text = "";

        tags.forEach(tag=>{

            const list = this.results.filter(x=>x.ally === tag);

            text += `[spoiler=${tag}]\n`;
            text += `[table]\n`;
            text += `[**]LP[||]Rank[||]Player[||]Points[||]Time[/**]\n`;

            list.forEach((p,i)=>{
                text += `[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][b]${p.points}[/b][|]${p.time}\n`;
            });

            text += `[/table]\n[/spoiler]\n\n`;
        });

        this.show(text);
    },

    show(txt){

        const div = document.createElement("div");

        div.style = `
            position:fixed;inset:0;
            background:black;
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:9999999;
        `;

        div.innerHTML = `
            <div style="background:white;padding:10px;width:80%">
                <textarea style="width:100%;height:300px">${txt}</textarea>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;

        document.body.appendChild(div);
    }
};

await Script.init();

} catch(e) {

console.error(e);
alert("Script Fehler: " + e.message);

}

})();
