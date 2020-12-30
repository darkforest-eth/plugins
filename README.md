# df-plugins

In v0.5 of [Dark Forest](https://zkga.me/), we added the ability to customize the game through "Plugins". These are scripts that are run by the game and provided access to specific aspects of the game.

## WARNING

Plugins are evaluated in the context of your game and can access all of your private information (including private key!). Plugins can dynamically load data, which can be switched out from under you!!! __Use these plugins at your own risk.__

You should not use any plugins that you haven't written yourself or by someone you trust completely. You or someone you trust should control the entire pipeline (such as imported dependencies) and should review plugins before you use them.

## Utilities

We provide a series of utilities that plugin authors can use. These are served directly from our website (`https://plugins.zkga.me`) and you can load them in your plugins. Check out what is available in the [javascript directory](javascript/)

If we are missing a utility that would be helpful, feel free to open an issue!

## Adding your plugin

You can submit your own plugins by sending a Pull Request to this repository!

You'll need to add your plugin to the `content/` directory of this project. Within `content/`, we have categories, like `casual`, `productivity`, or `artifacts`, please pick the best category, or create a directory for a new one.

Adding a new plugin directory can be done in 2 ways:

1. Install `hugo` by following https://gohugo.io/getting-started/installing/ then run `hugo new CATEGORY/PLUGIN-NAME` (where CATEGORY is the category you want and PLUGIN-NAME is the name of your plugin).

2. Copy an already existing plugin directory and rename it to the name of your plugin.

After you've created a new plugin directory, update the `index.md`, `plugin.js`, `screenshot.png` files to fit your plugin. You can also add additional information to the `README.md` that might help other users or developers with your plugin.

Feel free to add additional information to your plugin directory, such as we did with `remote-explorer`.

## Showcase local development

To develop on the showcase page or theme itself, you can use `hugo` by installing as per above, then running `hugo server -D` in this repository.
