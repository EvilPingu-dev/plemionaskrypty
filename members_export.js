/**
 * Ally Member Export – HTML Table Version
 * Neu formulierte Version basierend auf Hermitowski Members Export
 * Ausgabe erfolgt als HTML-Tabelle statt CSV-Download
 */

(async function (TribalWars) {

    const namespace = "Hermitowski.Members.HTML";
    const LABELS = {
        title: "Hermitowscy Członkowie",
        export: "Export",
        options: "Exportoptionen",
        troops: "Wojska",
        buildings: "Budynki",
        defense: "Obrona",
        skipped: "Pominięci gracze",
        noAlly: "Jesteś poza plemieniem",
        noVillages: "Gracz nie posiada wiosek",
        noAccess: "Gracz nie udostępnia informacji",
        noAccessSuffix: "(brak dostępu)",
        progressList: "Pobieranie listy graczy",
        progressFetch: "Pobieranie danych graczy (__0__/__1__)",
        progressTable: "Generowanie tabelki"
    };

    const UIHelper = {
        id: name => `${namespace}.${name}`,
        el: name => document.querySelector(`#${namespace}\\.${name}`),
        error: msg => UI.ErrorMessage(msg),
        popup: html => Dialog.show(namespace, html)
    };

    const App = {
        exportModes: ["members_troops", "members_buildings", "members_defense"],
        throttle: 50,
        parallel: 4,
        buildingNames: null,

        async start() {
            if (!game_data.player.ally) throw LABELS.noAlly;
            this.renderUI();
            this.loadSettings();
            this.bindEvents();
        },

        renderUI() {
            const box = document.createElement("div");
            box.id = UIHelper.id("container");

            const title = document.createElement("h2");
            title.textContent = LABELS.title;

            const fieldset = document.createElement("fieldset");
            const legend = document.createElement("legend");
            legend.textContent = LABELS.options;

            const table = document.createElement("table");

            this.exportModes.forEach(mode => {
                const row = document.createElement("tr");
                const label = document.createElement("label");
                const cb = document.createElement("input");

                label.textContent = LABELS[mode.split("_")[1]];
                label.setAttribute("for", UIHelper.id(mode));

                cb.type = "checkbox";
                cb.id = UIHelper.id(mode);
                cb.checked = true;

                const td1 = document.createElement("td");
                const td2 = document.createElement("td");
                td1.append(label);
                td2.append(cb);
                row.append(td1, td2);
                table.append(row);
            });

            const btn = document.createElement("button");
            btn.id = UIHelper.id("export");
            btn.textContent = LABELS.export;
            btn.classList.add("btn");
            btn.style.float = "right";

            const progress = document.createElement("div");
            progress.id = UIHelper.id("progress");

            fieldset.append(legend, table);
            box.append(title, fieldset, btn, progress);

            Dialog.show(namespace, box.outerHTML);
            document.querySelector('[id^="popup_box"]').style.width = "350px";
        },

        bindEvents() {
            this.exportModes.forEach(mode => {
                UIHelper.el(mode).addEventListener("click", () => {
                    this.saveSettings();
                    this.updateButton();
                });
            });

            UIHelper.el("export").addEventListener("click", () => this.runExport());
            this.updateButton();
        },

        updateButton() {
            const any = this.exportModes.some(m => UIHelper.el(m).checked);
            UIHelper.el("export").disabled = !any;
        },

        saveSettings() {
            const s = {};
            this.exportModes.forEach(m => s[m] = UIHelper.el(m).checked);
            localStorage.setItem(namespace, JSON.stringify(s));
        },

        loadSettings() {
            const s = JSON.parse(localStorage.getItem(namespace) || "{}");
            this.exportModes.forEach(m => {
                UIHelper.el(m).checked = s[m] ?? true;
            });
        },

        async runExport() {
            const btn = UIHelper.el("export");
            btn.disabled = true;

            try {
                const opts = this.getOptions();
                const meta = await this.fetchMemberLists(opts);
                const tasks = this.buildRequests(meta);
                const raw = await this.fetchAll(tasks);
                const merged = this.mergeData(raw, opts);
                const [rows, skipped] = this.buildTable(meta, merged, opts);
                this.showHTMLTable(rows, skipped);
            } catch (e) {
                UIHelper.error(e);
            }

            btn.disabled = false;
        },

        getOptions() {
            const o = {};
            this.exportModes.forEach(m => o[m] = UIHelper.el(m).checked);
            return o;
        },

        async fetchMemberLists(opts) {
            UIHelper.el("progress").textContent = LABELS.progressList;

            const reqs = this.exportModes
                .filter(m => opts[m])
                .map(m => this.fetchMemberList(m));

            const res = await Promise.all(reqs);
            return Object.fromEntries(res);
        },

        async fetchMemberList(mode) {
            const url = TribalWars.buildURL("", { screen: "ally", mode });
            const html = await (await fetch(url)).text();

            const body = document.createElement("body");
            body.innerHTML = html;

            const options = [...body.querySelectorAll("select option")].slice(1).map(o => {
                const name = o.label.endsWith(LABELS.noAccessSuffix)
                    ? o.label.replace(LABELS.noAccessSuffix, "").trim()
                    : o.label;

                return {
                    player_id: o.value,
                    player_name: name,
                    access: !o.disabled
                };
            });

            this.allyName = body.querySelector("h2").innerText;
            return [mode, options];
        },

        buildRequests(meta) {
            const map = {
                members_troops: this.mapTroops,
                members_buildings: this.mapBuildings,
                members_defense: this.mapDefense
            };

            const tasks = [];

            for (const mode in meta) {
                meta[mode].forEach(m => {
                    tasks.push({
                        mode,
                        player_id: m.player_id,
                        player_name: m.player_name,
                        access: m.access,
                        mapper: map[mode]
                    });
                });
            }

            return tasks;
        },

        async fetchAll(tasks) {
            const queue = [...tasks];
            const active = [];
            const ids = [];
            const result = {};

            tasks.forEach(t => {
                result[t.player_id] = {};
                this.exportModes.forEach(m => result[t.player_id][m] = []);
            });

            while (queue.length || active.length) {
                UIHelper.el("progress").textContent =
                    LABELS.progressFetch
                        .replace("__0__", tasks.length - queue.length)
                        .replace("__1__", tasks.length);

                while (queue.length && active.length < this.parallel) {
                    const t = queue.pop();
                    if (!t.access) continue;

                    const url = TribalWars.buildURL("", {
                        screen: "ally",
                        mode: t.mode,
                        player_id: t.player_id
                    });

                    const req = this.delay(fetch(url, { redirect: "manual" }));
                    active.push(req);
                    ids.push(t.mode + t.player_id);
                }

                const res = await Promise.any(active);
                const params = new URLSearchParams(res.url);
                const pid = params.get("player_id");
                const mode = params.get("mode");

                const idx = ids.indexOf(mode + pid);
                active.splice(idx, 1);
                ids.splice(idx, 1);

                const task = tasks.find(x => x.player_id === pid && x.mode === mode);

                if (res.type === "opaqueredirect") {
                    result[pid][mode] = [];
                } else if (res.status === 200) {
                    result[pid][mode] = await task.mapper(res);
                } else {
                    queue.push(task);
                }
            }

            return result;
        },

        delay: async function (p) {
            const start = Date.now();
            const r = await p;
            const d = Date.now() - start;
            return new Promise(res => {
                setTimeout(() => res(r), Math.max(0, this.throttle - d));
            });
        },

        async mapTroops(res) {
            const html = await res.text();
            const body = document.createElement("body");
            body.innerHTML = html;

            const table = body.querySelector("#ally_content table.vis.w100");
            if (!table) return [];

            const units = game_data.units;
            const data = [];

            const cmd = { incoming: -1, outgoing: -1 };
            for (let i = units.length + 1; i < table.rows[0].cells.length; i++) {
                const img = table.rows[0].cells[i].children[0].src.split("/").pop();
                if (img === "commands_outgoing.png") cmd.outgoing = i;
                if (img === "att.png") cmd.incoming = i;
            }

            for (let r = 1; r < table.rows.length; r++) {
                const row = table.rows[r];
                const obj = { units: {} };

                obj.coords = row.cells[0].innerText.match(/\d+\|\d+/)[0];
                obj.village_name = row.cells[0].innerText.trim();

                units.forEach((u, i) => {
                    const val = row.cells[i + 1].innerText.trim();
                    obj.units[u] = val === "?" ? null : Number(val);
                });

                obj.outgoing = cmd.outgoing === -1 ? null : Number(row.cells[cmd.outgoing].innerText);
                obj.incoming = cmd.incoming === -1 ? null : Number(row.cells[cmd.incoming].innerText);

                data.push(obj);
            }

            return data;
        },

        async mapBuildings(res) {
            const html = await res.text();
            const body = document.createElement("body");
            body.innerHTML = html;

            const table = body.querySelector("#ally_content table.vis.w100");
            if (!table) return [];

            const info = {};
            for (let i = 2; i < table.rows[0].cells.length; i++) {
                info[i] = table.rows[0].cells[i].children[0].src.split("/").pop().replace(".png", "");
            }

            if (!this.buildingNames) this.buildingNames = Object.values(info);

            const data = [];

            for (let r = 1; r < table.rows.length; r++) {
                const row = table.rows[r];
                const obj = { buildings: {} };

                obj.village_name = row.cells[0].innerText.trim();
                obj.coords = row.cells[0].innerText.match(/\d+\|\d+/)[0];
                obj.points = Number(row.cells[1].innerText.replace(".", ""));

                for (const idx in info) {
                    obj.buildings[info[idx]] = Number(row.cells[idx].innerText);
                }

                data.push(obj);
            }

            return data;
        },

        async mapDefense(res) {
            const html = await res.text();
            const body = document.createElement("body");
            body.innerHTML = html;

            const table = body.querySelector("#ally_content table.vis.w100");
            if (!table) return [];

            const units = game_data.units;
            const data = [];
            const hasIncoming = table.rows[0].cells.length > units.length + 2;

            for (let r = 1; r < table.rows.length; r += 2) {
                const row1 = table.rows[r];
                const row2 = table.rows[r + 1];

                const obj = {
                    village: {},
                    transit: {}
                };

                obj.village_name = row1.cells[0].innerText.trim();
                obj.coords = row1.cells[0].innerText.match(/\d+\|\d+/)[0];
                obj.incoming = hasIncoming ? Number(row1.cells[units.length + 2].innerText) : null;

                units.forEach((u, i) => {
                    const v1 = row1.cells[i + 2].innerText.trim();
                    const v2 = row2.cells[i + 1].innerText.trim();
                    obj.village[u] = v1 === "?" ? null : Number(v1);
                    obj.transit[u] = v2 === "?" ? null : Number(v2);
                });

                data.push(obj);
            }

            return data;
        },

        mergeData(raw, opts) {
            const out = {};

            for (const pid in raw) {
                out[pid] = {};
                for (const mode in opts) {
                    if (!opts[mode]) continue;

                    raw[pid][mode].forEach(v => {
                        if (!out[pid][v.coords]) out[pid][v.coords] = {};
                        Object.assign(out[pid][v.coords], v);
                    });
                }
            }

            return out;
        },

        buildTable(meta, data, opts) {
            UIHelper.el("progress").textContent = LABELS.progressTable;

            const header = this.buildHeader(opts);
            const rows = [header];

            const mergedMeta = this.mergeMeta(meta, opts);
            const skipped = [];

            for (const pid in mergedMeta) {
                const info = mergedMeta[pid];
                const villages = data[pid];

                const hasAccess = this.exportModes
                    .filter(m => opts[m])
                    .some(m => info.access[m]);

                if (!hasAccess) {
                    skipped.push({ name: info.name, reason: LABELS.noAccess });
                    continue;
                }

                if (Object.keys(villages).length === 0) {
                    skipped.push({ name: info.name, reason: LABELS.noVillages });
                    continue;
                }

                for (const coords in villages) {
                    const v = villages[coords];
                    const row = [];

                    row.push(info.name, v.village_name, v.coords);

                    if (opts.members_troops || opts.members_defense) {
                        row.push(v.incoming ?? "");
                    }

                    if (opts.members_troops) {
                        row.push(v.outgoing ?? "");
                        if (info.access.members_troops) {
                            game_data.units.forEach(u => row.push(v.units?.[u] ?? ""));
                        } else {
                            game_data.units.forEach(() => row.push(""));
                        }
                    }

                    if (opts.members_buildings) {
                        if (info.access.members_buildings) {
                            row.push(v.points ?? "");
                            this.buildingNames.forEach(b => row.push(v.buildings?.[b] ?? ""));
                        } else {
                            row.push("");
                            this.buildingNames.forEach(() => row.push(""));
                        }
                    }

                    if (opts.members_defense) {
                        if (info.access.members_defense) {
                            ["village", "transit"].forEach(type => {
                                game_data.units.forEach(u => row.push(v[type]?.[u] ?? ""));
                            });
                        } else {
                            game_data.units.forEach(() => row.push(""));
                            game_data.units.forEach(() => row.push(""));
                        }
                    }

                    rows.push(row);
                }
            }

            return [rows, skipped];
        },

        mergeMeta(meta, opts) {
            const out = {};

            this.exportModes.forEach(mode => {
                if (!opts[mode]) return;

                meta[mode].forEach(m => {
                    if (!out[m.player_id]) {
                        out[m.player_id] = {
                            name: m.player_name,
                            access: {}
                        };
                        this.exportModes.forEach(x => out[m.player_id].access[x] = false);
                    }
                    out[m.player_id].access[mode] = m.access;
                });
            });

            return out;
        },

        buildHeader(opts) {
            const h = ["player_name", "village_name", "coords"];

            if (opts.members_troops || opts.members_defense) h.push("incoming");
            if (opts.members_troops) {
                h.push("outgoing");
                h.push(...game_data.units);
            }
            if (opts.members_buildings) {
                h.push("points", ...this.buildingNames);
            }
            if (opts.members_defense) {
                h.push(...game_data.units.map(u => "village_" + u));
                h.push(...game_data.units.map(u => "transit_" + u));
            }

            return h;
        },

        showHTMLTable(rows, skipped) {
            const wrap = document.createElement("div");

            const info = document.createElement("p");
            info.textContent = "Markiere die Tabelle und kopiere sie (Strg+C).";
            wrap.append(info);

            const table = document.createElement("table");
            table.classList.add("vis");
            table.style.borderCollapse = "collapse";

            rows.forEach((r, i) => {
                const tr = document.createElement("tr");
                r.forEach(c => {
                    const cell = document.createElement(i === 0 ? "th" : "td");
                    cell.textContent = c;
                    cell.style.border = "1px solid #ccc";
                    cell.style.padding = "3px 6px";
                    tr.append(cell);
                });
                table.append(tr);
            });

            wrap.append(table);

            if (skipped.length) {
                const warn = document.createElement("pre");
                warn.textContent = LABELS.skipped + ":\n" +
                    skipped.map(s => `${s.name} – ${s.reason}`).join("\n");
                wrap.append(warn);
            }

            UIHelper.popup(wrap.outerHTML);
        }
    };

    try {
        await App.start();
    } catch (e) {
        UIHelper.error(e);
    }

})(TribalWars);
