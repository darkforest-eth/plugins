/**
 * Remember, you have access these globals:
 * 1. df - Just like the df object in your console.
 * 2. ui - For interacting with the game's user interface.
 * 3. plugin - To register the plugin, plus other helpful things.
 *
 */

class Plugin {
  constructor() { }
  async render(container) { 
    console.log('importing utils to dev console...');

    const utils = await import('https://plugins.zkga.me/utils/utils.js');
    
    window.utils = utils; 
    console.log('utils imported. Access via `utils`');
  }

  destroy() { }
}

/**
 * And don't forget to register it!
 */
plugin.register(new Plugin());
