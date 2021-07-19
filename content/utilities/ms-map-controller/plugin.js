/**
 * MS Map Controller
 *
 * Simple Plugin to pan & zoom the map with keyboard.
 *
 * Paning: Arrows (←, ↑, →, ↓)
 * Zooming: '-' out, '=' in
 *
 * Enable logging by setting `window.__MS_MC_DEBUG` to `true` in conosle.
 *
 * Author @matthewsimo
 */

import {
  html,
  render,
} from "https://unpkg.com/htm/preact/standalone.module.js";

class BasePlugin {
  constructor() {
    window.__MS_MC_DEBUG = window.__MS_MC_DEBUG || false;

    window.__MS_MC_DEBUG && console.log("[MS MC]: init", { df, ui }, this);

    this.container = null;

    const { heightInWorldUnits, widthInWorldUnits } = ui.getViewport();
    this.xDelta = widthInWorldUnits / 8; // Distance to move left or right
    this.yDelta = heightInWorldUnits / 8; // Distance to move up or down
    this.zoomDelta = 200; // Amount to zoom in or out

    window.addEventListener("keydown", this.handleKeyInput);
  }
  async render(container) {
    this.container = container;
    render(
      html`
        <div>
          <p>Use arrows to pan.</p>
          <p>'-' to Zoom Out & '=' to Zoom In.</p>
        </div>
      `,
      container
    );
  }

  handleKeyInput = (e) => {
    const { x, y } = ui.getViewport().centerWorldCoords;
    let newX = x;
    let newY = y;
    window.__MS_MC_DEBUG && console.log(`[MS MC]: handleKeyInput: `, e);

    switch (e.key) {
      case "ArrowLeft":
        newX -= this.xDelta;
        break;
      case "ArrowRight":
        newX += this.xDelta;
        break;
      case "ArrowUp":
        newY += this.yDelta;
        break;
      case "ArrowDown":
        newY -= this.yDelta;
        break;
    }

    if (x !== newX || y !== newY) {
      const newCoords = { x: newX, y: newY };
      ui.centerCoords(newCoords);
    }

    if (e.key === "-") {
      ui.getViewport().onScroll(this.zoomDelta, true);
    }

    if (e.key === "=") {
      ui.getViewport().onScroll(-this.zoomDelta, true);
    }
  };

  destroy() {
    window.__MS_MC_DEBUG &&
      console.log("[MS MC]:clean up", { df, ui }, this.container);
    window.removeEventListener("keydown", this.handleKeyInput);
  }
}
export default BasePlugin;
