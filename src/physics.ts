import Phaser from 'phaser';
import balance from '../data/balance.json';
import levels from '../data/levels.json';
import modules from '../data/terrain_modules.json';
import stage2 from '../data/prototype_stage2.json';
const M = (Phaser.Physics.Matter as any).Matter as any;
export const cfg = structuredClone(balance);
export const level = levels.levels[0];
export const finish = level.lengthMeters * cfg.pixelsPerMeter;
export const start = -180;
export function ground(x:number):number {
  // 300px safe checkpoint plateau and broad start/dock areas.
  const hills=modules.modules.find(m=>m.id===level.terrainSequence[0])!;
  const amp=(hills.parameters as any).amplitudePx[0];
  if(x<120 || x>=finish-level.dock.safeGroundBeforeMeters*cfg.pixelsPerMeter) return 540;
  if(x<420) return 540-amp*Math.sin(Math.PI*(x-120)/300)**2;
  if(x<740) return 540;
  const depth=(modules.modules.find(m=>m.id==='sudden_dip')!.parameters as any).depthPx[0];
  if(x<930) return 540+depth*Math.sin(Math.PI*(x-740)/190)**2;
  return 540-amp*Math.sin(Math.PI*(x-930)/(finish-level.dock.safeGroundBeforeMeters*cfg.pixelsPerMeter-930))**2;
}
export class Simulation {
 engine:any; ufo:any; king:any; terrain:any[]=[]; probes:any[]=[]; contacts:any[]=[];
 energy=1; risk=0; offMs=0; dockMs=0; elapsed=0; state='RUNNING';
 aboard=false; ejectedMs=0; protectionMs=0; failureX=0;
 constructor(){
  this.engine=M.Engine.create({gravity:{x:0,y:cfg.physics.gravityY},positionIterations:10,velocityIterations:8});
  for(let x=start-200;x<finish+650;x+=10){const y1=ground(x),y2=ground(x+10);const body=M.Bodies.rectangle(x+5,(y1+y2)/2+20,Math.hypot(10,y2-y1)+1,40,{isStatic:true,angle:Math.atan2(y2-y1,10),friction:0.8,label:'ground'});this.terrain.push(body);}
  const u=cfg.physics.ufo,k=cfg.physics.king;
  this.ufo=M.Bodies.rectangle(0,ground(0)-u.hoverHeightPx,u.widthPx,20,{chamfer:{radius:8},mass:u.mass,friction:k.friction,frictionStatic:k.frictionStatic,frictionAir:u.linearDrag,label:'ufo'});
  this.king=M.Bodies.rectangle(0,this.ufo.position.y-10-k.heightPx/2,k.widthPx,k.heightPx,{chamfer:{radius:28},mass:k.mass,friction:k.friction,frictionStatic:k.frictionStatic,frictionAir:k.frictionAir,label:'king'});
  M.Composite.add(this.engine.world,[...this.terrain,this.ufo,this.king]);
 }
 spawnAt(x:number){
  const y=Math.min(ground(x-cfg.physics.ufo.deckWidthPx*.4),ground(x+cfg.physics.ufo.deckWidthPx*.4))-cfg.physics.ufo.hoverHeightPx;
  M.Body.setPosition(this.ufo,{x,y});M.Body.setAngle(this.ufo,0);
  M.Body.setPosition(this.king,{x,y:y-10-cfg.physics.king.heightPx/2});M.Body.setAngle(this.king,0);
  for(const b of [this.ufo,this.king]){M.Body.setVelocity(b,{x:0,y:0});M.Body.setAngularVelocity(b,0);b.force.x=b.force.y=b.torque=0;}
  this.offMs=this.dockMs=this.risk=0;this.contacts=[];this.aboard=false;this.state='RUNNING';
 }
 safeAnchor(sourceX:number):number|null {
  const maxBack=cfg.revive.recoverAnchorMaxBacktrackMeters*cfg.pixelsPerMeter;
  const origin=Phaser.Math.Clamp(sourceX,start+4,finish+300);
  const test=new Simulation();
  for(let back=0;back<=maxBack;back++){
    const x=origin-back;if(x<start+4)continue;test.spawnAt(x);
    if(M.Query.collides(test.ufo,test.terrain).length===0&&M.Query.collides(test.king,test.terrain).length===0)return x;
  }
  return null;
 }
 step(direction:number,boost:boolean){
  if(this.state==='KING_EJECTED'){
    this.ejectedMs+=1000/cfg.physics.fixedStepHz;
    M.Engine.update(this.engine,1000/cfg.physics.fixedStepHz);
    if(this.ejectedMs>=stage2.failureAnimationMs)this.state='FAIL_MENU';
    return;
  }
  if(!['RUNNING','DANGER','DOCKING'].includes(this.state)) return;
  const dt=1000/cfg.physics.fixedStepHz,u=cfg.physics.ufo,b=cfg.physics.boost;
  this.elapsed+=dt;this.protectionMs=Math.max(0,this.protectionMs-dt);
  const active=boost&&this.energy>0.01&&this.state==='RUNNING';
  this.energy=Phaser.Math.Clamp(this.energy+(active?-1/b.durationSecAtFull:1/b.rechargeSec)/cfg.physics.fixedStepHz,0,1);
  const body=this.ufo,co=Math.cos(body.angle),si=Math.sin(body.angle);
  this.probes=[];
  for(const side of [-1,1]){
   const rx=side*u.deckWidthPx*.4*co,ry=side*u.deckWidthPx*.4*si;
   const p={x:body.position.x+rx,y:body.position.y+ry};
   const target=ground(p.x)-u.hoverHeightPx-(active?b.heightBonusPx:0);
   const vy=body.velocity.y+body.angularVelocity*rx;
   // spring coefficients are forces; baseline supports both physical masses.
   const support=(body.mass+this.king.mass)*this.engine.gravity.y*0.001/2;
   const force=Phaser.Math.Clamp(support+(p.y-target)*u.hoverSpring+vy*u.hoverDamping,-.018,.065);
   M.Body.applyForce(body,p,{x:0,y:-force});this.probes.push({...p,target,ground:ground(p.x)});
  }
  M.Body.applyForce(body,body.position,{x:direction*u.horizontalForce*(this.protectionMs>0?.65:1),y:0});
  body.torque+=(-body.angle*u.pitchStabilizer-body.angularVelocity*u.angularDrag*.1)*(this.protectionMs>0?1.5:1);
  const max=u.maxSpeedPxPerSec/60;
  if(Math.abs(body.velocity.x)>max) M.Body.setVelocity(body,{x:Math.sign(body.velocity.x)*max,y:body.velocity.y});
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
  if(this.offMs>cfg.physics.king.ejectGraceMs||this.king.position.y>800||body.position.x<start||body.position.x>finish+400){this.state='KING_EJECTED';this.failureX=body.position.x;M.Body.setStatic(body,true);return;}
  const dock=cfg.docking;
  if(Math.abs(body.position.x-finish)<=level.dock.radiusPx&&Math.hypot(body.velocity.x,body.velocity.y)*60<=dock.maxSpeedPxPerSec&&Math.abs(body.angle)*180/Math.PI<=dock.maxAngleDeg&&aboard){this.dockMs+=dt;this.state='DOCKING';}else this.dockMs=0;
  if(this.dockMs>=level.dock.stableHoldMs)this.state='CLEAR';
 }
}
