import {
  html,
  render,
  useState,
  useLayoutEffect
} from "https://unpkg.com/htm/preact/standalone.module.js";

// Styles
let Spacing = {
  marginLeft: "12px",
  marginRight: "12px",
};
let VerticalSpacing = {
  marginBottom: "12px",
};
let HalfVerticalSpacing = {
  marginBottom: "6px",
};
let Clickable = {
  cursor: "pointer",
  textDecoration: "underline",
};
let ActionEntry = {
  marginBottom: "5px",
  display: "flex",
  justifyContent: "space-between",
  color: "",
};
// Types
/*
const enum PlanetType {
  PLANET = 0,
  SILVER_MINE = 1,
  RUINS = 2,
  TRADING_POST = 3,
  SILVER_BANK = 4
}
const enum PlanetType2 {
  NOT_RUINS = 0,
  NOT_PROSPECTED = 1,
  PROSPECTING = 2,
  READY_TO_FIND = 3,
  FINDING = 4,
  PROSPECTED_EXPIRED = 5,
  FOUND = 6
}
*/
var PlanetType;
(function (PlanetType) {
  PlanetType[PlanetType["PLANET"] = 0] = "PLANET";
  PlanetType[PlanetType["SILVER_MINE"] = 1] = "SILVER_MINE";
  PlanetType[PlanetType["RUINS"] = 2] = "RUINS";
  PlanetType[PlanetType["TRADING_POST"] = 3] = "TRADING_POST";
  PlanetType[PlanetType["SILVER_BANK"] = 4] = "SILVER_BANK";
})(PlanetType || (PlanetType = {}));
var PlanetType2;
(function (PlanetType2) {
  PlanetType2[PlanetType2["NOT_RUINS"] = 0] = "NOT_RUINS";
  PlanetType2[PlanetType2["NOT_PROSPECTED"] = 1] = "NOT_PROSPECTED";
  PlanetType2[PlanetType2["PROSPECTING"] = 2] = "PROSPECTING";
  PlanetType2[PlanetType2["READY_TO_FIND"] = 3] = "READY_TO_FIND";
  PlanetType2[PlanetType2["FINDING"] = 4] = "FINDING";
  PlanetType2[PlanetType2["PROSPECTED_EXPIRED"] = 5] = "PROSPECTED_EXPIRED";
  PlanetType2[PlanetType2["FOUND"] = 6] = "FOUND";
})(PlanetType2 || (PlanetType2 = {}));
const PlanetType2Str = ["Not R", "wait P", "in P", "wait F", "in F", "expire", "found"];

// Helper functions
const checkPlanetType = (planet, currentBlockNumber /*: number*/) => {
  if (planet.unconfirmedFindArtifact) {
      return PlanetType2.FINDING;
  }
  if (planet.unconfirmedProspectPlanet) {
      return PlanetType2.PROSPECTING;
  }
  if (planet.planetType !== PlanetType.RUINS) {
      return PlanetType2.NOT_RUINS;
  }
  if (planet.prospectedBlockNumber === undefined) {
      return PlanetType2.NOT_PROSPECTED;
  }
  if (planet.hasTriedFindingArtifact) {
      return PlanetType2.FOUND;
  }
  if (currentBlockNumber - (planet.prospectedBlockNumber || 0) > 256) {
      return PlanetType2.PROSPECTED_EXPIRED;
  }
  return PlanetType2.READY_TO_FIND;
};

// UI components

function PlanetItem(props) { // id, planet, planetStatus
  return html`
  <div key=${props.id} style=${ActionEntry}>
      <span>
      <span
          style=${{ ...Spacing, ...Clickable }}
          onClick=${() => ui.centerPlanet(props.planet)}
          >${props.planet.locationId.substring(4, 10)}</span>
      <span style=${{ flex: 1 }}></span>
      <span style=${{ ...Spacing }}>${PlanetType2Str[props.planetStatus]}</span>
      </span>
  </div>
  `;
}

