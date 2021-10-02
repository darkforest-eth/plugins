// Player List
//
// Shows a list of players that appear on your map. Shows information about
// them: hash, planetCount, energy, energyCap, energyAvailable, silver, score,
// leaderboardRank List is sorted by highest energyCap. You can click on a
// player to jump to one of their planets (with the highest energyCap). Planets
// outside of your map will not be included, only what you can see and only
// players with more than one planet. The view will refresh every 60 seconds
// while open.

// change the following if you want to disaplay or hide certain rows:
const COLUMN_VISIBLE_HASH = true;
const COLUMN_VISIBLE_NAME = true;
const COLUMN_VISIBLE_PLANETS = true;
const COLUMN_VISIBLE_ENERGY = true;
const COLUMN_VISIBLE_ENERGYCAP = false;
const COLUMN_VISIBLE_ENERGYAVAIL = true;
const COLUMN_VISIBLE_SILVER = true;
const COLUMN_VISIBLE_SCORE = true;
const COLUMN_VISIBLE_RANK = true;

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
	if (p1.score === undefined || p1.score === null) return -1;
	if (p2.score === undefined || p2.score === null) return 1;
	return p2.score - p1.score;
}

function Column(name, funcGetStr, funcSortPlayers) {
	let o = {};	
	o.name = name;
	o.getStr = funcGetStr;
	o.sortPlayers = funcSortPlayers;
	return o;
}

function Plugin() {
	let o = {};
	o.columns = [];
	o.players = {};
	o.playerList = [];
	o.allPlayers;
	o.div;
	o.div_playerList;
	o.updateInterv = null;
	o.firstRender = true;
	o.twitterNames = null;
	o.leaderboard = [];
	o.lastClickedColumn = "";
	o.reverseSort = false;

	o.init = function () {
		o.initColumns();
		downloadTwitterNames().then(twitter => {
			o.twitterNames = twitter;
			o.update();
		});
		o.updateInterv = setInterval(o.update, 1000 * updateTimeInSeconds);
	}
	
	function createColumnHash() {
		function getStr(player) {
			return player.hash.substr(0, 8);
		}
		function sortPlayers(p1, p2) {
			if (p1.hash < p2.hash) return -1;
			if (p1.hash > p2.hash) return 1;
			return 0;
		}
		return Column("hash", getStr, sortPlayers);
	}
	function createColumnName() {
		function getStr(player) {
			return o.getTwitterName(player.hash).substr(0, 12);
		}
		function sortPlayers(p1, p2) {
			let n1 = o.getTwitterName(p1.hash);
			let n2 = o.getTwitterName(p2.hash);
			if (n1.length === 0) return 1;
			if (n2.length === 0) return -1;
			if (n1 < n2) return -1;
			if (n1 > n2) return 1;
			return 0;
		}
		return Column("name", getStr, sortPlayers);
	}
	function createColumnPlanets() {
		function getStr(player) {
			return formatNumberForDisplay(player.planets.length);
		}
		function sortPlayers(p1, p2) {
			return p2.planets.length - p1.planets.length;
		}
		return Column("planets", getStr, sortPlayers);
	}
	function createColumnEnergy() {
		function getStr(player) {
			return formatNumberForDisplay(player.energy);
		}
		function sortPlayers(p1, p2) {
			return p2.energy - p1.energy;
		}
		return Column("energy", getStr, sortPlayers);
	}
	function createColumnEnergyCap() {
		function getStr(player) {
			return formatNumberForDisplay(player.energyCap);
		}
		function sortPlayers(p1, p2) {
			return p2.energyCap - p1.energyCap;
		}
		return Column("energyCap", getStr, sortPlayers);
	}
	function createColumnEnergyAvail() {
		function getStr(player) {
			return parseInt(player.energyAvailablePercent * 100) + "%";
		}
		function sortPlayers(p1, p2) {
			return p2.energyAvailablePercent - p1.energyAvailablePercent;
		}
		return Column("energyAvail", getStr, sortPlayers);
	}
	function createColumnSilver() {
		function getStr(player) {
			return formatNumberForDisplay(player.silver);
		}
		function sortPlayers(p1, p2) {
			return p2.silver - p1.silver;
		}
		return Column("silver", getStr, sortPlayers);
	}
	function createColumnScore() {
		function getStr(player) {
			return formatNumberForDisplay(player.score);
		}
		return Column("score", getStr, sortScoreFunc);
	}
	function createColumnRank() {
		function getStr(player) {
			return formatNumberForDisplay(player.leaderboardRank);
		}
		function sortPlayers(p1, p2) {
			return p2.leaderboardRank - p1.leaderboardRank;
		}
		return Column("rank", getStr, sortPlayers);
	}
					
	o.initColumns = function() {
		if (COLUMN_VISIBLE_HASH) o.columns.push(createColumnHash());
		if (COLUMN_VISIBLE_NAME) o.columns.push(createColumnName());
		if (COLUMN_VISIBLE_PLANETS) o.columns.push(createColumnPlanets());
		if (COLUMN_VISIBLE_ENERGY) o.columns.push(createColumnEnergy());
		if (COLUMN_VISIBLE_ENERGYCAP) o.columns.push(createColumnEnergyCap());
		if (COLUMN_VISIBLE_ENERGYAVAIL) o.columns.push(createColumnEnergyAvail());
		if (COLUMN_VISIBLE_SILVER) o.columns.push(createColumnSilver());
		if (COLUMN_VISIBLE_SCORE) o.columns.push(createColumnScore());
		if (COLUMN_VISIBLE_RANK) o.columns.push(createColumnRank());
	}

	o.render = function (div) {
		o.div = div;
		div.style.width = '700px';
		div.style.color = "#FFF";
		div.style.backgroundColor = "#000";
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
			for (let c of o.columns) {
				let th = document.createElement('th');
				th.innerText = c.name;
				th.style.cursor = "pointer";
				th.addEventListener("mouseenter", ()=>{
					th.style.color = "#000000";
					th.style.backgroundColor = "#FFFFFF";
				});
				th.addEventListener("mouseleave", ()=>{
					th.style.color = "#FFFFFF";
					th.style.backgroundColor = "#000000";
				});
				th.onclick=()=>{
					o.playerList.sort(c.sortPlayers);
					if (th.innerText === o.lastClickedColumn) o.reverseSort = !o.reverseSort;
					o.lastClickedColumn = th.innerText;
					if (o.reverseSort) o.playerList.reverse();
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
//			const bestPlanet = findBestPlanetOfPlayer(player.hash);
//			tr.onclick = () => {
//				ui.centerPlanet(bestPlanet);
//			}
			
			for (let c of o.columns)
				addAsTd(tr, c.getStr(player));

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

