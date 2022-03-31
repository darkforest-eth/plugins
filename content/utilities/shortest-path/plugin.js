// Shortest Path
import { html, render, useState, useEffect, useLayoutEffect } from "https://unpkg.com/htm/preact/standalone.module.js";
import { PlanetLevel } from "https://cdn.skypack.dev/@darkforest_eth/types";
import { getPlanetName } from "https://cdn.skypack.dev/@darkforest_eth/procedural";

let graph = {}

function isLocatable(planet) {
    return planet.location !== undefined;
}

function getPlanetsInRange(p, minLevel) {
    const inRange = df.getPlanetsInRange(p.locationId, 100).filter(p => p.planetLevel >= minLevel);
    
    const activeArtifact = df.getActiveArtifact(p)
    const wormholeTo = activeArtifact && df.getPlanetWithId(activeArtifact.wormholeTo)
    wormholeTo && inRange.push(wormholeTo)

    const artifactFrom = df.getMyArtifacts().find(a => a.wormholeTo === p.locationId)
    const wormholeFrom = artifactFrom && df.getPlanetWithId(artifactFrom.onPlanetId)
    wormholeFrom && inRange.push(wormholeFrom)

    return inRange
}

function buildGraph(minLevel)
{
    const newGraph = {}

    const planets = Array.from(df.getAllPlanets())
        .filter(p => p.planetLevel >= minLevel)
        .filter(isLocatable)

    for (const p of planets) 
    {
        const moves = getPlanetsInRange(p, minLevel)
          .filter(isLocatable)
          .reduce((moves, p2) => {
              moves[p2.locationId] = {
                  dist: df.getDist(p.locationId, p2.locationId),
                  time: df.getTimeForMove(p.locationId, p2.locationId),
                  energy: df.getEnergyNeededForMove(p.locationId, p2.locationId, 10)
              }

              return moves
          }, {})

        newGraph[p.locationId] = moves
    }

    graph = newGraph
}

function getSubgraph(cost)
{
    return Object.keys(graph).reduce((subgraph, key) => {
        subgraph[key] = Object.keys(graph[key]).reduce((moves, key2) => {
            moves[key2] = graph[key][key2][cost]
            
            return moves
        }, {})
        
        return subgraph
    }, {})
}

function getDistanceGraph()
{
    return getSubgraph('dist')
}

function getEnergyGraph()
{
    return getSubgraph('energy')
}

function getTimeGraph()
{
    return getSubgraph('time')
}

