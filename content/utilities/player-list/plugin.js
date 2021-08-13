// Player List
//
// Shows a list of players that appear on your map. Shows information about
// them: hash, planetCount, energy, energyCap, energyAvailable, silver, score,
// leaderboardRank List is sorted by highest energyCap. You can click on a
// player to jump to one of their planets (with the highest energyCap). Planets
// outside of your map will not be included, only what you can see and only
// players with more than one planet. The view will refresh every 60 seconds
// while open.

const minPlayerPlanetCount = 2;
const updateTimeInSeconds = 60;

function formatNumberForDisplay(num, decimalCount = 1) {
	num = parseInt(num);
	if (num < 1000) return num;
	if (num < 1000000) return (num / 1000).toFixed(decimalCount) + "k";
	if (num < 1000000000) return (num / 1000000).toFixed(decimalCount) + "m";
	if (num < 1000000000000) return (num / 1000000000).toFixed(decimalCount) + "b";
	return (num / 1000000000000, 2).toFixed(decimalCount) + "t";
}

function CreatePlayersObject() {
	let o = {};
	o.hash = "";
	o.planets = [];
	o.energy = 0;
	o.silver = 0;
	o.energyCap = 0;
	o.energyAvailablePercent = 0;
	o.addPlanet = function (planet) {
		o.planets.push(planet);
	}
	return o;
}

async function downloadTwitterNames() {
	return fetch('https://api.zkga.me/twitter/all-twitters')
		.then(response => response.json())
}

async function downloadLeaderboard() {
	let leaderboard = await fetch('https://api.zkga.me/leaderboard')
		.then(response => response.json())
	return leaderboard.entries;
}

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

function sortScoreFunc(p1, p2) {
	if (p1.score === undefined || p1.score === null) return 1;
	if (p2.score === undefined || p2.score === null) return -1;
	return p1.score - p2.score;
}

function Plugin() {
	let o = {};
	o.players = {};
	o.playerList = [];
	o.allPlayers;
	o.div;
	o.div_playerList;
	o.updateInterv = null;
	o.firstRender = true;
	o.twitterNames = null;
	o.leaderboard = [];

	o.init = function () {
		downloadTwitterNames().then(twitter => {
			o.twitterNames = twitter;
			o.update();
		});
		o.updateInterv = setInterval(o.update, 1000 * updateTimeInSeconds);
	}

	o.render = function (div) {
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

	o.destroy = function () {
		if (o.updateInterv !== null)
			clearInterval(o.updateInterv);
	}

	o.update = async function () {
		o.allPlayers = df.getAllPlayers();
		await o.updateLeaderboard();
		o.getPlayerInfo();
		o.drawPlayerInfo();
	}

	o.updateLeaderboard = async function () {
		o.leaderboard = await downloadLeaderboard();
		o.leaderboard.sort(sortScoreFunc);
	}

	o.getLeaderboardRank = function (ethAddress) {
		for (let i = 0; i < o.leaderboard.length; ++i) {
			if (ethAddress === o.leaderboard[i].ethAddress)
				return i+1;
		}
		return 999999;
	}

	o.getPlayerInfo = function () {
		o.players = {};
		function createNewPlayer(hash) {
			o.players[hash] = CreatePlayersObject();
			o.players[hash].hash = hash;
			o.players[hash].score = 999999;
			o.players[hash].leaderboardRank = 999999;
			for (let p of o.allPlayers) {
				if (p.address !== hash) continue;
				o.players[hash].dfObject = p;
				break;
			}
		}
		const planets = df.getAllOwnedPlanets();
		for (let planet of planets) {
			if (!o.players[planet.owner])
				createNewPlayer(planet.owner);
			let player = o.players[planet.owner];
			player.addPlanet(planet);
			player.energy += planet.energy;
			player.energyCap += planet.energyCap;
			player.silver += planet.silver;
		}
		for (let i = 0; i < o.leaderboard.length; ++i) {
			let lp = o.leaderboard[i];
			for (let hash in o.players) {
				if (lp.ethAddress === hash) {
					o.players[hash].leaderboardRank = i + 1;
					o.players[hash].score = lp.score;
					break;
				}
			}
		}
		o.playerList = [];
		for (let hash in o.players) {
			let player = o.players[hash];
			if (player.planets.length < minPlayerPlanetCount) continue;
			o.playerList.push(player);
			player.energyAvailablePercent = player.energy / player.energyCap;
		}
		// default sort by planet count - this makes it very likely that you will see yourself on the list
		o.playerList.sort((a, b) => b.planets.length - a.planets.length);
	}

	o.drawPlayerInfo = function () {
		o.div_playerList.innerText = "";
		let table = document.createElement('table');
		table.width = (parseInt(o.div.style.width)-20) + "px";
		{
			const tr = document.createElement('tr');
			const groups = ["hash", "name", "planets", "energy", "energyCap", "energyAvail", "silver", "score", "rank"];
			for (let group of groups) {
				let th = document.createElement('th');
				th.innerText = group;
				if (th.innerText !== "hash" && th.innerText !== "name")
					th.style.cursor = "pointer";

				th.onclick=()=>{
					if(th.innerText=='planets')	o.playerList.sort((a,b)=> b.planets.length-a.planets.length);
					else if(th.innerText=='energy') o.playerList.sort((a, b) => b.energy - a.energy);
					else if(th.innerText=='energyCap') o.playerList.sort((a,b)=> b.energyCap-a.energyCap);
					else if(th.innerText=='energyAvail') o.playerList.sort((a,b)=>b.energyAvailablePercent-a.energyAvailablePercent);
					else if(th.innerText=='silver') o.playerList.sort((a,b)=>b.silver-a.silver);
					else if(th.innerText=='score') o.playerList.sort(sortScoreFunc);
					else if(th.innerText=='rank') o.playerList.sort((a,b)=>a.leaderboardRank-b.leaderboardRank);
					o.drawPlayerInfo();
				}

				tr.appendChild(th);
			}
			table.appendChild(tr);
		}
		function addAsTd(tr, text) {
			let td = document.createElement('td');
			td.innerText = text;
			td.style["text-align"] = "center";
			tr.appendChild(td);
		}
		for (const player of o.playerList) {
			const tr = document.createElement('tr');
			tr.style["color"] = getPlayerColor(player.hash);
			tr.style.cursor = "pointer";
			const bestPlanet = findBestPlanetOfPlayer(player.hash);
			tr.onclick = () => {
				ui.centerPlanet(bestPlanet);
			}
			const twitterName = o.getTwitterName(player.hash);
			const name = twitterName !== "" ? twitterName : player.hash.substr(0, 8);
			tr.title = "jump to " + name;

			addAsTd(tr, player.hash.substr(0, 8));
			addAsTd(tr, twitterName);
			addAsTd(tr, player.planets.length);
			addAsTd(tr, formatNumberForDisplay(player.energy));
			addAsTd(tr, formatNumberForDisplay(player.energyCap));
			addAsTd(tr, parseInt(player.energyAvailablePercent * 100) + "%");
			addAsTd(tr, formatNumberForDisplay(player.silver));
			if (player.score === undefined) addAsTd(tr, "none");
			else addAsTd(tr, formatNumberForDisplay(player.score));
			addAsTd(tr, formatNumberForDisplay(player.leaderboardRank));
			table.appendChild(tr);
		}
		o.div_playerList.appendChild(table);
	}

	o.getTwitterName = function (playerEthAddress) {
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

