
// Two modes to choose from:
// 1. Draw SpaceType (can show you space type in not mined areas of the map)
// 2. Draw Biome heatmap (draws biome perlin value that together with the spacetype define the biome)

// Resource intensive plugin - dont zoom out too much
// Hover over text inside the plugin to get a tooltip

const quadrantSize = 500; // smaller size means more detail but also longer computation

const biomeColorAccuracy = 3; // smaller = more accurate & more lag, 1 is best accuracy

const spaceTypeOpacity = "88"; // from 00 to FF
const biomeOpacity = "0.4"; // from 0 to 1

// useful package containing types (its not importet because color values also need to change if types change)
// import("https://cdn.skypack.dev/@darkforest_eth/types").then(console.log)

let spaceType = {};
spaceType.NEBULA = 0;
spaceType.SPACE = 1;
spaceType.DEEP_SPACE = 2;
spaceType.DEAD_SPACE = 3;

let spaceTypeColor = [];
spaceTypeColor[0] = "#001452"+spaceTypeOpacity;
spaceTypeColor[1] = "#00052b"+spaceTypeOpacity;
spaceTypeColor[2] = "#020006"+spaceTypeOpacity;
spaceTypeColor[3] = "#002400"+spaceTypeOpacity;

let activeMode;

let mode_spaceType;
let mode_biomePerlin;

let divText;
let divModeButtons;
let intervUpdateDiv = null;

const quadrantSizeHalf = Math.round(quadrantSize/2);

let screenBoundaries = { startX:0, startY:0, endX:0, endY:0 };

function isInsideBoundaries(coords) {
	if (coords.x < screenBoundaries.startX) return false;
	if (coords.x > screenBoundaries.endX) return false;
	if (coords.y < screenBoundaries.startY) return false;
	if (coords.y > screenBoundaries.endY) return false;
	return true;
}

function Mode(name, calcColorFunc, getPerlin) {
	let o = {};
	
	o.name = name;
	o.cache = {};
	o.queue = {};
	o.queueCount = 0;
	let interv = null;
	let resetQueueWithNextCalc = false;
	
	o.calcColorFunc = calcColorFunc;
	o.getPerlin = getPerlin;
	
	function start() {
		if (interv) return;
		interv = setInterval(calc, 1);
	}
	o.start = start;
	
	function stop() {
		if (!interv) return;
		clearInterval(interv);
		interv = null;
	}
	o.stop = stop;
	
	function clearQueue() {
		resetQueueWithNextCalc = true;
	}
	o.clearQueue = clearQueue;
	
	function getColor(coords) {
		let id = coords.x+","+coords.y;
		if (o.cache[id] !== undefined) return o.cache[id];
		if (o.queue[id]) return false;
		o.queue[id] = coords;
		o.queueCount++;
		return false;
	}
	o.getColor = getColor;
	
	function calc() {
		if (resetQueueWithNextCalc) {
			o.queue = {};
			o.queueCount = 0;
			resetQueueWithNextCalc = false;
			return;
		}
		let i=0;
		let time = Date.now();
		for (let id in o.queue) {
			let coords = o.queue[id];
			if (!isInsideBoundaries(coords)) {
				delete o.queue[id];
				o.queueCount--;
				continue;
			}
			o.cache[id] = o.calcColorFunc(coords);
			delete o.queue[id];
			o.queueCount--;
			++i;
			if (i >= 3) { // do 3 at a time
				if (Date.now() - time > 10) break; // stop if we are calculating longer than 10 ms
				i = 0;
			}
		}
	}
	
	return o;
}

function calcSpaceTypeColor(coords) {
	let spaceType = df.spaceTypeFromPerlin(df.spaceTypePerlin(coords));
	return spaceTypeColor[spaceType];
}

// function can be useful to figure out an estimate of the range of a perlin

//function findMinMaxPerlin() {
//	let coords = { x:0, y:0 };
//	let minPerlin = 999999;
//	let maxPerlin = -99999;
//	function checkPerlin() {
//		let perlin = df.biomebasePerlin(coords);
//		if (perlin < minPerlin) minPerlin = perlin;
//		if (perlin > maxPerlin) maxPerlin = perlin;
//	}
//	for (let i=0; i<1000; ++i) {
//		checkPerlin();
//		coords.x += 100;
//	}
//	for (let i=0; i<1000; ++i) {
//		checkPerlin();
//		coords.y += 100;
//	}
//	console.log("minPerlin: "+minPerlin+" maxPerlin: "+maxPerlin);
//}
// minPerlin: 12.97 maxPerlin: 21.22

const minBiomePerlin = 13;
const biomePerlinRange = 6.5;

function calcBiomePerlinColor(coords) {
	let perlin = df.biomebasePerlin(coords);
	let p = perlin - minBiomePerlin;
	if (p < 0) p = 0;
	p /= biomePerlinRange;
	if (p > 1) p = 1;
	p = 1 - p;
	let h = p * 260;
	h -= 20;
	h -= h % biomeColorAccuracy;
	if (h < 0) h += 360;
	return "hsla(" + h + ", 100%, 50%, "+biomeOpacity+")";
}

function init() {
	mode_spaceType = Mode("SpaceType", calcSpaceTypeColor, coords => df.spaceTypePerlin(coords));
	mode_biomePerlin = Mode("BiomePerlin", calcBiomePerlinColor, coords => df.biomebasePerlin(coords));
	activateMode(mode_spaceType);
}

function activateMode(mode) {
	if (activeMode === mode) return;
	if (activeMode) {
		activeMode.clearQueue();
		activeMode.stop();
	}
	activeMode = mode;
	activeMode.start();
}

