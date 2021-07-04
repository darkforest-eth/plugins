import {
  html,
  render,
  useState,
  useCallback,
  // @ts-ignore
} from "https://unpkg.com/htm/preact/standalone.module.js";

const PLANET_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7].map((level) => ({
  value: level,
  text: level.toString(),
}));
const PLANET_ANY_TYPE = -1;
const ARTIFACT_ANY_TYPE = -1;
const ARTIFACT_ANY_RARITY = -1;

const PLANET_TYPES = [
  { value: PLANET_ANY_TYPE, text: "Any" },
  { value: 0, text: "Planet" },
  { value: 1, text: "Asteroid Field" },
  { value: 2, text: "Foundry" },
  { value: 3, text: "Spacetime Rip" },
  { value: 4, text: "" },
];

const ARTIFACT_TYPES = [
  {
    value: ARTIFACT_ANY_TYPE,
    text: "Any",
  },
  {
    value: 1,
    text: "Monolith",
  },
  {
    value: 2,
    text: "Colossus",
  },
  {
    value: 3,
    text: "Spaceship",
  },
  {
    value: 4,
    text: "Pyramid",
  },
  {
    value: 5,
    text: "Wormhole",
  },
  {
    value: 6,
    text: "PlanetaryShield",
  },
  {
    value: 7,
    text: "PhotoidCannon",
  },
  {
    value: 8,
    text: "BloomFilter",
  },
  {
    value: 9,
    text: "BlackDomain",
  },
];

const ARTIFACT_RARITIES = [
  {
    value: ARTIFACT_ANY_RARITY,
    text: "Any",
  },
  {
    value: 1,
    text: "Common",
  },
  {
    value: 2,
    text: "Rare",
  },
  {
    value: 3,
    text: "Epic",
  },
  {
    value: 4,
    text: "Legendary",
  },
  {
    value: 5,
    text: "Mythic",
  },
];

function CreateSelectFilter({ items, selectedValue, onSelect }) {
  const selectStyle = {
    background: "rgb(8,8,8)",
    width: "120px",
    padding: "3px 5px",
    border: "1px solid white",
    borderRadius: "3px",
  };

  return html`
    <select
      style=${selectStyle}
      value=${selectedValue}
      onChange=${(e) => onSelect(Number(e.target.value))}
    >
      ${items.map(
        ({ value, text }) => html`<option value=${value}>${text}</option>`
      )}
    </select>
  `;
}

function LevelFilter({ levels, selectedLevels, onSelectLevel }) {
  const buttonStyle = {
    border: "1px solid #ffffff",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",

    width: "40px",
    height: "25px",
    padding: "0 0.3em",
    color: "white",
    textAlign: "center",
    transition: "background-color 0.2s, color 0.2s",
    borderRadius: "3px",
  };

  const buttonSelectedStyle = {
    ...buttonStyle,
    color: "white",
    background: "#00ADE1",
    borderRadius: 0,
  };

  const buttonsRow = {
    display: "flex",
    flexDirection: "row",
  };

  const button = ({ value, text, onClick, selected = false }) => html`
    <div
      style=${selected ? buttonSelectedStyle : buttonStyle}
      onClick=${() => onClick(value)}
    >
      ${text}
    </div>
  `;
  const inRange = (value) =>
    value <= Math.max(...selectedLevels) &&
    value >= Math.min(...selectedLevels);
  return html`
    <div style=${buttonsRow}>
      ${levels.map(({ value, text }) =>
        button({
          value,
          text,
          onClick: onSelectLevel,
          selected: inRange(value),
        })
      )}
    </div>
  `;
}

function createDivider() {
  const dividerStyle = {
    width: "100%",
    border: "0.1px solid white",
    margin: "20px 0",
    height: 0,
  };

  return html`<div style=${dividerStyle}></div> `;
}

function createButton({ loading, onClick }) {
  const buttonStyle = {
    // margin: "10px 0",
    background: "rgb(8,8,8)",
    width: "180px",
    padding: "3px 5px",
    border: "1px solid white",
    borderRadius: "6px",
    textAlign: "center",
  };

  const hoverStyle = {
    color: "#080808",
    background: "#ffffff",
  };

  const [hover, setHover] = useState(false);
  return html` <button
    disabled=${loading}
    style=${{
      ...buttonStyle,
      ...(hover ? hoverStyle : {}),
    }}
    onClick=${onClick}
    onMouseEnter=${() => setHover(true)}
    onMouseLeave=${() => setHover(false)}
  >
    Start Highlight
  </button>`;
}

// @ts-ignore
let eligiblePlanets = [];

