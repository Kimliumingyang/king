import levelData from '../data/levels.json';
import terrainData from '../data/terrain_modules.json';
import rules from '../data/layout_rules.json';
import difficulty from '../data/difficulty.json';
import economy from '../data/economy_rules.json';
export {difficulty};
export {rules};
export const allLevels=levelData.levels;
export const AVAILABLE_LEVELS=15;
export type Level=typeof allLevels[number];
export type ModuleId=typeof terrainData.modules[number]['id'];
export const moduleSpec=(id:string)=>terrainData.modules.find(m=>m.id===id)!;
export interface Section {
  id:string; type:ModuleId; x:number; end:number; center:number; params:Record<string,any>;
  gapStart?:number; gapEnd?:number; overlays:string[];
}
export class TerrainLayout {
  sections:Section[]=[]; finish:number; checkpointXs:number[]; errors:string[]=[];
  constructor(public level:Level,public ppm:number){
    this.finish=level.dock.xMeters*ppm;this.checkpointXs=level.checkpointsMeters.map(m=>m*ppm);
    let cursor=rules.startFlatPx;
    const recovery=level.index>=11?rules.lateRecoveryPx:rules.recoveryPx;
    const reserved=this.checkpointXs.map(x=>[x-rules.checkpointFlatPx/2,x+rules.checkpointFlatPx/2]);
    const safeEnd=this.finish-level.dock.safeGroundBeforeMeters*ppm;
    const sequence=[...level.terrainSequence,...((difficulty.extraModulesByLevel as Record<string,string[]>)[level.id]??[])];
    const free:number[][]=[];let edge=rules.startFlatPx;
    for(const [a,b]of reserved){if(a>edge)free.push([edge,a]);edge=Math.max(edge,b);}if(edge<safeEnd)free.push([edge,safeEnd]);
    // Backward feasibility bounds prevent a checkpoint from pushing later modules off the map.
    const latest:number[]=[];let right=safeEnd;
    for(let i=sequence.length-1;i>=0;i--){
      const spec=moduleSpec(sequence[i]),length=spec.lengthPx;
      const choices=free.map(([a,b])=>({a,x:Math.min(b-length,right-length)})).filter(c=>c.x>=c.a);
      if(!choices.length)throw new Error(`${level.id}: terrain recipe exceeds safe layout capacity`);
      latest[i]=Math.max(...choices.map(c=>c.x));
      if(i>0)right=latest[i]-Math.max(recovery,moduleSpec(sequence[i-1]).minimumSafeGapAfterPx);
    }
    let seed=level.seed;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(const [i,type]of sequence.entries()){
      const spec=moduleSpec(type);const length=spec.lengthPx;
      const spread=sequence.length>1?i/(sequence.length-1):0;
      const desired=rules.startFlatPx+(safeEnd-rules.startFlatPx-length)*spread;
      const choices=free.map(([a,b])=>({a:Math.max(a,cursor),b:Math.min(b-length,latest[i])})).filter(c=>c.a<=c.b).map(c=>Math.max(c.a,Math.min(c.b,desired)));
      if(!choices.length)throw new Error(`${level.id}: no safe placement for ${type}`);
      cursor=choices.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired))[0];
      const params:Record<string,any>={};
      for(const [key,value]of Object.entries(spec.parameters))params[key]=Array.isArray(value)?value[0]+(value[1]-value[0])*Math.min(1,difficulty.parameterFractionMin+(level.index-1)/14*difficulty.parameterLevelGrowth+random()*difficulty.parameterRandomSpan):value;
      if(type==='gap_jump')params.gapWidthPx=(difficulty.gapWidthsPx as Record<string,number>)[level.id]??165;
      if(params.periods)params.periods=Math.round(params.periods);
      const s:Section={id:`${level.id}-${type}-${i}`,type,x:cursor,end:cursor+length,center:cursor+length/2,params,overlays:[]};
      if(type==='gap_jump'){s.gapStart=s.center-params.gapWidthPx/2;s.gapEnd=s.center+params.gapWidthPx/2;}
      if(['moving_platform','seesaw','crumbling_bridge'].includes(type)){
        const span=type==='moving_platform'?difficulty.movingPlatformGapPx:type==='seesaw'?params.platformLengthPx:rules.dynamic.bridgeSpanPx;
        s.gapStart=s.center-span/2;s.gapEnd=s.center+span/2;
      }
      for(const combo of (rules.combos as Record<string,{on:string;effect:string}[]>)[level.id]??[])if(combo.on===type)s.overlays.push(combo.effect);
      this.sections.push(s);cursor=s.end+Math.max(recovery,spec.minimumSafeGapAfterPx);
      if(s.end>safeEnd)this.errors.push(`${s.id}: overlaps dock safety area`);
    }
    for(const cp of this.checkpointXs){
      for(const s of this.sections)if(s.x<cp+rules.checkpointFlatPx/2&&s.end>cp-rules.checkpointFlatPx/2)this.errors.push(`${s.id}: overlaps checkpoint`);
    }
    if(this.errors.length)throw new Error(this.errors.join('; '));
  }
  sectionAt(x:number){return this.sections.find(s=>x>=s.x&&x<=s.end);}
  profile(x:number):number {
    const s=this.sectionAt(x);if(!s)return rules.groundY;
    const t=(x-s.x)/(s.end-s.x),p=s.params;
    switch(s.type){
      case 'gentle_hills':return rules.groundY-p.amplitudePx*Math.sin(t*Math.PI)**2;
      case 'rolling_waves':return rules.groundY-p.amplitudePx*Math.sin(t*Math.PI*p.periods)**2;
      case 'sudden_dip':return rules.groundY+p.depthPx*Math.sin(t*Math.PI)**2;
      case 'steep_ramp':{
        const ramp=(s.end-s.x-p.landingFlatPx)/2;
        const height=Math.tan(p.slopeDeg*Math.PI/180)*ramp;
        return rules.groundY-height*Math.min(1,(x-s.x)/ramp,(s.end-x)/ramp);
      }
      case 'spring_mushroom':return rules.groundY-difficulty.springSurfaceHeightPx*Math.sin(t*Math.PI)**2;
      default:return rules.groundY;
    }
  }
  groundAt(x:number):number|null {
    const s=this.sectionAt(x);
    if(s?.gapStart!==undefined&&x>s.gapStart&&x<s.gapEnd!)return null;
    // Same piecewise-linear samples used to build the collider.
    const a=Math.floor(x/rules.samplePx)*rules.samplePx;
    return this.profile(a)+(this.profile(a+rules.samplePx)-this.profile(a))*(x-a)/rules.samplePx;
  }
  pickups(){return this.sections.map((s,i)=>({id:`${this.level.id}-p${String(i+1).padStart(2,'0')}`,x:s.end+difficulty.pickupOffsetPx,value:economy.pickupValue}));}
}
