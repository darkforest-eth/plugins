// top 10 pulled from ingame data - @0x_Bear
console.log(df, ui);

class Plugin {
  constructor() {}

  /**
   * Called when plugin is launched with the "run" button.
   */
  async render(container) {
    container.style.width = "280px";
    let label = document.createElement('div');
        
table=[];
players=df.getAllPlayers().sort((p1,p2)=>{if (p1.withdrawnSilver + p1.totalArtifactPoints > p2.withdrawnSilver + p2.totalArtifactPoints) { return -1; } else { return 1 }})
.slice(0,10)
.forEach(function(item,index,array){
  if (item.twitter == undefined) { name = item.address.substr(0,5); } else { name = item.twitter }
  newRow = [name,Math.round(item.withdrawnSilver/1000),Math.round(item.totalArtifactPoints/1000),Math.round((item.withdrawnSilver+item.totalArtifactPoints)/1000)]
  table.push(newRow);
});
var text = "<style>tr td { border-bottom: 1px solid black; }</style><table cellpadding=3><tr><th></th><th colspan=3 align=center><b>score</th></tr><tr><td><b>name</td><td><b>silver</td><td><b>artifact</td><td><b>total</td></tr><tr><td>"+table.map(function(d){
    return JSON.stringify(Object.values(d).join("</td><td>"));
})
.join('</tr><tr><td>') 
.replace(/(^\[)|(\]$)|(\")/mg, '')+"</td></tr></table>";
console.log("updated top10");

    label.innerHTML = text;
    container.appendChild(label);
  }

  /**
   * Called when plugin modal is closed.
   */
  destroy() {}
}

/**
 * And don't forget to export it!
 */
export default Plugin;