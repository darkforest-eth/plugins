const minPlayerPlanetCount = 2;
const updateTimeInSeconds = 60;

function formatNumberForDisplay(num, decimalCount=1) {
	num = parseInt(num);
	if (num < 1000) return num;
	if (num < 1000000) return (num/1000).toFixed(decimalCount)+"k";
	if (num < 1000000000) return (num/1000000).toFixed(decimalCount)+"m";
	if (num < 1000000000000) return (num/1000000000).toFixed(decimalCount)+"b";
	return (num/1000000000000, 2).toFixed(decimalCount)+"t";
}

function CreatePlayersObject() {
	var o = {};
	o.hash = "";
	o.planets = [];
	o.energy = 0;
	o.silver = 0;
	o.energyCap = 0;
	o.energyAvailablePercent = 0;
	o.reset = function() {
		o.planets = [];
		o.energy = 0;
		o.silver = 0;
		o.energyCap = 0;
		o.energyAvailablePercent = 0;
	}
	o.addPlanet = function(planet) {
		o.planets.push(planet);
	}
	return o;
}

async function downloadTwitterNames() {
	return fetch('https://api.zkga.me/twitter/all-twitters')
		.then(response => response.json())
}

// is not sorted - maybe there is a way to download a sorted array
// leaderboard["0.6.2-production"].scoresByPlayer;
// async function downloadLeaderboard() {
//	return fetch('https://api.zkga.me/leaderboard')
//		.then(response => response.json())
//}

// return example: 'hsl(285,100%,70%)'
function getPlayerColor(ethAddress) {
	return df.getProcgenUtils().getPlayerColor(ethAddress);
}

function findBestPlanetOfPlayer(ethAddress) {
	const planets = df.getAllOwnedPlanets();
	let bestPlanet = null;
	for (const planet of planets) {
		if (planet.owner !== ethAddress) continue;
		if (bestPlanet === null) {
			bestPlanet = planet;
			continue;
		}
		if (planet.energyCap > bestPlanet.energyCap)
			bestPlanet = planet;
	}
	return bestPlanet;
}

function getPlayerScore(player) {
	return player.withdrawnSilver + player.totalArtifactPoints;
}

function Plugin() {
	var o = {};
	o.players = {};
	o.playerList = [];
	o.allPlayers;
	o.div;
	o.div_playerList;
	o.updateInterv = null;
	o.firstRender = true;
	o.twitterNames = null;
	o.leaderboard = [];

	o.init = function() {
		downloadTwitterNames().then(twitter => {
			o.twitterNames = twitter;
			o.update();
		});
		o.updateInterv = setInterval(o.update, 1000*updateTimeInSeconds);
	}

	o.render = function(div) {
		o.div = div;
		div.style.width = '700px';
		div.parentElement.parentElement.style.bot = '0px'

		o.div_playerList = document.createElement('div');
		div.appendChild(o.div_playerList);

		if (o.firstRender) {
			o.init();
			o.firstRender = false;
		}
	}

	o.destroy = function() {
		if (o.updateInterv !== null)
			clearInterval(o.updateInterv);
	}

	o.update = function() {
		o.allPlayers = df.getAllPlayers();
		o.leaderboard = [...o.allPlayers];
		o.updateLeaderboard();
		o.getPlayerInfo();
		o.drawPlayerInfo();
	}

	o.updateLeaderboard = function() {
		o.leaderboard.sort((p1,p2) => {
			return getPlayerScore(p2) - getPlayerScore(p1);
		});
	}

	o.getLeaderboardRank = function(ethAddress) {
		for (var i=0; i<o.leaderboard.length; ++i) {
			if (ethAddress === o.leaderboard[i].address)
				return i;
		}
		return -1;
	}

	o.getPlayerInfo = function() {
		o.players = {};
		for (var hash in o.players) {
			o.players[hash].reset();
		}
		function createNewPlayer(hash) {
			o.players[hash] = CreatePlayersObject();
			o.players[hash].hash = planet.owner;
			for (var p of o.allPlayers) {
				if (p.address !== hash) continue;
				o.players[hash].dfObject = p;
				break;
			}
		}
		const planets = df.getAllOwnedPlanets();
		for (var planet of planets) {
			if (!o.players[planet.owner])
				createNewPlayer(planet.owner);
			var player = o.players[planet.owner];
			player.addPlanet(planet);
			player.energy += planet.energy;
			player.energyCap += planet.energyCap;
			player.silver += planet.silver;
		}
		o.playerList = [];
		for (var hash in o.players) {
			var player = o.players[hash];
			if (player.planets.length < minPlayerPlanetCount) continue;
			o.playerList.push(player);
			player.energyAvailablePercent = player.energy/player.energyCap;
		}
		o.playerList.sort((a, b) => b.energyCap - a.energyCap );
	}

	o.drawPlayerInfo = function() {
		o.div_playerList.innerText = "";
		var table = document.createElement('table');
		table.width = "700px";
		{
			const tr = document.createElement('tr');
			const groups = [ "hash", "name", "planets", "energy", "energyCap", "energyAvail", "silver", "score", "rank" ];
			for (var group of groups) {
				var th = document.createElement('th');
				th.innerText = group;
				tr.appendChild(th);
			}
			table.appendChild(tr);
		}
		function addAsTd(tr, text) {
			var td = document.createElement('td');
			td.innerText = text;
			td.style["text-align"] = "center";
			tr.appendChild(td);
		}
		for (const player of o.playerList) {
			const tr = document.createElement('tr');
			tr.style["color"] = getPlayerColor(player.hash);
			tr.style.cursor = "pointer";
			const bestPlanet = findBestPlanetOfPlayer(player.hash);
			tr.onclick = ()=> {
				ui.centerPlanet(bestPlanet);
			}
			const twitterName = o.getTwitterName(player.hash);
			const name = twitterName !== "" ? twitterName : player.hash.substr(0, 8); 
			tr.title = "jump to "+name;

			addAsTd(tr, player.hash.substr(0, 8));
			addAsTd(tr, twitterName);
			addAsTd(tr, player.planets.length);
			addAsTd(tr, formatNumberForDisplay(player.energy));
			addAsTd(tr, formatNumberForDisplay(player.energyCap));
			addAsTd(tr, parseInt(player.energyAvailablePercent*100)+"%");
			addAsTd(tr, formatNumberForDisplay(player.silver));
			addAsTd(tr, formatNumberForDisplay(getPlayerScore(player.dfObject)));
			addAsTd(tr, o.getLeaderboardRank(player.hash));
			table.appendChild(tr);
		}
		o.div_playerList.appendChild(table);
	}

	o.getTwitterName = function(playerEthAddress) {
		if (o.twitterNames === null) return "";
		if (!o.twitterNames[playerEthAddress]) return "";
		return o.twitterNames[playerEthAddress];
	}

	return o;
}

class PlayerListPlugin {
	constructor() {
		this.plugin = Plugin();
	}
	async render(container) {
		this.plugin.render(container);
	}
	destroy() {
		this.plugin.destroy();
		this.plugin = null;
	}
}

export default PlayerListPlugin;

