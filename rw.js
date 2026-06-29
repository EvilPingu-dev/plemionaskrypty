(async function () {
    "use strict";

    const NS = "sup_";
    const MAX_PAGES = 200;
    const REQUEST_DELAY = 250;
    const BASE_URL = `${location.origin}/game.php`;

    const Script = {
        results: [],
        filteredResults: [],
        seen: new Set(),

        settings: {
            sort: "points_desc"
        },

        init() {
            document.getElementById(`${NS}overlay`)?.remove();

            const style = document.createElement("style");
            style.id = `${NS}style`;
            style.textContent = `
                .sup-modal{
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,.75);
                    backdrop-filter:blur(4px);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    z-index:999999;
                }

                .sup-card{
                    background:#fff;
                    width:500px;
                    max-width:95vw;
                    border-radius:12px;
                    padding:16px;
                    box-shadow:0 10px 30px rgba(0,0,0,.3);
                    font-family:Arial,sans-serif;
                }

                .sup-header{
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:12px;
                }

                .sup-close{
                    border:none;
                    background:#ef4444;
                    color:white;
                    width:30px;
                    height:30px;
                    border-radius:6px;
                    cursor:pointer;
                    font-weight:bold;
                }

                .sup-input{
                    width:100%;
                    padding:8px;
                    border:1px solid #ccc;
                    border-radius:6px;
                    box-sizing:border-box;
                }

                .sup-row{
                    display:flex;
                    gap:8px;
                    margin-top:10px;
                }

                .sup-btn{
                    border:none;
                    padding:10px 14px;
                    border-radius:6px;
                    cursor:pointer;
                    background:#2563eb;
                    color:white;
                }

                .sup-btn:hover{
                    background:#1d4ed8;
                }

                .sup-progress{
                    background:#ddd;
                    height:8px;
                    border-radius:999px;
                    overflow:hidden;
                    margin-top:12px;
                }

                .sup-progress-bar{
                    background:#2563eb;
                    height:100%;
                    width:0%;
                    transition:.2s;
                }

                .sup-results{
                    background:white;
                    width:95%;
                    max-width:1200px;
                    max-height:90vh;
                    padding:16px;
                    border-radius:12px;
                    overflow:hidden;
                    display:flex;
                    flex-direction:column;
                }

                .sup-toolbar{
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                    margin-bottom:10px;
                }

                .sup-table-wrap{
                    overflow:auto;
                    border:1px solid #ddd;
                    flex:1;
                }

                .sup-table{
                    width:100%;
                    border-collapse:collapse;
                }

                .sup-table th{
                    position:sticky;
                    top:0;
                    background:#2563eb;
                    color:white;
                    cursor:pointer;
                    padding:8px;
                }

                .sup-table td{
                    padding:6px 8px;
                    border-bottom:1px solid #eee;
                }

                .sup-table tr:nth-child(even){
                    background:#f7f7f7;
                }

                .sup-table tr:hover{
                    background:#e8f1ff;
                }

                .sup-count{
                    margin-top:8px;
                    color:#666;
                }
            `;

            document.getElementById(`${NS}style`)?.remove();
            document.head.appendChild(style);

            const html = `
                <div id="${NS}overlay" class="sup-modal">
                    <div class="sup-card">
                        <div class="sup-header">
                            <h2>Support Ranking PRO</h2>
                            <button id="${NS}close" class="sup-close">✕</button>
                        </div>

                        <label>Tribes</label>
                        <textarea
                            id="${NS}tribes"
                            class="sup-input"
                            style="height:90px"
                            placeholder="MILF3&#10;Cart3l"></textarea>

                        <div class="sup-row">
                            <input
                                id="${NS}top"
                                class="sup-input"
                                placeholder="Top X">

                            <input
                                id="${NS}min"
                                class="sup-input"
                                placeholder="Min Points">
                        </div>

                        <button
                            id="${NS}start"
                            class="sup-btn"
                            style="width:100%;margin-top:12px;">
                            Start Scan
                        </button>

                        <div class="sup-progress">
                            <div id="${NS}bar" class="sup-progress-bar"></div>
                        </div>

                        <div id="${NS}log" style="margin-top:8px;">
                            Ready
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML("beforeend", html);

            document.getElementById(`${NS}close`)
                .onclick = () => this.close();

            document.getElementById(`${NS}start`)
                .onclick = () => this.start();

            document.addEventListener("keydown", e => {
                if (e.key === "Escape") {
                    this.close();
                }
            });
        },

        close() {
            document.getElementById(`${NS}overlay`)?.remove();
            document.getElementById(`${NS}results`)?.remove();
        },

        log(text) {
            const el = document.getElementById(`${NS}log`);
            if (el) el.textContent = text;
        },

        prog(value) {
            document.getElementById(`${NS}bar`).style.width =
                `${Math.min(100, value)}%`;
        },

        async fetchDoc(url) {
            try {
                const response = await fetch(url);

                return new DOMParser().parseFromString(
                    await response.text(),
                    "text/html"
                );
            } catch (e) {
                console.error(e);
                return null;
            }
        },

        async start() {
            this.results = [];
            this.filteredResults = [];
            this.seen = new Set();

            this.targets =
                document.getElementById(`${NS}tribes`)
                    .value
                    .split(/\n|\s+/)
                    .map(v => v.trim())
                    .filter(Boolean);

            this.top =
                parseInt(document.getElementById(`${NS}top`).value) || 0;

            this.min =
                parseInt(document.getElementById(`${NS}min`).value) || 0;

            await this.scan();

            document.getElementById(`${NS}overlay`)?.remove();

            this.showResults();
        },

        async scan() {
            for (let page = 0; page < MAX_PAGES; page++) {

                if (this.top && this.results.length >= this.top)
                    break;

                const doc = await this.fetchDoc(
                    `${BASE_URL}?village=${game_data.village.id}&screen=ranking&mode=kill_player&type=support&offset=${page * 25}`
                );

                if (!doc) break;

                const table = [...doc.querySelectorAll("table.vis")]
                    .find(t => {
                        const h = [...t.querySelectorAll("th")]
                            .map(x => x.textContent.trim());

                        return (
                            h.includes("Ranking") &&
                            h.includes("Nazwa") &&
                            h.includes("Plemię") &&
                            h.includes("Pokonany")
                        );
                    });

                if (!table) break;

                let found = 0;

                table.querySelectorAll("tr").forEach(row => {

                    const td = row.querySelectorAll("td");

                    if (td.length !== 4)
                        return;

                    found++;

                    const player =
                        td[1].querySelector("a")?.textContent.trim();

                    const ally =
                        td[2].querySelector("a")?.textContent.trim() || "";

                    const points =
                        parseInt(
                            td[3].textContent
                                .replace(/\./g, "")
                                .trim()
                        );

                    if (points < this.min)
                        return;

                    if (
                        this.targets.length &&
                        !this.targets.some(t => ally.includes(t))
                    ) {
                        return;
                    }

                    if (this.seen.has(player))
                        return;

                    this.seen.add(player);

                    this.results.push({
                        rank: parseInt(td[0].textContent.trim()),
                        player,
                        ally,
                        points
                    });
                });

                this.log(
                    `Page ${page + 1} | Found ${this.results.length}`
                );

                this.prog(((page + 1) / MAX_PAGES) * 100);

                if (!found)
                    break;

                await new Promise(
                    r => setTimeout(r, REQUEST_DELAY)
                );
            }

            this.prog(100);
        },

        sortResults(mode) {
            this.settings.sort = mode;

            switch (mode) {

                case "points_asc":
                    this.filteredResults.sort(
                        (a, b) => a.points - b.points
                    );
                    break;

                case "rank":
                    this.filteredResults.sort(
                        (a, b) => a.rank - b.rank
                    );
                    break;

                case "player":
                    this.filteredResults.sort(
                        (a, b) =>
                            a.player.localeCompare(b.player)
                    );
                    break;

                case "ally":
                    this.filteredResults.sort(
                        (a, b) =>
                            a.ally.localeCompare(b.ally)
                    );
                    break;

                default:
                    this.filteredResults.sort(
                        (a, b) => b.points - a.points
                    );
            }

            this.renderTable();
        },

        renderTable() {
            const tbody =
                document.getElementById(`${NS}tbody`);

            if (!tbody)
                return;

            tbody.innerHTML =
                this.filteredResults.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${p.rank}</td>
                        <td>${p.player}</td>
                        <td>${p.ally}</td>
                        <td>${p.points.toLocaleString()}</td>
                    </tr>
                `).join("");

            document.getElementById(`${NS}count`)
                .textContent =
                `${this.filteredResults.length} Results`;
        },

getTextExport() {

    return `[table]
[**]Pozycja[||]Nick[||]Plemie[||]Punkty[/**]
${this.filteredResults.map((p, i) =>
    `[*]${i + 1}. [|]${p.player} [|]${p.ally || "-"} [|]${p.points}`
).join("\n")}
[/table]`;

},

        showResults() {

            this.filteredResults = [...this.results];

            document.body.insertAdjacentHTML("beforeend", `
                <div id="${NS}results" class="sup-modal">
                    <div class="sup-results">

                        <div class="sup-header">
                            <h2>Support Results (${this.results.length})</h2>
                            <button id="${NS}closeResults" class="sup-close">✕</button>
                        </div>

                        <div class="sup-toolbar">
                            <input
                                id="${NS}search"
                                class="sup-input"
                                style="flex:1;"
                                placeholder="Search player or ally">

                            <select id="${NS}sort" class="sup-input" style="width:180px;">
                                <option value="points_desc">Points ↓</option>
                                <option value="points_asc">Points ↑</option>
                                <option value="rank">Rank</option>
                                <option value="player">Player</option>
                                <option value="ally">Ally</option>
                            </select>

                            <button id="${NS}copy" class="sup-btn">📋 Copy</button>
                            <button id="${NS}txt" class="sup-btn">📄 TXT</button>
                            <button id="${NS}csv" class="sup-btn">📊 CSV</button>
                        </div>

                        <div class="sup-table-wrap">
                            <table class="sup-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Rank</th>
                                        <th>Player</th>
                                        <th>Ally</th>
                                        <th>Points</th>
                                    </tr>
                                </thead>
                                <tbody id="${NS}tbody"></tbody>
                            </table>
                        </div>

                        <div id="${NS}count" class="sup-count"></div>

                    </div>
                </div>
            `);

            document.getElementById(`${NS}closeResults`)
                .onclick = () =>
                    document.getElementById(`${NS}results`)?.remove();

            document.getElementById(`${NS}sort`)
                .addEventListener("change", e =>
                    this.sortResults(e.target.value)
                );

            document.getElementById(`${NS}search`)
                .addEventListener("input", e => {

                    const q =
                        e.target.value.toLowerCase();

                    this.filteredResults =
                        this.results.filter(r =>
                            r.player.toLowerCase().includes(q) ||
                            r.ally.toLowerCase().includes(q)
                        );

                    this.sortResults(
                        document.getElementById(`${NS}sort`).value
                    );
                });

            document.getElementById(`${NS}copy`)
                .onclick = async () => {

                    await navigator.clipboard.writeText(
                        this.getTextExport()
                    );

                    UI.SuccessMessage("Copied!");
                };

            document.getElementById(`${NS}txt`)
                .onclick = () => {

                    const blob =
                        new Blob(
                            [this.getTextExport()],
                            { type: "text/plain" }
                        );

                    const a =
                        document.createElement("a");

                    a.href =
                        URL.createObjectURL(blob);

                    a.download =
                        "support_ranking.txt";

                    a.click();
                };

            document.getElementById(`${NS}csv`)
                .onclick = () => {

                    const csv = [
                        "Rank,Player,Ally,Points",
                        ...this.filteredResults.map(r =>
                            `${r.rank},"${r.player}","${r.ally}",${r.points}`
                        )
                    ].join("\n");

                    const blob =
                        new Blob(
                            [csv],
                            { type: "text/csv" }
                        );

                    const a =
                        document.createElement("a");

                    a.href =
                        URL.createObjectURL(blob);

                    a.download =
                        "support_ranking.csv";

                    a.click();
                };

            this.sortResults("points_desc");
        }
    };

    Script.init();

})();