var dijkstra = {
  single_source_shortest_paths: function(graph, s, d) {
    // Predecessor map for each node that has been encountered.
    // node ID => predecessor node ID
    var predecessors = {};

    // Costs of shortest paths from s to all nodes encountered.
    // node ID => cost
    var costs = {};
    costs[s] = 0;

    // Costs of shortest paths from s to all nodes encountered; differs from
    // `costs` in that it provides easy access to the node that currently has
    // the known shortest path from s.
    // XXX: Do we actually need both `costs` and `open`?
    var open = dijkstra.PriorityQueue.make();
    open.push(s, 0);

    var closest,
        u, v,
        cost_of_s_to_u,
        adjacent_nodes,
        cost_of_e,
        cost_of_s_to_u_plus_cost_of_e,
        cost_of_s_to_v,
        first_visit;
    while (!open.empty()) {
      // In the nodes remaining in graph that have a known cost from s,
      // find the node, u, that currently has the shortest path from s.
      closest = open.pop();
      u = closest.value;
      cost_of_s_to_u = closest.cost;

      // Get nodes adjacent to u...
      adjacent_nodes = graph[u] || {};

      // ...and explore the edges that connect u to those nodes, updating
      // the cost of the shortest paths to any or all of those nodes as
      // necessary. v is the node across the current edge from u.
      for (v in adjacent_nodes) {
        if (adjacent_nodes.hasOwnProperty(v)) {
          // Get the cost of the edge running from u to v.
          cost_of_e = adjacent_nodes[v];

          // Cost of s to u plus the cost of u to v across e--this is *a*
          // cost from s to v that may or may not be less than the current
          // known cost to v.
          cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

          // If we haven't visited v yet OR if the current known cost from s to
          // v is greater than the new cost we just found (cost of s to u plus
          // cost of u to v across e), update v's cost in the cost list and
          // update v's predecessor in the predecessor list (it's now u).
          cost_of_s_to_v = costs[v];
          first_visit = (typeof costs[v] === 'undefined');
          if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
            costs[v] = cost_of_s_to_u_plus_cost_of_e;
            open.push(v, cost_of_s_to_u_plus_cost_of_e);
            predecessors[v] = u;
          }
        }
      }
    }

    if (typeof d !== 'undefined' && typeof costs[d] === 'undefined') {
      var msg = ['Could not find a path from ', s, ' to ', d, '.'].join('');
      throw new Error(msg);
    }

    return predecessors;
  },

  extract_shortest_path_from_predecessor_list: function(predecessors, d) {
    var nodes = [];
    var u = d;
    var predecessor;
    while (u) {
      nodes.push(u);
      predecessor = predecessors[u];
      u = predecessors[u];
    }
    nodes.reverse();
    return nodes;
  },

  find_path: function(graph, s, d) {
    var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
    return dijkstra.extract_shortest_path_from_predecessor_list(
      predecessors, d);
  },

  /**
   * A very naive priority queue implementation.
   */
  PriorityQueue: {
    make: function (opts) {
      var T = dijkstra.PriorityQueue,
          t = {},
          key;
      opts = opts || {};
      for (key in T) {
        if (T.hasOwnProperty(key)) {
          t[key] = T[key];
        }
      }
      t.queue = [];
      t.sorter = opts.sorter || T.default_sorter;
      return t;
    },

    default_sorter: function (a, b) {
      return a.cost - b.cost;
    },

    /**
     * Add a new item to the queue and ensure the highest priority element
     * is at the front of the queue.
     */
    push: function (value, cost) {
      var item = {value: value, cost: cost};
      this.queue.push(item);
      this.queue.sort(this.sorter);
    },

    /**
     * Return the highest priority element in the queue.
     */
    pop: function () {
      return this.queue.shift();
    },

    empty: function () {
      return this.queue.length === 0;
    }
  }
};

const timeStyle = 'rgb(65, 85, 240)'
const distanceStyle = 'rgb(120, 255, 120)'
const energyStyle = 'rgb(255, 100, 100)'
let ctxShowTime = true
let ctxShowEnergy = true
let ctxShowDistance = true
let paths = {}

let Spacing = {
  marginLeft: "12px",
  marginRight: "12px",
};
let VerticalSpacing = {
  marginBottom: "12px",
};
let SelectStyle = {
  background: "rgb(8,8,8)",
  width: "100px",
  padding: "3px 5px",
  border: "1px solid white",
  borderRadius: "3px",
};

let Button = {

}
let ButtonOn = {
    color: 'rgb(10, 10, 10)',
}
let ButtonMetric = Object.assign({}, Button, {
    width: '100%'
})

let ButtonDistance = Object.assign({}, ButtonMetric, {
})
let ButtonDistanceOn = Object.assign({}, ButtonOn, ButtonDistance, {
    backgroundColor: distanceStyle
})

let ButtonTime = Object.assign({}, ButtonMetric, {
})
let ButtonTimeOn = Object.assign({}, ButtonOn, ButtonTime, {
    backgroundColor: timeStyle
    
})

let ButtonEnergy = Object.assign({}, ButtonMetric, {
})
let ButtonEnergyOn = Object.assign({}, ButtonOn, ButtonEnergy, {
    backgroundColor: energyStyle
})

function planetShort(planet) {
  return getPlanetName(planet)
}

function PlotCourse() 
{
  let [source, setSource] = useState(null);
  let [target, setTarget] = useState(null);

  console.log({ source, target })

  async function plotCourse(source, target) 
  {
    paths = {
      energy: dijkstra.find_path(getEnergyGraph(), source.locationId, target.locationId),
      time: dijkstra.find_path(getTimeGraph(), source.locationId, target.locationId),
      distance: dijkstra.find_path(getDistanceGraph(), source.locationId, target.locationId),
    }
  }

  return html`
    <div style=${{ display: 'flex' }}>
      <button
        style=${VerticalSpacing}
        onClick=${() => { console.log(ui.getSelectedPlanet()); setSource(ui.getSelectedPlanet()) }}
      >
        Set Source
      </button>
      <span style=${{ ...Spacing, marginRight: 'auto' }}
        >${source ? planetShort(source) : "?????"}
      </span>
      <button
        style=${VerticalSpacing}
        onClick=${() => setTarget(ui.getSelectedPlanet())}
      >
        Set Target
      </button>
      <span style=${{ ...Spacing, marginRight: 'auto' }}
        >${target ? planetShort(target) : "?????"}
      </span>
      <button
        style=${VerticalSpacing}
        onClick=${() => plotCourse(source, target)}
      >
        Plot
      </button>
    </div>
  `;
}

