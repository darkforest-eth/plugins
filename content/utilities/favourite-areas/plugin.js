// Favourite Areas
// Save client width, height and coordinates of currently visible area

import {
  html,
  render,
  useState,
  useEffect,
} from "https://unpkg.com/htm/preact/standalone.module.js";

// Used to give a rough estimate of zoom level
const maxClientSize = 1000000;

const input = {
  width: "250px",
  padding: "5px",
  outline: "none",
  color: "black",
};

const row = {
  display: "flex",
  padding: "3px",
};

const goToButton = {
  "margin-left": "auto",
  "margin-right": "5px",
};

const addButton = {
  "margin-left": "auto",
};

const zoom = {
  "margin-left": "5px",
};

function AreaRow({ area, onRemove, onGoTo }) {
  const removeClicked = () => {
    onRemove(area.name);
  };

  const goToClicked = () => {
    onGoTo(area.name);
  };

  const calculateZoom = (area) => {
    const zoom = maxClientSize / ((area.width + area.height) / 2);
    return Math.round(zoom * 10) / 10;
  };

  const trimCoordinate = (coordinate) => {
    return coordinate.toString().split(".")[0];
  };

  return html`<div style=${row}>
    <span
      >${area.name} (${trimCoordinate(area.x)}, ${trimCoordinate(area.y)})
    </span>
    <span style=${zoom}>${calculateZoom(area)}x</span>
    <button style=${goToButton} onClick=${goToClicked}>Go To</button>
    <button onClick=${removeClicked}>X</button>
  </div> `;
}

function App() {
  const [areaName, setAreaName] = useState(null);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    const areasJson = localStorage.getItem("favourite-areas");
    const cachedAreas = JSON.parse(areasJson);
    setAreas(cachedAreas);
  }, []);

  const onAreaNameChange = (event) => {
    setAreaName(event.target.value);
  };

  const saveArea = () => {
    const nameNotUnique = areas.some((area) => area.name === areaName);
    if (nameNotUnique === true) return;

    const viewPort = ui.getViewport();
    const viewPortPosition = viewPort.getViewportPosition();
    const newAreas = [
      ...areas,
      {
        name: areaName,
        width: viewPort.getViewportWorldWidth(),
        height: viewPort.getViewportWorldHeight(),
        x: viewPortPosition.x,
        y: viewPortPosition.y,
      },
    ];

    setAreas(newAreas);
    localStorage.setItem("favourite-areas", JSON.stringify(newAreas));
  };

  const onRemove = (name) => {
    const newAreas = areas.filter((area) => area.name !== name);
    setAreas(newAreas);
    localStorage.setItem("favourite-areas", JSON.stringify(newAreas));
  };

  const onGoTo = (name) => {
    const selectedArea = areas.find((area) => area.name === name);
    const viewPort = ui.getViewport();
    viewPort.centerChunk({
      chunkFootprint: {
        bottomLeft: {
          x: selectedArea.x,
          y: selectedArea.y,
        },
        sideLength: 0,
      },
    });
    viewPort.setWorldHeight(selectedArea.height);
    viewPort.setWorldWidth(selectedArea.width);
  };

  return html`
    <div>
      ${areas.map(
        (area) => html`
          <${AreaRow} area=${area} onRemove=${onRemove} onGoTo=${onGoTo} />
        `
      )}
    </div>

    <div style=${row}>
      <input
        style=${input}
        value=${areaName}
        onChange=${onAreaNameChange}
        placeholder="Area Name"
      />
      <button style=${addButton} onClick="${saveArea}">Add</button>
    </div>
  `;
}

class Plugin {
  constructor() {
    this.container = null;
  }

  render(container) {
    container.parentElement.style.minHeight = "unset";
    container.style.width = "500px";
    container.style.minHeight = "unset";

    this.container = container;

    render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container);
  }
}

export default Plugin;
