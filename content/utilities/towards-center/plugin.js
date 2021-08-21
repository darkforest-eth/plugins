// Towards Center
//
// when you choose one planet :), 
// you can make it towards center.
//

class TowardsCenter {
  constructor(){
    this.el=document.createElement('div');
    this.first = document.createElement('div');
    this.first.innerHTML = 
    'when you choose one planet :)'
    this.second=document.createElement('div');
    this.second.innerHTML='you can make it towards center'
    this.coords = document.createElement('div');
    this.coords.innerHTML=`(???,???)`;
    this.el.appendChild(this.first);
    this.el.appendChild(this.second);
    this.el.appendChild(this.coords);
    this.planet=null;

  }

 async render(div){
  div.style.width = '280px';
  div.style.height = '100px';
  div.appendChild(this.el);

 }

 draw(ctx){
  let p=ui.getMouseDownPlanet();
  if(p!=this.planet){
    this.planet=p;
    return;
  }
  const viewport = ui.getViewport();
  ctx.strokeStyle="pink"
  ctx.lineWidth=2

  if(p){
    const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
    const tx=viewport.worldToCanvasX(0);
    const ty=viewport.worldToCanvasY(0);
    this.coords.innerHTML=`(${p.location.coords.x},${p.location.coords.y})`
    const range=p.range*0.01*20;
    const trueRange = viewport.worldToCanvasDist(range);
    ctx.beginPath();
    ctx.moveTo(tx,ty);
    ctx.lineTo(x,y);
    ctx.arc(x,y,trueRange,0,2*Math.PI);
    ctx.stroke();
  }
 }
  destroy(){  
    delete this.el
    delete this.first
    delete this.second
  }
}

export default TowardsCenter;