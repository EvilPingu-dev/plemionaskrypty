(async function () {

const namespace = "ScavengeRanking";

const Helper = {
    id: (name) => `${namespace}_${name}`,
    el: (name) => document.getElementById(Helper.id(name))
};

const Script = {

    playersTarget: new Set(),
    foundPlayers: new Set(),
    results: [],

    async init() {
        this.createUI();
    },

    createUI() {

        const overlay = document.createElement("div");
        overlay.id = Helper.id("overlay");

        overlay.style = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.6);
            display:flex;
            justify-content:center;
            align-items:center;
            z-index:999999;
        `;

        overlay.innerHTML = `
            <div style="background:white;padding:15px;border-radius:12px;max-width:500px;width:100%">
                <h2>Scavenge Ranking</h2>

                <textarea id="${Helper.id("input")}" 
                    placeholder="TAG1 TAG2 TAG3"
                    style="width:100%;height:60px"></textarea>

                <br><br>

                <button id="${Helper.id("start")}">Start</button>
                <div id="${Helper.id("progress")}" style="margin-top:10px;font-size:13px"></div>

            </div>
        `;

        document.body.appendChild(overlay);

        Helper.el("start").addEventListener("click", () => this.start());
    },

    log(text){
        Helper.el("progress").innerText = text;
    },

    async fetchDoc(url){
        const res = await fetch(url);
        const text = await res.text();
        return new DOMParser().parseFromString(text, "text/html");
    },

    async getAllyMembers(tag){

        const url = game_data.link_base_pure + `ally&mode=members&tag=${tag}`;
        const doc = await this.fetchDoc(url);

        let members = [];

        doc.querySelectorAll("#ally_content table tr").forEach((row,i)=>{
            if(i === 0) return;
            const tds = row.querySelectorAll("td");
            if(tds[1]){
                members.push(tds[1].innerText.trim());
            }
        });

        return members;
    },

    async start(){

        const input = Helper.el("input").value.trim();
        if(!input){
            alert("Podaj tagi plemion");
            return;
        }

        const tags = input.split(" ");

        this.log("Pobieranie członków...");

        for(const tag of tags){
            const members = await this.getAllyMembers(tag);
            members.forEach(m => this.playersTarget.add(m));
        }

        this.log(`Znaleziono graczy: ${this.playersTarget.size}`);

        await this.scanRanking(tags);
    },

    async scanRanking(tags){

        for(let i=0;i<300;i++){

            this.log(`Skanowanie rankingu... ${(i+1)*25}`);

            const url = game_data.link_base_pure +
                `ranking&mode=in_a_day&type=scavenge&offset=${i*25}`;

            const doc = await this.fetchDoc(url);

            const rows = doc.querySelectorAll("#in_a_day_ranking_table tr");

            if(rows.length <= 1) break;

            rows.forEach(row => {

                const cols = row.querySelectorAll("td");
                if(cols.length < 5) return;

                const player = cols[1]?.innerText.trim();
                const ally = cols[2]?.innerText.trim();

                if(!this.playersTarget.has(player)) return;

                this.results.push({
                    ranking: cols[0].innerText,
                    player,
                    ally,
                    points: cols[3].innerText,
                    time: cols[4].innerText
                });

                this.foundPlayers.add(player);
            });

            // ✅ early stop
            if(this.foundPlayers.size === this.playersTarget.size){
                break;
            }

            await this.sleep(80);
        }

        this.generateOutput(tags);
    },

    sleep(ms){
        return new Promise(r => setTimeout(r, ms));
    },

    generateOutput(tags){

        let output = "";

        tags.forEach(tag=>{

            const list = this.results.filter(x=> x.ally === tag);

            output += `[spoiler=${tag}]\n`;
            output += `[table]\n`;
            output += `[**]LP[||]Rank[||]Gracz[||]Punkty[||]Czas[/**]\n`;

            list.forEach((p,i)=>{
                output += `[*][b]${i+1}[/b][|]${p.ranking}[|][player]${p.player}[/player][|][b]${p.points}[/b][|]${p.time}\n`;
            });

            output += `[/table]\n[/spoiler]\n\n`;
        });

        this.showOutput(output);
    },

    showOutput(text){

        const overlay = document.createElement("div");

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
            <div style="background:white;padding:15px;border-radius:10px;width:80%;max-width:900px">
                <h2>BBCode</h2>
                <textarea style="width:100%;height:400px">${text}</textarea>
                <button onclick="this.parentElement.parentElement.remove()">Zamknij</button>
            </div>
        `;

        document.body.appendChild(overlay);
    }
};

await Script.init();

})();
