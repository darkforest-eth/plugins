// move silver with minimum energy
import {html, render, useState, useLayoutEffect } from 
  "https://unpkg.com/htm/preact/standalone.module.js";

function runZero(source, destination, silver) {
  // update planets
  source = df.getPlanetWithId(source.locationId);
  destination = df.getPlanetWithId(destination.locationId);
  console.log(source, destination, silver);
  if ( silver === "max" ) {
    silver = source.silver;
  }
  if ( silver > source.silver ) {
    df.terminal.current.println("Not enough silver to perform operation");
    return;
  }
  console.log(source, destination, silver);
  let max = source.energy;
  let energy = df.getEnergyNeededForMove(source.locationId, destination.locationId, 0);
  let dist = df.getDist(source.locationId, destination.locationId);
  let landing = df.getEnergyArrivingForMove(source.locationId, destination.locationId, dist, energy);
  while (landing < 2) {
    if (energy > max) { // prevent infinite loop
      df.terminal.current.println("Not enough energy to perform operation.");
      return; // do nothing else
    }
    energy = energy + 1;
    console.log("energy", energy);
    landing = df.getEnergyArrivingForMove(source.locationId, destination.locationId, dist, Math.ceil(energy));
    console.log("landing", landing);
  }
  if (energy > max) {
    df.terminal.current.println("Not enough energy to perform operation.");
    return; // do nothing else
  }
  df.move(source.locationId, destination.locationId, Math.ceil(energy), silver);
}

function planetShort(planet) {
  if ( !planet ) {
    return "none";
  }
  return planet.locationId.substring(4, 9);
}

function App() {
  let [getSelectedPlanet, setSelectedPlanet] = useState(ui.getSelectedPlanet());
  let [getSource, setSource] = useState(false);
  let [getDestination, setDestination] = useState(false);
  let [getSilver, setSilver] = useState(null);

  let silverchange = (evt) => {
    setSilver(evt.target.value);
  }
  
  useLayoutEffect(() => {
    let onClick = () => {
      setSelectedPlanet(ui.getSelectedPlanet());
    }
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    }
  }, []);

  return html`
    <div>
      <button onClick=${() => setSource(getSelectedPlanet)}> Set Source </button> <span>${planetShort(getSource)}</span><br />
      <button onClick=${() => setDestination(getSelectedPlanet)}> Set Dest </button> <span>${planetShort(getDestination)}</span><br />
	  <input type="text" style="color: black" value=${getSilver} onInput=${silverchange} placeholder="silver to send" /><button onClick=${() => setSilver("max")}> Max </button><br />
	  <button onClick=${() => runZero(getSource, getDestination, getSilver)}> Send Zero </button>
    </div>
  `;
}

class Plugin {
  constructor() {
	this.root = null;
	this.container = null;
  }

  async render(container) {
	this.container = container;
	container.style.width = "215px";
	this.root = render(html`<${App} />`, container);
  }

  destroy() {}
}

export default Plugin;
