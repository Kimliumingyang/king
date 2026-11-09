import Phaser from 'phaser';
import king from './assets/king.svg?url&no-inline';import crown from './assets/crown.svg?url&no-inline';import ufo from './assets/ufo.svg?url&no-inline';import soldier from './assets/soldier.svg?url&no-inline';import throne from './assets/throne.svg?url&no-inline';import mushroom from './assets/mushroom.svg?url&no-inline';
import {frameAsset} from './asset-loader';import tuning from '../data/stage5_tuning.json';import type {Simulation} from './physics';
export const art={king,crown,ufo,soldier,throne,mushroom};
export class RoyalArt {
 sprites:Record<string,Phaser.GameObjects.Image>={};fx:Phaser.GameObjects.Graphics;bubble:Phaser.GameObjects.Text;
 crown={phase:'worn',x:0,y:0,vx:0,vy:0,angle:0,warning:0,age:0,hit:false};clock=0;lastSim:Simulation|null=null;pose='idle';
 constructor(public scene:Phaser.Scene){for(const key of ['king','crown','ufo','left','right','throne'])this.sprites[key]=scene.add.image(0,0,key==='left'||key==='right'?'soldier':key).setDepth(key==='throne'?1:10);this.fx=scene.add.graphics().setDepth(14);this.bubble=scene.add.text(0,0,'',{fontFamily:'Trebuchet MS',fontSize:'17px',fontStyle:'bold',color:'#37333f',backgroundColor:'#f1dfc6',padding:{x:10,y:6}}).setOrigin(.5).setDepth(16);}
 draw(k:{x:number,y:number},sim:Simulation,finish:number,ground:(x:number)=>number,dt:number,boost:boolean,cue:(id:string)=>void){
  this.clock+=dt;const ka=sim.king.angle,u=sim.ufo.position,ua=sim.ufo.angle,eject=sim.state==='KING_EJECTED'?sim.ejectedMs:0,restoring=sim.state==='REVIVE_ANIMATION';
  if(sim!==this.lastSim||restoring){this.crown.phase='worn';this.crown.warning=0;this.crown.age=0;this.crown.hit=false;this.lastSim=sim;}
  const event=sim.events.active,pending=sim.events.pending;
  this.pose=restoring?'rescue':sim.state==='CLEAR'?'victory':eject?'airborne':event?.id??(sim.risk>.8?'slide':sim.risk>.5?'warn':'idle');
  const eventClock=event?tuning.eventActiveMs-sim.events.data.activeLeft:this.clock;
  frameAsset(this.sprites.king,'king_'+this.pose,'king',eventClock);
  this.sprites.king.setPosition(k.x,k.y-3).setDisplaySize(139,147).setRotation(ka);
  const rotate=(x:number,y:number)=>({x:u.x+x*Math.cos(ua)-y*Math.sin(ua),y:u.y+x*Math.sin(ua)+y*Math.cos(ua)});
  frameAsset(this.sprites.ufo,boost?'ufo_boost':'ufo_idle','ufo',this.clock);
  this.sprites.ufo.setPosition(u.x,u.y+11).setDisplaySize(224,62).setRotation(ua).setDepth(12);
  for(const [key,x] of [['left',-78],['right',78]] as const){const p=rotate(x,-38),pose=sim.state==='CLEAR'?'cheer':sim.risk>.5||!!pending||!!event?'panic':'idle';frameAsset(this.sprites[key],'guard_'+key+'_'+pose,'soldier',this.clock);this.sprites[key].setPosition(p.x,p.y).setDisplaySize(47,69).setRotation(ua+(pose==='panic'?Math.sin(this.clock/80+x)*.04:0)).setDepth(key==='left'?9:11);}
  const cy=-70,cx=-6,c=this.sprites.crown,head={x:k.x+cx*Math.cos(ka)-cy*Math.sin(ka),y:k.y+cx*Math.sin(ka)+cy*Math.cos(ka)};
  const warning=event?.id==='hiccup'||Math.abs(ua)*180/Math.PI>tuning.crownWarningDeg||sim.risk>.5;
  const danger=Math.abs(ua)*180/Math.PI>tuning.crownDropDeg||Math.abs(ka)*180/Math.PI>tuning.crownDropKingDeg||sim.risk>tuning.crownDropRisk;
  if(this.crown.phase==='worn'){
   this.crown.warning=danger?this.crown.warning+dt:0;
   if((this.crown.warning>=tuning.crownWarningMs||eject>0)&&!restoring){Object.assign(this.crown,{phase:'falling',x:head.x,y:head.y,vx:sim.king.velocity.x*60+(ka<0?-55:55),vy:-110,angle:ka,age:0,hit:false});cue('sfx_crown_drop');}
   c.setVisible(true).setPosition(head.x+(warning?Math.sin(this.clock/65)*3:0),head.y).setRotation(ka+(warning?Math.sin(this.clock/110)*.13:0));
  }
  if(this.crown.phase==='falling'){
   const cr=this.crown,t=dt/1000;cr.age+=dt;cr.x+=cr.vx*t;cr.vy+=360*t;cr.y+=cr.vy*t;cr.angle+=t*3;
   const floor=sim.surfaceAt(cr.x);if(floor!==null&&cr.y>=floor-12&&cr.vy>0){cr.y=floor-12;cr.vy=-cr.vy*.3;cr.vx*=.6;if(!cr.hit){cue('sfx_crown_hit');cr.hit=true;}}
   c.setPosition(cr.x,cr.y).setRotation(cr.angle).setVisible(cr.age<tuning.crownGroundLifetimeMs&&cr.y<850);
  }
  frameAsset(c,this.crown.phase==='falling'?'crown_fall':warning?'crown_loose':'crown_idle','crown',this.clock);c.setDisplaySize(57,41);
  frameAsset(this.sprites.throne,'throne_idle','throne',this.clock);this.sprites.throne.setPosition(finish+25,ground(finish)-89).setDisplaySize(145,177);
  const g=this.fx;g.clear();g.fillStyle(0xb9edef,boost?.55:.22);for(const x of [-53,0,53]){const p=rotate(x,37);g.fillEllipse(p.x,p.y+(boost?13:4),boost?28:20,(boost?42:17)+Math.sin(this.clock/90+x)*3);}
  if(sim.risk>.5||pending||event){g.fillStyle(0xb5d6d5);for(const x of [-84,88]){const p=rotate(x,-60);g.fillEllipse(p.x+8,p.y+Math.sin(this.clock/120)*5,4,8);}}
  // Facial pieces blink independently; the torso transform still uses only King physics.
  if(event?.id==='nap'||this.clock%4200<120){g.lineStyle(3,0x37333f);for(const x of [-6,14]){const y=-33,px=k.x+x*Math.cos(ka)-y*Math.sin(ka),py=k.y+x*Math.sin(ka)+y*Math.cos(ka);g.lineBetween(px-6,py,px+7,py-2);}}
  if(event){
   const local=(x:number,y:number)=>({x:k.x+x*Math.cos(ka)-y*Math.sin(ka),y:k.y+x*Math.sin(ka)+y*Math.cos(ka)});
   if(event.id==='nap'){const p=local(30,-70);g.lineStyle(3,0x37333f);for(let i=0;i<3;i++){const x=p.x+i*12,y=p.y-i*15-Math.sin(this.clock/400)*3;g.lineBetween(x,y,x+8,y);g.lineBetween(x+8,y,x,y+8);g.lineBetween(x,y+8,x+8,y+8);}}
   if(event.id==='toast'){g.fillStyle(0x86495c);const p=local(50,-10);for(let i=0;i<5;i++){const phase=(eventClock/900+i*.14)%1;g.fillEllipse(p.x+phase*25,p.y+phase*70,4,7);}}
   if(event.id==='sneeze'){const p=local(50,-50),phase=Math.min(1,eventClock/1300);g.fillStyle(0xf1dfc6);g.lineStyle(1,0x706b7c);g.fillRect(p.x+phase*100,p.y-phase*40,15,12);g.strokeRect(p.x+phase*100,p.y-phase*40,15,12);}
   if(event.id==='scepter'){const p=local(-50,-15);g.lineStyle(5,0xd9b563);const a=-Math.PI/2+Math.sin(eventClock/150)*.45;g.lineBetween(p.x,p.y,p.x+Math.cos(a)*55,p.y+Math.sin(a)*55);g.fillStyle(0x86495c);g.fillCircle(p.x+Math.cos(a)*55,p.y+Math.sin(a)*55,7);}
   if(event.id==='hiccup'){const p=local(39,-33);g.lineStyle(2,0xe6cfb2,.7);g.strokeCircle(p.x+eventClock/75,p.y-eventClock/100,4+eventClock/500);}
   if(event.id==='hurry'){const p=local(45,-25);g.fillStyle(0x37333f);g.fillEllipse(p.x,p.y,7,6+Math.sin(eventClock/60)*2);}
  }
  this.bubble.setPosition(k.x,k.y-118).setText(pending?'!':event?.caption??(this.crown.phase==='falling'&&this.crown.age<1200?'MIND THE CROWN!':''));this.bubble.setVisible(!!this.bubble.text);
 }
}
export function eventLabel(id:string){return ({hiccup:'HIC... EASY!',sneeze:'AH... AH...',nap:'GETTING SLEEPY...',toast:'RAISING THE GOBLET...',scepter:'SCEPTER COMING UP!',hurry:'HIS MAJESTY HAS NOTES...'} as Record<string,string>)[id]??id;}
