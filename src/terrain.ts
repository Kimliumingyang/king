import levelData from '../data/levels.json';
import terrainData from '../data/terrain_modules.json';
import rules from '../data/layout_rules.json';
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
    let seed=level.seed;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(const [i,type]of level.terrainSequence.entries()){
      const spec=moduleSpec(type);const length=spec.lengthPx;
      const spread=level.terrainSequence.length>1?i/(level.terrainSequence.length-1):0;
      cursor=Math.max(cursor,rules.startFlatPx+(safeEnd-rules.startFlatPx-length)*spread);
      for(const [a,b]of reserved)if(cursor<b&&cursor+length>a)cursor=b;
      const params:Record<string,any>={};
      for(const [key,value]of Object.entries(spec.parameters))params[key]=Array.isArray(value)?value[0]+(value[1]-value[0])*random()*.3:value;
      if(params.periods)params.periods=Math.round(params.periods);
      const s:Section={id:`${level.id}-${type}-${i}`,type,x:cursor,end:cursor+length,center:cursor+length/2,params,overlays:[]};
      if(type==='gap_jump'){s.gapStart=s.center-params.gapWidthPx/2;s.gapEnd=s.center+params.gapWidthPx/2;}
      if(['moving_platform','seesaw','crumbling_bridge'].includes(type)){
        const span=type==='moving_platform'?250:type==='seesaw'?params.platformLengthPx:rules.dynamic.bridgeSpanPx;
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
      case 'spring_mushroom':return rules.groundY-8*Math.sin(t*Math.PI)**2;
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
  pickups(){return this.sections.map((s,i)=>({id:`${this.level.id}-p${String(i+1).padStart(2,'0')}`,x:s.end+90,value:5}));}
}