function createButton(text, onClick=null) {
   	let but = document.createElement('button');
	but.style.backgroundColor = "#000";
	but.style.color = "#FFF";
	but.style.border = "1px solid white"
	but.style.textAlign = "center";
	but.style.lineHeight = "0px"; // makes the button text vertically centered
	let padding = 2;
	but.style.padding = padding+"px "+padding+"px "+padding+"px "+padding+"px"; // top right bottom left
	but.innerHTML = text;
	if (onClick) but.addEventListener('click', onClick);
	let active = false;
	but.setButtonActive = function(b) {
		active = b;	
		if (active) {
			but.style.backgroundColor = "#FFF";
			but.style.color = "#000";
		} else {
			but.style.backgroundColor = "#000";
			but.style.color = "#FFF";
		}
	}
	but.addEventListener('mouseenter', ()=>{
		if (active) return;
		but.style.backgroundColor = "#444";
	});
	but.addEventListener('mouseleave', ()=>{
		if (active) return;
		but.style.backgroundColor = "#000";
	});
	return but;
}

function updateDiv() {
	divText.innerHTML = "";
	
	let divQueueText = document.createElement("div");
	divQueueText.title = "how many perlin caluclations are queued\nwhenever you look at a new part of the map new calculations will be queued";
	divQueueText.innerText = "queue: "+activeMode.queueCount;
	divQueueText.style.width = "160px";
	divQueueText.style.float = "left";
	divText.appendChild(divQueueText);
	
	let divPerlinText = document.createElement("div");
	let perlin = ui.mouseHoveringOverCoords ? activeMode.getPerlin(ui.mouseHoveringOverCoords) : "";
	divPerlinText.title = "shows perlin value at the mouse location";
	divPerlinText.innerText = "perlin: "+perlin;
	divPerlinText.style.float = "left";
	divText.appendChild(divPerlinText);
}

function render(div) {
	div.style.width = "320px";
	div.style.height = "60px";
	div.style.margin = "5px";
	
	divText = document.createElement("div");
	divText.style.width = "100%";
	divText.style.height = "50%";
	divText.style.padding = "5px";
	div.appendChild(divText);
	
	divModeButtons = document.createElement("div");
	divModeButtons.style.width = "100%";
	divModeButtons.style.height = "50%";
	div.appendChild(divModeButtons);
	
	let buttonSpaceType = createButton("SpaceType", ()=>{
		if (activateMode === mode_spaceType) return;
		activateMode(mode_spaceType);
		buttonSpaceType.setButtonActive(true);
		buttonBiome.setButtonActive(false);
	});
	buttonSpaceType.style.height = "80%";
	buttonSpaceType.style.width = "48%";
	divModeButtons.appendChild(buttonSpaceType);
	
	let buttonBiome = createButton("Biome", ()=>{
		if (activateMode === mode_biomePerlin) return;
		activateMode(mode_biomePerlin);
		buttonBiome.setButtonActive(true);
		buttonSpaceType.setButtonActive(false);
	});
	buttonBiome.style.height = "80%";
	buttonBiome.style.width = "48%";
	buttonBiome.style.float = "right";
	divModeButtons.appendChild(buttonBiome);
	
	buttonSpaceType.setButtonActive(true);
	
	if (intervUpdateDiv) return;
	intervUpdateDiv = setInterval(updateDiv, 333);
}

function draw(ctx) {
	
	const viewport = ui.getViewport();
	
	let start = {};
	let end = {};
	
	let vWidth = viewport.viewportWidth * viewport.scale;
	start.x = viewport.centerWorldCoords.x - vWidth/2;
	start.x -= start.x % quadrantSize;
	start.x -= quadrantSize;
	let vHeight = viewport.viewportHeight * viewport.scale;
	start.y = viewport.centerWorldCoords.y - vHeight/2;
	start.y -= start.y % quadrantSize;
	
	let maxWidth = viewport.centerWorldCoords.x + vWidth/2;
	let maxHeight = viewport.centerWorldCoords.y + vHeight/2;
	maxHeight += quadrantSize;
	
	screenBoundaries.startX = start.x;
	screenBoundaries.startY = start.y;
	screenBoundaries.endX = maxWidth + quadrantSize;
	screenBoundaries.endY = maxHeight + quadrantSize;
	
	let drawData = {};
	let quadSizeScaled = quadrantSize / viewport.scale;
	
	let pos = {};
	for (pos.y = start.y; pos.y < maxHeight; pos.y += quadrantSize) {
		for (pos.x = start.x; pos.x < maxWidth; pos.x += quadrantSize) {
			let coords = { "x": pos.x+quadrantSizeHalf, "y": pos.y+quadrantSizeHalf };
			let color = activeMode.getColor(coords);
			if (!color) continue;
			let p = viewport.worldToCanvasCoords(pos);
			let d = {};
			d.startX = Math.round(p.x);
			d.startY = Math.round(p.y);
			d.endX = Math.round(p.x + quadSizeScaled) - d.startX;
			d.endY = Math.round(p.y + quadSizeScaled) - d.startY;
			if (!drawData[color]) drawData[color] = [];
			drawData[color].push(d);
		}
	}
	
	for (let color in drawData) {
		let d = drawData[color];
		ctx.beginPath();
		ctx.fillStyle = color;
		for (let p of d) {
			ctx.rect(p.startX, p.startY, p.endX, p.endY);
		}
		ctx.fill();
	}
}

function destroy() {
	clearInterval(intervUpdateDiv);
	mode_spaceType.stop();
	mode_biomePerlin.stop();
}

class Plugin {
	constructor() { init(); }
	render(div) { render(div); }
	draw(ctx) { draw(ctx); }
	destroy() { destroy(); }
}

export default Plugin;
