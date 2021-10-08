//
// Gift Area Planets
// 
// 	gift the planet(s) circled with level filter and area filter to your friends :)
// 	
// 


import { PlanetLevel, PlanetType, PlanetTypeNames } from
	"https://cdn.skypack.dev/@darkforest_eth/types";

import { html, render, useState } from
	"https://unpkg.com/htm/preact/standalone.module.js";

let minLevel = 4;
let maxLevel = 9;

let planetRange = {
	beginCoords: null,
	endCoords: null,
};

const CursorMode = {
	SINGLE: 1,
	RANGE: 2,
	ALL: 3
};

let showPlanetList = [];
let cursorMode = CursorMode.ALL;

function clearRangeCoords() {
	planetRange = {
		beginCoords: null,
		endCoords: null,
	};
}

function setCursorMode(mode) {
	console.log("Set Cursor Mode to: ", mode);
	switch (mode) {
		case CursorMode.RANGE:
			clearRangeCoords();
			cursorMode = CursorMode.RANGE;
			break;
		case CursorMode.SINGLE:
			clearRangeCoords();
			cursorMode = CursorMode.SINGLE;
			break;
		default:
			clearRangeCoords();
			cursorMode = CursorMode.ALL;
	}
}

const PLANET_LEVELS = Object.values(PlanetLevel).map((level) => ({
	value: level,
	text: level.toString(),
}));

function getPlanetColor(ethAddress) {
	return df.getProcgenUtils().getPlayerColor(ethAddress);
}

function drawRound(ctx, p, color, alpha) {
	if (!p) return '(???,???)';
	const viewport = ui.getViewport();
	ctx.strokeStyle = color;

	ctx.globalAlpha = alpha;
	ctx.lineWidth = 2;
	const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
	const range = p.range * 0.01 * 20;
	const trueRange = viewport.worldToCanvasDist(range);
	ctx.beginPath();
	// ctx.setLineDash([10,10]);
	ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
	ctx.stroke();
	return `(${p.location.coords.x},${p.location.coords.y})`
}

function drawRectangle(ctx, coordsA, coordsB, color) {
	if (coordsA && coordsB) {
		const viewport = ui.getViewport();
		let beginX = Math.min(coordsA.x, coordsB.x);
		let beginY = Math.min(coordsA.y, coordsB.y);
		let endX = Math.max(coordsA.x, coordsB.x);
		let endY = Math.max(coordsA.y, coordsB.y);
		let width = endX - beginX;
		let height = endY - beginY;

		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.strokeRect(
			viewport.worldToCanvasX(beginX),
			viewport.worldToCanvasY(endY),
			viewport.worldToCanvasDist(width),
			viewport.worldToCanvasDist(height)
		);
		ctx.restore();
	}
}


function refreshPlanetList() {
	if (cursorMode === CursorMode.ALL) {
		showPlanetList = [];
		const planets = df.getMyPlanets();
		if (minLevel > maxLevel) {
			let tmp = minLevel;
			minLevel = maxLevel;
			maxLevel = tmp;
		}

		for (let i in planets) {
			let p = planets[i];
			if (!p?.location?.coords) continue;
			if (p.planetLevel < minLevel) continue;
			if (p.planetLevel > maxLevel) continue;
			showPlanetList.push(p);
		}
		return;
	} else if (cursorMode === CursorMode.RANGE) {
		if (planetRange.beginCoords === null) return;
		if (planetRange.endCoords === null) return;
		console.log("refreshPlanet");
		showPlanetList = [];
		let coordsA = planetRange.beginCoords;
		let coordsB = planetRange.endCoords;
		let beginX = Math.min(coordsA.x, coordsB.x);
		let beginY = Math.min(coordsA.y, coordsB.y);
		let endX = Math.max(coordsA.x, coordsB.x);
		let endY = Math.max(coordsA.y, coordsB.y);
		const planets = df.getMyPlanets();
		for (let i in planets) {
			let p = planets[i];
			if (!p?.location?.coords) continue;
			if (p.planetLevel < minLevel) continue;
			if (p.planetLevel > maxLevel) continue;

			let coords = p.location.coords;
			if (coords.x >= beginX && coords.y >= beginY && coords.x <= endX && coords.y <= endY) {
				showPlanetList.push(p);
			}
		}
	}
}


