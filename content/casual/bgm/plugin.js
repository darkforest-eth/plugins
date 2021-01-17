// # BGM
// The BGM plugin allows you to add background music to your Dark Forest
// experience! Via https://github.com/ichub

class Plugin {
  async render(container) {
    container.style.width = '200px';
    container.style.height = '150px';
    container.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/xZPQbeAnQ0E" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  destroy() { }
}

plugin.register(new Plugin());
