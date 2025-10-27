# Dark Forest ARES Plugins

## WARNING

Plugins are evaluated in the context of your game and can access all of your private information (including private key!). Plugins can dynamically load data, which can be switched out from under you!!! __Use these plugins at your own risk.__

You should not use any plugins that you haven't written yourself or by someone you trust completely. You or someone you trust should control the entire pipeline (such as imported dependencies) and should review plugins before you use them.

# Intro

In v0.5 of [Dark Forest](https://zkga.me/), Dark Forest office team added the ability to customize the game through "Plugins". These are scripts that are run by the game and provided access to specific aspects of the game.



Dark Forest ARES is a modified version of [Dark Forest v0.6](https://github.com/darkforest-eth/darkforest-v0.6).

This repository is forked from [Dark Forest Plugins](https://github.com/darkforest-eth/plugins), and we will continue to maintain it.



We deploy DF ARES v0.1.1 on [Redstone](https://redstone.xyz/) , more info please check [here](https://mirror.xyz/dfarchon.eth/8OS1CKPOc2L1ZgwEKmLYheeYKLljsjzxLxrPjFJ9cg8).

Game Wesite: [https://dfares-redstone.netlify.app](https://dfares-redstone.netlify.app/)


| Game Version            | Plugin Version | Packages Version                                             |
| ----------------------- | -------------- | ------------------------------------------------------------ |
| Dark Forest v0.6.5      | v0.6.5         | v6.7.29    @darkforest_eth/*   [link](https://www.npmjs.com/~ichub_df) |
| Dark Forest ARES v0.1.1 | v0.1.1-dfares  | v6.8.5        @dfares/*     [link](https://www.npmjs.com/search?q=dfares) |

If you want to submit the plugins, please use **v0.1.1-dfares** as the version name.

## Utilities

The Dark Forest in game api has two typical interaction points. In the Dark Forest client you'll find the documentation for the [df object](https://github.com/darkforest-eth/client/blob/master/docs/classes/Backend_GameLogic_GameManager.default.md) and the [ui object](https://github.com/darkforest-eth/client/blob/master/docs/classes/Backend_GameLogic_GameUIManager.default.md).

| Game Version            | df object                                                    | ui object                                                    |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Dark Forest v0.6.5      | [link](https://github.com/darkforest-eth/client/blob/master/docs/classes/Backend_GameLogic_GameManager.default.md) | [link](https://github.com/darkforest-eth/client/blob/master/docs/classes/Backend_GameLogic_GameUIManager.default.md) |
| Dark Forest ARES v0.1.1 | [link](https://github.com/dfarchon/DFARES-v0.1/blob/redstone/client/docs/classes/Backend_GameLogic_GameUIManager.default.md) | [link](https://github.com/dfarchon/DFARES-v0.1/blob/redstone/client/docs/classes/Backend_GameLogic_GameUIManager.default.md) |



We also provide a series of utilities that plugin authors can use. These are served directly from our website (`https://dfares-plugins.netlify.app/`) and you can load them in your plugins. Check out what is available in the [javascript directory](javascript/)

If we are missing a utility that would be helpful, feel free to open an issue!

## Adding your plugin

You can submit your own plugins by sending a Pull Request to this repository!

You'll need to add your plugin to the `content/` directory of this project. Within `content/`, we have categories, like `casual`, `productivity`, or `artifacts`, please pick the best category, or create a directory for a new one.

Adding a new plugin directory can be done in 2 ways:

1. Install `hugo` by following https://gohugo.io/getting-started/installing/ then run `hugo new CATEGORY/PLUGIN-NAME` (where CATEGORY is the category you want and PLUGIN-NAME is the name of your plugin).

2. Copy an already existing plugin directory and rename it to the name of your plugin.

After you've created a new plugin directory, update the `index.md`, `plugin.js`, `screenshot.png` files to fit your plugin. Make sure to add additional information to the comments of the `plugin.js` that might help other users or developers with your plugin.

Feel free to add additional information to your plugin directory, such as we did with `remote-explorer`.

## Contribution Guidelines
- Comments on top of the script explaining what is is and how to use it
- Has to have screenshot, ideally with result of action and or the ui, should to be ~20kb in size unless you really need more
- Check destructors cleanup all constructors, delete all new, reset all listeners and timers
- Simple clean auditable javascript, expect to go through a little back and forth code review
- No external scripts being loaded except for from us https://plugins.zkga.me/utils/ or a few REALLY big names from knowns cdns have been allowed so far like: https://unpkg.com/htm/preact/standalone.module.js and https://cdn.skypack.dev/lodash.range
- No use of localstorage, overriding internal rpc timers/settings (df.contractsAPI.contractCaller), interaction with or depending on other plugins

Please understand these 'rules' are our best effort to be able to lightly audit code for the protection of the users. Its an impossible job but were trying anyway. If your code doesn't fit in here don't take it personally. The community has also created repos like [Awesome Dark Forest](https://github.com/snowtigersoft/awesome-darkforest) which provide no such gatekeeping and are a great way to showcase your work as well.

## Reviewer Guidelines
This repo always needs more help reviewing the incoming plugins PRs. Please 'watch' the repo so you get emails of all the new stuff coming in.

**Note incoming PRs are obviously not reviewed so you need to be much more careful testing unmerged PRS as they could be malicious. Read the code closely before running, and if possible review untrusted code with a throwaway wallet or local copy of game** 

Reviewing isn't that big of a task! Anyone can do it
* Is it documented at all?
* Does it work like you'd expect based on documentation?
* Does it work at all, did you test it? report back
* Does it overlap heavily with an existing plugin, or at least say why its different and better than an old one, can you ping the original developer or people who have touched it to give some feedback
* Make sure it follows the contribution and security guidelines 
* Think about the general javascript code quality (but don't nitpick too hard)

Leave that feedback in the issue, more than one reviewer is always appreciated

## Showcase local development

To develop on the showcase page or theme itself, you can use `hugo` by installing as per above. You need to checkout the git submodules for the theme with `git submodule update --init --recursive` and then running `hugo server -D` in this repository will start a local webserver you can visit with your browser.
