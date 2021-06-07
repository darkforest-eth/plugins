let oneMinute = 60;
let oneHour = 60 * oneMinute;

class Plugin {
  constructor() {
    this.estimatedTime = document.createElement('div');
    this.estimatedTime.innerText = '?????';
    this.estimatedTime.style.textAlign = 'center';
  }

  calcVoyageTime = () => {
    let fromPlanet = ui.getMouseDownPlanet();
    if (fromPlanet) {
      let toPlanet = ui.getHoveringOverPlanet();

      if (toPlanet && fromPlanet !== toPlanet) {
        // In seconds
        let time = Math.ceil(
          df.getTimeForMove(fromPlanet.locationId, toPlanet.locationId)
        );
        let hours = Math.floor(time / oneHour);
        let minutes = Math.floor(time % oneHour / 60);
        let seconds = Math.ceil(time % oneHour % oneMinute);
        if (hours >= 1) {
          this.estimatedTime.innerText = `${hours} hrs, ${minutes} mins, ${seconds} secs`;
        } else if (minutes >= 1) {
          this.estimatedTime.innerText = `${minutes} mins, ${seconds} secs`;
        } else {
          this.estimatedTime.innerText = `${seconds} secs`;
        }
      } else {
        this.estimatedTime.innerText = '?????';
      }
    } else {
      this.estimatedTime.innerText = '?????';
    }
  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.width = '200px';
    container.style.minHeight = 'unset';
    window.addEventListener('mousemove', this.calcVoyageTime);

    let label = document.createElement('div');
    label.innerText = 'Estimated time:'
    label.style.textAlign = 'center';

    container.appendChild(label);
    container.appendChild(this.estimatedTime);
  }

  destroy() {
    window.removeEventListener('mousemove', this.calcVoyageTime);
  }
}

export default Plugin;
