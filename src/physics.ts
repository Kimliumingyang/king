import Phaser from 'phaser';
import balance from '../data/balance.json';
import {TerrainLayout,allLevels,rules,difficulty,moduleSpec,type Level,type Section} from './terrain';
import type {Upgrades} from './progress';
import stage2 from '../data/prototype_stage2.json';
const M = (Phaser.Physics.Matter as any).Matter as any;
export const cfg = structuredClone(balance);
export let level=allLevels[0];
export let finish=level.lengthMeters*cfg.pixelsPerMeter;
export const start=-180;
let activeLayout=new TerrainLayout(level,cfg.pixelsPerMeter);
export function activateLevel(id:string){level=allLevels.find(l=>l.id===id)??allLevels[0];finish=level.dock.xMeters*cfg.pixelsPerMeter;activeLayout=new TerrainLayout(level,cfg.pixelsPerMeter);}
export function ground(x:number){return activeLayout.profile(x);}
export function tunePhysics(snapshot:Record<string,number>,boostScale=1){
 const p=structuredClone(cfg.physics),u=p.ufo,k=p.king,b=p.boost;
 u.horizontalForce*=1+(snapshot.engine??0)*cfg.upgrades.engine.bonusPerLevel;
 const stability=1+(snapshot.stabilizer??0)*cfg.upgrades.stabilizer.bonusPerLevel;
 u.pitchStabilizer*=stability;u.pitchTrimGain*=stability;u.pitchTrimMaxTorque*=stability;
 const grip=1+(snapshot.grip??0)*cfg.upgrades.grip.bonusPerLevel;k.friction*=grip;k.frictionStatic*=grip;
 b.durationSecAtFull*=1+(snapshot.battery??0)*cfg.upgrades.battery.bonusPerLevel;
 b.heightBonusPx*=boostScale;b.forceMultiplier=1+(b.forceMultiplier-1)*boostScale;
 k.ejectGraceMs+=(snapshot.rescue_kit??0)*cfg.upgrades.rescue_kit.dangerGraceBonusSec*1000;
 return p;
}
export class Simulation {
 engine:any; ufo:any; king:any; terrain:any[]=[]; probes:any[]=[]; contacts:any[]=[];
 lastGroundY=rules.groundY; pitchTrim=0; boostHeight=0; energy=1; risk=0; offMs=0; dockMs=0; elapsed=0; state='RUNNING';
 aboard=false; ejectedMs=0; protectionMs=0; failureX=0;
 layout:TerrainLayout; roofs:any[]=[]; warning=''; springTimers=new Map<string,number>();springPulses=new Map<string,number>(); approachTimers=new Map<string,number>();
 dynamics:{section:Section;type:string;body:any;baseX:number;baseY:number;loadedAt?:number;fallen?:boolean}[]=[];
 constraints:any[]=[]; hazardClock=0; magneticScale=1; windForce=0; hazardEffects=new Map<string,{warning:boolean;active:boolean;phase:number}>();
 tuning:ReturnType<typeof tunePhysics>;
 constructor(public config:Level=level,public upgrades:Record<string,number>={},public boostScale=1){
  this.upgrades=structuredClone(upgrades);this.tuning=tunePhysics(this.upgrades,boostScale);
  this.layout=new TerrainLayout(config,cfg.pixelsPerMeter);
  this.engine=M.Engine.create({gravity:{x:0,y:cfg.physics.gravityY},positionIterations:10,velocityIterations:8});
  const boundaries=[start-200,this.layout.finish+650,...this.layout.sections.flatMap(s=>[s.gapStart,s.gapEnd].filter((x):x is number=>x!==undefined))].sort((a,b)=>a-b);
  for(let x=start-200;x<this.layout.finish+650;){
    const next=Math.min((Math.floor(x/rules.samplePx)+1)*rules.samplePx,...boundaries.filter(v=>v>x+.0001));
    if(this.layout.groundAt((x+next)/2)!==null){
      const y1=this.layout.profile(x),y2=this.layout.profile(next);
      const vertices=[{x,y:y1},{x:next,y:y2},{x:next,y:y2+100},{x,y:y1+100}];
      this.terrain.push(M.Bodies.fromVertices((x+next)/2,(y1+y2)/2+50,[vertices],{isStatic:true,friction:.8,label:'ground'}));
    }
    x=next;
  }
  for(const s of this.layout.sections)if(s.type==='low_ceiling'||s.overlays.includes('low_ceiling')){
    const clearance=s.params.clearancePx??(moduleSpec('low_ceiling').parameters as any).clearancePx[0],length=s.params.tunnelLengthPx??150;
    const roof=M.Bodies.rectangle(s.center,rules.groundY-clearance-20,length,40,{isStatic:true,friction:.01,label:'low_ceiling'});
    this.roofs.push(roof);this.terrain.push(roof);
  }
  for(const section of this.layout.sections){
    const p=section.params;
    if(section.type==='moving_platform'){
      const body=M.Bodies.rectangle(section.center,rules.groundY+6,p.platformWidthPx,12,{isStatic:true,friction:.8,label:'moving_platform'});
      this.dynamics.push({section,type:section.type,body,baseX:section.center,baseY:rules.groundY+6});this.terrain.push(body);
    }
    if(section.type==='seesaw'){
      const body=M.Bodies.rectangle(section.center,rules.groundY+6,p.platformLengthPx,12,{mass:12,friction:.8,frictionAir:p.angularDamping,label:'seesaw'});
      this.constraints.push(M.Constraint.create({bodyA:body,pointB:{x:section.center,y:rules.groundY+6},stiffness:1,length:0}));
      for(const side of [-1,1])this.terrain.push(M.Bodies.rectangle(section.center+side*70,rules.groundY+39,18,14,{isStatic:true,label:'seesaw_stop'}));
      this.dynamics.push({section,type:section.type,body,baseX:section.center,baseY:rules.groundY+6});this.terrain.push(body);
    }
    if(section.type==='crumbling_bridge'){
      const width=(section.gapEnd!-section.gapStart!)/p.segmentCount;
      for(let i=0;i<p.segmentCount;i++){
        const x=section.gapStart!+width*(i+.5);
        const body=M.Bodies.rectangle(x,rules.groundY+6,width,12,{isStatic:true,friction:.8,label:'crumbling_bridge'});
        this.dynamics.push({section,type:section.type,body,baseX:x,baseY:rules.groundY+6});this.terrain.push(body);
      }
    }
  }
  const u=this.tuning.ufo,k=this.tuning.king;
  this.ufo=M.Bodies.rectangle(0,this.layout.profile(0)-u.hoverHeightPx,u.widthPx,20,{chamfer:{radius:8},mass:u.mass,friction:k.friction,frictionStatic:k.frictionStatic,frictionAir:u.linearDrag,label:'ufo'});
  this.king=M.Bodies.rectangle(0,this.ufo.position.y-10-k.heightPx/2,k.widthPx,k.heightPx,{chamfer:{radius:28},mass:k.mass,friction:k.friction,frictionStatic:k.frictionStatic,frictionAir:k.frictionAir,label:'king'});
  M.Composite.add(this.engine.world,[...this.terrain,...this.constraints,this.ufo,this.king]);
 }
 spawnAt(x:number){
  this.pitchTrim=0;this.boostHeight=0;M.Pairs.clear(this.engine.pairs);
  M.Body.setStatic(this.ufo,false);
  const left=this.surfaceAt(x-cfg.physics.ufo.deckWidthPx*.4),right=this.surfaceAt(x+cfg.physics.ufo.deckWidthPx*.4);
  const floors=[left,right].filter((v):v is number=>v!==null);
  const y=(floors.length?Math.min(...floors):rules.groundY)-cfg.physics.ufo.hoverHeightPx;
  M.Body.setPosition(this.ufo,{x,y});M.Body.setAngle(this.ufo,0);
  M.Body.setPosition(this.king,{x,y:y-10-cfg.physics.king.heightPx/2});M.Body.setAngle(this.king,0);
  for(const b of [this.ufo,this.king]){M.Body.setVelocity(b,{x:0,y:0});M.Body.setAngularVelocity(b,0);b.force.x=b.force.y=b.torque=0;}
  this.ejectedMs=0;this.offMs=this.dockMs=this.risk=0;this.contacts=[];this.aboard=false;this.state='RUNNING';
 }
 surfaceSample(x:number,minY=-Infinity):{y:number;body?:any}|null {
  const staticY=this.layout.groundAt(x);let result=staticY!==null&&staticY>=minY?{y:staticY,body:undefined as any}:null;
  for(const d of this.dynamics){
    if(d.body.bounds.max.y>800||x<d.body.bounds.min.x||x>d.body.bounds.max.x)continue;
    const v=d.body.vertices;
    for(let i=0;i<v.length;i++){
      const a=v[i],b=v[(i+1)%v.length];if(Math.abs(a.x-b.x)<.001||x<Math.min(a.x,b.x)||x>Math.max(a.x,b.x))continue;
      const y=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
      if(y>=minY&&(!result||y<result.y))result={y,body:d.body};
    }
  }
  return result;
 }
 surfaceAt(x:number):number|null {return this.surfaceSample(x)?.y??null;}
 safeAnchor(sourceX:number):number|null {
  const maxBack=cfg.revive.recoverAnchorMaxBacktrackMeters*cfg.pixelsPerMeter;
  const origin=Phaser.Math.Clamp(sourceX,start+4,this.layout.finish+300);
  for(let back=0;back<=maxBack;back++){
    const x=origin-back;if(x<start+4)continue;

    const left=this.surfaceAt(x-cfg.physics.ufo.deckWidthPx*.4),right=this.surfaceAt(x+cfg.physics.ufo.deckWidthPx*.4);
    const floors=[left,right].filter((y):y is number=>y!==null);
    const margin=4;
    const supportXs=[x-cfg.physics.ufo.deckWidthPx*.4,x+cfg.physics.ufo.deckWidthPx*.4];
    if(!floors.length||!supportXs.some(px=>this.surfaceAt(px-margin)!==null&&this.surfaceAt(px+margin)!==null))continue;
    const y=Math.min(...floors)-cfg.physics.ufo.hoverHeightPx;
    const u=M.Bodies.rectangle(x,y,cfg.physics.ufo.widthPx,20),k=M.Bodies.rectangle(x,y-10-cfg.physics.king.heightPx/2,cfg.physics.king.widthPx,cfg.physics.king.heightPx);
    if(M.Query.collides(u,this.terrain).length===0&&M.Query.collides(k,this.terrain).length===0)return x;
  }
  return null;
 }
 updateHazards(dt:number){
  this.warning='';this.hazardClock+=dt;this.magneticScale=1;this.windForce=0;
  const x=this.ufo.position.x;
  const safe=this.protectionMs>0||this.layout.checkpointXs.some(cp=>Math.abs(x-cp)<rules.checkpointFlatPx/2)||x>this.layout.finish-this.config.dock.safeGroundBeforeMeters*cfg.pixelsPerMeter;
  for(const d of this.dynamics){
    const p=d.section.params;
    if(d.type==='moving_platform'){
      const phase=this.hazardClock/(p.periodSec*1000)*Math.PI*2;
      M.Body.setPosition(d.body,{x:d.baseX+Math.sin(phase)*p.horizontalRangePx,y:d.baseY+Math.sin(phase)*p.verticalRangePx},true);
    }
    if(d.type==='seesaw'){
      d.body.torque-=d.body.angle*.3;
    }
    if(d.type==='crumbling_bridge'){
      if(d.loadedAt===undefined&&this.probes.some(probe=>Math.abs(probe.x-d.baseX)<(d.body.bounds.max.x-d.body.bounds.min.x)/2&&probe.ground!==null))d.loadedAt=this.hazardClock;
      if(d.loadedAt!==undefined&&this.hazardClock-d.loadedAt>=p.collapseDelayMs&&!d.fallen){M.Body.setStatic(d.body,false);M.Body.setMass(d.body,3);d.fallen=true;}
    }
  }
  const labels:Record<string,string>={gentle_hills:'GENTLE HILLS · EASY ON THE THROTTLE',rolling_waves:'WAVES · STEADY SPEED',steep_ramp:'STEEP RAMP · BRAKE BEFORE THE CREST',sudden_dip:'DIP AHEAD · SLOW DOWN',gap_jump:'GAP AHEAD · BUILD SPEED + SHORT BOOST',low_ceiling:'LOW CEILING · DO NOT BOOST',spring_mushroom:'SPRING MUSHROOM · SLOW APPROACH',seesaw:'SEESAW · BALANCE OVER THE PIVOT',moving_platform:'MOVING PLATFORM · WATCH THE CYCLE, THEN BOOST',crumbling_bridge:'CRUMBLING BRIDGE · KEEP MOVING',magnetic_pulse:'MAGNETIC PULSE · WATCH THE WARNING',crosswind:'CROSSWIND · LEAVE ROOM TO BRAKE'};
  for(const s of this.layout.sections){
    if(x<s.x-rules.warningDistancePx||x>s.end+100)continue;
    const approach=(this.approachTimers.get(s.id)??0)+dt;this.approachTimers.set(s.id,approach);
    if(!this.warning)this.warning=labels[s.type];
    if(s.type==='spring_mushroom'){
      const timer=(this.springTimers.get(s.id)??0)+dt;this.springTimers.set(s.id,timer);
      const ready=timer>=s.params.warningMs&&Math.abs(x-s.center)<70&&!safe;
      if(ready&&!this.springPulses.has(s.id))this.springPulses.set(s.id,this.hazardClock);
      const active=ready&&this.hazardClock-(this.springPulses.get(s.id)??-Infinity)<difficulty.springPulseMs;
      this.hazardEffects.set(s.id,{warning:timer<s.params.warningMs,active,phase:timer});
      if(active)M.Body.applyForce(this.ufo,this.ufo.position,{x:0,y:-difficulty.springPulseForce*(s.params.impulseMultiplier/1.1)});
    }
    for(const effect of [s.type,...s.overlays]){
      if(effect==='magnetic_pulse'){
        const p=moduleSpec(effect).parameters as any;
        const phase=this.hazardClock%(p.pulseIntervalSec*1000);
        const warning=phase<p.warningMs,active=phase>=p.warningMs&&phase<p.warningMs+rules.dynamic.magneticActiveMs;
        this.hazardEffects.set(s.id+'-'+effect,{warning,active,phase});
        if(x>=s.x&&x<=s.end&&!safe&&active&&approach>=p.warningMs)this.magneticScale=p.forceScaleMin+(p.forceScaleMax-p.forceScaleMin)*(Math.sin((phase-p.warningMs)/rules.dynamic.magneticActiveMs*Math.PI)**2);
        if(approach<p.warningMs)this.warning='! MAGNETIC PULSE APPROACH · PREPARE';
        else if(warning)this.warning='! MAGNETIC PULSE IN '+((p.warningMs-phase)/1000).toFixed(1)+'s';
      }
      if(effect==='crosswind'){
        const p=moduleSpec(effect).parameters as any;
        const phase=this.hazardClock%(p.warningMs+p.durationSec*1000+rules.dynamic.windRestMs);
        const warning=phase<p.warningMs,active=phase>=p.warningMs&&phase<p.warningMs+p.durationSec*1000;
        this.hazardEffects.set(s.id+'-'+effect,{warning,active,phase});
        if(x>=s.x&&x<=s.end&&!safe&&active&&approach>=p.warningMs)this.windForce=p.windForceMax*rules.dynamic.windForceScale*((this.config.seed%2)?1:-1);
        if(approach<p.warningMs)this.warning='! CROSSWIND APPROACH · PREPARE';
        else if(warning)this.warning='! CROSSWIND IN '+((p.warningMs-phase)/1000).toFixed(1)+'s';
      }
    }
  }
 }
 refreshTuning(){this.tuning=tunePhysics(this.upgrades,this.boostScale);this.king.friction=this.tuning.king.friction;this.king.frictionStatic=this.tuning.king.frictionStatic;this.ufo.friction=this.tuning.king.friction;this.ufo.frictionStatic=this.tuning.king.frictionStatic;}
 step(direction:number,boost:boolean){
  if(this.state==='KING_EJECTED'){
    this.ejectedMs+=1000/cfg.physics.fixedStepHz;
    M.Engine.update(this.engine,1000/cfg.physics.fixedStepHz);
    if(this.ejectedMs>=stage2.failureAnimationMs)this.state='FAIL_MENU';
    return;
  }
  if(!['RUNNING','DANGER','DOCKING'].includes(this.state)) return;
  const dt=1000/cfg.physics.fixedStepHz,u=this.tuning.ufo,b=this.tuning.boost;
  this.elapsed+=dt;this.updateHazards(dt);this.protectionMs=Math.max(0,this.protectionMs-dt);
  const active=boost&&this.energy>0.01&&['RUNNING','DANGER'].includes(this.state);
  const desiredHeight=active?b.heightBonusPx:0;
  this.boostHeight+=Phaser.Math.Clamp(desiredHeight-this.boostHeight,-b.heightRampPxPerSec/cfg.physics.fixedStepHz,b.heightRampPxPerSec/cfg.physics.fixedStepHz);
  this.energy=Phaser.Math.Clamp(this.energy+(active?-1/b.durationSecAtFull:1/b.rechargeSec)/cfg.physics.fixedStepHz,0,1);
  const body=this.ufo,co=Math.cos(body.angle),si=Math.sin(body.angle);
  this.probes=[];
  for(const side of [-1,1]){
   const rx=side*u.deckWidthPx*.4*co,ry=side*u.deckWidthPx*.4*si;
   const p={x:body.position.x+rx,y:body.position.y+ry};
   const sample=this.surfaceSample(p.x,p.y+5);
   const surface=sample&&sample.y-p.y<rules.dynamic.probeRangePx?sample.y:null;
   const target=(surface??rules.groundY+350)-u.hoverHeightPx-this.boostHeight;
   const vy=body.velocity.y+body.angularVelocity*rx;
   // spring coefficients are forces; baseline supports both physical masses.
   const support=(body.mass+this.king.mass)*this.engine.gravity.y*0.001/2;
   let force=Phaser.Math.Clamp(support+(p.y-target)*u.hoverSpring+vy*u.hoverDamping,-.018,.065);
   force*=this.magneticScale;
   if(surface!==null)this.lastGroundY=surface;
   if(surface===null){
    const flightTarget=this.lastGroundY-u.hoverHeightPx-this.boostHeight;
    force=active?Phaser.Math.Clamp(support+(p.y-flightTarget)*u.hoverSpring+vy*u.hoverDamping,0,support*b.forceMultiplier):0;
   }
   if(sample?.body&&!sample.body.isStatic)M.Body.applyForce(sample.body,{x:p.x,y:sample.y},{x:0,y:Math.max(0,force)*rules.dynamic.hoverReactionScale});
   M.Body.applyForce(body,p,{x:0,y:-force});this.probes.push({...p,target,ground:surface});
  }
  M.Body.applyForce(body,body.position,{x:direction*u.horizontalForce*(this.protectionMs>0?.65:1)+this.windForce,y:0});
  const supportedFlat=this.probes.length===2&&this.probes.every(p=>p.ground!==null)&&Math.abs(this.probes[0].ground-this.probes[1].ground)<2;
  this.pitchTrim=supportedFlat?Phaser.Math.Clamp(this.pitchTrim-body.angle*u.pitchTrimGain/cfg.physics.fixedStepHz,-u.pitchTrimMaxTorque,u.pitchTrimMaxTorque):this.pitchTrim*.98;
  body.torque+=this.pitchTrim;
  const pitchLimit=u.maxPitchDeg*Math.PI/180;
  const restoring=-body.angle*u.pitchStabilizer*body.inertia/25-body.angularVelocity*u.angularDrag*body.inertia/100;
  const overPitch=Math.max(0,Math.abs(body.angle)-pitchLimit*.8);
  body.torque+=Phaser.Math.Clamp((restoring-Math.sign(body.angle)*overPitch*body.inertia*.0007)*(this.protectionMs>0?1.5:1),-12,12);
  const max=u.maxSpeedPxPerSec/60;
  if(Math.abs(body.velocity.x)>max) M.Body.setVelocity(body,{x:Math.sign(body.velocity.x)*max,y:body.velocity.y});
  this.king.torque-=this.king.angularVelocity*this.king.inertia*cfg.physics.king.angularDrag/(dt*dt);
  M.Engine.update(this.engine,dt);
  const pairs=this.engine.pairs.list.filter((p:any)=>p.isActive&&((p.bodyA.parent===body&&p.bodyB.parent===this.king)||(p.bodyB.parent===body&&p.bodyA.parent===this.king)));
  this.contacts=pairs.flatMap((p:any)=>p.collision.supports.filter(Boolean));
  const dx=this.king.position.x-body.position.x,dy=this.king.position.y-body.position.y;
  const localX=dx*Math.cos(body.angle)+dy*Math.sin(body.angle);
  const localY=-dx*Math.sin(body.angle)+dy*Math.cos(body.angle);
  const aboard=pairs.length>0&&localY<0;this.aboard=aboard;
  this.risk=Math.max(Math.abs(localX)/(u.deckWidthPx/2),Math.abs(body.angle)/(u.maxPitchDeg*Math.PI/180));
  // Short airborne hops are recoverable; contact must return before grace expires.
  this.offMs=aboard?0:this.offMs+dt;
  this.state=this.risk>cfg.physics.king.edgeWarningThreshold||this.offMs>100?'DANGER':'RUNNING';
  if(this.offMs>this.tuning.king.ejectGraceMs||this.king.position.y>800||body.position.x<start||body.position.x>this.layout.finish+400){this.state='KING_EJECTED';this.failureX=body.position.x;M.Body.setStatic(body,true);return;}
  const dock=cfg.docking;
  const kingStable=Math.hypot(this.king.velocity.x-body.velocity.x,this.king.velocity.y-body.velocity.y)*60<=dock.maxSpeedPxPerSec&&Math.abs(this.king.angularVelocity)*60<=dock.kingMaxAngularSpeedRadS;
  if(Math.abs(body.position.x-this.layout.finish)<=this.config.dock.radiusPx&&Math.hypot(body.velocity.x,body.velocity.y)*60<=dock.maxSpeedPxPerSec&&Math.abs(body.angle)*180/Math.PI<=dock.maxAngleDeg&&aboard&&kingStable){this.dockMs+=dt;this.state='DOCKING';}else this.dockMs=0;
  if(this.dockMs>=this.config.dock.stableHoldMs)this.state='CLEAR';
 }
}
