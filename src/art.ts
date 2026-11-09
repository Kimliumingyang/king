import Phaser from 'phaser';
import king from './assets/king.svg?url&no-inline';
import crown from './assets/crown.svg?url&no-inline';
import ufo from './assets/ufo.svg?url&no-inline';
import soldier from './assets/soldier.svg?url&no-inline';
import throne from './assets/throne.svg?url&no-inline';
import mushroom from './assets/mushroom.svg?url&no-inline';
export const art={king,crown,ufo,soldier,throne,mushroom};
export class RoyalArt {
 sprites:Record<string,Phaser.GameObjects.Image>={};
 constructor(public scene:Phaser.Scene){for(const key of ['king','crown','ufo','left','right','throne'])this.sprites[key]=scene.add.image(0,0,key==='left'||key==='right'?'soldier':key).setDepth(key==='throne'?1:10);}
 draw(k:{x:number,y:number},ka:number,u:{x:number,y:number},ua:number,finish:number,ground:number,eject:number){
  this.sprites.king.setPosition(k.x,k.y-3).setDisplaySize(139,147).setRotation(ka);
  const rotate=(x:number,y:number)=>({x:u.x+x*Math.cos(ua)-y*Math.sin(ua),y:u.y+x*Math.sin(ua)+y*Math.cos(ua)});
  this.sprites.ufo.setPosition(u.x,u.y+11).setDisplaySize(224,62).setRotation(ua).setDepth(12);
  for(const [key,x] of [['left',-78],['right',78]] as const){const p=rotate(x,-38);this.sprites[key].setPosition(p.x,p.y).setDisplaySize(47,69).setRotation(ua).setDepth(key==='left'?9:11);}
  const cy=-70, cx=-6, c=this.sprites.crown;c.setPosition(k.x+cx*Math.cos(ka)-cy*Math.sin(ka)+eject*.12,k.y+cx*Math.sin(ka)+cy*Math.cos(ka)-Math.sin(Math.min(1,eject/1200)*Math.PI)*90).setDisplaySize(57,41).setRotation(ka+eject*.001);
  this.sprites.throne.setPosition(finish+25,ground-89).setDisplaySize(145,177);
 }
}
