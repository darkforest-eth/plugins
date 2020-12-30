# df-plugins

In v0.5 of [Dark Forest](https://zkga.me/), they added the ability to customize the game through "Plugins". These are scripts that are run by the game and provided access to specific aspects of the game.

__WARNING:__ Plugins are evaluated in the context of your game and can access all of your private information (including private key!). You should not use any plugins that you haven't written yourself and control the entire pipeline (such as imported dependencies). Plugins can dynamically load data, which can be switched out from under you!!!

## Examples

This repository contains plugins used by myself and [@jacobrosenthal](https://github.com/jacobrosenthal) in our DF games. It is only recommended as a reference guide on making plugins. __You should not use these verbatim and should control the entire pipeline!__
