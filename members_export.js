(async function (TribalWars) {
    const start = Date.now();
    const namespace = 'Hermitowski.Members';

    const i18n = {
        ERROR: {
            NO_ALLY: 'Jesteś poza plemieniem',
            NO_VILLAGES: 'Gracz nie posiada wiosek',
            NO_PERMISSIONS: 'Gracz nie udostępnia informacji',
            SKIPPED_PLAYERS: 'Pominięci gracze'
        },
        LABEL: {
            export_option: 'Opcje exportu',
            members_troops: 'Wojska',
            members_buildings: 'Budynki',
            export: 'Export'
        },
        TITLE: 'Hermitowscy Członkowie',
        PLAYER_NO_ACCESS: '(brak dostępu)',
        ERROR_MESSAGE: 'Komunikat o błędzie: ',
        FORUM_THREAD: 'Link do wątku na forum',
        FORUM_THREAD_HREF: 'https://forum.plemiona.pl/index.php?threads/HermitowscyCzlonkowie.128378/',
        PROGRESS: {
            PLAYER_LIST: 'Pobieranie listy graczy',
            PLAYER_TROOPS: 'Pobieranie danych graczy (__0__/__1__)',
            TABLE: 'Generowanie tabelki',
        },
    };

    const Helper = {
        get_id: function (control_name) {
            return control_name ? `${namespace}.${control_name}` : namespace;
        },
        get_control: function (control_name) {
            const escaped_id = Helper.get_id(control_name).replace(/\./g, '\\.');
            return document.querySelector(`#${escaped_id}`);
        },
        handle_error: function (error) {
            if (typeof error === 'string') {
                UI.ErrorMessage(error);
                return;
            }
            const gui =
                `<h2>WTF - What a Terrible Failure</h2>
                <p><strong>${i18n.ERROR_MESSAGE}</strong><br/>
                <textarea rows='5' cols='42'>${error}\n\n${error.stack}</textarea><br/>
                <a href='${i18n.FORUM_THREAD_HREF}'>${i18n.FORUM_THREAD}</a>
                </p>`;
            Dialog.show(namespace, gui);
        },
    };

    const AllyMembers = {
        export_options: ['members_troops', 'members_buildings'],
        building_names: null,
        throttle_ms: 50,
        concurrent_requests: 4,

        create_ui: function () {
            const container = document.createElement('div');
            container.id = Helper.get_id('container');
            Dialog.show(Helper.get_id(), container.outerHTML);
            document.querySelector('[id^="popup_box"]').style.width = '300px';
        },

        create_controls: function () {
            const container = Helper.get_control('container');
            const title = document.createElement('h2');
            title.innerText = i18n.TITLE;

            const fieldset = document.createElement('fieldset');
            const legend = document.createElement('legend');
            legend.innerText = i18n.LABEL.export_option;

            const table = document.createElement('table');

            for (const export_option of AllyMembers.export_options) {
                const row = document.createElement('tr');
                const cell_1 = document.createElement('td');
                const cell_2 = document.createElement('td');
                const label = document.createElement('label');
                const checkbox = document.createElement('input');

                label.textContent = i18n.LABEL[export_option];
                label.setAttribute('for', Helper.get_id(export_option));

                checkbox.type = 'checkbox';
                checkbox.id = Helper.get_id(export_option);
                checkbox.checked = true;

                cell_1.append(label);
                cell_2.append(checkbox);
                row.append(cell_1);
                row.append(cell_2);
                table.append(row);
            }

            const button = document.createElement('button');
            button.id = Helper.get_id('export_button');
            button.innerText = i18n.LABEL.export;
            button.classList.add('btn');
            button.style.float = 'right';

            const progress = document.createElement('div');
            progress.id = Helper.get_id('progress');

            container.append(title);
            container.append(fieldset);
            fieldset.append(legend);
            fieldset.append(table);
            container.append(button);
            container.append(progress);
        },

        add_handlers: function () {
            for (const export_option of AllyMembers.export_options) {
                const control = Helper.get_control(export_option);
                control.addEventListener('click', AllyMembers.save_settings);
                control.addEventListener('click', AllyMembers.disable_export);
            }
            const export_button = Helper.get_control('export_button');
            export_button.addEventListener('click', AllyMembers.export);
        },

        save_settings: function () {
            const settings = {};
            for (const export_option of AllyMembers.export_options) {
                const control = Helper.get_control(export_option);
                settings[export_option] = control.checked;
            }
            localStorage.setItem(namespace + '.settings', JSON.stringify(settings));
        },

        load_settings: function () {
            const raw = localStorage.getItem(namespace + '.settings');
            if (!raw) return;
            try {
                const settings = JSON.parse(raw);
                for (const export_option of AllyMembers.export_options) {
                    if (settings.hasOwnProperty(export_option)) {
                        const control = Helper.get_control(export_option);
                        control.checked = settings[export_option];
                    }
                }
            } catch (e) {
                // ignore
            }
        },

        disable_export: function () {
            const export_button = Helper.get_control('export_button');
            const options = AllyMembers.get_export_options();
            const anyChecked = Object.values(options).some(v => v);
            export_button.disabled = !anyChecked;
        },

        print_progress: function (text) {
            const progress = Helper.get_control('progress');
            progress.textContent = text;
        },

        time_wrapper: function (promise) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    promise.then(resolve).catch(reject);
                }, AllyMembers.throttle_ms);
            });
        },

        init: async function () {
            AllyMembers.create_ui();
            AllyMembers.create_controls();
            AllyMembers.load_settings();
            AllyMembers.disable_export();
            AllyMembers.add_handlers();
        },

        get_export_options: function () {
            const export_options = {};
            for (const export_option of AllyMembers.export_options) {
                const control = Helper.get_control(export_option);
                export_options[export_option] = control.checked;
            }
            return export_options;
        },

        export: async function () {
            const export_button = Helper.get_control('export_button');
            try {
                export_button.disabled = true;
                const export_options = AllyMembers.get_export_options();
                const members_info = await AllyMembers.get_members_info(export_options);
                const requests = AllyMembers.get_requests(members_info);
                const responses = await AllyMembers.fetch_data(requests);
                const member_data = AllyMembers.merge_member_data(responses, export_options);
                const [table, skipped_players] = AllyMembers.generate_table(members_info, member_data, export_options);
                AllyMembers.save_as_file(table.join('\n'));

                if (skipped_players.length) {
                    AllyMembers.print_progress(
                        i18n.ERROR.SKIPPED_PLAYERS + '\n' +
                        skipped_players.map(x => `${x.player_name} - ${x.reason}`).join('\n')
                    );
                } else {
                    AllyMembers.print_progress('');
                }
            } catch (ex) {
                Helper.handle_error(ex);
            } finally {
                export_button.disabled = false;
            }
        },

        get_members_info: async function (export_options) {
            AllyMembers.print_progress(i18n.PROGRESS.PLAYER_LIST);
            const requests = [];

            for (const export_name in export_options) {
                if (export_options[export_name]) {
                    requests.push(AllyMembers.get_player_list(export_name));
                }
            }

            const responses = await Promise.all(requests);
            return Object.fromEntries(responses);
        },

        get_player_list: async function (mode) {
            const player_link = TribalWars.buildURL('', { screen: 'ally', mode });
            const response = await fetch(player_link);
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;

            const options = [...body.querySelectorAll('select option')].map(option => {
                const access_granted = !option.disabled;
                const player_id = option.value;
                let player_name = option.label;

                if (player_name.endsWith(i18n.PLAYER_NO_ACCESS)) {
                    player_name = player_name.slice(0, player_name.length - i18n.PLAYER_NO_ACCESS.length).trim();
                }

                return { player_id, player_name, access_granted };
            });

            AllyMembers.ally_name = body.querySelector('h2').innerText;
            return [mode, options.slice(1)];
        },

        get_requests: function (members_info) {
            const requests = [];
            const response_mappers = {
                members_troops: AllyMembers.map_member_troops,
                members_buildings: AllyMembers.map_member_buildings
            };

            for (const export_name in members_info) {
                for (const member of members_info[export_name]) {
                    requests.push(Object.assign({}, member, {
                        response_mapper: response_mappers[export_name],
                        mode: export_name
                    }));
                }
            }
            return requests;
        },

        fetch_data: async function (tasks) {
            const task_queue = [...tasks];
            const active_requests = [];
            const request_ids = [];

            const players_data = {};
            for (const task of tasks) {
                players_data[task.player_id] = {};
                for (const mode of AllyMembers.export_options) {
                    players_data[task.player_id][mode] = [];
                }
            }

            while (task_queue.length || active_requests.length) {
                AllyMembers.print_progress(
                    i18n.PROGRESS.PLAYER_TROOPS
                        .replace('__0__', tasks.length - task_queue.length)
                        .replace('__1__', tasks.length)
                );

                while (task_queue.length && active_requests.length < AllyMembers.concurrent_requests) {
                    const task = task_queue.pop();
                    if (!task.access_granted) continue;

                    const url = TribalWars.buildURL('', {
                        screen: 'ally',
                        mode: task.mode,
                        player_id: task.player_id
                    });

                    const request = AllyMembers.time_wrapper(fetch(url, { redirect: 'manual' }));
                    active_requests.push(request);
                    request_ids.push(task.mode + task.player_id);
                }

                const response = await Promise.any(active_requests);
                const response_data = new URLSearchParams(response.url);
                const response_player_id = response_data.get('player_id');
                const response_mode = response_data.get('mode');

                const index = request_ids.indexOf(response_mode + response_player_id);
                active_requests.splice(index, 1);
                request_ids.splice(index, 1);

                const finished_task = tasks.find(
                    x => x.player_id === response_player_id && x.mode === response_mode
                );

                if (response.type === "opaqueredirect") {
                    players_data[response_player_id][response_mode] = [];
                } else if (response.status === 200) {
                    if (finished_task.response_mapper) {
                        players_data[response_player_id][response_mode] =
                            await finished_task.response_mapper(response);
                    }
                } else {
                    task_queue.push(finished_task);
                }
            }

            return players_data;
        },

        map_member_troops: async function (response) {
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;

            const table = body.querySelector('#ally_content table.vis.w100');
            const player_data = [];

            if (!table) return player_data;

            for (let i = 1; i < table.rows.length; i++) {
                const row = table.rows[i];
                const row_data = { units: {} };

                row_data.village_name = row.cells[0].innerText.trim();
                row_data.coords = row.cells[0].innerText.match(/\d+\|\d+/g).pop();

                // cells: 0 = village, 1 = incoming, 2 = outgoing, ab 3 = units
                let idx = 3;
                for (const unit of game_data.units) {
                    const val = row.cells[idx].innerText.trim();
                    row_data.units[unit] = val === '?' ? '' : Number(val);
                    idx++;
                }

                player_data.push(row_data);
            }

            return player_data;
        },

        map_member_buildings: async function (response) {
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;

            const table = body.querySelector('#ally_content table.vis.w100');
            const player_data = [];

            if (!table) return player_data;

            const building_info = {};
            for (let i = 2; i < table.rows[0].cells.length; i++) {
                building_info[i] = table.rows[0].cells[i].children[0].src
                    .split('/').pop().split('.png')[0];
            }

            if (!AllyMembers.building_names) {
                AllyMembers.building_names = Object.values(building_info);
            }

            for (let i = 1; i < table.rows.length; i++) {
                const row = table.rows[i];
                const row_data = { buildings: {} };

                row_data.village_name = row.cells[0].innerText.trim();
                row_data.coords = row.cells[0].innerText.match(/\d+\|\d+/g).pop();
                row_data.points = Number(row.cells[1].innerText.replace('.', ''));

                for (const idx in building_info) {
                    row_data.buildings[building_info[idx]] =
                        Number(row.cells[idx].innerText);
                }

                player_data.push(row_data);
            }

            return player_data;
        },

        merge_member_data: function (responses, export_options) {
            const members_data = {};

            for (const player_id in responses) {
                const response_data = responses[player_id];
                const member_data = {};

                for (const export_name in export_options) {
                    if (!export_options[export_name]) continue;

                    const villages = response_data[export_name];

                    for (const village of villages) {
                        if (village.coords in member_data) {
                            Object.assign(member_data[village.coords], village);
                        } else {
                            member_data[village.coords] = JSON.parse(JSON.stringify(village));
                        }
                    }
                }

                members_data[player_id] = member_data;
            }

            return members_data;
        },

        merge_member_metadata: function (members_metadata, export_options) {
            const members_info = {};

            for (const export_name of AllyMembers.export_options) {
                if (!export_options[export_name]) continue;

                const members_list = members_metadata[export_name];

                for (const member of members_list) {
                    if (!(member.player_id in members_info)) {
                        const member_info = {
                            player_id: member.player_id,
                            player_name: member.player_name,
                            access_granted: {}
                        };

                        for (const export_name of AllyMembers.export_options) {
                            member_info.access_granted[export_name] = false;
                        }

                        members_info[member.player_id] = member_info;
                    }

                    members_info[member.player_id].access_granted[export_name] =
                        member.access_granted[export_name] ?? member.access_granted;
                }
            }

            return members_info;
        },

        generate_table_header: function (export_options) {
            const header = ['player_name', 'village_name', 'coords'];

            if (export_options['members_buildings']) {
                header.push('points', ...AllyMembers.building_names);
            }

            if (export_options['members_troops']) {
                header.push(...game_data.units);
            }

            return header;
        },

        generate_table: function (members_metadata, members_data, export_options) {
            AllyMembers.print_progress(i18n.PROGRESS.TABLE);

            const header = AllyMembers.generate_table_header(export_options);
            const members_info = AllyMembers.merge_member_metadata(members_metadata, export_options);

            const table = [header.join(",")];
            const skipped_players = [];

            for (const player_id in members_info) {
                const member_metadata_info = members_info[player_id];
                const member_data = members_data[player_id];

                if (!AllyMembers.export_options
                    .filter(export_name => export_options[export_name])
                    .map(export_name => member_metadata_info.access_granted[export_name])
                    .reduce((pv, cv) => cv || pv, false)) {
                    skipped_players.push({
                        player_name: member_metadata_info.player_name,
                        reason: i18n.ERROR.NO_PERMISSIONS
                    });
                    continue;
                }

                if (Object.keys(member_data).length === 0) {
                    skipped_players.push({
                        player_name: member_metadata_info.player_name,
                        reason: i18n.ERROR.NO_VILLAGES
                    });
                    continue;
                }

                for (const village_coords in member_data) {
                    const row = [];
                    const village_data = member_data[village_coords];

                    row.push(
                        `"${member_metadata_info.player_name}"`,
                        `"${village_data.village_name}"`,
                        village_data.coords
                    );

                    if (export_options['members_buildings']) {
                        if (member_metadata_info.access_granted['members_buildings']) {
                            row.push(village_data.points);
                            for (const building_name of AllyMembers.building_names) {
                                row.push(village_data.buildings[building_name]);
                            }
                        } else {
                            row.push('');
                            row.push(...new Array(AllyMembers.building_names.length).fill(''));
                        }
                    }

                    if (export_options['members_troops']) {
                        if (member_metadata_info.access_granted['members_troops']) {
                            for (const unit_name of game_data.units) {
                                row.push(village_data.units[unit_name] !== null ?
                                    village_data.units[unit_name] : '');
                            }
                        } else {
                            row.push(...new Array(game_data.units.length).fill(''));
                        }
                    }

                    table.push(row.join(','));
                }
            }

            return [table, skipped_players];
        },

        save_as_file: function (content) {
            const lines = content.split("\n");
            const header = lines.shift().split(",");

            const playerIdx = header.indexOf("player_name");
            const coordsIdx = header.indexOf("coords");
            const pointsIdx = header.indexOf("points");

            const isTroops = game_data.units.some(u => header.includes(u));
            const isBuildings = header.includes("main");

            const players = {};

            for (const line of lines) {
                if (!line.trim()) continue;
                const cols = line.split(",");

                const player = cols[playerIdx]?.replace(/"/g, "") || "???";
                const coords = cols[coordsIdx] || "0|0";

                let points = 0;
                if (isBuildings && pointsIdx !== -1 && typeof cols[pointsIdx] === "string") {
                    const cleaned = cols[pointsIdx].replace(/\./g, "");
                    const parsed = parseInt(cleaned, 10);
                    if (!isNaN(parsed)) points = parsed;
                }

                if (!players[player]) {
                    players[player] = {
                        totalPoints: 0,
                        villages: []
                    };
                }

                const villageData = {
                    coords,
                    points,
                    troops: {},
                    buildings: {}
                };

                // TROOPS (skip incoming + outgoing)
                if (isTroops) {
                    let idx = coordsIdx + 1; // incoming
                    idx += 2; // skip incoming + outgoing
                    for (const unit of game_data.units) {
                        villageData.troops[unit] = cols[idx] || "";
                        idx++;
                    }
                }

                // BUILDINGS
                if (isBuildings) {
                    let idx = pointsIdx + 1;
                    for (let i = 0; i < AllyMembers.building_names.length; i++) {
                        const bName = AllyMembers.building_names[i];
                        villageData.buildings[bName] = cols[idx] || "";
                        idx++;
                    }
                }

                players[player].totalPoints += points;
                players[player].villages.push(villageData);
            }

            const sortedPlayers = Object.entries(players)
                .sort((a, b) => b[1].totalPoints - a[1].totalPoints);

            let output = "[table]\n";
            output += "[**]Gracz[||]Koordynaty[||]Punkty";

            if (isTroops) {
                for (const unit of game_data.units) {
                    output += `[||][unit]${unit}[/unit]`;
                }
            }

            if (isBuildings) {
                for (const b of AllyMembers.building_names) {
                    output += `[||][building]${b}[/building]`;
                }
            }

            output += "[/**]\n";

            for (const [player, data] of sortedPlayers) {
                for (const v of data.villages) {
                    output += "[*]";
                    output += `[player]${player}[/player][|]`;
                    output += `[coord]${v.coords}[/coord][|]`;
                    output += `${v.points}`;

                    if (isTroops) {
                        for (const unit of game_data.units) {
                            output += `[|]${v.troops[unit]}`;
                        }
                    }

                    if (isBuildings) {
                        for (const b of AllyMembers.building_names) {
                            output += `[|]${v.buildings[b]}`;
                        }
                    }

                    output += "\n";
                }
            }

            output += "[/table]";

            const gui =
                `<h2>BBCode – zum Kopieren</h2>
                <p>Sortiert nach Gesamtpunkten pro Spieler (DESC)</p>
                <textarea rows="25" cols="100" style="width:100%;">${output}</textarea>`;
            Dialog.show(namespace + ".bbcode_output", gui);
        },

        main: async function () {
            if (!game_data.player.ally_id) {
                throw i18n.ERROR.NO_ALLY;
            }
            await AllyMembers.init();
        }
    };

    try { await AllyMembers.main(); }
    catch (ex) { Helper.handle_error(ex); }

    console.log(
        `%c${namespace} | Elapsed time: ${Date.now() - start} [ms]`,
        "background-color:black;color:lime;font-family:'Courier New';padding:5px"
    );

})(TribalWars);
