/**
 * Remember, you have access these globals:
 * 1. df - Just like the df object in your console.
 * 2. ui - For interacting with the game's user interface.
 * 3. plugin - To register the plugin, plus other helpful things.
 *
 */

class Plugin {
  constructor() { }

  /**
   * Called when plugin is launched with the "run" button.
   */
  async render(container) { 
    console.log('importing utils to dev console...');

    utils = await import('https://plugins.zkga.me/utils/utils.js');
    
    window.uitls = utils; 
    console.log('utils imported. Access via window.utils');
  }
  /**
   * Called when plugin modal is closed.
   */
  destroy() { }
}

/**
 * And don't forget to register it!
 */
plugin.register(new Plugin());
