//This plugin lets you cycle around your planets that are above a certain level when you press a key.

/**
 * filter which planets to cycle through
 */
function planetFilter(t) {
  t.planets = df.getMyPlanets().filter((e)=> {return e.planetLevel >= t.levelFilter})
  t.planetsIter = t.planets.values()
}

class Plugin {
  constructor() {
    this.abortC = new AbortController() // for removing eventlistener from window
    this.cycleKey = "F9" // key you press to go to next planet
    this.levelFilter =1 // minimum level of planets to cycle around
    this.planets = null    // the planets you will cycle
    this.planetsIter = null   // the iterator of the planets
  }

  /**
   * Called when plugin is launched with the "run" button.
   */
  async render(container) {
    planetFilter(this)
    window.addEventListener("keyup",(e)=>{ // handles the pressing of the cycle key
      if (e.key === this.cycleKey){
        let next = this.planetsIter.next().value
        if(next === undefined){
          this.planetsIter = this.planets.values()
        }
        ui.setSelectedPlanet(next)
        ui.centerPlanet(next)
      }
    }, {signal: this.abortC.signal}) 

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
      this.levelFilter=e.target.value
      planetFilter(this)
    })
    lvlLabel.appendChild(levelMenu)

    const ksLabel = document.createElement("label") // label for keybind selection
    ksLabel.innerText = "key to cycle"
    const keySelector = document.createElement("input") // text field where you type which key to bind cycling to
    keySelector.type="text"
    keySelector.value="F9"
    keySelector.addEventListener("change",(e)=>{this.cycleKey=e.target.value})
    ksLabel.appendChild(keySelector)
  
    container.appendChild(ksLabel)
    container.appendChild(lvlLabel)
    this.container = container
  }

  /**
   * Called when plugin modal is closed.
   */
  destroy(){
    this.abortC.abort() // remove event listener from window
    while(this.container.firstChild){ // remove plugin
      this.container.removeChild(this.container.firstChild)
    }
  }
}

export default Plugin;
