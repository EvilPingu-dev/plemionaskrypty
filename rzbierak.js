var tribesInput = prompt(
    "Stämme eingeben (durch Komma getrennt):",
    ""
);

if (!tribesInput) {
    alert("Keine Stämme angegeben.");
    throw new Error("Keine Stämme angegeben.");
}

var ally = tribesInput
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

var topPlayers = parseInt(
    prompt(
        "Wie viele Spieler der Rangliste sollen geprüft werden?",
        "5000"
    ),
    10
);

if (isNaN(topPlayers) || topPlayers < 25) {
    alert("Ungültige Spieleranzahl.");
    throw new Error("Ungültige Spieleranzahl.");
}

let numberOfRepetitions = Math.ceil(topPlayers / 25);

listPlayersRanking(ally, numberOfRepetitions);
