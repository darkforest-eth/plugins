// 
//  author: https://twitter.com/DfArchon
// 
//  Peace Dove
//  Make peace doves fly on all your planets ! 
//
// 
//


import { PlanetLevel } from
        "https://cdn.skypack.dev/@darkforest_eth/types";

import { html, render, useState } from
        "https://unpkg.com/htm/preact/standalone.module.js";


function peaceDove() {
    const beginInfo = html`<div >${'just click [Peace Dove]'}</div>`;
    const waitInfo = html`<div style=${{color: '#CCFF99' }}>${'waiting ...'}</div>`;
    const doveInfo = html`<div style=${{color:'pink'}}> All Peace Dove Fly 🕊️</div>`;
    const clearInfo = html`<div style=${{color: '#99FFFF' }}>${'Clear All Emoji xD'}</div>`;

    const [info,setInfo]=useState(beginInfo);

    function setPeaceDoveEmoji() {
        let planets = df.getMyPlanets();
        setInfo(waitInfo);
        console.log(planets.length);
        let transactions = [];
        planets.forEach(p=>{
            transactions.push(
                df.setPlanetEmoji(p.locationId,"🕊️").then(()=>{
                    console.log(p.locationId);
                })
            );
        });
        Promise.all(transactions).then(()=>{
            setInfo(doveInfo);
        })
    }

    function clearEmoji() {
        let planets = df.getMyPlanets();
        setInfo(waitInfo);
        console.log(planets.length);
        let transactions = [];
        planets.forEach(p=>{
            transactions.push(df.clearEmoji(p.locationId));
        });
        Promise.all(transactions).then(()=>{
                setInfo(clearInfo);
            }
        );
    }

    return html`<div style=${{textAlign:'center'}}>
        <div style=${{
        textAlign: 'center',
        justifyContent: "space-around",
        width: "100%",
            display:'flex',flexDirection:'row'}}>
        <div > 
            <button 
                style=${{width:'100px'}}
            onClick=${setPeaceDoveEmoji}>
                  Peace Dove
            </button>
         </div>
         <div style=${{marginLeft:'3px'}}> 
            <button 
                style=${{width:'100px'}}
            onClick=${clearEmoji}>
                  Clear Emoji
            </button>
        </div>
        </div>
        <div> ${info}</div>
    </div>`;
}

class Plugin {
    constructor() {
        this.container = null;
    }
    async render(container) {
        this.container = container;
        container.style.width = "230px";
        render(html`<${peaceDove} />`, container);
    }
    destroy() {
        render(null, this.container);
    }
}

export default Plugin;



