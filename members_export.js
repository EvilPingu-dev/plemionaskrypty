// ==UserScript==
// @name         TW Members Export (Dark Premium UI)
// @version      1.0
// @description  Export Wojska / Budynki / Obrona in modernem Popup
// @author       EvilPingu
// ==/UserScript==

(function() {
    "use strict";

    /* ---------------------------------------------------------
     *  MODULE 1 — UI MANAGER (Button, Popup, Styling)
     * --------------------------------------------------------- */
    class UIManager {
        static injectStyles() {
            const css = `
            .twexp-btn {
                position: fixed;
                top: 90px;
                right: 20px;
                background: #222;
                color: #eee;
                padding: 8px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
                border: 1px solid #444;
                box-shadow: 0 0 8px rgba(0,0,0,0.4);
                z-index: 99999;
            }
            .twexp-btn:hover {
                background: #333;
            }

            .twexp-popup-overlay {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
            }

            .twexp-popup {
                background: #1b1b1b;
                color: #eee;
                width: 480px;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                font-family: Arial, sans-serif;
            }

            .twexp-title {
                font-size: 20px;
                margin-bottom: 15px;
                text-align: center;
            }

            .twexp-switch {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                font-size: 16px;
            }

            .twexp-switch input {
                transform: scale(1.3);
            }

            .twexp-export-btn {
                width: 100%;
                padding: 10px;
                margin-top: 15px;
                background: #0aa;
                border: none;
                border-radius: 6px;
                color: #fff;
                font-size: 16px;
                cursor: pointer;
            }
            .twexp-export-btn:hover {
                background: #099;
            }

            .twexp-table-popup {
                background: #1b1b1b;
                color: #eee;
                width: 80%;
                max-height: 80%;
                overflow: auto;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
            }

            table.twexp-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            table.twexp-table th {
                position: sticky;
                top: 0;
                background: #111;
                padding: 8px;
                border-bottom: 2px solid #444;
            }
            table.twexp-table td {
                padding: 6px;
                border-bottom: 1px solid #333;
            }

            .twexp-copy-btn {
                background: #0aa;
                padding: 6px 12px;
                border-radius: 6px;
                float: right;
                cursor: pointer;
                margin-bottom: 10px;
            }
            `;
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
        }

        static createMainButton(onClick) {
            const btn = document.createElement("div");
            btn.className = "twexp-btn";
            btn.innerHTML = "🧩 Export";
            btn.onclick = onClick;
            document.body.appendChild(btn);
        }

        static showPopup(contentHTML) {
            const overlay = document.createElement("div");
            overlay.className = "twexp-popup-overlay";

            const popup = document.createElement("div");
            popup.className = "twexp-popup";
            popup.innerHTML = contentHTML;

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            return overlay;
        }

        static showTablePopup(html) {
            const overlay = document.createElement("div");
            overlay.className = "twexp-popup-overlay";

            const popup = document.createElement("div");
            popup.className = "twexp-table-popup";

            const copyBtn = document.createElement("div");
            copyBtn.className = "twexp-copy-btn";
            copyBtn.textContent = "Kopieren";
            copyBtn.onclick = () => navigator.clipboard.writeText(html);

            popup.appendChild(copyBtn);
            popup.insertAdjacentHTML("beforeend", html);

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            overlay.onclick = e => {
                if (e.target === overlay) overlay.remove();
            };
        }
    }

    /* ---------------------------------------------------------
     *  MODULE 2 — DATA FETCHER
     * --------------------------------------------------------- */
    class DataFetcher {
        static async fetchPage(url) {
            const res = await fetch(url);
            return await res.text();
        }

        static async getMembers() {
            const url = "/game.php?screen=info_ally&mode=members";
            return await this.fetchPage(url);
        }

        static async getTroops(id) {
            return await this.fetchPage(`/game.php?screen=info_player&mode=units&player_id=${id}`);
        }

        static async getBuildings(id) {
            return await this.fetchPage(`/game.php?screen=info_player&mode=buildings&player_id=${id}`);
        }

        static async getDefense(id) {
            return await this.fetchPage(`/game.php?screen=info_player&mode=defense&player_id=${id}`);
        }
    }

    /* ---------------------------------------------------------
     *  MODULE 3 — PARSER
     * --------------------------------------------------------- */
    class Parser {
        static parseMembers(html) {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const rows = [...doc.querySelectorAll("#ally_content table tbody tr")].slice(1);

            return rows.map(r => {
                const a = r.querySelector("a");
                return {
                    id: new URL(a.href).searchParams.get("player_id"),
                    name: a.textContent.trim()
                };
            });
        }

        static extractTable(html) {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const table = doc.querySelector("table");
            return table ? table.outerHTML : "<p>Keine Daten</p>";
        }
    }

    /* ---------------------------------------------------------
     *  MODULE 4 — TABLE BUILDER
     * --------------------------------------------------------- */
    class TableBuilder {
        static build(title, rows) {
            let html = `<h2>${title}</h2>`;
            html += `<table class="twexp-table">`;

            rows.forEach(row => {
                html += `<tr><td>${row.name}</td><td>${row.data}</td></tr>`;
            });

            html += `</table>`;
            return html;
        }
    }

    /* ---------------------------------------------------------
     *  MODULE 5 — MAIN APP
     * --------------------------------------------------------- */
    class App {
        static init() {
            UIManager.injectStyles();
            UIManager.createMainButton(() => this.openMenu());
        }

        static openMenu() {
            const popup = UIManager.showPopup(`
                <div class="twexp-title">Mitglieder Export</div>

                <div class="twexp-switch">
                    <span>Wojska</span>
                    <input type="checkbox" id="exp-wojska" checked>
                </div>

                <div class="twexp-switch">
                    <span>Budynki</span>
                    <input type="checkbox" id="exp-budynki" checked>
                </div>

                <div class="twexp-switch">
                    <span>Obrona</span>
                    <input type="checkbox" id="exp-obrona" checked>
                </div>

                <button class="twexp-export-btn" id="twexp-start">Exportieren</button>
            `);

popup.querySelector("#twexp-start").onclick = () => {
    const wantTroops = popup.querySelector("#exp-wojska").checked;
    const wantBuildings = popup.querySelector("#exp-budynki").checked;
    const wantDefense = popup.querySelector("#exp-obrona").checked;
    this.startExport(wantTroops, wantBuildings, wantDefense);
    popup.remove();

};

        }

        static async startExport() {
            const wantTroops = document.querySelector("#exp-wojska").checked;
            const wantBuildings = document.querySelector("#exp-budynki").checked;
            const wantDefense = document.querySelector("#exp-obrona").checked;

            const membersHTML = await DataFetcher.getMembers();
            const members = Parser.parseMembers(membersHTML);

            const rows = [];

            for (const m of members) {
                let data = "";

                if (wantTroops) {
                    const t = await DataFetcher.getTroops(m.id);
                    data += "<h4>Wojska</h4>" + Parser.extractTable(t);
                }
                if (wantBuildings) {
                    const b = await DataFetcher.getBuildings(m.id);
                    data += "<h4>Budynki</h4>" + Parser.extractTable(b);
                }
                if (wantDefense) {
                    const d = await DataFetcher.getDefense(m.id);
                    data += "<h4>Obrona</h4>" + Parser.extractTable(d);
                }

                rows.push({ name: m.name, data });
            }

            const html = TableBuilder.build("Export", rows);
            UIManager.showTablePopup(html);
        }
    }

    App.init();
})();
