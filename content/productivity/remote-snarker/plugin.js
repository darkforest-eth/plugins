// Remote Snarker
//
// Similar to the remote explore plugin, the remote snarker plugin allows
// players to run snark proof generation on another computer. We
// usehttps://github.com/bind/df-snarker as a webserver that exposes a `/move`
// endpoint and connect to it from in-game with this plugin.
//
// When trying contact a remote server (not also running on your computer) from
// a webpage like this plugin does it may not work or you may see an error about
// blocked insecure content. Theres 3 ways make this work:
// * The right but rather technical way is to install a SSL Certificate on your
//   server.
// * Another technical solution is routing your local port to your remote server
//   as described https://developer.zkga.me/mining/connecting-to-a-remote-headless-miner
// * Finally a bad but quick solution is to google enabling mixed content in your browser
//   NOTE however this can be extremely dangerous also allowing any other code to do the same.

import fastq from "https://cdn.skypack.dev/fastq";

function isMoveSnarkInput(snarkInput) {
  return snarkInput?.x1 && snarkInput?.x2 && snarkInput?.y1 && snarkInput?.y2;
}

function replaceOldProverQueue() {
  //@ts-ignore
  df.snarkHelper.snarkProverQueue.taskQueue = fastq(
    async function remoteSnarkerExecute(task, cb) {
      try {
        //@ts-ignore
        let res = await window.snarkjs.groth16.fullProve(
          task.input,
          task.circuit,
          task.zkey
        );
        console.log(`proved ${task.taskId}`);
        cb(null, res);
      } catch (e) {
        console.error("error while calculating SNARK proof:");
        console.error(e);
        cb(e, null);
      }
    },
    1
  );
}

function patchSnarkProverQueue(url) {
  // If no url return
  if (!url) return;
  // if malformed url return
  try {
    new URL(url);
  } catch (_) {
    return;
  }

  df.snarkHelper.snarkProverQueue.taskQueue = fastq(
    async function remoteSnarkerExecute(task, cb) {
      try {
        let res;
        if (isMoveSnarkInput(task.input)) {
          let proverResponse = await fetch(`${url}/move`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(task.input),
          });
          res = await proverResponse.json();
        } else {
          res = await window.snarkjs.groth16.fullProve(
            task.input,
            task.circuit,
            task.zkey
          );
        }
        console.log(`proved ${task.taskId}`);
        cb(null, res);
      } catch (e) {
        console.error("YOU SHOULD PROBABLY CLOSE YOUR REMOTE SNARKER PLUGIN");
        console.error("error while calculating SNARK proof:");
        console.error(e);
        cb(e, null);
      }
    },
    1
  );
}

class Snarker {
  /**
   * A constructor can be used to keep track of information.
   */
  constructor() {}
  /**
   * A plugin's render function is called once.
   * Here, you can insert custom html into a game modal.
   * You render any sort of UI that makes sense for the plugin!
   */
  async render(div) {
    div.style.width = "400px";
    const firstTextDiv = document.createElement("div");
    firstTextDiv.innerText = "Add the url that points to your snarker below.";
    const input = document.createElement("input");
    input.style.width = "100%";
    input.placeholder = "https://snarker.orden.gg";
    const button = document.createElement("button");
    button.innerHTML = "Start Remote Snarker";
    button.onclick = () => {
      patchSnarkProverQueue(input.value);
    };
    div.appendChild(firstTextDiv);
    div.appendChild(document.createElement("br"));
    div.appendChild(input);
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));
    div.appendChild(button);
  }
  /**
   * When this is unloaded, the game calls the destroy method.
   * So you can clean up everything nicely!
   */
  destroy() {
    replaceOldProverQueue();
  }
}
/**
 * For the game to know about your plugin, you must export it!
 *
 * Use `export default` to expose your plugin Class.
 */
export default Snarker;
