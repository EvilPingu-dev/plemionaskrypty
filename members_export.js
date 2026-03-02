// ==UserScript==
// @name         TW Members Export (Dark Premium UI)
// @version      1.1
// @description  Export Wojska / Budynki / Obrona in modernem Popup
// @author       EvilPingu
// ==/UserScript==

(function() {
    "use strict";

    /* ---------------------------------------------------------
     *  UI MANAGER
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
                font-family: Arial, sans-serif;
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
                vertical-align: top;
            }

            .twexp-copy-btn {
                background: #0aa;
                padding: 6px 12px;
                border-radius: 6px;
                float: right;
                cursor: pointer;
                margin-bottom: 10px;
            }
            .twexp-copy-btn:hover {
                background: #099;
            }
            `;
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
        }

        static createMainButton(onClick) {
            if (document.querySelector(".twexp-btn")) return; // nicht doppelt

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

            overlay.addEventListener("click", e => {
                if (e.target === overlay) overlay.remove();
            });

            return { overlay, popup };
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
     *  DATA FETCHER
     * --------------------------------------------------------- */
class DataFetcher {

    // Mitglieder werden NICHT gefetcht – direkt aus der aktuellen Seite
    static getMembersDoc() {
        return document;
    }

    static async fetchPage(url) {
        const res = await fetch(url, { credentials: "include" });
        return await res.text();
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
     *  PARSER
     * --------------------------------------------------------- */
class Parser {

    static parseMembersFromDoc(doc) {

        // Alle Links im Dokument durchsuchen
        const links = [...doc.querySelectorAll("a[href*='player_id']")];

        const seen = new Set();
        const members = [];

        for (const a of links) {
            const url = new URL(a.href, location.origin);
            const id = url.searchParams.get("player_id");
            const name = a.textContent.trim();

            if (!id) continue;
            if (!name) continue;
            if (seen.has(id)) continue;

            seen.add(id);
            members.push({ id, name });
        }

        return members;
    }

    static extractFirstTable(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table");
        return table ? table.outerHTML : "<p>Brak danych</p>";
    }
}


    /* ---------------------------------------------------------
     *  TABLE BUILDER
     * --------------------------------------------------------- */
    class TableBuilder {
        static build(title, rows) {
            let html = `<h2>${title}</h2>`;
            html += `<table class="twexp-table">`;
            html += `<tr><th>Gracz</th><th>Dane</th></tr>`;

            for (const row of rows) {
                html += `<tr><td>${row.name}</td><td>${row.data}</td></tr>`;
            }

            html += `</table>`;
            return html;
        }
    }

    /* ---------------------------------------------------------
     *  APP
     * --------------------------------------------------------- */
    class App {
        static init() {
            UIManager.injectStyles();
            UIManager.createMainButton(() => this.openMenu());
        }

        static openMenu() {
            const { overlay, popup } = UIManager.showPopup(`
                <div class="twexp-title">Eksport członków</div>

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

                <button class="twexp-export-btn" id="twexp-start">Export</button>
            `);

            const startBtn = popup.querySelector("#twexp-start");
            const cbTroops = popup.querySelector("#exp-wojska");
            const cbBuildings = popup.querySelector("#exp-budynki");
            const cbDefense = popup.querySelector("#exp-obrona");

            startBtn.onclick = () => {
                const wantTroops = cbTroops.checked;
                const wantBuildings = cbBuildings.checked;
                const wantDefense = cbDefense.checked;

                overlay.remove(); // Popup weg
                this.startExport(wantTroops, wantBuildings, wantDefense);
            };
        }

        static async startExport(wantTroops, wantBuildings, wantDefense) {

    const membersDoc = DataFetcher.getMembersDoc();
    const members = Parser.parseMembersFromDoc(membersDoc);

    console.log("Gefundene Mitglieder:", members);

    // Beispiel: CSV-Header
    const header = ["player_name", "village_name", "coords"];
    // Hier je nach Optionen erweitern (analog Original)

    // Beispiel: CSV-Zeilen sammeln
    const csvLines = [];
    csvLines.push(header.join(","));

    // Beispiel: Füge Dummy-Daten hinzu (hier musst du echte Daten einfügen)
    for (const member of members) {
        // Beispielzeile
        csvLines.push(`"${member.name}","Dorfname","123|456"`);
    }

    // Ausgabe als Text im Dialog oder Konsole
    const csvText = csvLines.join("
");

    // Zeige Text zum Kopieren an (z.B. in einem Dialog)
    alert("CSV-Daten zum Kopieren:

" + csvText);

    // Alternativ: in Konsole ausgeben
    console.log(csvText);
}