function AppUI(props) { // refreshPlanetStates, doProspectAndFind, chainBlockNumber, planets
  //const [chainBlockNumber, setChainBlockNumber] = useState(0);
  //const [planets, setPlanets] = useState([]);
  const itemsHTML = props.planets.map((p, i) => {
      return html`<${PlanetItem} id=${i} planet=${p[0]} planetStatus=${p[1]} />`;
  });
  const nums = props.planets.reduce((acc, p) => {
      acc[p[1]] += 1;
      return acc;
  }, PlanetType2Str.map(() => 0));
  const numsHTML = PlanetType2Str.map((p, i) => html`<span style=${{ ...Spacing }}>${p}<br/>${nums[i]}</span>`);
  const warningHTML = props.chainBlockNumber == 0 ? html`<div>Warning! No current block height info.
      Planet status might be wrong. Please retry after several seconds. (~8s)</div>` : '';

  return html`
  <div>
      <div style=${{ display: 'flex' }}>
          <button style=${{ ...VerticalSpacing, ...Spacing }} onClick=${() => props.refreshPlanetStates()}>Refresh</button>
          <button style=${{ ...VerticalSpacing, ...Spacing }} onClick=${() => props.doProspectAndFind()}>Auto P+F</button>
          <span style=${{ flex: 1 }}></span>
          <span style=${Spacing}>Cur Blk: ${props.chainBlockNumber}</span>
      </div>
      <div style=${{ display: 'flex' }}>
          ${numsHTML}
      </div>
      ${warningHTML}
      <div style=${{
          maxHeight: "300px", overflowX: "hidden", overflowY: "scroll",
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid gray'
      }}
          otherstyle="grid-template-columns:repeat(auto-fill, minmax(4em, max-content));">
          ${itemsHTML}
      </div>
  </div>
  `;
}


class Plugin {
  //container: any; // Plugin container, used in render()
  //pluginHTMLNode: any; // Root node of the plugin panel

  //_chainBlockNumber_Subscriber: any;
  //chainBlockNumber: number;
  //chainBlockNumberplanets: any[];
  container;
  pluginHTMLNode;
  planets;
  chainBlockNumber;
  _chainBlockNumber_Subscriber;

  constructor() {
      this._chainBlockNumber_Subscriber = ui.getEthConnection().blockNumber$.subscribe(x => {
          this.chainBlockNumber = x;
      });
      this.container = null;
      this.pluginHTMLNode = null;
      this.chainBlockNumber = 0;
      this.planets = [];
  }

  destroy() {
      this._chainBlockNumber_Subscriber.unsubscribe();
      render(null, this.container, this.pluginHTMLNode);
  }

  getAllRuins() {
      return df.getMyPlanets().filter((planet) => planet.planetType === PlanetType.RUINS);
  }

  refreshPlanetStates() {
      console.log("Refresing Planets with Artifacts...");
      this.planets = this.getAllRuins().map((p) => [p, checkPlanetType(p, this.chainBlockNumber)]).sort((p, q) => (p[1] - q[1]));
      this.render(this.container);
  }

  doProspectAndFind() {
      const do_find = (planet) => {
          console.log("Post F on ", planet.locationId);
          df.findArtifact(planet.locationId);
          /*.then(
                          v => {
                              console.log("Finish Finding    artifact on ", planet.locationId);
                          },
                          e => {
                              console.log("Error  Finding    artifact on ", planet.locationId, " ", e);
                          });*/
      };
      const do_prospect = (planet) => {
          console.log("Post P on ", planet.locationId);
          df.prospectPlanet(planet.locationId).then(
              v => {
                  do_find(planet);
              },
              e => {
                  console.log("Error Prospecting artifact on ", planet.locationId, " ", e);
              });

      };
      this.planets.map((p, i) => {
          if (i < 20) {
              const ptype = p[1];
              const planet = p[0];
              if (ptype == PlanetType2.NOT_PROSPECTED) {
                  do_prospect(planet);
              } else if (ptype == PlanetType2.READY_TO_FIND) {
                  do_find(planet);
              }
          }
      })
  }

  async render(container) {
      this.container = container;
      container.style.width = "480px";
      this.pluginHTMLNode = render(
          html`<style>button:hover { border: 1px solid black !important; }</style>
          <${AppUI} chainBlockNumber=${this.chainBlockNumber} planets=${this.planets}
              refreshPlanetStates=${() => this.refreshPlanetStates()}
              doProspectAndFind=${() => this.doProspectAndFind()}
          />`, container);
  }
}

export default Plugin;