import {
  html,
  render,
  useState,
} from "https://unpkg.com/htm/preact/standalone.module.js";

let show_planets = [];

function drawRound(ctx, p, color, width, alpha) {
  if (!p || !p.location || !p.location.coords) return;
  const viewport = ui.getViewport();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  const { x, y } = p.location.coords;
  const range = p.planetLevel * 20;
  const trueRange = viewport.worldToCanvasDist(range);
  ctx.beginPath();
  ctx.arc(
    viewport.worldToCanvasX(x),
    viewport.worldToCanvasY(y),
    trueRange,
    0,
    2 * Math.PI
  );
  ctx.stroke();
}

function main_ui() {
  const [levelFilter, setLevelFilter] = useState(3);

  const cacheArtifactPlanets = () => {
    show_planets = [];
    for (let planet of df.getAllPlanets()) {
      if (
        planet.planetLevel >= levelFilter &&
        df.isPlanetMineable(planet) &&
        !planet.hasTriedFindingArtifact
      ) {
        show_planets.push(planet);
      }
    }
  };

  const handleLevelChange = (e) => {
    setLevelFilter(parseInt(e.target.value, 10));
  };

  const handleHighlight = () => {
    cacheArtifactPlanets();
  };

  const flexRow = {
    display: "flex",
    flexDirection: "column",
    marginTop: "16px",
    marginLeft: "10px",
    marginBottom: "10px",
  };

  return html`<div style=${flexRow}>
        <label style=${{ display: "block", marginBottom: "8px" }}>
            Min. planets to show
        </label>
        <select
            value=${levelFilter}
            onChange=${handleLevelChange}
            style=${{
      background: "rgb(8,8,8)",
      width: "100%",
      marginBottom: "10px",
      padding: "8px",
    }}
        >
            ${[0, 1, 2, 3, 4, 5, 6, 7].map(
      (lvl) =>
        html`<option value=${lvl}>Level ${lvl}</option>`
    )}
        </select>
        <button
            onClick=${handleHighlight}
            style=${{
      width: "100%",
      height: "50px",
      cursor: "pointer",
    }}
        >
            Highlight Planets!
        </button>
    </div>`;
}

class Plugin {
  constructor() {
    this.container = null;
  }

  draw(ctx) {
    ctx.save();
    show_planets.forEach((p) => drawRound(ctx, p, "red", 5, 1));
    ctx.restore();
  }

  async render(container) {
    this.container = container;
    container.style.width = "250px";
    container.style.height = "200px";
    render(html`<${main_ui} />`, container);
  }

  destroy() {
    render(null, this.container);
  }
}

export default Plugin;