const { default: Manager } = await import(
  "https://plugins.zkga.me/utils/RepeatAttackCore.js"
);

const { html, render, useState, useLayoutEffect } = await import(
  "https://unpkg.com/htm/preact/standalone.module.js"
);

let Spacing = {
  marginLeft: "12px",
  marginRight: "12px",
};
let VerticalSpacing = {
  marginBottom: "12px",
};
let Clickable = {
  cursor: "pointer",
  textDecoration: "underline",
};
let ActionEntry = {
  marginBottom: "10px",
  display: "flex",
  justifyContent: "space-between",
  color: "",
};

function centerPlanet(id) {
  ui.centerLocationId(id);
}

function Attack({ action }) {
  return html`
    <div key=${action.id} style=${ActionEntry}>
      <span>
        <span
          style=${{ ...Spacing, ...Clickable }}
          onClick=${() => centerPlanet(action.payload.srcId)}
          >${action.payload.srcId.substring(5, 10)}</span
        >
        →
        <span
          style=${{ ...Spacing, ...Clickable }}
          onClick=${() => centerPlanet(action.payload.syncId)}
          >${action.payload.syncId.substring(5, 10)}</span
        ></span
      >
      <button
        onClick=${() => {
          op.delete(action.id);
        }}
      >
        ✕
      </button>
    </div>
  `;
}

function AddAttack() {
  let [planet, setPlanet] = useState(ui.getSelectedPlanet());
  let [source, setSource] = useState(false);
  let [target, setTarget] = useState(false);
  let onClick = () => {
    setPlanet(ui.getSelectedPlanet());
  };
  useLayoutEffect(() => {
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
    };
  }, [onClick]);

  function createAttack(source, target) {
    op.pester(source.locationId, target.locationId);
  }

  return html`
    <div>
      <button
        style=${VerticalSpacing}
        onClick=${() => {
          setSource(planet);
        }}
      >
        Set Source
      </button>
      <span style=${{ ...Spacing }}
        >${source ? source.locationId.substring(5, 10) : ""}</span
      >
    </div>
    <div>
      <button
        style=${VerticalSpacing}
        onClick=${() => {
          setTarget(planet);
        }}
      >
        Set Target
      </button>
      <span style=${{ ...Spacing }}
        >${target ? target.locationId.substring(5, 10) : ""}</span
      >
    </div>
    <button
      style=${VerticalSpacing}
      onClick=${() => createAttack(source, target)}
    >
      submit
    </button>
  `;
}

function AttackList() {
  const [actions, setActions] = useState(op.actions);

  let actionList = {
    maxHeight: "100px",
    overflowX: "hidden",
    overflowY: "scroll",
  };

  let actionsChildren = actions
    .filter((a) => a.type == "PESTER")
    .map((action) => {
      return html`<${Attack} action=${action} />`;
    });

  return html`
    <h1 style=${VerticalSpacing}>Create a Recurring Attack</h1>

    <i style=${VerticalSpacing}
      >When the source planet energy is >75% it will launch an attack
    </i>
    <${AddAttack} />
    <h1 style=${VerticalSpacing}>
      Recurring Attacks
      <button
        style=${{ float: "right" }}
        onClick=${() => setActions(op.actions)}
      >
        refresh
      </button>
    </h1>
    <div style=${{ ...actionList, ...VerticalSpacing }}>
      ${actionsChildren.length ? actionsChildren : "No Actions."}
    </div>
  `;
}

function App() {
  return html` <${AttackList} /> `;
}

/**
 * Remember, you have access these globals:
 * 1. df - Just like the df object in your console.
 * 2. ui - For interacting with the game's user interface.
 * 3. plugin - To register the plugin, plus other helpful things.
 *
 * Let's log these to the console when you run your plugin!
 */

class Plugin {
  constructor() {
    if (typeof window.op === "undefined") {
      window.op = new Manager();
    }
    this.op = window.op;
    this.root = null;
    this.container = null;
  }

  /**
   * Called when plugin is launched with the "run" button.
   */
  async render(container) {
    this.container = container;
    container.style.width = "450px";
    this.root = render(html`<${App} />`, container);
  }

  /**
   * Called when plugin modal is closed.
   */
  destroy() {
    render(null, this.container, this.root);
  }
}

/**
 * And don't forget to register it!
 */
plugin.register(new Plugin());
