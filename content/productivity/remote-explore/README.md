# RemoteExplorePlugin

The remote explore plugin allows us to use headless explorers that we run on servers and RaspberryPi devices.

We use [mimc-fast](https://github.com/projectsophon/darkforest-rs/tree/main/mimc-fast) as a webserver that exposes a `/mine` endpoint and connect to it from in-game with this plugin.

When running this on https://zkga.me/, you might get an error about blocked insecure content. You probably just want to install a SSL Certificate on your explore server. If you can't, you can [enable mixed content](enable-mixed.md), __but this can be extremely dangerous.__
