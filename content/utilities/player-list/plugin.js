// Player List
//
// Shows a list of players that appear on your map.
// Click on a planet of a player to move that player to the top of the list.
// Click on one of the categories to sort the list by it.
// Click on one of the players in the list to jump to one of their planets.
// The list will refresh every 60 seconds.

// change the following if you want to disaplay or hide certain rows:
const COLUMN_VISIBLE_HASH = true; // player address
const COLUMN_VISIBLE_NAME = true; // twitter name
const COLUMN_VISIBLE_PLANETS = true; // how many planets
const COLUMN_VISIBLE_VOYAGES = true; // active moves that player is currently sending or receiving
const COLUMN_VISIBLE_ENERGY = true;
const COLUMN_VISIBLE_ENERGYCAP = false;
const COLUMN_VISIBLE_ENERGYAVAIL = false; // energy available in percent
const COLUMN_VISIBLE_SILVER = false;
const COLUMN_VISIBLE_SILVERPROD = true; // silver production - how fast a player produces silver
const COLUMN_VISIBLE_ARTIFACTS = true; // how many common, rare, epic... artifacts a player has
const COLUMN_VISIBLE_SCORE = true; // leaderboard score
const COLUMN_VISIBLE_RANK = true; // leaderboard rank
const COLUMN_VISIBLE_LASTACTIVE = true; // when was the last time a player made a move

// players with less planets than this will not show up in the list
const minPlayerPlanetCount = 2;
// how often the list updates
const updateTimeInSeconds = 60;
// for how many players the last move time will be updated at once
// we limit this because we dont want to send huge querries
const maxPlayersLastMoveGraphDL = 40;

// this needs to be changed every round
const GRAPH_API_URL = 'https://api.thegraph.com/subgraphs/name/darkforest-eth/dark-forest-v06-round-4';

const artifactMaxType = 9;
const artifactMaxRarity = 5;

// colors are not accurate but easy to see
let artifactRarityColors = [];
artifactRarityColors[0] = "#FF0000"; // "Unknown"
artifactRarityColors[1] = "#FFFFFF"; // "Common"
artifactRarityColors[2] = "#4EAAFF"; // "Rare"
artifactRarityColors[3] = "#CD29FF"; // "Epic"
artifactRarityColors[4] = "#ECA950"; // "Legendary"
artifactRarityColors[5] = "#63FF00"; // "Mythic"

let artifactRarityScore = [];
artifactRarityScore[1] = 5000; // 5k
artifactRarityScore[2] = 20000; // 20k
artifactRarityScore[3] = 200000; // 200k
artifactRarityScore[4] = 3000000; // 3m
artifactRarityScore[5] = 20000000; // 20m

let artifactRarityNames = [];
artifactRarityNames[0] = "Unknown";
artifactRarityNames[1] = "Common";
artifactRarityNames[2] = "Rare";
artifactRarityNames[3] = "Epic";
artifactRarityNames[4] = "Legendary";
artifactRarityNames[5] = "Mythic";

const voyageColorFriendly = "#0F2";
const voyageColorNeutral = "#69F";
const voyageColorHostile = "#F33";
const voyageColorVictim = "#FF2";

const emptyAddress = "0x0000000000000000000000000000000000000000";

function roundToDecimal(num, decimalCount=1) {
	if (decimalCount < 1) return Math.round(num);
	let p = Math.pow(10, decimalCount);
	num = num * p;
	num = Math.round(num) / p;
	return num;
}

function formatNumberForDisplay(num, decimalCount=1) {
	if (num < 1e3) return roundToDecimal(num, decimalCount);
	if (num < 1e6) return roundToDecimal(num / 1e3, decimalCount) + "k";
	if (num < 1e9) return roundToDecimal(num / 1e6 , decimalCount) + "m";
	if (num < 1e12) return roundToDecimal(num / 1e9, decimalCount) + "b";
	return roundToDecimal(num / 1e12, decimalCount) + "t";
}

