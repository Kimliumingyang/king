import Phaser from 'phaser';
import {cfg,finish,ground,level,start} from './physics';
import {Session} from './session';
import {economyRules,upgradePrice,upgradeValue,type UpgradeId} from './progress';
import {allLevels,AVAILABLE_LEVELS,rules} from './terrain';
import stage2 from '../data/prototype_stage2.json';
import {MockBridge} from './bridge';
import {MemorySaveBackend} from './storage';
import {RunStore} from './save';
import {GameSaveService} from './game-save';
import './style.css';
const debug=new URLSearchParams(location.search).has('debug');
const bridge=new MockBridge();await bridge.init();
const root=document.getElementById('game')!;
root.innerHTML=`
<header>
  <div class="brand">Don't Drop<br><b>the King!</b><small>ROYAL COURIER · STAGE 04</small></div>
  <div class="level">LEVEL 01<small>His First Ride</small></div>
  <div class="route"><span>◉</span><progress id="progress" max="500" value="0"></progress><span>♛</span></div>
  <div id="distance">0 / 500m</div>
  <button id="levels" aria-label="Choose level">☰</button><button id="pause" aria-label="Pause">||</button><button id="restart" aria-label="Restart level">↻</button>
</header>
<div id="canvas"></div>
<div id="caption">DELIVER THE KING.<br><b>NOT LAUNCH HIM.</b></div>
<div id="run-hud"><span id="checkpoint-chip">⚑ START</span><span id="rescue-chip">♛ RESCUE 1 / 1</span><span id="save-chip">SAVED LOCALLY</span><button id="garage" aria-label="Garage">COINS 0</button></div>
<div id="toast" role="status"></div><div id="hazard-tip" role="status"></div>
<div id="risk-box" hidden><span>! YOUR MAJESTY IS SLIPPING</span><progress id="risk" max="1" value="0"></progress></div>
<div id="status">Hold D / → to move · Release early. Brake gently.</div>
<button id="skip" hidden>SKIP ANIMATION</button>
<footer>
  <div class="drive"><button data-key="left">A <span>←</span></button><button data-key="right"><span>→</span> D</button><small>HOLD TO MOVE / BRAKE</small></div>
  <div class="energy"><small>HOVER ENERGY</small><progress id="energy" max="1" value="1"></progress><span>Easy on the royal cargo.</span></div>
  <div class="boost"><button data-key="boost">SPACE <span>↑</span></button><small>HOVER BOOST</small></div>
</footer>
<div id="modal" hidden><div class="panel" role="dialog" aria-modal="true" aria-labelledby="title"><div class="royal-mark">♛</div><small id="eyebrow">ROYAL DELIVERY SERVICE · LEVEL 01</small><h1 id="title"></h1><p id="message"></p><div id="summary" hidden></div><div id="actions"></div><small id="menu-note"></small></div></div>
${debug?'<aside id="debug"><b>LIVE PHYSICS LAB</b><pre id="readout"></pre><div id="sliders"></div></aside>':''}`;
const el=(id:string)=>document.getElementById(id)!;
const session=new Session();let sim=session.sim,paused=true,acc=0,toastMs=0;
const held={left:false,right:false,boost:false};
function clearInput(){held.left=held.right=held.boost=false;document.querySelectorAll('.pressed').forEach(x=>x.classList.remove('pressed'));}
function canDrive(){return !paused&&['RUNNING','DANGER','DOCKING'].includes(sim.state);}
function closeMenu(){paused=false;acc=0;clearInput();el('modal').hidden=true;bridge.gameplayStart();}
function modal(title:string,message:string,buttons:[string,()=>void][],note=''){
  el('modal').className='';
  el('eyebrow').textContent=`ROYAL DELIVERY SERVICE · LEVEL ${String(level.index).padStart(2,'0')}`;
  paused=true;acc=0;clearInput();bridge.gameplayStop();el('title').textContent=title;el('message').textContent=message;
  el('summary').hidden=true;el('menu-note').textContent=note;el('actions').replaceChildren();
  for(const [label,action]of buttons){const b=document.createElement('button');b.textContent=label;b.onclick=action;el('actions').append(b);}
  el('modal').hidden=false;
}
function reset(){session.restart();sim=session.sim;closeMenu();}
function failMenu(){
  const run=session.run;const buttons:[string,()=>void][]=[];
  if(!run.freeRescueUsed)buttons.push(['ROYAL RESCUE — FREE',()=>{
    if(session.rescue()){sim=session.sim;closeMenu();}else{el('message').textContent=session.store.error;}
  }]);
  buttons.push(['RETRY CHECKPOINT',()=>{if(session.retry()){sim=session.sim;closeMenu();toast('BACK IN BUSINESS · CHECKPOINT RETRY');}}]);
  buttons.push(['RESTART LEVEL',confirmRestart]);
  const cp=run.checkpointId?`${level.checkpointsMeters[run.checkpointId-1]}m`:'START';
  modal('THE KING HAS LEFT THE UFO.',run.freeRescueUsed?'Your rescue was used. The checkpoint is always free.':'One royal rescue. Unlimited free checkpoint retries.',buttons,'NO ADS · NO COST TO CONTINUE');
  el('summary').hidden=false;el('summary').innerHTML=`<div><small>THIS FLIGHT</small><b>${Math.max(0,Math.round(run.failureX/cfg.pixelsPerMeter))}m</b></div><div><small>RUN BEST</small><b>${Math.round(run.furthestX/cfg.pixelsPerMeter)}m</b></div><div><small>CHECKPOINT</small><b>${cp}</b></div><div><small>RUN COINS</small><b>${run.runCoins}</b></div>`;
}
function openLevel(index:number){if(session.startLevel(index)){sim=session.sim;closeMenu();}}
function levelMenu(){
  modal('ROYAL ROUTES',session.progress.error||'Finish a delivery to unlock the next route.',[['BACK',()=>{if(sim.state==='FAIL_MENU')failMenu();else if(sim.state==='CLEAR')clearMenu();else closeMenu();}]],'NO UPGRADES OR ADS REQUIRED');
  const grid=document.createElement('div');grid.id='level-grid';
  for(const route of allLevels){
    const b=document.createElement('button');b.textContent=`${String(route.index).padStart(2,'0')} · ${route.name} ${"★".repeat(session.progress.data.bestStars[route.id]??0)}`;
    b.disabled=route.index>Math.max(session.memoryUnlocked,session.progress.data.highestUnlockedLevel)||route.index>AVAILABLE_LEVELS;
    b.classList.toggle('completed',session.progress.data.completedLevels.includes(route.id));
    b.onclick=()=>openLevel(route.index);grid.append(b);
  }
  el('actions').prepend(grid);
}
function clearMenu(){
  const actions:[string,()=>void][]=[];
  if(level.index<AVAILABLE_LEVELS)actions.push(['NEXT LEVEL',()=>openLevel(level.index+1)]);
  actions.push(['GARAGE / UPGRADES',garageMenu],['MISSIONS',missionsMenu],['PLAY AGAIN',reset],['CHOOSE LEVEL',levelMenu]);
  const receipt=session.progress.data.settledRuns[session.run.runId];
  if(!receipt)actions.unshift(['RETRY REWARD SAVE',()=>{session.settle();clearMenu();}]);
  modal('ROYAL DELIVERY COMPLETE!',`${level.name} delivered. ${session.progress.error||(level.index<AVAILABLE_LEVELS?'The next route is unlocked and saved.':'Final route delivered. Choose a route to replay.')}`,actions,`${level.id} · ${session.run.dailyChallengeDate?'DAILY CHALLENGE':'ROYAL DELIVERY'}`);
  el('modal').className='reward-mode';
  el('summary').hidden=false;
  el('summary').innerHTML=receipt?`<div class="reward-stars">${'★'.repeat(receipt.stars)}${'☆'.repeat(3-receipt.stars)}</div><div class="reward-total">+${receipt.coins} COINS</div><div class="reward-details">Delivery ${receipt.base} · Pickups ${receipt.pickups} · First clear ${receipt.firstClear}<br>Three stars ${receipt.threeStar} · Daily ${receipt.daily}<br>${receipt.seconds.toFixed(1)}s · BEST ${session.progress.data.bestTimes[level.id].toFixed(1)}s</div>`:'Reward pending — free play remains available. Retry saving before leaving to keep this reward.';
}
function backToRunMenu(){if(sim.state==='FAIL_MENU')failMenu();else if(sim.state==='CLEAR')clearMenu();else modal('A ROYAL BREATHER','Your run is paused.',[['RESUME',closeMenu],['GARAGE',garageMenu],['MISSIONS',missionsMenu],['RESTART LEVEL',confirmRestart]]);}
function garageMenu(){
  modal('THE ROYAL GARAGE',session.progress.error||`Wallet: ${session.progress.data.coinsWallet} coins. Upgrades apply to the next run or full restart. Checkpoint retries keep the current setup.`,[['BACK',backToRunMenu]],'NO ADS REQUIRED · UPGRADES NEVER GLUE THE KING DOWN');
  el('modal').className='garage-mode';
  const grid=document.createElement('div');grid.className='garage-grid';
  for(const id of Object.keys(cfg.upgrades) as UpgradeId[]){
    const n=session.progress.data.upgradeLevels[id],max=cfg.upgrades[id].maxLevel,price=upgradePrice(id,n);
    const card=document.createElement('div');card.className='upgrade-card';
    const title=document.createElement('b');title.textContent=`${economyRules.upgradeLabels[id]} · ${n}/${max}`;
    const detail=document.createElement('p');detail.textContent=`${upgradeValue(id,n)} → ${upgradeValue(id,Math.min(n+1,max))}`;
    const b=document.createElement('button');b.textContent=n>=max?'MAX LEVEL':`BUY · ${price} COINS`;b.disabled=n>=max||price>session.progress.data.coinsWallet||session.progress.blocked;
    b.onclick=()=>{session.progress.purchase(id,n);garageMenu();};card.append(title,detail,b);grid.append(card);
  }
  el('actions').prepend(grid);
}
function missionsMenu(){
  modal('ROYAL ASSIGNMENTS',session.progress.error||`Wallet: ${session.progress.data.coinsWallet} coins. Optional goals reward successful deliveries.`,[['BACK',backToRunMenu]],'DAILY: 15% WEAKER BOOST · NO RESCUES OR CHECKPOINT RETRIES FOR BONUS');
  el('modal').className='mission-mode';
  const list=document.createElement('div');list.className='mission-list';
  for(const m of economyRules.missions){
    const b=document.createElement('button'),claimed=session.progress.data.missions.claimed.includes(m.id),ready=session.progress.data.completedLevels.includes(m.levelId);
    b.textContent=`${m.name} · Finish ${m.levelId} · ${claimed?'CLAIMED':ready?'CLAIM +'+m.reward:'+'+m.reward+' COINS'}`;
    b.disabled=claimed||!ready||session.progress.blocked;b.onclick=()=>{session.progress.claimMission(m.id);missionsMenu();};list.append(b);
  }
  const daily=document.createElement('button');daily.textContent=`START DAILY · ${session.progress.dailyAvailable()?`+${economyRules.daily.reward} BONUS`:'BONUS ALREADY CLAIMED / NOT READY'}`;
  daily.onclick=()=>{if(session.startDaily()){sim=session.sim;closeMenu();toast('DAILY FLIGHT · WEAKER BOOST · CLEAN DELIVERY FOR BONUS');}};list.append(daily);el('actions').prepend(list);
}
function pause(){
  clearInput();session.save();
  if(paused||['FAIL_MENU','CLEAR'].includes(sim.state))return;
  modal('A ROYAL BREATHER','Physics, the rescue animation and time are paused.',[['RESUME',closeMenu],['GARAGE',garageMenu],['MISSIONS',missionsMenu],['RESTART LEVEL',confirmRestart]]);
}
function confirmRestart(){
  const wasPaused=paused;
  modal('RESTART THIS RIDE?','Start a new run. Checkpoint progress and temporary coins reset. Your one free rescue returns.',[['RESTART',reset],['CANCEL',()=>{
    if(sim.state==='FAIL_MENU')failMenu();else if(sim.state==='CLEAR')clearMenu();else if(wasPaused){modal('A ROYAL BREATHER','Your run is paused.',[['RESUME',closeMenu],['GARAGE',garageMenu],['MISSIONS',missionsMenu],['RESTART LEVEL',confirmRestart]]);}else closeMenu();
  }]]);
}
function toast(text:string){el('toast').textContent=text;toastMs=2200;}
el('garage').onclick=garageMenu;el('levels').onclick=levelMenu;el('pause').onclick=pause;el('restart').onclick=confirmRestart;
el('skip').onclick=()=>{if(sim.state==='KING_EJECTED'){sim.state='FAIL_MENU';failMenu();}};
const mapping:Record<string,keyof typeof held>={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'boost',KeyW:'boost'};
window.addEventListener('keydown',e=>{if(mapping[e.code]){e.preventDefault();if(canDrive())held[mapping[e.code]]=true;}if(!e.repeat){if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR')confirmRestart();}});
window.addEventListener('keyup',e=>{if(mapping[e.code])held[mapping[e.code]]=false;});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>session.save());
window.addEventListener('storage',event=>{
 if(event.key==='ddtk-profile-v2'){if(session.progress.refresh()){if(el('title').textContent==='THE ROYAL GARAGE')garageMenu();else if(el('title').textContent==='ROYAL ASSIGNMENTS')missionsMenu();}return;}
 if(event.key==='ddtk-stage2-run-v1'){
  try{const incoming=JSON.parse(event.newValue??'null');if(incoming&&incoming.revision<=session.run.revision)return;}catch{/* Invalid external writes still pause safely. */}
  modal('RUN UPDATED IN ANOTHER TAB','Continue in one tab to keep your saved checkpoint and rescue in sync.',[['LOAD SAVED RUN',()=>location.reload()]]);
}});
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{
  const key=b.dataset.key as keyof typeof held;
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(canDrive()){held[key]=true;b.classList.add('pressed');}};
  const release=()=>{held[key]=false;b.classList.remove('pressed');};
  b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
});
if(session.store.error){modal('A NOTE FROM THE ROYAL ARCHIVE',session.store.error,[['START NEW RUN',reset]],'CHECKPOINT RETRIES ARE ALWAYS FREE');}
else if(sim.state==='FAIL_MENU')failMenu();
else if(sim.state==='CLEAR')clearMenu();
else modal(session.restored?'WELCOME BACK, CAPTAIN.':'HIS MAJESTY NEEDS A RIDE.',session.restored?`Saved run restored at ${session.run.checkpointId?`checkpoint ${level.checkpointsMeters[session.run.checkpointId-1]}m`:'the start'}. ${session.run.freeRescueUsed?'Royal Rescue already used.':'One free Royal Rescue available.'}`:'Keep the king aboard. Ease over the hills, boost when needed, and stop at the throne.',[[session.restored?'CONTINUE':'PLAY',closeMenu],['CHOOSE LEVEL',levelMenu],['GARAGE',garageMenu],['MISSIONS / DAILY',missionsMenu]],'A / D TO MOVE · SPACE TO BOOST · CHECKPOINTS ARE FREE');
if(debug){const fields:[string,any,string,number,number,number][]=[['King friction',cfg.physics.king,'friction',0,1,.01],['King mass',cfg.physics.king,'mass',1,6,.1],['Gravity',cfg.physics,'gravityY',.5,2,.05],['Hover spring',cfg.physics.ufo,'hoverSpring',.0001,.0015,.00005],['Drive force',cfg.physics.ufo,'horizontalForce',.0005,.026,.0005]];for(const [label,obj,key,min,max,step]of fields){const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.type='range';i.min=String(min);i.max=String(max);i.step=String(step);i.value=String(obj[key]);i.oninput=()=>{obj[key]=Number(i.value);sim.refreshTuning();sim.engine.gravity.y=cfg.physics.gravityY;sim.king.friction=cfg.physics.king.friction;((Phaser.Physics.Matter as any).Matter as any).Body.setMass(sim.king,cfg.physics.king.mass);};l.append(i);el('sliders').append(l);}}
class Game extends Phaser.Scene {
 g!:Phaser.GameObjects.Graphics; cameraX=-350;
 create(){this.g=this.add.graphics();}
 update(_t:number,delta:number){
  if(!paused){
    acc+=Math.min(delta,50);
    while(acc>=1000/cfg.physics.fixedStepHz){
      const cp=session.run.checkpointId;
      session.step(Number(held.right)-Number(held.left),held.boost);sim=session.sim;
      if(cp!==session.run.checkpointId)toast(`⚑ CHECKPOINT SAVED · ${level.checkpointsMeters[session.run.checkpointId-1]}m`);
      acc-=1000/cfg.physics.fixedStepHz;
    }
    toastMs=Math.max(0,toastMs-delta);
  }
  const x=sim.ufo.position.x;this.cameraX=Phaser.Math.Clamp(x-440,start-210,finish-700);this.cameras.main.scrollX=this.cameraX;
  this.cameras.main.setBackgroundColor(level.world==='moonlit_citadel'?'#65738f':level.world==='wobbly_wastes'?'#a297a5':'#8796ad');
  const g=this.g;g.clear();
  // Independent vector greybox shapes, no reference image texture.
  g.fillStyle(0x68778c,0.3);for(let i=-2;i<10;i++){const px=i*330+this.cameraX*.6;g.fillTriangle(px,570,px+100,320+(i%3)*35,px+240,570);}
  for(const body of sim.terrain){
    if(body.bounds.max.x<this.cameraX||body.bounds.min.x>this.cameraX+1280)continue;
    const bodyColor:Record<string,number>={low_ceiling:0x565469,moving_platform:0x9bafba,seesaw:0xb393a2,crumbling_bridge:0x968687,seesaw_stop:0x565469};
    g.fillStyle(bodyColor[body.label]??0x706b7c);g.fillPoints(body.vertices,true);
  }
  g.lineStyle(5,0xa9aa85);
  for(let px=Math.floor(this.cameraX/10)*10;px<this.cameraX+1290;px+=10){
    const a=sim.layout.groundAt(px+.001),b=sim.layout.groundAt(px+9.999);
    if(a!==null&&b!==null)g.lineBetween(px,a,px+10,b);
  }
  for(const cp of sim.layout.checkpointXs){g.lineStyle(3,0xb5d6d5);g.lineBetween(cp,540,cp,480);g.fillStyle(0xb5d6d5);g.fillTriangle(cp,480,cp+28,489,cp,499);if(debug){g.lineStyle(1,0xb5d6d5,.5);g.strokeRect(cp-rules.checkpointFlatPx/2,470,rules.checkpointFlatPx,70);}}
  for(const section of sim.layout.sections){
    for(const effect of [section.type,...section.overlays]){
      const state=sim.hazardEffects.get(section.id+'-'+effect);
      if(effect==='magnetic_pulse'||effect==='crosswind'){
        g.fillStyle(effect==='magnetic_pulse'?0xb5d6d5:0xe6cfb2,state?.active?.25:.1);g.fillRect(section.x,300,section.end-section.x,240);
        g.lineStyle(2,state?.warning?0xd9b563:0xb5d6d5,.8);g.strokeRect(section.x,300,section.end-section.x,240);
        for(let arrow=section.x+25;arrow<section.end;arrow+=60){if(effect==='crosswind'){g.lineBetween(arrow,330,arrow+25,330);g.lineBetween(arrow+25,330,arrow+16,323);}else g.strokeCircle(arrow,330,10);}
      }
    }

    if(section.gapStart!==undefined){g.fillStyle(0xd9b563);g.fillTriangle(section.gapStart-20,520,section.gapStart-5,520,section.gapStart-5,505);g.fillTriangle(section.gapEnd!+5,520,section.gapEnd!+20,520,section.gapEnd!+5,505);}
    if(section.type==='spring_mushroom'){g.fillStyle(0x9d7b96);g.fillEllipse(section.center,sim.layout.profile(section.center)+8,110,16);}
    if(debug){g.lineStyle(1,0xd9b563,.6);g.strokeRect(section.x,580,section.end-section.x,20);}
  }
  g.lineStyle(3,0xe3ccad);g.strokeRoundedRect(finish-level.dock.radiusPx,430,level.dock.radiusPx*2,108,12);g.fillStyle(0xb393a2);g.fillRoundedRect(finish-24,471,48,58,8);g.fillStyle(0xd4bb81);g.fillRect(finish-30,522,60,10);g.fillTriangle(finish-22,470,finish-30,448,finish-1,463);g.fillTriangle(finish,470,finish+6,445,finish+24,470);
  const drawBody=(b:any,color:number)=>{g.fillStyle(color);g.lineStyle(3,0x343440);g.fillPoints(b.vertices,true);g.strokePoints(b.vertices,true);};
  for(const coin of sim.layout.pickups()){
    if(!session.run.claimedPickupIds.includes(coin.id)){g.fillStyle(0xd9b563);g.lineStyle(2,0x343440);g.fillCircle(coin.x,ground(coin.x)-112,9);g.strokeCircle(coin.x,ground(coin.x)-112,9);}
  }
  drawBody(sim.ufo,0xa49aa5);
  const restoring=sim.state==='REVIVE_ANIMATION';
  const t=Math.min(1,session.rescueMs/stage2.rescueAnimationMs);
  const kingVisual=restoring?{
    x:Phaser.Math.Linear(Phaser.Math.Clamp(session.rescueFrom.x,sim.ufo.position.x-200,sim.ufo.position.x+200),sim.king.position.x,1-(1-t)**3),
    y:Phaser.Math.Linear(sim.ufo.position.y+95,sim.king.position.y,1-(1-t)**3)
  }:sim.king.position;
  if(restoring){
    const dx=kingVisual.x-sim.king.position.x,dy=kingVisual.y-sim.king.position.y;
    g.fillStyle(0xe6cfb2);g.lineStyle(3,0x343440);const points=sim.king.vertices.map((v:any)=>({x:v.x+dx,y:v.y+dy}));g.fillPoints(points,true);g.strokePoints(points,true);
    g.fillStyle(0xb5d6d5,.2);g.fillTriangle(sim.ufo.position.x,sim.ufo.position.y-240,kingVisual.x-65,kingVisual.y+65,kingVisual.x+65,kingVisual.y+65);
    g.fillStyle(0xa49aa5);g.lineStyle(3,0x343440);g.fillEllipse(sim.ufo.position.x,sim.ufo.position.y-240,92,24);g.strokeEllipse(sim.ufo.position.x,sim.ufo.position.y-240,92,24);
    g.lineStyle(7,0xb5d6d5);g.strokeCircle(sim.ufo.position.x,sim.ufo.position.y-216,12);g.lineStyle(4,0x733e54);g.lineBetween(sim.ufo.position.x-12,sim.ufo.position.y-215,sim.ufo.position.x-12,sim.ufo.position.y-198);g.lineBetween(sim.ufo.position.x+12,sim.ufo.position.y-215,sim.ufo.position.x+12,sim.ufo.position.y-198);
  }else drawBody(sim.king,0xe6cfb2);
  if(sim.protectionMs>0){g.lineStyle(2,0xb5d6d5,.8);g.strokeCircle(sim.king.position.x,sim.king.position.y,90);}

  // Geometric crown distinguishes the independent king body.
  const k={position:{...kingVisual}};if(sim.state==='KING_EJECTED'){k.position.x+=sim.ejectedMs*.12;k.position.y-=Math.sin(Math.min(1,sim.ejectedMs/stage2.failureAnimationMs)*Math.PI)*90;}const crownY=k.position.y-72;g.fillStyle(0xd9b563);g.fillTriangle(k.position.x-23,crownY+13,k.position.x-27,crownY-5,k.position.x-9,crownY+6);g.fillTriangle(k.position.x-13,crownY+13,k.position.x,crownY-12,k.position.x+13,crownY+13);g.fillTriangle(k.position.x+9,crownY+6,k.position.x+27,crownY-5,k.position.x+23,crownY+13);
  for(const d of sim.dynamics){
    if(d.type==='seesaw'){g.fillStyle(0x343440);g.fillTriangle(d.baseX-15,d.baseY+34,d.baseX+15,d.baseY+34,d.baseX,d.baseY);}
    if(d.type==='crumbling_bridge'&&d.loadedAt!==undefined&&!d.fallen){g.lineStyle(3,0xd9b563);g.lineBetween(d.body.position.x-14,d.body.position.y-8,d.body.position.x+14,d.body.position.y-8);}
    if(debug&&d.type==='moving_platform'){g.lineStyle(1,0xb5d6d5,.6);g.strokeRect(d.baseX-d.section.params.horizontalRangePx-d.section.params.platformWidthPx/2,d.baseY-d.section.params.verticalRangePx,2*d.section.params.horizontalRangePx+d.section.params.platformWidthPx,2*d.section.params.verticalRangePx);}
  }
  if(debug){g.lineStyle(1,0x7de1e5);for(const b of sim.terrain)g.strokePoints(b.vertices,true);for(const p of sim.probes){g.lineBetween(p.x,p.y,p.x,p.ground??800);g.strokeCircle(p.x,p.target,5);}for(const b of [sim.king,sim.ufo]){g.fillStyle(0xe17584);g.fillCircle(b.position.x,b.position.y,4);}for(const p of sim.contacts){g.fillStyle(0xffff00);g.fillCircle(p.x,p.y,5);}el('readout').textContent=`${sim.state} · ${this.game.loop.actualFps.toFixed(0)} fps\nrisk ${sim.risk.toFixed(2)} · contact ${sim.contacts.length}\nv ${(sim.ufo.velocity.x*60).toFixed(1)} px/s · angle ${(sim.ufo.angle*180/Math.PI).toFixed(1)}°\noff deck ${sim.offMs.toFixed(0)}ms\nking x ${sim.king.position.x.toFixed(1)} / ufo x ${x.toFixed(1)}\ndock ${sim.dockMs.toFixed(0)} / 1500ms`;}
  (el('progress') as HTMLProgressElement).value=Math.max(0,x/cfg.pixelsPerMeter);el('distance').textContent=`${Math.max(0,Math.min(level.lengthMeters,Math.round(x/cfg.pixelsPerMeter)))} / ${level.lengthMeters}m`;(el('energy') as HTMLProgressElement).value=sim.energy;
  el('status').textContent=sim.state==='DANGER'?'! EASY, YOUR MAJESTY! · Balance before you brake.':sim.state==='DOCKING'?`HOLD STEADY · ${(sim.dockMs/1000).toFixed(1)} / 1.5s`:x>finish-260?'ROYAL THRONE AHEAD · Slow down and hold steady.':'A / ← brake or reverse · D / → move · SPACE / W boost';
  el('checkpoint-chip').textContent=session.run.checkpointId?`⚑ CHECKPOINT ${level.checkpointsMeters[session.run.checkpointId-1]}m`:'⚑ START';
  (el('progress') as HTMLProgressElement).max=level.lengthMeters;
  const qaSelect=document.getElementById('qa-level') as HTMLSelectElement|null;if(qaSelect&&qaSelect.value!==String(level.index))qaSelect.value=String(level.index);
  document.querySelector('.level')!.innerHTML=`LEVEL ${String(level.index).padStart(2,'0')}<small>${level.name}</small>`;
  el('hazard-tip').textContent=sim.warning;
  el('rescue-chip').textContent=session.run.freeRescueUsed?'♛ RESCUE USED':'♛ RESCUE 1 / 1';
  el('save-chip').textContent=session.store.error||session.progress.error?'! SAVE NOTICE':'SAVED LOCALLY';
  el('garage').textContent=session.progress.blocked?'COINS —':`COINS ${session.progress.data.coinsWallet}`;
  el('toast').classList.toggle('show',toastMs>0);
  el('risk-box').hidden=sim.state!=='DANGER';
  (el('risk') as HTMLProgressElement).value=sim.offMs?sim.offMs/sim.tuning.king.ejectGraceMs:Math.min(1,sim.risk);
  el('skip').hidden=sim.state!=='KING_EJECTED'||paused;
  if(sim.protectionMs>0)el('status').textContent=`ROYAL RECOVERY · ${(sim.protectionMs/1000).toFixed(1)}s · gentle controls, collisions remain active`;
  if(sim.state==='KING_EJECTED')el('status').textContent="HE'S FLYING!";
  if(sim.state==='REVIVE_ANIMATION')el('status').textContent='ROYAL RESCUE · RETURNING HIS MAJESTY';
  if(debug)el('readout').textContent+=`\ncheckpoint ${session.run.checkpointId} · retries ${session.run.retries}\nrescue used ${session.run.freeRescueUsed}\nprotection ${sim.protectionMs.toFixed(0)}ms · coins ${session.run.runCoins}`;
  if(!paused&&sim.state==='FAIL_MENU')failMenu();
  if(!paused&&sim.state==='CLEAR')clearMenu();
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',width:1280,height:720,backgroundColor:'#8796ad',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Game,audio:{noAudio:true}});
(window as any).__test={get sim(){return sim;},session,garageMenu,missionsMenu,levelMenu,clearMenu,reset,step:(direction:number,boost=false)=>{session.step(direction,boost);sim=session.sim;},setPaused:(p:boolean)=>{paused=p;},held,failMenu,closeMenu};
if(debug){
  const select=document.createElement('select');select.id='qa-level';select.setAttribute('aria-label','QA level jump');
  for(const l of allLevels){const option=document.createElement('option');option.value=String(l.index);option.textContent=`L${String(l.index).padStart(2,'0')} · ${l.name}`;select.append(option);}
  select.value=String(level.index);select.onchange=()=>{session.startLevel(Number(select.value),true);sim=session.sim;closeMenu();};el('sliders').prepend(select);
}
if(debug)Object.assign((window as any).__test,{
  createMemorySaves:()=>new GameSaveService(new RunStore(new MemorySaveBackend())),createMockBridge:()=>new MockBridge(),
  loadLevel(index:number){const ok=session.startLevel(index,true);sim=session.sim;closeMenu();return ok;},
  dislodge(x?:number){
    const M=(Phaser.Physics.Matter as any).Matter;
    if(x!==undefined)sim.spawnAt(x);
    M.Body.setPosition(sim.king,{x:sim.ufo.position.x+250,y:sim.ufo.position.y-75});
    M.Body.setVelocity(sim.king,{x:2,y:0});
  },
  approachDockFast(){const M=(Phaser.Physics.Matter as any).Matter;sim.spawnAt(sim.layout.finish-150);M.Body.setVelocity(sim.ufo,{x:5,y:0});M.Body.setVelocity(sim.king,{x:5,y:0});},
  edgeBrake(offset=80){const M=(Phaser.Physics.Matter as any).Matter;sim.spawnAt(sim.layout.finish-700);M.Body.setPosition(sim.king,{x:sim.ufo.position.x+offset,y:sim.king.position.y});M.Body.setVelocity(sim.ufo,{x:4.5,y:0});M.Body.setVelocity(sim.king,{x:4.5,y:0});},
  overlapDepth(){const M=(Phaser.Physics.Matter as any).Matter;return Math.max(0,...M.Query.collides(sim.ufo,sim.terrain).map((c:any)=>c.depth),...M.Query.collides(sim.king,sim.terrain).map((c:any)=>c.depth));},
  overlaps(){const M=(Phaser.Physics.Matter as any).Matter;return M.Query.collides(sim.ufo,sim.terrain).length+M.Query.collides(sim.king,sim.terrain).length;}
});