function giftAreaPlanets() {
	const [toAddress, setToAddress] = useState(undefined);
	const [inMinLevel, setInMinLevel] = useState(minLevel);
	const [inMaxLevel, setInMaxLevel] = useState(maxLevel);

	let warningStyle = {
		color: 'red'
	};

	let infoStyle = {
		color: '#F4D03F '
	};

	let myAccountComponent =
		df.account == undefined ?
			html`<div style=${warningStyle}>You Are not log in </div>` :
			html`<div>
			your address is : <br/>
			<div style=${infoStyle}> ${df.account}</div>
		</div>`;


	let [input, setInput] = useState(undefined);

	let toAddressPart = toAddress === undefined ?
		html`<div style=${{color:'#AED6F1'}}>not choose yet</div>`:
		html`<div style=${{color:'#F1C40F'}}>${toAddress}</div>`;

	let toAddressComponent =
		html`<div>
		
		<div style=${{ marginTop: "16px",marginBottom:"16px" }}> 
		
		<input style=${{width: '250px'}}
		placeholder=${'input lowercase address :0'}
		onChange=${e => {
				setInput(e.target.value);

			}}> </input>
		${'     '}
		<button onClick=${() => {
				setToAddress(input.toLowerCase());
			}}> choose </button>
		</div>
		<button 
			
		onClick=${() => {
				let p = ui.getSelectedPlanet();
				console.log(p);
				setToAddress(p.owner);
			}}>
			choose this planet's owner as receiver
		</button>
		<h1> the account who get your planet(s) is </h1>
		<h1>
		${toAddressPart}
	
		</h1>
		</div>`;

	let selectStyle = {
		background: "rgb(8,8,8)",
		width: "100px",
		padding: "3px 5px",
		border: "1px solid white",
		borderRadius: "3px",
	};


	const minLevelSelect = html`
		<select
		  style=${selectStyle}
		  value=${inMinLevel}
		  onChange=${async (e) => {
			minLevel = Number(e.target.value);

			refreshPlanetList();

			setInMinLevel(Number(e.target.value));
		}
		}
		>
		  ${PLANET_LEVELS.map(
			({ value, text }) => html`<option value=${value}>${text}</option>`
		)}
		</select>`;

	const maxLevelSelect = html`
		<select
		  style=${selectStyle}
		  value=${inMaxLevel}
		  onChange=${(e) => {
			maxLevel = Number(e.target.value);
			refreshPlanetList();
			setInMaxLevel(Number(e.target.value));

		}
		}
		>
		  ${PLANET_LEVELS.map(
			({ value, text }) => html`<option value=${value}>${text}</option>`
		)}
		</select>`;

	const selectLevelComponent = html`
		<div>
		<h1> choose the planetLevel </h1>
		<div>
		${minLevelSelect}
		${' '}
		${maxLevelSelect}
		</div>
		<h1> the level you choose is [${minLevel},${maxLevel}]</h1>
		</div>
	`;


	let [selectInfo, setSelectInfo] =
		useState("select the planet(s) you want to share");



	function selectSinglePlanet() {

		console.log("Select Single Planet");

		setCursorMode(CursorMode.SINGLE);

		showPlanetList = [];

		setSelectInfo("please click one planet to share");
		return;
	}

	let selectSinglePlanetButton = html`
		<div  style=${{ width: "100px" }} > 
			<button 
				onClick=${selectSinglePlanet}
			> set Single Planet </button>
		</div>
	`;

	function selectRangePlanet() {
		console.log("Select Range Planet");
		setCursorMode(CursorMode.RANGE);
		showPlanetList = [];
		setSelectInfo("determine the area of planet(s) will level filter");
	}


	let selectRangeButton =
		html`
			<div style=${{ marginLeft: "8px", width: "100px" }}>
			<button
			onClick=${selectRangePlanet}
			>Set Range Planet(s)</button>
			</div>
		`;

	function selectAllPlanet() {
		console.log("Select All Planet");
		setCursorMode(CursorMode.All);
		showPlanetList= df.getMyPlanets();
		setSelectInfo("determine the area of planet(s) with level filter");
	}
	let selectAllButton = html`
	<div style=${{ marginLeft: "8px", width: "100px" }}>
	<button
	onClick=${selectAllPlanet}
	>Set All Planet(s)</button>
	</div>
	`;
	const flexRow = {
		display: "flex",
		flexDirection: "row",
	};

	let selectComponent = html`<div>

	<div style=${{ ...flexRow, marginTop: "16px" }}>
	${selectSinglePlanetButton}
	${selectRangeButton}
	${selectAllButton}
	</div>
		${selectInfo}
	</div>`;

	let [giftInfo,setGiftInfo]=useState('');

	function giftPlanet(){
		console.log(showPlanetList);

		for(let i in showPlanetList){
			let p =showPlanetList[i];
			df.transferOwnership(p.locationId, toAddress);
		
		}
		
		setGiftInfo("the "+showPlanetList.length+" cicled planet(s) will be shared");

	}


	let giftComponent = html`
	<div style=${{ marginTop: "16px"}}>
	<button
	onClick=${giftPlanet}
	>Gift the Planet(s)</button>

	<div
		style=${{color:"pink"}}
	>${giftInfo}</div>
	</div>`;

	return html`
	<div>
		${toAddressComponent}
		${selectLevelComponent}
		${selectComponent}
		${giftComponent }		
	</div>`;

}


