import {cfg,level} from './physics';
import {allLevels} from './terrain';
import type {SaveBackend} from './storage';
export const SAVE_KEY='ddtk-stage2-run-v1';
export interface RunState {
  schemaVersion:1; dailyChallengeDate?:string; pixelsPerMeter?:number; revision:number; runId:string; attemptId:string; levelId:string; seed:number;
  freeRescueUsed:boolean; extraRescueUsed:boolean; lastCheckpointId:number; checkpointId:number;
  claimedPickupIds:string[]; runCoins:number; retries:number; totalRescues:number;
  runUpgradeSnapshot:Record<string,number>; elapsedMs:number; furthestX:number; dangerCount:number;
  status:'active'|'failed'|'rescuing'|'complete'; failureX:number; lastSavedAt:number;
}
const statuses=['active','failed','rescuing','complete'];
export function validRun(v:any):v is RunState {
  const savedLevel=allLevels.find(l=>l.id===v?.levelId);
  return !!savedLevel&&!!v&&v.schemaVersion===1&&typeof v.runId==='string'&&v.runId.length>0&&typeof v.attemptId==='string'
    &&(v.pixelsPerMeter===undefined||(Number.isFinite(v.pixelsPerMeter)&&v.pixelsPerMeter>0))&&v.seed===savedLevel.seed&&typeof v.freeRescueUsed==='boolean'&&typeof v.extraRescueUsed==='boolean'
    &&statuses.includes(v.status)&&Array.isArray(v.claimedPickupIds)&&v.claimedPickupIds.every((id:any)=>typeof id==='string')
    &&['revision','lastCheckpointId','checkpointId','runCoins','retries','totalRescues','elapsedMs','furthestX','dangerCount','lastSavedAt'].every(k=>Number.isFinite(v[k])&&v[k]>=0)
    &&Number.isFinite(v.failureX)&&Number.isInteger(v.checkpointId)&&v.checkpointId===v.lastCheckpointId&&v.checkpointId<=savedLevel.checkpointsMeters.length
    &&v.runUpgradeSnapshot&&Object.keys(cfg.upgrades).every(k=>Number.isInteger(v.runUpgradeSnapshot[k])&&v.runUpgradeSnapshot[k]>=0);
}
export function newRun(snapshot:Record<string,number>=Object.fromEntries(Object.keys(cfg.upgrades).map(k=>[k,0])),dailyChallengeDate?:string):RunState {
  return {schemaVersion:1,dailyChallengeDate,pixelsPerMeter:cfg.pixelsPerMeter,revision:0,runId:crypto.randomUUID(),attemptId:crypto.randomUUID(),levelId:level.id,seed:level.seed,
    freeRescueUsed:false,extraRescueUsed:false,lastCheckpointId:0,checkpointId:0,claimedPickupIds:[],runCoins:0,retries:0,totalRescues:0,
    runUpgradeSnapshot:structuredClone(snapshot),elapsedMs:0,furthestX:0,dangerCount:0,status:'active',failureX:0,lastSavedAt:Date.now()};
}
export class RunStore {
  error=''; recovered=false; needsReset=false;
  private storage:SaveBackend|null;
  get backend(){return this.storage;}
  constructor(storage?:SaveBackend|null){
    try{this.storage=storage===undefined?window.localStorage:storage;}catch{this.storage=null;this.error='Browser storage is unavailable. Checkpoint retries still work.';}
  }
  load():RunState|null {
    try {
      const raw=[SAVE_KEY,SAVE_KEY+'-staging',SAVE_KEY+'-backup'].map(key=>this.storage?.getItem(key)??null);
      const candidates=raw.flatMap(s=>{try{const v=JSON.parse(s??'null');return validRun(v)?[v]:[];}catch{return [];}}).sort((a,b)=>b.revision-a.revision);
      if(!candidates.length){if(raw.some(Boolean)){this.needsReset=true;this.error='Saved run is damaged. Start a new run to continue; your old save is kept until you choose.';}return null;}
      const run=candidates[0];this.recovered=raw[0]!==JSON.stringify(run);
      // Merge irreversible claims from valid snapshots from the same run.
      for(const v of candidates.filter(v=>v.runId===run.runId)){
        run.freeRescueUsed ||=v.freeRescueUsed;run.extraRescueUsed ||=v.extraRescueUsed;
        run.claimedPickupIds=[...new Set([...run.claimedPickupIds,...v.claimedPickupIds])];
      }
      const previousScale=run.pixelsPerMeter??2.4;
      if(previousScale!==cfg.pixelsPerMeter){
        run.furthestX=run.furthestX/previousScale*cfg.pixelsPerMeter;
        run.failureX=run.failureX/previousScale*cfg.pixelsPerMeter;
      }
      run.pixelsPerMeter=cfg.pixelsPerMeter;
      return run;
    }catch {this.error='Browser storage is unavailable. Checkpoint retries still work; refresh recovery and Royal Rescue need storage.';return null;}
  }
  save(run:RunState,allowNewRun=false):boolean {
    try {
      if(this.needsReset)return false;
      if(!this.storage)throw new Error('unavailable');
      const current=[SAVE_KEY,SAVE_KEY+'-staging',SAVE_KEY+'-backup'].flatMap(key=>{
        try{const v=JSON.parse(this.storage!.getItem(key)??'null');return validRun(v)?[v]:[];}catch{return [];}
      });
      const latest=current.sort((a,b)=>b.revision-a.revision)[0];
      if(!allowNewRun&&latest&&(latest.runId!==run.runId||latest.revision>run.revision)){
        this.error='A newer saved run exists. Reload this tab to continue safely.';return false;
      }

      const next={...run,revision:Math.max(run.revision,...current.map(v=>v.revision))+1,lastSavedAt:Date.now()};
      if(!validRun(next))throw new Error('invalid');
      const text=JSON.stringify(next);
      this.storage.setItem(SAVE_KEY+'-staging',text);
      if(this.storage.getItem(SAVE_KEY+'-staging')!==text)throw new Error('verification');
      this.storage.setItem(SAVE_KEY,text);
      this.storage.setItem(SAVE_KEY+'-backup',text);
      this.storage.removeItem(SAVE_KEY+'-staging');
      Object.assign(run,next);this.error='';return true;
    }catch{this.error='Cannot save in this browser. Keep this tab open; checkpoint retries remain free.';return false;}
  }
}
