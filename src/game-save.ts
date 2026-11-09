import {RunStore,SAVE_KEY,validRun} from './save';
import {LevelProgress,PROFILE_KEY,validProfile} from './progress';
import {commitCopy,readCopies} from './storage';
export interface PlatformSavePort {loadSave():Promise<string|null>;save(value:string):Promise<void>;}
export class GameSaveService {
  profile:LevelProgress;syncError='';
  constructor(public run=new RunStore()){this.profile=new LevelProgress(run.backend);}
  export(){return JSON.stringify({schemaVersion:1,profile:this.profile.data,run:this.run.load()});}
  async push(port:PlatformSavePort){try{if(this.profile.blocked||this.run.needsReset)throw new Error('Damaged local save');await port.save(this.export());this.syncError='';return true;}catch{this.syncError='Platform save unavailable; local save remains authoritative.';return false;}}
  async pullNewer(port:PlatformSavePort){
    try{
      const raw=await port.loadSave();if(!raw)return false;const d=JSON.parse(raw);if(d.schemaVersion!==1||!validProfile(d.profile)||(d.run!==null&&!validRun(d.run)))return false;
      let changed=false;
      if(d.profile.revision>this.profile.data.revision){
        const local=this.profile.data,remote=d.profile;
        const compatible=Object.keys(local.settledRuns).every(id=>remote.settledRuns[id])&&local.claimedFirstClear.every(id=>remote.claimedFirstClear.includes(id))&&local.missions.claimed.every(id=>remote.missions.claimed.includes(id))&&Object.keys(local.upgradeLevels).every(id=>remote.upgradeLevels[id]>=local.upgradeLevels[id as keyof typeof local.upgradeLevels]);
        if(!compatible){this.syncError='Save conflict: local purchases and receipts were retained.';return false;}
        for(const [id,stars]of Object.entries(local.bestStars))remote.bestStars[id]=Math.max(stars,remote.bestStars[id]??0);
        for(const [id,time]of Object.entries(local.bestTimes))remote.bestTimes[id]=Math.min(time,remote.bestTimes[id]??Infinity);
        remote.highestUnlockedLevel=Math.max(local.highestUnlockedLevel,remote.highestUnlockedLevel);remote.completedLevels=[...new Set([...local.completedLevels,...remote.completedLevels])];
        remote.dailyChallengeDate=local.dailyChallengeDate>remote.dailyChallengeDate?local.dailyChallengeDate:remote.dailyChallengeDate;remote.dailyClaimedAt=Math.max(local.dailyClaimedAt,remote.dailyClaimedAt);
        commitCopy(this.run.backend,PROFILE_KEY,remote);this.profile.data=remote;this.profile.blocked=false;this.profile.error='';changed=true;
      }
      const current=readCopies(this.run.backend,SAVE_KEY,validRun).copies.sort((a,b)=>b.revision-a.revision)[0];
      if(d.run&&(!current||d.run.revision>current.revision)){
        if(current&&current.runId===d.run.runId){
          d.run.freeRescueUsed ||=current.freeRescueUsed;d.run.extraRescueUsed ||=current.extraRescueUsed;
          d.run.claimedPickupIds=[...new Set([...current.claimedPickupIds,...d.run.claimedPickupIds])];
          d.run.totalRescues=Math.max(current.totalRescues,d.run.totalRescues);d.run.retries=Math.max(current.retries,d.run.retries);
        }
        commitCopy(this.run.backend,SAVE_KEY,d.run);changed=true;
      }
      return changed;
    }catch{this.syncError='Platform restore unavailable; local state was retained.';return false;}
  }
}
