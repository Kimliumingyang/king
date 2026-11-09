import Phaser from 'phaser';
import {Simulation,cfg,finish,ground,level,start} from './physics';
import {MockBridge} from './bridge';
import './style.css';
const debug=new URLSearchParams(location.search).has('debug');
const bridge=new MockBridge(); await bridge.init();
const root=document.getElementById('game')!;
root.innerHTML=`<header><div class="brand">Don't Drop<br><b>the King!</b><small>PHYSICS PROTOTYPE · STAGE 01</small></div><div class="level">LEVEL 01<small>His First Ride</small></div><div class="route"><span>◉</span><progress id="progress" max="500" value="0"></progress><span>♛</span></div><div id="distance">0 / 500m</div><button id="pause" aria-label="Pause">Ⅱ</button><button id="restart" aria-label="Restart level">↻</button></header><div id="canvas"></div><div id="caption">DELIVER THE KING.<br><b>NOT LAUNCH HIM.</b></div><div id="status">Hold D / → to move · Release early. Brake gently.</div><footer><div class="drive"><button data-key="left">A <span>←</span></button><button data-key="right"><span>→</span> D</button><small>HOLD TO MOVE / BRAKE</small></div><div class="energy"><small>HOVER ENERGY</small><progress id="energy" max="1" value="1"></progress><span>Independent king. Real inertia.</span></div><div class="boost"><button data-key="boost">SPACE <span>↑</span></button><small>HOVER BOOST</small></div></footer><div id="modal" hidden><div class="panel"><small>ROYAL FLIGHT TEST · LEVEL 01</small><h1 id="title"></h1><p id="message"></p><div id="actions"></div></div></div>${debug?'<aside id="debug"><b>LIVE PHYSICS LAB</b><pre id="readout"></pre><div id="sliders"></div></aside>':''}`;
let sim=new Simulation(),paused=false,acc=0;
const held={left:false,right:false,boost:false};
const el=(id:string)=>document.getElementById(id)!;
function clearInput(){held.left=held.right=held.boost=false;document.querySelectorAll('.pressed').forEach(x=>x.classList.remove('pressed'));}
function reset(){sim=new Simulation();paused=false;acc=0;clearInput();el('modal').hidden=true;bridge.gameplayStart();}
function modal(title:string,message:string,buttons:[string,()=>void][]){el('title').textContent=title;el('message').textContent=message;el('actions').replaceChildren();for(const [label,action] of buttons){const b=document.createElement('button');b.textContent=label;b.onclick=action;el('actions').append(b);}el('modal').hidden=false;}
function pause(){if(['FAILED','CLEAR'].includes(sim.state))return;paused=true;clearInput();bridge.gameplayStop();modal('A ROYAL BREATHER','Physics and time are paused.',[['RESUME',()=>{paused=false;acc=0;el('modal').hidden=true;bridge.gameplayStart();}],['RESTART LEVEL',confirmRestart]]);}
function confirmRestart(){paused=true;clearInput();modal('RESTART THIS RIDE?','Return to the start of the physics test.',[['RESTART',reset],['CANCEL',()=>{paused=false;el('modal').hidden=true;}] ]);}
el('pause').onclick=pause;el('restart').onclick=confirmRestart;
const mapping:Record<string,keyof typeof held>={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'boost',KeyW:'boost'};
window.addEventListener('keydown',e=>{if(mapping[e.code]){e.preventDefault();if(!paused)held[mapping[e.code]]=true;}if(!e.repeat){if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR')confirmRestart();}});
window.addEventListener('keyup',e=>{if(mapping[e.code])held[mapping[e.code]]=false;});
window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{const key=b.dataset.key as keyof typeof held;b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!paused){held[key]=true;b.classList.add('pressed');}};const release=()=>{held[key]=false;b.classList.remove('pressed');};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;});
if(debug){const fields:[string,any,string,number,number,number][]=[['King friction',cfg.physics.king,'friction',0,1,.01],['King mass',cfg.physics.king,'mass',1,6,.1],['Gravity',cfg.physics,'gravityY',.5,2,.05],['Hover spring',cfg.physics.ufo,'hoverSpring',.0001,.0015,.00005],['Drive force',cfg.physics.ufo,'horizontalForce',.0005,.026,.0005]];for(const [label,obj,key,min,max,step]of fields){const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.type='range';i.min=String(min);i.max=String(max);i.step=String(step);i.value=String(obj[key]);i.oninput=()=>{obj[key]=Number(i.value);sim.engine.gravity.y=cfg.physics.gravityY;sim.king.friction=cfg.physics.king.friction;((Phaser.Physics.Matter as any).Matter as any).Body.setMass(sim.king,cfg.physics.king.mass);};l.append(i);el('sliders').append(l);}}
class Game extends Phaser.Scene {
 g!:Phaser.GameObjects.Graphics; cameraX=-350;
 create(){this.g=this.add.graphics();}
 update(_t:number,delta:number){
  if(!paused){acc+=Math.min(delta,50);while(acc>=1000/60){sim.step(Number(held.right)-Number(held.left),held.boost);acc-=1000/60;}}
  const x=sim.ufo.position.x;this.cameraX=Phaser.Math.Clamp(x-440,start-210,finish-700);this.cameras.main.scrollX=this.cameraX;
  const g=this.g;g.clear();
  // Independent vector greybox shapes, no reference image texture.
  g.fillStyle(0x68778c,0.3);for(let i=-2;i<10;i++){const px=i*330+this.cameraX*.6;g.fillTriangle(px,570,px+100,320+(i%3)*35,px+240,570);}
  g.fillStyle(0x706b7c);g.beginPath();g.moveTo(start-220,800);for(let px=start-220;px<=finish+650;px+=10)g.lineTo(px,ground(px));g.lineTo(finish+650,800);g.closePath();g.fillPath();
  g.lineStyle(9,0xa9aa85);g.beginPath();g.moveTo(start-220,ground(start-220));for(let px=start-210;px<=finish+650;px+=10)g.lineTo(px,ground(px));g.strokePath();
  const cp=level.checkpointsMeters[0]*cfg.pixelsPerMeter;g.lineStyle(3,0xb5d6d5);g.lineBetween(cp,540,cp,480);g.fillStyle(0xb5d6d5);g.fillTriangle(cp,480,cp+28,489,cp,499);
  g.lineStyle(3,0xe3ccad);g.strokeRoundedRect(finish-level.dock.radiusPx,430,level.dock.radiusPx*2,108,12);g.fillStyle(0xb393a2);g.fillRoundedRect(finish-24,471,48,58,8);g.fillStyle(0xd4bb81);g.fillRect(finish-30,522,60,10);g.fillTriangle(finish-22,470,finish-30,448,finish-1,463);g.fillTriangle(finish,470,finish+6,445,finish+24,470);
  const drawBody=(b:any,color:number)=>{g.fillStyle(color);g.lineStyle(3,0x343440);g.fillPoints(b.vertices,true);g.strokePoints(b.vertices,true);};
  drawBody(sim.ufo,0xa49aa5);drawBody(sim.king,0xe6cfb2);
  // Geometric crown distinguishes the independent king body.
  const k=sim.king;const crownY=k.position.y-72;g.fillStyle(0xd9b563);g.fillTriangle(k.position.x-23,crownY+13,k.position.x-27,crownY-5,k.position.x-9,crownY+6);g.fillTriangle(k.position.x-13,crownY+13,k.position.x,crownY-12,k.position.x+13,crownY+13);g.fillTriangle(k.position.x+9,crownY+6,k.position.x+27,crownY-5,k.position.x+23,crownY+13);
  if(debug){g.lineStyle(1,0x7de1e5);for(const b of sim.terrain)g.strokePoints(b.vertices,true);for(const p of sim.probes){g.lineBetween(p.x,p.y,p.x,p.ground);g.strokeCircle(p.x,p.target,5);}for(const b of [sim.king,sim.ufo]){g.fillStyle(0xe17584);g.fillCircle(b.position.x,b.position.y,4);}for(const p of sim.contacts){g.fillStyle(0xffff00);g.fillCircle(p.x,p.y,5);}el('readout').textContent=`${sim.state} · ${this.game.loop.actualFps.toFixed(0)} fps\nrisk ${sim.risk.toFixed(2)} · contact ${sim.contacts.length}\nv ${(sim.ufo.velocity.x*60).toFixed(1)} px/s · angle ${(sim.ufo.angle*180/Math.PI).toFixed(1)}°\noff deck ${sim.offMs.toFixed(0)}ms\nking x ${sim.king.position.x.toFixed(1)} / ufo x ${x.toFixed(1)}\ndock ${sim.dockMs.toFixed(0)} / 1500ms`;}
  (el('progress') as HTMLProgressElement).value=Math.max(0,x/cfg.pixelsPerMeter);el('distance').textContent=`${Math.max(0,Math.min(500,Math.round(x/cfg.pixelsPerMeter)))} / 500m`;(el('energy') as HTMLProgressElement).value=sim.energy;
  el('status').textContent=sim.state==='DANGER'?'! EASY, YOUR MAJESTY! · Balance before you brake.':sim.state==='DOCKING'?`HOLD STEADY · ${(sim.dockMs/1000).toFixed(1)} / 1.5s`:x>finish-260?'ROYAL THRONE AHEAD · Slow down and hold steady.':'A / ← brake or reverse · D / → move · SPACE / W boost';
  if(!paused&&sim.state==='FAILED'){paused=true;clearInput();modal('THE KING HAS LEFT THE UFO.','Stage 01 physics test. Full Royal Rescue + checkpoint persistence are the next stage.',[['RESTART TEST',reset]]);}
  if(!paused&&sim.state==='CLEAR'){paused=true;clearInput();modal('ROYAL DELIVERY COMPLETE!','A real, stable landing. Level 01 physics prototype complete.',[['PLAY AGAIN',reset]]);}
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',width:1280,height:720,backgroundColor:'#8796ad',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Game,audio:{noAudio:true}});
(window as any).__test={get sim(){return sim;},reset,step:(direction:number,boost=false)=>sim.step(direction,boost),setPaused:(p:boolean)=>{paused=p;},held};
