// EnergyCurve Display
//
// Shows the energy curve of the selected planet.
// You can hover over the curve to set a point and find out
// when exactly this point will be reached.
//
// Can be used to find out when a foundry reaches 95%.
// Helps to understand how energy growth works.


import {
  PlanetTypeNames,
} from "https://cdn.skypack.dev/@darkforest_eth/types";

const { getPlanetName } = df.getProcgenUtils();

// returns time (in seconds) it takes for the planet to reach a certain energy level (in percent 0 - 1)
// returns -1 if time is in the past
// source: https://github.com/darkforest-eth/client/blob/e9fecab7e67b59ead29ce11c95a723360f7a810c/src/Backend/GameLogic/GameObjects.ts#L1540
function getEnergyCurveAtPercent(planet, percent) {
	const p1 = percent * planet.energyCap;
	const c = planet.energyCap;
	const p0 = planet.energy;
	const g = planet.energyGrowth;
	const t = (c / (4 * g)) * Math.log((p1 * (c - p0)) / (p0 * (c - p1)));
	if (!t || t < 0) return -1;
	return t;
}

// returns how much energy a planet is going to have in durationSec
// source: https://github.com/darkforest-eth/plugins/blob/master/content/productivity/sitrep/plugin.js#L239
function modelEnergyGrowth(energy, energyGrowth, energyCap, durationSec) {
	let denom = Math.exp((-4 * energyGrowth * durationSec) / energyCap)
		 		* (energyCap / energy - 1) + 1;
	return energyCap / denom;
}

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

function padStrLeading(str, desiredSize, char) {
    if (str.length >= desiredSize) return str;
    return char.repeat(desiredSize-str.length) + str;
}

function dateToTimeStr(date) {
	let str = "";
	str += padStrLeading(date.getHours()+"", 2, "0")+":";
	str += padStrLeading(date.getMinutes()+"", 2, "0")+":";
	str += padStrLeading(date.getSeconds()+"", 2, "0");
	return str;
}

function formatSeconds(seconds, decimalCount=1) {
	let time = seconds;
	if (time < 60) return roundToDecimal(time, decimalCount)+" seconds";
	time /= 60;
	if (time < 60) return roundToDecimal(time, decimalCount)+" minutes";
	time /= 60;
	if (time < 24) return roundToDecimal(time, decimalCount)+" hours";
	time /= 24;
	return roundToDecimal(time, decimalCount)+" days";
}

function createCurvePoints(planet, canvasSize, pointCount=300) {
	let fakePlanet = {};
	fakePlanet.energy = planet.energyCap*0.01;
	fakePlanet.energyCap = planet.energyCap;
	fakePlanet.energyGrowth = planet.energyGrowth;
	fakePlanet.lastUpdated = planet.lastUpdated;
	let points = [];
	let energyArr = [];
	let maxDuration = Math.round(getEnergyCurveAtPercent(fakePlanet, 0.99));
	let timeIncrease = maxDuration / pointCount;
	for (let time=timeIncrease; time < maxDuration; time += timeIncrease) {
		let energy = modelEnergyGrowth(fakePlanet.energy, planet.energyGrowth, planet.energyCap, time);
		energy /= planet.energyCap;
		energyArr.push(energy);
	}
	for (let i=0; i < energyArr.length; ++i) {
		let p = {};
		p.x = i / energyArr.length;
		p.y = energyArr[i];
		p.x *= canvasSize;
		p.y *= canvasSize;
		p.y = canvasSize - p.y;
		points[i] = p;
	}
	return points;
}

function drawMultiplePointLine(ctx, points, color, thickness=3) {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.lineWidth = thickness;
	ctx.moveTo(points[0].x,	points[1].y);
	for (let i=1; i<points.length; ++i) {
		ctx.lineTo(points[i].x, points[i].y);
	}
	ctx.stroke();
}

function saveCanvas(canvas) {
	let img = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); 
	window.location.href=img;
}

const PI2 = Math.PI * 2;
function drawCircle(ctx, x, y, radius, thickness=0.8, color="#FFF") {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.arc(x, y, radius, 0, PI2, true);
	ctx.fill();
}

function CurveImage(size, planet, color="#FFF") {
	let o = {};
	
	o.size = size;
	o.planet = planet;
	o.color = color;
	o.points = null;
	o.dataUrl = null;
	
	o.create = function() {
		const canvas = document.createElement('canvas');
		canvas.width = o.size;
		canvas.height = o.size;
		const ctx = canvas.getContext('2d');

		o.points = createCurvePoints(o.planet, o.size);
		drawMultiplePointLine(ctx, o.points, o.color);
		o.dataUrl = canvas.toDataURL("image/png"); 
	}
	
	o.getClosestPointToPoint = function(point) {
		let closestI = -1;
		let closestDist = 999999;
		for (let i=0; i < o.points.length; ++i) {
			let p = o.points[i];
			let vecX = p.x-point.x;
			let vecY = p.y-point.y;
			let dist = Math.sqrt(vecX*vecX + vecY*vecY);
			if (dist < closestDist) {
				closestDist = dist;
				closestI = i;
			}
		}
		return { point: o.points[closestI], percent: closestI/o.points.length };
	}
	
	o.getClosestPointToPercent = function(percent) {
		if (percent > 1) percent = 1;
		if (percent < 0) percent = 0;
		let i = Math.round(o.points.length*percent);
		if (i === o.points.length) --i;
		return o.points[i];
	}
	
	return o;
}