function App() {
  const [showDistance, setShowDistance] = useState(true)
  const [showTime, setShowTime] = useState(true)
  const [showEnergy, setShowEnergy] = useState(true)
  const [minLevel, setMinLevel] = useState(5)

  const PLANET_LEVELS = Object.values(PlanetLevel).map((level) => ({
    value: level,
    text: level.toString(),
  }))

  useEffect(() => {
      ctxShowDistance = showDistance
      ctxShowTime = showTime
      ctxShowEnergy = showEnergy
  })

  async function buildGraphClick() {
    const count = Array.from(df.getAllPlanets()).filter(p => p.planetLevel >= minLevel).length
    if (window.confirm(`This will create an index of ${count} planets and might take a while. Continue?`)) {
      buildGraph(minLevel)
    }
  }

  return html`
    <div style="display: flex; justify-content: space-between;">
        <h1>Shortest Path</h1>
        <div style="display: flex; gap: 1rem;">
            <select style=${SelectStyle} value=${minLevel} onChange=${e => setMinLevel(Number(e.target.value))}>
                <option value="">Min Level</option>
                ${Object.values(PlanetLevel).map(lvl => html`<option value=${lvl}>${lvl}</option>`)}
            </select>
            <button style=${Button} onClick=${buildGraphClick}>
                Build Graph
            </button>
        </div>
    </div>
    <p>
        <i style=${{ ...VerticalSpacing, display: 'block' }}>
            Visualise the shortest path by distance, time or energy.
        </i>
    </p>
    <${PlotCourse} />
    <hr style="${VerticalSpacing}" />
    <div style="display: flex; justify-content: space-between; gap: 1rem;">
        <button style=${showDistance ? ButtonDistanceOn : ButtonDistance } onClick=${() => setShowDistance(! showDistance)}>
          Distance
        </button>
        <button style=${showTime ? ButtonTimeOn : ButtonTime } onClick=${() => setShowTime(! showTime)}>
          Time
        </button>
        <button style=${showEnergy ? ButtonEnergyOn : ButtonEnergy } onClick=${() => setShowEnergy(! showEnergy)}>
          Energy
        </button>
    </div>
  `;
}

class Plugin {
  constructor() {
    this.container = null;
  }

  async render(container) {
    this.container = container;
    container.style.width = "480px";
    render(html`<${App} />`, container);
  }

  drawPath(viewport, ctx, style, planets) {
    ctx.beginPath()
    ctx.strokeStyle = style

    const coords = df.getPlanetsWithIds(planets).map(p => p.location.coords)

    ctx.moveTo(
        viewport.worldToCanvasX(coords[0].x), 
        viewport.worldToCanvasY(coords[0].y),
    )

    for (let coord of coords.slice(1)) {
        ctx.lineTo(
            viewport.worldToCanvasX(coord.x), 
            viewport.worldToCanvasY(coord.y),
        )

        ctx.moveTo(
            viewport.worldToCanvasX(coord.x), 
            viewport.worldToCanvasY(coord.y),
        )
    }

    ctx.stroke()
  }

  draw(ctx) {
    const viewport = ui.getViewport()

    ctx.lineWidth = 2

    if (ctxShowDistance && paths.distance) this.drawPath(viewport, ctx, distanceStyle, paths.distance)
    if (ctxShowEnergy && paths.energy) this.drawPath(viewport, ctx, energyStyle, paths.energy)
    if (ctxShowTime && paths.time) this.drawPath(viewport, ctx, timeStyle, paths.time)
  }

  destroy() {
    render(null, this.container);
  }
}

export default Plugin;
