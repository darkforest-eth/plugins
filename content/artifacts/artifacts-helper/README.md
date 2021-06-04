# Artifacts Helper

This plugin can help you quickly do batch _prospecting_ and _finding_ on planets with artifacts. To do so, just click "Refresh" and then "Auto P+F". Note to get exact "Expired" number, the current block height must be obtained correctly, which might require several seconds after the plugin ran.

As the network can process only one or two action(tx)s per block, and the artifact would expire after 255 blocks after prospecting, by default this plugin only prospect the first 20 planets in "Wait P" state. "Wait F" planets are not related and would run at max concurrency.
