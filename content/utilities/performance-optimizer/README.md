# Performance Optimizer

Aims to improve performance under heavy load:

* Reduce render load by limiting percentage of total compute power to spend on rendering. Currently implemented very naively by overwriting `window.requestAnimationFrame`. Could be more sophisiticated in the future if render managers get exposed. Also, limited FPS mode disabled for now as it somehow doesn't work.
* Cache move zk-SNARK proofs. This seems like it could be (in a more optimized form) added to the native game, as it really doesn't have any downsides. Every move between the same two planets after the first one is sped up significantly. Would need somewhat cleverer storage management if it were to be added persistently - currently reset on game launch.
