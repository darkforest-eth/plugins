const minPlayerPlanetCount = 2;

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

function Plugin() {
	var o = {};
	o.players = {};
	o.playerList = [];
	o.div;
	o.div_playerList;
	o.playerCount = 0;
	o.updateInterv = null;
	o.firstRender = true;

	o.render = function(div) {
		o.div = div;
        div.style.width = '700px';

        o.div_playerList = document.createElement('div');
        div.appendChild(o.div_playerList);

		if (o.firstRender) {
			o.updateInterv = setInterval(o.update, 1000*10);
			o.update();
			o.firstRender = false;
		}
	}

	o.destroy = function() {
		if (o.updateInterv !== null)
			clearInterval(o.updateInterv);
	}

	o.update = function() {
		o.getPlayerInfo();
		o.drawPlayerInfo();
	}

	o.getPlayerInfo = function() {
		if (o.playerList.length > 0) return;
		const planets = df.getAllOwnedPlanets();
		for (var hash in o.players) {
			o.players[hash].reset();
		}
		for (var planet of planets) {
			if (!o.players[planet.owner]) {
				o.players[planet.owner] = CreatePlayersObject();
				o.players[planet.owner].hash = planet.owner;
			}
			var player = o.players[planet.owner];
			player.addPlanet(planet);
			player.energy += planet.energy;
			player.energyCap += planet.energyCap;
			player.silver += planet.silver;
		}
		o.playerCount = 0;
		o.playerList = [];
		for (var hash in o.players) {
			var player = o.players[hash];
			o.playerList.push(player);
			o.playerCount++;
			player.energyAvailablePercent = player.energy/player.energyCap;
		}
		o.playerList.sort((a, b) => b.energyCap - a.energyCap );
	}

	o.drawPlayerInfo = function() {
		var str = "";
		//str += o.playerCount + " players";
		//str += "\n";
		o.div_playerList.innerText = str;
		var table = document.createElement('table');
		table.width = "700px";
		{
			var tr = document.createElement('tr');
			var groups = [ "hash", "planets", "energy", "energyCap", "energyAvailable", "silver" ];
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
		for (var player of o.playerList) {
			if (player.planets.length < minPlayerPlanetCount) continue;
			var tr = document.createElement('tr');
			addAsTd(tr, player.hash.substr(0, 8));
			addAsTd(tr, player.planets.length);
			addAsTd(tr, formatNumberForDisplay(player.energy));
			addAsTd(tr, formatNumberForDisplay(player.energyCap));
			addAsTd(tr, parseInt(player.energyAvailablePercent*100)+"%");
			addAsTd(tr, formatNumberForDisplay(player.silver));
			table.appendChild(tr);
		}
        o.div_playerList.appendChild(table);
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