function App({}) {
  const [selectedLevels, setSelectedLevels] = useState([0, 7]);
  const [selectedPlanetType, setSelectedPlanetType] = useState(-1);
  const [selectedArtifactType, setSelectedArtifactType] = useState(-1);
  const [selectedArtifactRarity, setSelectedArtifactRarity] = useState(-1);
  const [mustHoldArtifacts, setMustHoldArtifacts] = useState(true);
  const [isOwner, setIsOwner] = useState(true);

  // @ts-ignore
  const usePlanetArtifacts = useCallback((planet) => {
    const artifacts = planet.heldArtifactIds
      ? ui.getArtifactsWithIds(planet.heldArtifactIds)
      : [];
    return artifacts.filter((a) => !!a);
  });

  const getEligiblePlanets = useCallback(() => {
    let planets = [];
    for (let planet of df.getAllPlanets()) {
      // check planet level in range
      if (
        !(
          planet.planetLevel >= Math.min(...selectedLevels) &&
          planet.planetLevel <= Math.max(...selectedLevels)
        )
      ) {
        continue;
      }

      if (isOwner && planet.owner !== df.getAccount()) {
        continue;
      }

      // check planet type
      if (
        selectedPlanetType !== PLANET_ANY_TYPE &&
        planet.planetType != selectedPlanetType
      ) {
        continue;
      }

      if (!mustHoldArtifacts) {
        planets.push(planet);
      } else {
        let artifacts = usePlanetArtifacts(planet);
        // check planet must have artifact of specific type and rarity
        if (selectedArtifactType !== ARTIFACT_ANY_TYPE) {
          // @ts-ignore
          artifacts = artifacts.filter(
            (artifact) => artifact.artifactType === selectedArtifactType
          );
        }

        if (selectedArtifactRarity !== ARTIFACT_ANY_RARITY) {
          // @ts-ignore
          artifacts = artifacts.filter(
            (artifact) => artifact.rarity === selectedArtifactRarity
          );
        }
        if (artifacts.length > 0) {
          planets.push(planet);
        }
      }
    }
    return planets;
  }, [
    selectedLevels,
    selectedPlanetType,
    selectedArtifactType,
    selectedArtifactRarity,
    isOwner,
    mustHoldArtifacts,
  ]);

  const flexRow = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-even",
  };

  const planetLevelFilter = html`<div style=${{ marginBottom: "3px" }}>
      Planet Level Ranges
    </div>
    <${LevelFilter}
      levels=${PLANET_LEVELS}
      selectedLevels=${selectedLevels}
      onSelectLevel=${(level) => {
        if (selectedLevels.length == 2) {
          setSelectedLevels([level]);
        } else {
          setSelectedLevels([level, selectedLevels[0]]);
        }
      }}
    />`;

  const planetTypeFilter = html`<div>
    <div style=${{ marginBottom: "3px" }}>Planet Type</div>
    <${CreateSelectFilter}
      items=${PLANET_TYPES}
      selectedValue=${selectedPlanetType}
      onSelect=${setSelectedPlanetType}
    />
  </div>`;

  const mustHoldArtifactsFilter = html`
    <div>
      <div style=${{ marginBottom: "3px" }}>Artifacts</div>
      <input
        type="checkbox"
        title="planets must hold artifacts"
        onChange=${setMustHoldArtifacts}
        defaultChecked=${mustHoldArtifacts}
      />
    </div>
  `;

  const ownerFilter = html`
    <div>
      <div style=${{ marginBottom: "3px" }}>Owner</div>
      <input
        type="checkbox"
        title="planet is claimed by you"
        onChange=${() => setIsOwner(!isOwner)}
        defaultChecked=${isOwner}
      />
    </div>
  `;

  const planetUnionFilters = html`
    <div style=${{ ...flexRow, justifyContent: "space-between", marginTop: "10px" }}>
      ${planetTypeFilter} ${mustHoldArtifactsFilter} ${ownerFilter}
    </div>
  `;

  const artifactFilters = html`<div style=${{ ...flexRow, marginTop: "10px" }}>
    <div>
      <div style=${{ marginBottom: "3px" }}>Artifacts Type</div>
      <${CreateSelectFilter}
        items=${ARTIFACT_TYPES}
        selectedValue=${selectedArtifactType}
        onSelect=${(v) => {
          setSelectedArtifactType(v);
          console.log("level mm", selectedLevels);
        }}
      />
    </div>
    <div style=${{ marginLeft: "75px" }}>
      <div style=${{ marginBottom: "3px" }}>Artifacts Rarity</div>
      <${CreateSelectFilter}
        items=${ARTIFACT_RARITIES}
        selectedValue=${selectedArtifactRarity}
        onSelect=${setSelectedArtifactRarity}
      />
    </div>
  </div>`;

  const [loading, setLoading] = useState(false);

  const highlightPlanet = () => {
    setLoading(true);
    eligiblePlanets = getEligiblePlanets();
    setLoading(false);
  };

  const submitButton = html`<${createButton}
    loading=${loading}
    onClick=${highlightPlanet}
  />`;

  return html`
    ${planetLevelFilter} ${planetUnionFilters} ${artifactFilters}
    <${createDivider} />
    ${submitButton}
  `;
}

//@ts-ignore
class Plugin {
  draw(ctx) {
    // @ts-ignore
    const viewport = ui.getViewport();

    ctx.save();
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    for (let planet of eligiblePlanets) {
      if (!planet.location) continue;
      let { x, y } = planet.location.coords;
      ctx.beginPath();
      ctx.arc(
        viewport.worldToCanvasX(x),
        viewport.worldToCanvasY(y),
        viewport.worldToCanvasDist(
          ui.getRadiusOfPlanetLevel(planet.planetLevel)
        ),
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    }
    ctx.restore();
  }

  async render(container) {
    render(html`<${App} />`, container);
  }
}

export default Plugin;
