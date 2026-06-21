(async function () {

try {

const baseUrl = location.origin + "/game.php";

const Script = {

    target: new Set(),
    found: new Set(),
    results: [],

    async init() {
        this.createUI();
    },

    createUI() {

        // ✅ kill alte UI falls vorhanden
        document.getElementById("rzb_overlay")?.remove();

        const overlay = document.createElement("div");
        overlay.id = "rzb_overlay";

        overlay.style = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.7);
            display:flex;
            justify-content:center;
            align-items:center;
            z-index:9999999;
        `;

        overlay.innerHTML = `
            <div style="background:white;padding:15px;border-radius:10px;width:420px">
                <h3>Scavenge Ranking</h3>

                <textarea id="rzb_input"
                placeholder="TAG1 TAG2"
                style="width:100%;height:60px"></textarea>

                <br><br>

                <button id="rzb_start">Start</button>
                <button id="rzb_close">Close</button>

                <div id="rzb_log" style="margin-top:10px;font-size:12px"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById("rzb_start").onclick = () => this.start();
        document.getElementById("rzb_close").onclick = () => overlay.remove();
    },

    log(msg){
        document.getElementById("rzb_log").innerText = msg;
    },

    async fetchDoc(url){
        const res = await fetch(url);
        const text = await res.text();
        return new DOMParser().parseFromString(text,"text/html");
    },

    async getMembers(tag){

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

        const input = document.getElementById("rzb_input").value.trim();

        if(!input){
            alert("Enter tribe tags!");
            return;
        }

        const tags = input.split(" ");

        this.log("Loading members...");

        for(const t of tags){
            const members = await this.getMembers(t);
            members.forEach(x => this.target.add(x));
        }

        this.log(`Players: ${this.target.size}`);

        await this.scan(tags);
    },

    async scan(tags){

        for(let i=0;i<200;i++){

            this.log(`Scanning page ${i}`);

            const url = `${baseUrl}?screen=ranking&mode=in_a_day&type=scavenge&offset=${i*25}`;

            const doc = await this.fetchDoc(url);
            const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

            if(rows.length <= 1) break;

            rows.forEach(r=>{
                const td = r.querySelectorAll("td");
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

            if(this.found.size === this.target.size)
                break;

            await new Promise(r => setTimeout(r, 80));
        }

        this.output(tags);
    },

    output(tags){

        let txt = "";

        tags.forEach(tag=>{

            const list = this.results.filter(x=>x.ally === tag);

            txt += `[spoiler=${tag}]\n`;
            txt += `[table]\n`;
            txt += `[**]LP[||]Rank[||]Player[||]Points[||]Time[/**]\n`;

            list.forEach((p,i)=>{
                txt += `[*][b]${i+1}[/b][|]${p.rank}[|][player]${p.player}[/player][|][b]${p.points}[/b][|]${p.time}\n`;
            });

            txt += `[/table]\n[/spoiler]\n\n`;
        });

        this.show(txt);
    },

    show(text){

        const out = document.createElement("div");

        out.style = `
            position:fixed;
            inset:0;
            background:black;
            display:flex;
            justify-content:center;
            align-items:center;
            z-index:99999999;
        `;

        out.innerHTML = `
            <div style="background:white;padding:10px;width:80%">
                <textarea style="width:100%;height:350px">${text}</textarea>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;

        document.body.appendChild(out);
    }
};

// ✅ WICHTIG: direkt starten
await Script.init();

} catch(e) {

console.error(e);
alert("Script crashed: " + e.message);

}

})();
