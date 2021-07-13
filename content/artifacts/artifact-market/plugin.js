import { BigNumber, utils } from 'https://cdn.skypack.dev/ethers';

const DF_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/darkforest-eth/dark-forest-v06-round-2';
const MARKET_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/zk-farts/dfartifactmarket';

const SALES_CONTRACT_ADDRESS = "0x3Fb840EbD1fFdD592228f7d23e9CA8D55F72F2F8";
const SALES_CONTRACT_ABI = await fetch('https://gist.githubusercontent.com/zk-FARTs/5761e33760932affcbc3b13dd28f6925/raw/afd3c6d8eba7c27148afc9092bfe411d061d58a3/MARKET_ABI.json').then(res=>res.json());
const SALES = await df.loadContract(SALES_CONTRACT_ADDRESS,SALES_CONTRACT_ABI);

const TOKENS_CONTRACT_ADDRESS = "0xafb1A0C81c848Ad530766aD4BE2fdddC833e1e96"; // when a new round starts someone has to change this
const TOKENS_APPROVAL_ABI = await fetch('https://gist.githubusercontent.com/zk-FARTs/d5d9f3fc450476b40fd12832298bb54c/raw/1cac7c4638ee5d766615afe4362e6ce80ed68067/APPROVAL_ABI.json').then(res=>res.json());
const TOKENS = await df.loadContract(TOKENS_CONTRACT_ADDRESS,TOKENS_APPROVAL_ABI);  
const FEE = await SALES.fee() 
/*
  createElement function: this lets me make elements more easily
    @params params: Object containing at most 5 entries
        params.type: The kind of element to create (string)
        params.attributes: a 2d array containing all the attributes. key = attribute, value = value
        params.text: The text of the element
        params.eventListeners: The event listeners (onclick, onchange,)
        parms.css: a 2d array containing the style parts as key and the value to assign as value
*/
function createElement(params){
  const element = document.createElement(params.type)
  element.textContent = params.text
  if ( params.attributes !== undefined){
    for (const [key,value] of params.attributes){
      element.setAttribute(key, value)
    }
  }    
  if (params.eventListeners !== undefined){
    for (const [key,value] of params.eventListeners){
      element.addEventListener(key,value)
    }
  }
  if (params.css !== undefined){
    for (const e of params.css){
      element.style[e[0]] = e[1]
    }
  }
  return element
}



// fetch subgraph data for token stats and prices
async function subgraphData(){

  // gets from shop subgraph
  const storeSubgraphData = await fetch(MARKET_GRAPH_URL,{
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        query: 
        ` 
        query getlistings{
            othertokens: listedTokens( where:{owner_not: "${df.account}"}){
                tokenID
                price
            }
            mytokens: listedTokens( where:{owner: "${df.account}"}){
                tokenID
            }
        }
        `
    })
  })


  // gets from df subgraph
  const dfSubgraphData  = await fetch(DF_GRAPH_URL,{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 
    ` 
      query getartifacts{
        myartifacts: artifacts(where:{owner:"${df.account}"}){
          idDec
          id
          rarity
          artifactType
          energyCapMultiplier
          energyGrowthMultiplier
          rangeMultiplier
          speedMultiplier
          defenseMultiplier
        }
        
        shopartifacts: artifacts(where:{owner:"${SALES_CONTRACT_ADDRESS.toLowerCase()}"}){
          idDec
          id
          rarity
          artifactType
          energyCapMultiplier
          energyGrowthMultiplier
          rangeMultiplier
          speedMultiplier
          defenseMultiplier
        }
      }
    `
      })
  })

  const dfDatajson = await dfSubgraphData.json()
  const dfData = dfDatajson.data
  const storeDatajson  = await storeSubgraphData.json()
  const storeData = storeDatajson.data
  const myListedTokenArray = storeData.mytokens.map(e=>e.tokenID)
  
  dfData.mylistedartifacts = dfData.shopartifacts.filter((token)=>{
      return myListedTokenArray.includes(token.idDec)
  })
  dfData.shopartifacts = dfData.shopartifacts.filter((token)=>{return !(myListedTokenArray.includes(token.idDec))})
  
  // I need to make sure they are sorted the same way or else this won't work
  for (let i; i<storeData.othertokens; i++){
      dfData.shopartifacts[i].price = storeData.othertokens[i].price
  }
  
  
  return dfData
}


// function for properly formatting the artifacts stats
function formatMultiplier(mul){
    if (mul ===100){
      return `+0%`
    }        
    else if (mul >100){
      return `+${mul-100}%`            
    }
      return  `-${100 -mul}%`
  }



function myListedRow(artifact){
    
    const onClick = (event)=>{
      SALES.unlist(BigNumber.from(artifact.idDec)).then(()=>{
        event.target.parentNode.parentNode.parentNode.parentNode.removeChild(event.target.parentNode.parentNode.parentNode)  // delete the row
        alert("unlisted!")
      }).catch(e=>console.log(e))
    }

    const row = document.createElement('tr')
    row.appendChild(createElement({type:"td", text:`${artifact.rarity} ${artifact.artifactType}` }))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.energyCapMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.energyGrowthMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.rangeMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.speedMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.defenseMultiplier)}))
    row.appendChild(createElement({type:"td"})).appendChild(
      createElement({type:"button",text:"Unlist", eventListeners:[["click",onClick]] })
    )    
   return row
}