function App() {
	return html`<${giftAreaPlanets} />`;
}

class Plugin {
	constructor() {
		minLevel = 4;
		maxLevel = 9;
		showPlanetList = df.getMyPlanets();
		this.container = null;
	}

	onClick = () => {
		if (cursorMode === CursorMode.SINGLE) {

			let p = ui.getSelectedPlanet();
			if (p == undefined) return;
			if (p.owner != df.account) return;
			showPlanetList = [];
			showPlanetList.push(p);


		} else if (cursorMode === CursorMode.RANGE) {
			let coords = ui.getHoveringOverCoords();
			if (!coords) return;
			if (planetRange.beginCoords == null) {
				planetRange.beginCoords = coords;
				return;
			} else if (planetRange.endCoords == null) {
				planetRange.endCoords = coords;
				// console.log(planetRange);
				refreshPlanetList();
			} else {
				//console.log(planetRange);
				refreshPlanetList();
			}
		}
	}

	draw(ctx) {
		if (cursorMode === CursorMode.RANGE) {
			let begin = planetRange.beginCoords;
			let end = planetRange.endCoords || ui.getHoveringOverCoords();


			drawRectangle(ctx, begin, end, "red");
			if (begin != null && end != null) {
				let coordsA = begin;//planetRange.beginCoords;
				let coordsB = end;//planetRange.endCoords;
				let beginX = Math.min(coordsA.x, coordsB.x);
				let beginY = Math.min(coordsA.y, coordsB.y);
				let endX = Math.max(coordsA.x, coordsB.x);
				let endY = Math.max(coordsA.y, coordsB.y);

				const planets = df.getMyPlanets();

				for (let i in planets) {
					let p = planets[i];
					if (!p?.location?.coords) continue;
					if (p.planetLevel < minLevel) continue;
					if (p.planetLevel > maxLevel) continue;

					let coords = p.location.coords;
					if (coords.x >= beginX && coords.y >= beginY && coords.x <= endX && coords.y <= endY) {

						let color = getPlanetColor(p.owner);
						drawRound(ctx, p, color, 0.7);
					}
				}

			}
		}
		for (let i in showPlanetList) {
			let p = showPlanetList[i];
			let color = getPlanetColor(p.owner);
			drawRound(ctx, p, color, 1);
		}
	}

	async render(container) {
		this.container = container;
		container.style.width = "360px";
		container.style.height = "440px";
		window.addEventListener("click", this.onClick);
		render(html`<${App} />`, container);
	}

	destroy() {
		render(null, this.container);
	}
}

export default Plugin;