function CreatePlayersObject() {
	let o = {};
	o.hash = "";
	o.planets = [];
	o.energy = 0;
	o.energyCap = 0;
	o.energyAvailablePercent = 0;
	o.silver = 0;
	o.silverProduction = 0;
	o.artifacts = [];
	o.artifactTypeCount = [];
	for (let i=0; i <= artifactMaxType; ++i) o.artifactTypeCount[i] = 0;
	o.artifactRarityCount = [];
	for (let i=0; i <= artifactMaxRarity; ++i) o.artifactRarityCount[i] = 0;
	o.artifactScore = 0;
	o.voyagesFriendly = []; // sent to a planet this player owns
	o.voyagesNeutral = []; // sent to an unowned planet
	o.voyagesHostile = []; // sent by this player against another player
	o.voyagesVictim = []; // sent against this player
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

function getActiveVoyages() {
    return df.getAllVoyages()
        .filter(voyage => new Date(voyage.arrivalTime*1000) > new Date());
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

function formatSeconds(seconds, decimalCount=1) {
	let time = seconds;
	if (time < 60) return roundToDecimal(time, decimalCount)+"s";
	time /= 60;
	if (time < 60) return roundToDecimal(time, decimalCount)+"m";
	time /= 60;
	if (time < 24) return roundToDecimal(time, decimalCount)+"h";
	time /= 24;
	return roundToDecimal(time, decimalCount)+"d";
}

function PlayerGraphQLData() {
	let o = {};	
	o.lastActiveSec = 0;
	o.lastUpdateMs = 0;
	return o;
}

async function dlGraphQLData(query, graphApiUrl=GRAPH_API_URL) {
	const response = await fetch(graphApiUrl, {
		method: 'POST',
		body: JSON.stringify({ query }),
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
	});
	return await response.json();
}

async function getLastMoveTimes(playerAddressArr, maxPlayers=maxPlayersLastMoveGraphDL) {
	let queryStr = "{\n";
	for (let i=0; i < playerAddressArr.length && i < maxPlayers; ++i) {
		queryStr += 'p'+i+':arrivals(where: {player: "'+playerAddressArr[i]+'"}, orderBy: departureTime, orderDirection: desc, first: 1) {\n';
		queryStr += "departureTime\n";
		queryStr += "}\n";
	}
	queryStr += "}";
	const lastMoves = await dlGraphQLData(queryStr);
	let times = [];
	for (let id in lastMoves.data) {
		let i = parseInt(id.substr(1));
		times[i] = lastMoves.data[id][0].departureTime;
	}
	return times;
}

function Column(name, funcGetStr, funcSortPlayers, funcGetDesc=null) {
	let o = {};
	o.name = name;
	o.getStr = funcGetStr;
	o.sortPlayers = funcSortPlayers;
	o.getDesc = funcGetDesc;
	return o;
}

function Plugin() {
	
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
	function createColumnVoyages() {
		function getStr(player) {
			let str = "";
			function add(num, color) {
				str += "<span style='color: "+color+"'>";
				str += num;
				str += "</span>";
			}
			add(player.voyagesFriendly.length, voyageColorFriendly);
			str += " ";
			add(player.voyagesNeutral.length, voyageColorNeutral);
			str += " ";
			add(player.voyagesVictim.length, voyageColorVictim);
			str += " ";
			add(player.voyagesHostile.length, voyageColorHostile);
			return str;
		}
		function getPlayerVoyageCount(player) {
			return player.voyagesFriendly.length + player.voyagesNeutral.length + player.voyagesVictim.length + player.voyagesHostile.length;
		}
		function sortPlayers(p1, p2) {
			return getPlayerVoyageCount(p2) - getPlayerVoyageCount(p1);
		}
		function getDesc(player) {
			let str = "";
			str += player.voyagesFriendly.length + " friendly, ";
			str += " ";
			str += player.voyagesNeutral.length + " neutral, ";
			str += " ";
			str += player.voyagesVictim.length + " victim, ";
			str += " ";
			str += player.voyagesHostile.length + " hostile";
			str += "\n-----------------------------------------------------";
			str += "\nfriendly = sent to a planet this player owns";
			str += "\nneutral = sent to an unowned planet";
			str += "\nvictim = sent from another player against this player";
			str += "\nhostile = sent by this player against another player";
			return str;
		}
		return Column("voyages", getStr, sortPlayers, getDesc);
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
	function createColumnSilverProd() {
		function getStr(player) {
			return formatNumberForDisplay(player.silverProduction);
		}
		function sortPlayers(p1, p2) {
			return p2.silverProduction - p1.silverProduction;
		}
		function getDesc(player) {
			return "produces "+getStr(player)+" silver";
		}
		return Column("silverProd", getStr, sortPlayers, getDesc);
	}
	function createColumnArtifacts() {
		function getStr(player) {
			let str = "";
			for (let i=1; i < artifactRarityColors.length; ++i) {
				if (i > 1) str += " ";
				str += "<span style='color: "+artifactRarityColors[i]+"'>";
				str += player.artifactRarityCount[i];
				str += "</span>";
			}
			return str;
		}
		function sortPlayers(p1, p2) {
			return p2.artifactScore - p1.artifactScore;
		}
		function getDesc(player) {
			let str = "";
			for (let i=1; i < artifactRarityNames.length; ++i) {
				if (player.artifactRarityCount[i] < 1) continue;
				if (str.length > 0) str += ", ";
				str += player.artifactRarityCount[i]+" "+artifactRarityNames[i];
			}
			return str;
		}
		return Column("artifacts", getStr, sortPlayers, getDesc);
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
			return p1.leaderboardRank - p2.leaderboardRank;
		}
		return Column("rank", getStr, sortPlayers);
	}
	function createColumnLastActive() {
		function getStr(player) {
			let graphData = o.playersGraphData[player.hash];
			if (!graphData) return "";
			if (!graphData.lastActiveSec) return "";
			return formatSeconds((graphData.lastUpdateMs/1000) - graphData.lastActiveSec);
		}
		function sortPlayers(p1, p2) {
			let g1 = o.playersGraphData[p1.hash];
			let g2 = o.playersGraphData[p2.hash];
			if (!g1 && !g2) return 0;
			if (!g1) return 1;
			if (!g2) return -1;
			return g2.lastActiveSec - g1.lastActiveSec;
		}
		function getDesc(player) {
			let str = getStr(player);
			if (str.length < 1) return "";
			return "last active "+str+" ago";
		}
		return Column("active", getStr, sortPlayers, getDesc);
	}
					
	let o = {};
	o.columns = [];
	o.players = {}; // index is player address
	o.playerList = [];
	o.allPlayers;
	o.div;
	o.div_playerList;
	o.updateInterv = null;
	o.firstRender = true;
	o.twitterNames = null;
	o.leaderboard = [];
	o.sortByColumn = null;
	o.reverseSort = false;
	o.playersGraphData = {}; // index is player address
	o.planetSelectedPlayer = null;

	o.initColumns = function() {
		if (COLUMN_VISIBLE_HASH) o.columns.push(createColumnHash());
		if (COLUMN_VISIBLE_NAME) o.columns.push(createColumnName());
		if (COLUMN_VISIBLE_PLANETS) {
			o.columns.push(createColumnPlanets());
			// default sort by planet count - this makes it very likely that you will see yourself on the list
			o.sortByColumn = o.columns[o.columns.length-1];
		}
		if (COLUMN_VISIBLE_VOYAGES) o.columns.push(createColumnVoyages());
		if (COLUMN_VISIBLE_ENERGY) o.columns.push(createColumnEnergy());
		if (COLUMN_VISIBLE_ENERGYCAP) o.columns.push(createColumnEnergyCap());
		if (COLUMN_VISIBLE_ENERGYAVAIL) o.columns.push(createColumnEnergyAvail());
		if (COLUMN_VISIBLE_SILVER) o.columns.push(createColumnSilver());
		if (COLUMN_VISIBLE_SILVERPROD) o.columns.push(createColumnSilverProd());
		if (COLUMN_VISIBLE_ARTIFACTS) o.columns.push(createColumnArtifacts());
		if (COLUMN_VISIBLE_SCORE) o.columns.push(createColumnScore());
		if (COLUMN_VISIBLE_RANK) o.columns.push(createColumnRank());
		if (COLUMN_VISIBLE_LASTACTIVE) o.columns.push(createColumnLastActive());
	}
	
	o.init = function() {
		if (COLUMN_VISIBLE_NAME) {
			downloadTwitterNames().then(twitter => {
				o.twitterNames = twitter;
				o.drawPlayerList();
			});
		}
		o.updateInterv = setInterval(o.update, 1000 * updateTimeInSeconds);
		o.updateLeaderboard().then(()=> { o.drawPlayerList(); });
		o.setPlayerInfo();
		o.sortPlayerList();
		o.updateLastActive().then(()=> { o.drawPlayerList(); });
		o.drawPlayerList();
		window.addEventListener("click", o.onMouseClick);
	}

	o.render = function(div) {
		if (o.columns.length < 1) o.initColumns();
		o.div = div;
		div.style.width = o.columns.length*80+"px";
		div.style.color = "#FFF";
		div.style.backgroundColor = "#000";

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
		window.removeEventListener("click", o.onMouseClick);
	}
	
	o.onMouseClick = function() {
		let newPlayer = ui.selectedPlanet ? ui.selectedPlanet.owner : null;
		if (newPlayer === emptyAddress) newPlayer = null;
		if (newPlayer === o.planetSelectedPlayer) return;
		o.planetSelectedPlayer = newPlayer;
		o.sortPlayerList();
		o.updateLastActive().then(()=> { o.drawPlayerList(); });
		o.drawPlayerList();
	}

	o.update = async function() {
		o.setPlayerInfo();
		await o.updateLeaderboard();
		o.sortPlayerList();
		await o.updateLastActive();
		o.drawPlayerList();
	}
	
	o.sortPlayerList = function() {
		if (o.sortByColumn) {
			if (o.reverseSort) {
				o.playerList.sort((p1,p2)=> {
					return o.sortByColumn.sortPlayers(p1,p2) * -1;
				});
			} else o.playerList.sort(o.sortByColumn.sortPlayers);
		}
		if (o.planetSelectedPlayer) {
			let p = o.players[o.planetSelectedPlayer];
			let index = o.playerList.findIndex(pl => pl === p);
			if (index != -1) o.playerList.splice(index, 1);
			if (p && o.playerList[0] !== p)
				o.playerList.splice(0, 0, p);
		}
	}
	
	o.getPlayerGraphData = function(hash) {
		if (!o.playersGraphData[hash]) {
			o.playersGraphData[hash] = PlayerGraphQLData();
		}
		return o.playersGraphData[hash];
	}
	
	o.updateLastActive = async function() {
		if (!COLUMN_VISIBLE_LASTACTIVE) return;
		let timeNow = Date.now();
		let players = [];
		let hashes = [];
		for (let i=0; i < o.playerList.length && i < maxPlayersLastMoveGraphDL; ++i) {
			let hash = o.playerList[i].hash;
			let graphData = o.getPlayerGraphData(hash);
			if (graphData.lastUpdateMs + (updateTimeInSeconds*1000) > timeNow)
				continue;
			players.push(o.playerList[i].hash);
			hashes.push(hash);
		}
		let lastMoves = null;
		try {
			lastMoves = await getLastMoveTimes(players);
		} catch (err) {
			console.error(err);
			return;
		}
		for (let i=0; i < lastMoves.length; ++i) {
			let graphData = o.getPlayerGraphData(hashes[i]);
			graphData.lastUpdateMs = timeNow;
			graphData.lastActiveSec = lastMoves[i];
		}
	}

	o.updateLeaderboard = async function() {
		if (!COLUMN_VISIBLE_RANK && !COLUMN_VISIBLE_SCORE) return;
		let lb = await downloadLeaderboard();
		lb.sort(sortScoreFunc);
		o.leaderboard = lb;
		o.setPlayersRankAndScore();
	}

	o.getLeaderboardRank = function(ethAddress) {
		for (let i = 0; i < o.leaderboard.length; ++i) {
			if (ethAddress === o.leaderboard[i].ethAddress)
				return i+1;
		}
		return 999999;
	}
	
	o.setPlayersRankAndScore = function() {
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
	}

	o.updateVoyages = function() {
		if (!COLUMN_VISIBLE_VOYAGES) return;
		let voyages = getActiveVoyages();
		for (let voy of voyages) {
			let destPlanet = df.getPlanetWithId(voy.toPlanet);
			if (voy.player === destPlanet.owner) {
				o.players[voy.player].voyagesFriendly.push(voy);
			} else if (destPlanet.owner === emptyAddress) {
				o.players[voy.player].voyagesNeutral.push(voy);
			} else {
				o.players[voy.player].voyagesHostile.push(voy);
				o.players[destPlanet.owner].voyagesVictim.push(voy);
			}
		}
	}
	
	o.setPlayerInfo = function() {
		o.allPlayers = df.getAllPlayers();
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
			player.planets.push(planet);
			player.energy += planet.energy;
			player.energyCap += planet.energyCap;
			player.silver += planet.silver;
			player.silverProduction += planet.silverGrowth;
			player.artifacts.concat(planet.heldArtifactIds);
			for (let artifId of planet.heldArtifactIds) {
				let artifact = df.getArtifactWithId(artifId);
				if (!artifact) continue;
				player.artifactTypeCount[artifact.artifactType]++;
				player.artifactRarityCount[artifact.rarity]++;
				player.artifactScore += artifactRarityScore[artifact.rarity];
			}
		}
		o.updateVoyages();
		o.setPlayersRankAndScore(); // this is only needed when the user sorts by column during an update
		o.playerList = [];
		for (let hash in o.players) {
			let player = o.players[hash];
			player.energyAvailablePercent = player.energy / player.energyCap;
			if (player.planets.length < minPlayerPlanetCount) continue;
			o.playerList.push(player);
		}
	}

	o.drawPlayerList = function() {
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
					if (c === o.sortByColumn) o.reverseSort = !o.reverseSort;
					else o.reverseSort = false;
					o.sortByColumn = c;
					o.sortPlayerList();
					o.updateLastActive().then(()=> { o.drawPlayerList(); });
					o.drawPlayerList();
				}
				tr.appendChild(th);
			}
			table.appendChild(tr);
		}
		for (const player of o.playerList) {
			const tr = document.createElement('tr');
			tr.style["color"] = getPlayerColor(player.hash);
			tr.style.cursor = "pointer";
			if (player.hash === o.planetSelectedPlayer)
				tr.style.backgroundColor = "#232435";
			const bestPlanet = findBestPlanetOfPlayer(player.hash);
			tr.onclick = () => {
				if (!bestPlanet || !bestPlanet.locationId || !bestPlanet.location) return;
				ui.centerPlanet(bestPlanet);
			}
			
			for (let c of o.columns) {
				let td = document.createElement('td');
				td.innerHTML = c.getStr(player);
				td.style["text-align"] = "center";
				if (c.getDesc) td.title = c.getDesc(player);
				tr.appendChild(td);
			}

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

