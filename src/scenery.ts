import Phaser from 'phaser';
import ff from './assets/foothills-far.svg?url&no-inline';import fm from './assets/foothills-mid.svg?url&no-inline';import fg from './assets/foothills-foreground.svg?url&no-inline';
import wf from './assets/wastes-far.svg?url&no-inline';import wm from './assets/wastes-mid.svg?url&no-inline';import wg from './assets/wastes-foreground.svg?url&no-inline';
import cf from './assets/citadel-far.svg?url&no-inline';import cm from './assets/citadel-mid.svg?url&no-inline';import cg from './assets/citadel-foreground.svg?url&no-inline';
const urls:Record<string,string>={foothills_far:ff,foothills_mid:fm,foothills_foreground:fg,wastes_far:wf,wastes_mid:wm,wastes_foreground:wg,citadel_far:cf,citadel_mid:cm,citadel_foreground:cg};
export function preloadScenery(scene:Phaser.Scene){for(const [id,url] of Object.entries(urls))scene.load.svg(id,url);}
export class Scenery {
 layers:Phaser.GameObjects.TileSprite[]=[];
 constructor(public scene:Phaser.Scene){for(let i=0;i<3;i++)this.layers.push(scene.add.tileSprite(640,360,1280,720,'foothills_far').setScrollFactor(0).setDepth(i===2?15:-5+i).setAlpha(i===1?.45:1));}
 draw(world:string,camera:number){const name=world==='wobbly_wastes'?'wastes':world==='moonlit_citadel'?'citadel':'foothills';for(let i=0;i<3;i++){const layer=['far','mid','foreground'][i],replacement='bg_'+name+'_'+layer,fallback=name+'_'+layer,tex=this.scene.textures.exists(replacement)?replacement:fallback;if((this.layers[i] as any).displayTexture?.key!==tex){this.layers[i].setTexture(tex);this.layers[i].setTileScale(tex===replacement?.5:1);}this.layers[i].tilePositionX=camera*[.12,.35,.7][i];}}
}
