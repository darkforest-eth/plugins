// Tiny Leaderboard
//
// Shows a tiny leaderboard with a timer (until the round ends)
// Shows the 5 people above and below you on the board
// Updates every 60 seconds

const updateTimeInSeconds = 60;
const leaderboardRange = 5; // 5 people above and below you

// ---------------------------------------------------------------

// https://github.com/darkforest-eth/client/blob/master/src/Frontend/Views/Leaderboard.tsx#L118
const roundEndTimestamp = '2021-08-22T16:00:00.000Z';
const roundEndTime = new Date(roundEndTimestamp).getTime();
// df.endTimeSeconds does not return the round end time - maybe this is a bug or something else can be used
// const roundEndTime = df.endTimeSeconds*1000;

function formatDuration(durationMs) {
	if (durationMs < 0) return '';
	const hours = Math.floor(durationMs / 1000 / 60 / 60);
	const minutes = Math.floor((durationMs - hours * 60 * 60 * 1000) / 1000 / 60);
	const seconds = Math.floor((durationMs - hours * 60 * 60 * 1000 - minutes * 60 * 1000) / 1000);
	return (
		timestampSection(hours) + ':' + timestampSection(minutes) + ':' + timestampSection(seconds)
	);
}

function timestampSection(value) {
	return value.toString().padStart(2, '0');
}

function getStrTimeUntilRoundEnds() {
	const timeUntilEnd = roundEndTime - new Date().getTime();
	if (timeUntilEnd <= 0) return "00:00";
	else return formatDuration(timeUntilEnd);
}

// ---------------------------------------------------------------

function formatNumber(num, decimalCount = 1) {
	num = parseInt(num);
	if (num < 1000) return num;
	if (num < 1000000) return (num / 1000).toFixed(decimalCount) + "k";
	if (num < 1000000000) return (num / 1000000).toFixed(decimalCount) + "m";
	if (num < 1000000000000) return (num / 1000000000).toFixed(decimalCount) + "b";
	return (num / 1000000000000, 2).toFixed(decimalCount) + "t";
}

async function downloadLeaderboard() {
	return fetch('https://api.zkga.me/leaderboard')
		.then(response => response.json())
}

// return example: 'hsl(285,100%,70%)'
function getPlayerColor(ethAddress) {
	return df.getProcgenUtils().getPlayerColor(ethAddress);
}

function Plugin() {
	var o = {};
	o.div;
	o.div_timer;
	o.div_playerList;
	o.updateTimerInterv = null;
	o.updateLeaderboardInterv = null;
	o.firstRender = true;
	o.leaderboard = [];

	o.init = function () {
		o.updateTimerInterv = setInterval(o.updateTimer, 1000);
		o.updateInterv = setInterval(o.updateLeaderboard, 1000 * updateTimeInSeconds);
		o.updateTimer();
		o.updateLeaderboard();
	}

	o.render = function (container) {
		o.container = container;
		o.container.style.width = '250px';

		o.div_timer = document.createElement('div');
		o.div_timer.style.fontSize = "x-large";
		o.div_timer.style.textAlign = "center";
		o.div_timer.style["margin-top"] = "-10px";
		container.appendChild(o.div_timer);

		container.appendChild(document.createElement('hr'));

		o.div_playerList = document.createElement('div');
		o.div_playerList.style.width = o.container.offsetWidth+"px";
		container.appendChild(o.div_playerList);

		if (o.firstRender) {
			o.init();
			o.firstRender = false;
		}
	}

	o.destroy = function () {
		if (o.updateInterv !== null)
			clearInterval(o.updateInterv);
		if (o.updateTimerInterv !== null)
			clearInterval(o.updateTimerInterv);
	}

	o.updateTimer = function() {
		o.div_timer.innerText = getStrTimeUntilRoundEnds();
	}

	o.updateLeaderboard = async function () {
		o.leaderboard = await downloadLeaderboard();
		o.leaderboard = o.leaderboard.entries;
		o.leaderboard.sort((p1, p2) => {
			if (!p1.score) return 1;
			if (!p2.score) return -1;
			return p1.score - p2.score;
		});

		o.div_playerList.innerText = "";
		let table = document.createElement("table");
		table.style.width = o.container.offsetWidth+"px";
		let personalRank = o.getLeaderboardRank(df.account);
		let i = personalRank - leaderboardRange;
		if (i < 0) i = 0;
		let max = personalRank + leaderboardRange;
		for ( ; i < o.leaderboard.length && i <= max; ++i) {
			o.addPlayerToBoard(table, o.leaderboard[i], i);
		}
		o.div_playerList.appendChild(table);
	}

	o.getLeaderboardRank = function (ethAddress) {
		for (var i = 0; i < o.leaderboard.length; ++i) {
			if (ethAddress === o.leaderboard[i].ethAddress)
				return i;
		}
		return -1;
	}

	o.addPlayerToBoard = function(table, player, rank) {
		let name = player.twitter !== null && player.twitter !== undefined ? player.twitter : player.ethAddress.substr(0, 8);
		name = name.substr(0, 13); // name max length

		const tr = document.createElement('tr');
		tr.style["color"] = getPlayerColor(player.ethAddress);

		function AddTd(tr, text) {
			var td = document.createElement('td');
			td.innerText = text;
			td.style["text-align"] = "center";
			tr.appendChild(td);
		}
		AddTd(tr, rank+".");
		AddTd(tr, name);
		AddTd(tr, player.score);
		table.appendChild(tr);
	}

	return o;
}

class TinyLeaderboardPlugin {
	constructor() {
		this.plugin = Plugin();
	}
	render(container) {
		this.plugin.render(container);
	}
	destroy() {
		this.plugin.destroy();
		this.plugin = null;
	}
}

export default TinyLeaderboardPlugin;