// Creates one row in the table of the users withdrawn artifacts
function myRow(artifact){
    
    let value;
    const onClick =(event)=>{
      SALES.list(BigNumber.from(artifact.idDec),utils.parseEther(value.toString())).then(()=>{
        event.target.parentNode.parentNode.parentNode.parentNode.removeChild(event.target.parentNode.parentNode.parentNode)  // delete the row
        alert("listed!")
      }).catch(e=>console.log(e))
    }
    
    const onChange = (event)=>{
       value = event.target.value
    }

    const row = document.createElement("tr")
    row.appendChild(createElement({type:"td", text:`${artifact.rarity} ${artifact.artifactType}` }))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.energyCapMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.energyGrowthMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.rangeMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.speedMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.defenseMultiplier)}))
    row.appendChild(createElement({type:"td" })).appendChild(document.createElement("div")).appendChild(
      createElement({type:"input", eventListeners:[["change",onChange]], attributes:[["type","number"],["min",0],["step",0.01],["size",4]]})
      ).parentNode.appendChild(
      createElement({type:"button", eventListeners:[["click",onClick]], text:"List"}))
    
  return row
}


// Creates one row in the table of the stores listed artifacts
function saleRow(artifact){ 
    
    const onClick = (event)=>{  
      SALES.buy(BigNumber.from(artifact.idDec),{value: BigNumber.from(artifact.price).add(FEE)}).then(()=>{
        event.target.parentNode.parentNode.parentNode.removeChild(event.target.parentNode.parentNode) // delete the row
        alert("bought!")
      }).catch(e=>console.log(e))
    }
    const row = document.createElement('tr')
    row.appendChild(createElement({type:"td", text:`${artifact.rarity} ${artifact.artifactType}` }))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.energyCapMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.energyGrowthMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.rangeMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.speedMultiplier)}))
    row.appendChild(createElement({type:"td", text:formatMultiplier(artifact.defenseMultiplier)}))
    row.appendChild(createElement({type:"td"})).appendChild(
      createElement({type:"div", text:`price: ${utils.formatEther(artifact.price)} XDAI + ${utils.formatEther(FEE)} fee`, css:[["fontSize","70%"]]})
    ).parentNode.appendChild(
      createElement({type:"button",text:"Buy", eventListeners:[["click",onClick]] })
    )

    return row
}


// Creates the table of the users withdrawn artifacts
function myTable(data){

    const table= document.createElement('table')
    table.appendChild(
      createElement({type:"caption",text:"My Artifacts"}))
    table.appendChild(
      document.createElement('thead')).appendChild(
        document.createElement('tr')).appendChild(
          createElement({type:"th", text:"Artifact"})).parentNode.appendChild(
          createElement({type:"th", text:"Cap"})).parentNode.appendChild(
          createElement({type:"th", text:"Growth"})).parentNode.appendChild(
          createElement({type:"th", text:"Range"})).parentNode.appendChild(
          createElement({type:"th", text:"Speed"})).parentNode.appendChild(
          createElement({type:"th", text:"Defense"})).parentNode.appendChild(
          createElement({type:"th", text:"List"}))
    
    
    if (data !== null){    
      const footer = table.appendChild(document.createElement('tfoot'))
      footer.appendChild(document.createElement("tr")).appendChild(
        createElement({type:"th", text:"My listings", attributes:[["colspan",7]]}))

      const body = table.appendChild(document.createElement('tbody'))
      for (let artifact of data.myartifacts){
         body.appendChild(myRow(artifact)) 
      }
      for (let artifact of data.mylistedartifacts){
         footer.appendChild(myListedRow(artifact))
      }
      
    }
    return table
}


// Creates the table of the stores listed artifacts
function saleTable(data){
  
  const table= document.createElement('table')
  table.appendChild(
      createElement({type:"caption",text:"Store Artifacts"}))
  table.appendChild(
      document.createElement('thead')).appendChild(
        document.createElement('tr')).appendChild(
          createElement({type:"th", text:"Artifact"})).parentNode.appendChild(
          createElement({type:"th", text:"Cap"})).parentNode.appendChild(
          createElement({type:"th", text:"Growth"})).parentNode.appendChild(
          createElement({type:"th", text:"Range"})).parentNode.appendChild(
          createElement({type:"th", text:"Speed"})).parentNode.appendChild(
          createElement({type:"th", text:"Defense"})).parentNode.appendChild(
          createElement({type:"th", text:"Buy"}))
  if (data !== null){
    const body = table.appendChild(document.createElement('tbody'))
    for (let artifact of data.shopartifacts){
      body.appendChild(saleRow(artifact)) 
    } 
  }
  return table
}

// special buttons for approving the contract and refreshing refreshing it goes here too

async function specialButtons(container, plugin){
  
  const approve = ()=> {
    TOKENS.setApprovalForAll(SALES_CONTRACT_ADDRESS,true).catch(e=>console.log(e)) // this will approve the market for all tokens
  }
  const refresh = async ()=> {
    plugin.destroy()
    await plugin.render(container)
    
  }
  const div = document.createElement('div')
  div.appendChild(createElement({type:"button", text:"approve", eventListeners:[["click",approve]]}))
  div.appendChild(createElement({type:"button", text:"refresh", eventListeners:[["click",refresh]]}))  
  return div
}

function styleSheet(){
    const style = document.createElement('style')
    style.innerHTML=`
        table { table-layout: fixed; width: 100% } 
        input { border: 1px solid white; background-color: #080808}
        th, td { text-align:center }
        `
    return style
}


class Plugin {
  constructor() {
    this.container=null;
  }

  async render(container) {
    const data=await subgraphData()
    console.log(data)
    this.container=container;
    this.container.style.width="500px"
    this.container.appendChild(await specialButtons(container,this))
    this.container.appendChild(styleSheet())
    this.container.appendChild(myTable(data))
    this.container.appendChild(saleTable(data))

  }

  destroy() {    
    while (this.container.firstChild){
        this.container.removeChild(this.container.firstChild)
    }
  }
}


export default Plugin;
