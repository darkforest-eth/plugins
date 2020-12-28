async function importChunks(chunks) {
  for (let chunk of chunks) {
    df.persistentChunkStore.updateChunk(chunk, false);

    for (const planetLocation of chunk.planetLocations) {
      df.entityStore.addPlanetLocation(planetLocation);
    }
  }

  for (let chunk of chunks) {
    for (const planetLocation of chunk.planetLocations) {
      if (df.entityStore.isPlanetInContract(planetLocation.hash)) {
        let planet = df.getPlanetWithId(planetLocation.hash);
        console.log(planet);
        if (planet && planet.syncedWithContract) {
          // skip things we know about
          continue;
        }

        // Await this so we don't crash the game
        await df.hardRefreshPlanet(planetLocation.hash);
      }
    }
  }
}

class Plugin {
  constructor() {
    this.status = document.createElement('div');
    this.status.style.marginTop = '10px';
    this.status.style.textAlign = 'center';
  }
  onImport = async () => {
    let input;
    try {
      input = await window.navigator.clipboard.readText();
    } catch (err) {
      console.error(err);
      this.status.innerText = 'Unable to import map. Did you allow clipboard access?';
      this.status.style.color = 'red';
      return;
    }

    let chunks;
    try {
      chunks = JSON.parse(input);
    } catch (err) {
      console.error(err);
      this.status.innerText = 'Invalid map data. Check the data in your clipboard.';
      this.status.style.color = 'red';
      return;
    }

    this.status.innerText = 'Importing, this will take awhile...';
    this.status.style.color = 'white';
    try {
      await importChunks(chunks)
      this.status.innerText = 'Successfully imported map!';
    } catch (err) {
      console.log(err);
      this.status.innerText = 'Encountered an unexpected error.';
      this.status.style.color = 'red';
    }
  }

  onExport = async () => {
    let chunks = ui.getExploredChunks();
    let chunksAsArray = Array.from(chunks);
    try {
      let map = JSON.stringify(chunksAsArray);
      await window.navigator.clipboard.writeText(map);
      this.status.innerText = 'Map copied to clipboard!';
      this.status.style.color = 'white'
    } catch (err) {
      console.error(err);
      this.status.innerText = 'Failed to export map.';
      this.status.style.color = 'red';
    }
  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.minHeight = 'unset';

    container.style.width = '200px';

    let wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'space-between';

    let exportButton = document.createElement('button');
    exportButton.innerText = "Export Map";
    exportButton.onclick = this.onExport;

    let importButton = document.createElement('button');
    importButton.innerText = "Import Map";
    importButton.onclick = this.onImport;

    wrapper.appendChild(exportButton);
    wrapper.appendChild(importButton);

    container.appendChild(wrapper);
    container.appendChild(this.status);
  }
}

plugin.register(new Plugin());
