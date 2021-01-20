# RemoteSnarkerPlugin

Similar to the remote explore plugin, the remote snarker plugin allows players to run snark proof generation on another computer. 

We use [snarking-server](https://github.com/bind/df-snarker) as a webserver that exposes a `/move` endpoint and connect to it from in-game with this plugin.

When running this on https://zkga.me/, you might get an error about blocked insecure content. You probably just want to install a SSL Certificate on your explore server. If you can't, you can [enable mixed content](enable-mixed.md), __but this can be extremely dangerous.__
