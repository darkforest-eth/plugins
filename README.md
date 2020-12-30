# df-plugins

In v0.5 of [Dark Forest](https://zkga.me/), we added the ability to customize the game through "Plugins". These are scripts that are run by the game and provided access to specific aspects of the game.

## WARNING

Plugins are evaluated in the context of your game and can access all of your private information (including private key!). Plugins can dynamically load data, which can be switched out from under you!!! __Use these plugins at your own risk.__

You should not use any plugins that you haven't written yourself or by someone you trust completely. You or someone you trust should control the entire pipeline (such as imported dependencies) and should review plugins before you use them.
