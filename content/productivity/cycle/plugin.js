const abortC = new AbortController() // for removing eventlistener from window
let cycleKey = "F9" // key you press to go to next planet
let levelFilter =1 // minimum level of planets to cycle around
let planets        // the planets you will cycle
let planetsIter    // the iterator of the planets

/**
 * filter which planets to cycle through
 */
function planetFilter() {
  planets = df.getMyPlanets().filter((e)=> {return e.planetLevel >= levelFilter})
  planetsIter = planets.values()
}

class Plugin {
  constructor() {}

  /**
   * Called when plugin is launched with the "run" button.
   */
  async render(container) {
    planetFilter()
    window.addEventListener("keyup",(e)=>{ // handles the pressing of the cycle key
      if (e.key === cycleKey){
        let next = planetsIter.next().value
        if(next === undefined){
          planetsIter = planets.values()
        }
        ui.setSelectedPlanet(next)
        ui.centerPlanet(next)
      }
    }, {signal: abortC.signal}) 

    const lvlLabel=document.createElement("label") // label for level selection menu
    lvlLabel.innerText="level >="
    const levelMenu = document.createElement("select") // level selection menu
    for(let i =0; i<10; i++){
        const e = document.createElement("option")
        e.innerText=i
        levelMenu.appendChild(e)
    }
    levelMenu.value=1
    levelMenu.addEventListener("input",(e)=>{ // handles the change of level in menu
      levelFilter=e.target.value
      planetFilter()
    })
    lvlLabel.appendChild(levelMenu)

    const ksLabel = document.createElement("label") // label for keybind selection
    ksLabel.innerText = "key to cycle"
    const keySelector = document.createElement("input") // text field where you type which key to bind cycling to
    keySelector.type="text"
    keySelector.value="F9"
    keySelector.addEventListener("change",(e)=>{cycleKey=e.target.value})
    ksLabel.appendChild(keySelector)
  
    container.appendChild(ksLabel)
    container.appendChild(lvlLabel)
    this.container = container
  }

  /**
   * Called when plugin modal is closed.
   */
  destroy(){
    abortC.abort() // remove event listener from window
    while(this.container.firstChild){ // remove plugin
      this.container.removeChild(this.container.firstChild)
    }
  }
}

export default Plugin;
