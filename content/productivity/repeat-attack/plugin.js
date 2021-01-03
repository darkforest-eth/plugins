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

function centerPlanet(id) {
  ui.centerLocationId(id);
}

function planetShort(locationId) {
  return locationId.substring(4, 9);
}

function Attack({ action, onDelete }) {
  let remoteAttack = () => {
    op.delete(action.id);
    onDelete();
  };
  return html`
    <div key=${action.id} style=${ActionEntry}>
      <span>
        <span
          style=${{ ...Spacing, ...Clickable }}
          onClick=${() => centerPlanet(action.payload.srcId)}
          >${planetShort(action.payload.srcId)}</span
        >
        →
        <span
          style=${{ ...Spacing, ...Clickable }}
          onClick=${() => centerPlanet(action.payload.syncId)}
          >${planetShort(action.payload.syncId)}</span
        ></span
      >
      <button onClick=${remoteAttack}>✕</button>
    </div>
  `;
}

function AddAttack({ onCreate }) {
  let [planet, setPlanet] = useState(ui.getSelectedPlanet());
  let [source, setSource] = useState(false);
  let [target, setTarget] = useState(false);
  useLayoutEffect(() => {
    let onClick = () => {
      setPlanet(ui.getSelectedPlanet());
    };
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
    };
  }, []);

  function createAttack(source, target) {
    op.pester(source.locationId, target.locationId);
    onCreate();
  }

  return html`
    <div style=${{ display: 'flex' }}>
      <button
        style=${VerticalSpacing}
        onClick=${() => setSource(planet)}
      >
        Set Source
      </button>
      <span style=${{ ...Spacing, marginRight: 'auto' }}
        >${source ? planetShort(source.locationId) : "?????"}</span
      >
      <button
        style=${VerticalSpacing}
        onClick=${() => setTarget(planet)}
      >
        Set Target
      </button>
      <span style=${{ ...Spacing, marginRight: 'auto' }}
        >${target ? planetShort(target.locationId) : "?????"}</span
      >
      <button
        style=${VerticalSpacing}
        onClick=${() => createAttack(source, target)}
      >
        start
      </button>
    </div>
  `;
}

function AttackList() {
  const [actions, setActions] = useState(op.actions);

  let actionList = {
    maxHeight: "70px",
    overflowX: "hidden",
    overflowY: "scroll",
  };

  let actionsChildren = actions
    .filter((a) => a.type == "PESTER")
    .map((action) => {
      return html`
        <${Attack}
          action=${action}
          onDelete=${() => setActions([...op.actions])} />
        `;
    });

  return html`
    <h1>Set-up a Recurring Attack</h1>

    <i style=${{ ...VerticalSpacing, display: 'block' }}
      >Auto-attack when source planet >75% energy
    </i>

    <${AddAttack} onCreate=${() => setActions([...op.actions])} />
    <h1 style=${HalfVerticalSpacing}>
      Recurring Attacks (${actionsChildren.length})
      <button
        style=${{ float: "right" }}
        onClick=${() => setActions([...op.actions])}
      >
        refresh
      </button>
    </h1>
    <div style=${actionList}>
      ${actionsChildren.length ? actionsChildren : "No Actions."}
    </div>
  `;
}

function App() {
  return html`<${AttackList} />`;
}

class Plugin {
  constructor() {
    if (typeof window.op === "undefined") {
      window.op = new Manager();
    }
    this.op = window.op;
    this.root = null;
    this.container = null;
  }

  async render(container) {
    this.container = container;
    container.style.width = "380px";
    this.root = render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container, this.root);
  }
}

plugin.register(new Plugin());
