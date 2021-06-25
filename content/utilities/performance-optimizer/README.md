# Performance Optimizer

Aims to improve performance under heavy load:

* Reduce render load by limiting percentage of total compute power to spend on rendering. Implemented by overwriting `window.requestAnimationFrame`. Could be more sophisiticated in the future if render managers get exposed.
* Clear zk-SNARK proofs cache / Set max. limit of zk-SNARK proofs. Default is 20. Every move between the same two planets after the first one is sped up significantly.