function PluginObj() {
	var o = {};
	
	let curvImg = null; // CurveImage()
	const curvImgSize = 400;
	let curvImgElement = null; // HTML element
	
	let canvas = null;
	let ctxCurvImgOverlay = null;
	
	o.selectedPlanet = null;
	o.displayedPlanet = null;
	
	const windowPadding = 16;
	const textHeight = 32;
	
	o.divPlanetDesc = null;
	
	o.divNumbers = null;
	o.tdCurrentEnergy = null;
	o.tdCurrentEnergyPercent = null;
	o.tdPredictedEnergy = null;
	o.tdPredictedEnergyPercent = null;
	o.tdPredictedTime = null;
	
	o.divPredictedText = null;
	
	let currentEnergyPoint = null;
	let predictedEnergyPoint = null;
	
	let colorPredicted = "#7E8";
	let colorTime = "#5BB";
	
	let predictedEnergy = null;
	let predictedEnergyPercent = null;
	let predictedTimeSec = null;
	let predictedTime = null;
	
	let intervUpdate = null;
	
	o.init = function() {
		window.addEventListener("click", o.onMouseClick);
	}
	
	o.render = function(div) {
		div.style.width = (curvImgSize+windowPadding)+'px';
		div.style.height = (curvImgSize+windowPadding+textHeight*3)+'px';
		div.style.backgroundColor = "#000";
		
		o.divPlanetDesc = document.createElement("div");
		o.divPlanetDesc.innerHTML = "select a planet";
		div.appendChild(o.divPlanetDesc);
		
		curvImgElement = document.createElement("img");
		curvImgElement.style.position = "fixed";
		curvImgElement.style.zIndex = 0;
		
		canvas = document.createElement("canvas");
		canvas.style.position = "fixed";
		canvas.width = curvImgSize;
		canvas.height = curvImgSize;
		canvas.style.zIndex = 1;
		canvas.style.pointerEvents = "none";
		ctxCurvImgOverlay = canvas.getContext('2d');
		
		div.appendChild(canvas);
		div.appendChild(curvImgElement);
		
		curvImgElement.addEventListener("mousemove", event => {
			let p = { x: event.layerX, y: event.layerY };
			o.mouseOverCurve(p);
		});
		
		function createTd(table) {
			let td = document.createElement("td");
			td.style["text-align"] = "center";
			td.style.border = "1px solid white";
			td.style.fontWeight = "900";
			table.appendChild(td);
			return td;
		}
		
		o.divNumbers = document.createElement("div");
		o.divNumbers.style.paddingTop = "8px";
		o.divNumbers.style.top = curvImgSize+"px";
		o.divNumbers.style.position = "relative";
		let table = document.createElement("table");
		o.tdCurrentEnergy = createTd(table);
		o.tdCurrentEnergy.width = "70px";
		o.tdCurrentEnergyPercent = createTd(table);
		o.tdCurrentEnergyPercent.width = "60px";
		let tdArrow = createTd(table);
		tdArrow.innerHTML = " -> ";
		tdArrow.width = "30px";
		o.tdPredictedEnergy = createTd(table);
		o.tdPredictedEnergy.width = "70px";
		o.tdPredictedEnergy.style.color = colorPredicted;
		o.tdPredictedEnergyPercent = createTd(table);
		o.tdPredictedEnergyPercent.width = "60px";
		o.tdPredictedEnergyPercent.style.color = colorPredicted;
		o.tdPredictedTime = createTd(table);
		o.tdPredictedTime.width = "110px";
		o.tdPredictedTime.style.color = colorTime;
		o.divNumbers.appendChild(table);
		div.appendChild(o.divNumbers);
		
		o.divPredictedText = document.createElement("div");
		o.divPredictedText.style.top = curvImgSize+"px";
		o.divPredictedText.style.position = "relative";
		o.divPredictedText.style.paddingTop = "8px";
		o.divPredictedText.innerHTML = "";
		div.appendChild(o.divPredictedText);
		
		o.clearTable();
		if (ui.selectedPlanet) o.selectPlanet(ui.selectedPlanet);
	}
	
	o.draw = function(ctx) { }
	
	o.destroy = function() {
		window.removeEventListener("click", o.onMouseClick);
		o.stopUpdating();
	}
	
	o.onMouseClick = function() {
		let newPlanet = ui.selectedPlanet ? ui.selectedPlanet : null;
		if (newPlanet === o.selectedPlanet) return;
		o.selectPlanet(newPlanet);
	}
	
	o.startUpdating = function() {
		if (intervUpdate !== null) return;
		intervUpdate = setInterval(o.update, 1000);
	}
	
	o.stopUpdating = function() {
		if (intervUpdate === null) return;
		clearInterval(intervUpdate);
		intervUpdate = null;
	}
	
	o.selectPlanet = function(planet) {
		o.selectedPlanet = planet;
		if (planet === null) {
			return;
		}
		o.displayedPlanet = planet;
		
		curvImg = CurveImage(curvImgSize, planet);
		curvImg.create();
		curvImgElement.src = curvImg.dataUrl;
		
		let str = "";
		str += PlanetTypeNames[o.displayedPlanet.planetType];
		str += " LvL."+o.displayedPlanet.planetLevel
		str += ' <span style="color:#990">'+getPlanetName(planet)+"</span>";
		o.divPlanetDesc.innerHTML = str;
		
		predictedEnergyPoint = null;
		
		o.startUpdating();
		o.update();
	}
	
	o.unselectPlanet = function() {
		o.divPlanetDesc.innerHTML = "select a planet";
		o.clearTable();
		predictedEnergyPoint = null;
		currentEnergyPoint = null;
		o.stopUpdating();
		ctxCurvImgOverlay.clearRect(0, 0, curvImgSize, curvImgSize);
	}
	
	o.mouseOverCurve = function(mouse) {
		if (!o.displayedPlanet) return;
		const { point, percent } = curvImg.getClosestPointToPoint(mouse);
		predictedEnergyPoint = point;
		predictedEnergy = o.displayedPlanet.energyCap * percent;
		predictedEnergyPercent = percent;
		predictedTimeSec = getEnergyCurveAtPercent(o.displayedPlanet, predictedEnergyPercent);
		if (predictedTimeSec > 0) {
			predictedTime = new Date((o.displayedPlanet.lastUpdated + Math.round(predictedTimeSec))*1000);
		} else predictedTime = null;
		o.setTdPredictedEnergy();
		drawPoints();
	}
	
	function drawPoints() {
		ctxCurvImgOverlay.fillStyle = "#00000000";
		ctxCurvImgOverlay.clearRect(0, 0, curvImgSize, curvImgSize);
		if (currentEnergyPoint)
			drawCircle(ctxCurvImgOverlay, currentEnergyPoint.x, currentEnergyPoint.y, 6);
		if (predictedEnergyPoint) {
			drawCircle(ctxCurvImgOverlay, predictedEnergyPoint.x, predictedEnergyPoint.y, 8, 0.8, colorPredicted);
			drawCircle(ctxCurvImgOverlay, predictedEnergyPoint.x, predictedEnergyPoint.y, 2, 0.8, "#000");
		}
	}
	
	function getPercent(a, b) {
		return (Math.round(a/b * 1000) / 10) + "%";
	}
	
	o.update = function() {
		o.displayedPlanet = df.getPlanetWithId(o.displayedPlanet.locationId);
		let p = o.displayedPlanet;
		currentEnergyPoint = curvImg.getClosestPointToPercent(p.energy / p.energyCap);
		o.setTdCurrentEnergy();
		o.setTdPredictedEnergy();
		drawPoints();
	}
	
	o.clearTable = function() {
		o.tdCurrentEnergy.innerHTML = "";
		o.tdCurrentEnergyPercent.innerHTML = "";
		o.tdPredictedEnergy.innerHTML = "";
		o.tdPredictedEnergyPercent.innerHTML = "";
		o.tdPredictedTime.innerHTML = "";
	}
	
	o.setTdCurrentEnergy = function() {
		o.tdCurrentEnergy.innerHTML = formatNumberForDisplay(o.displayedPlanet.energy);
		o.tdCurrentEnergyPercent.innerHTML = getPercent(o.displayedPlanet.energy, o.displayedPlanet.energyCap);
	}
	
	o.setTdPredictedEnergy = function() {
		o.tdPredictedEnergy.innerHTML = formatNumberForDisplay(predictedEnergy);
		o.tdPredictedEnergyPercent.innerHTML = (Math.round(predictedEnergyPercent*1000)/10)+"%";
		
		if (!predictedTime) o.tdPredictedTime.innerHTML = "";
		else o.tdPredictedTime.innerHTML = dateToTimeStr(predictedTime);
		
		if (predictedTimeSec > 0) {
			let sec = Math.round((predictedTime.getTime()-Date.now()) / 1000);
			let str = 'Planet will reach <span style="color:'+colorPredicted+'">';
			str += o.tdPredictedEnergyPercent.innerText+"</span> energy in ";
			str += '<span style="color:'+colorTime+'">'+formatSeconds(sec)+'</span>';
			o.divPredictedText.innerHTML = str;
		} else o.divPredictedText.innerHTML = "";
	}
	
	o.init();
	return o;
}

class Plugin {
	constructor() {
		this.plugin = PluginObj();
	}
	render(div) {
		this.plugin.render(div);
	}
	draw(ctx) {
		this.plugin.draw(ctx);
	}
	destroy() {
		this.plugin.destroy();
	}
}

export default Plugin;
