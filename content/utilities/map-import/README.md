# Map Import

<!-- You can write more details about your plugin here. -->
The current Map Import in the game causes a Denial-of-Service between your system and the xdai network. I changed the way things are loaded to loaded the map first, then slowly update new planets.

This takes a ton of time to import a map, but it doesn't DoS your system or xdai rate limit.
