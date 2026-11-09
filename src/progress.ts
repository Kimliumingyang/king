import {allLevels} from './terrain';
import {cfg} from './physics';
import type {RunState} from './save';
import {commitCopy,localBackend,readCopies,type SaveBackend} from './storage';
import rules from '../data/economy_rules.json';
export {rules as economyRules};
export const PROFILE_KEY='ddtk-profile-v2';
export type UpgradeId=keyof typeof cfg.upgrades;
export type Upgrades=Record<UpgradeId,number>;
export const zeroUpgrades=():Upgrades=>Object.fromEntries(Object.keys(cfg.upgrades).map(k=>[k,0])) as Upgrades;
export interface Receipt {runId:string;levelId:string;stars:number;seconds:number;coins:number;base:number;pickups:number;firstClear:number;threeStar:number;daily:number;}
export interface Profile {
  schemaVersion:2;revision:number;highestUnlockedLevel:number;coinsWallet:number;upgradeLevels:Upgrades;
  bestStars:Record<string,number>;bestTimes:Record<string,number>;completedLevels:string[];claimedFirstClear:string[];
  settledRuns:Record<string,Receipt>;missions:{claimed:string[]};settings:typeof cfg.settings;
  dailyChallengeDate:string;dailyClaimedAt:number;lastSavedAt:number;
}
export const localDay=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const validList=(v:any)=>Array.isArray(v)&&v.every(id=>allLevels.some(l=>l.id===id));
export function validProfile(v:any):v is Profile {
  return !!v&&v.schemaVersion===2&&Number.isInteger(v.revision)&&v.revision>=0&&Number.isInteger(v.coinsWallet)&&v.coinsWallet>=0
    &&Number.isInteger(v.highestUnlockedLevel)&&v.highestUnlockedLevel>=1&&v.highestUnlockedLevel<=allLevels.length
    &&v.upgradeLevels&&Object.entries(cfg.upgrades).every(([id,c])=>Number.isInteger(v.upgradeLevels[id])&&v.upgradeLevels[id]>=0&&v.upgradeLevels[id]<=c.maxLevel)
    &&validList(v.completedLevels)&&validList(v.claimedFirstClear)&&v.bestStars&&Object.values(v.bestStars).every((n:any)=>Number.isInteger(n)&&n>=1&&n<=3)
    &&v.bestTimes&&Object.values(v.bestTimes).every((n:any)=>Number.isFinite(n)&&n>=0)&&v.settledRuns&&typeof v.settledRuns==='object'
    &&Object.entries(v.settledRuns).every(([id,r]:[string,any])=>r?.runId===id&&allLevels.some(l=>l.id===r.levelId)&&Number.isInteger(r.coins)&&r.coins>=0&&r.stars>=1&&r.stars<=3)
    &&Array.isArray(v.missions?.claimed)&&v.missions.claimed.every((id:any)=>rules.missions.some(m=>m.id===id))&&typeof v.dailyChallengeDate==='string'&&Number.isFinite(v.dailyClaimedAt)&&v.dailyClaimedAt>=0&&Number.isFinite(v.lastSavedAt)&&v.settings&&typeof v.settings.muted==='boolean';
}
function emptyProfile():Profile{return{schemaVersion:2,revision:0,highestUnlockedLevel:1,coinsWallet:0,upgradeLevels:zeroUpgrades(),bestStars:{},bestTimes:{},completedLevels:[],claimedFirstClear:[],settledRuns:{},missions:{claimed:[]},settings:structuredClone(cfg.settings),dailyChallengeDate:'',dailyClaimedAt:0,lastSavedAt:Date.now()};}
export function starsFor(run:RunState){
  const l=allLevels.find(l=>l.id===run.levelId)!;
  if(run.elapsedMs<=l.timeGoldSec*1000&&run.totalRescues===0&&run.retries===0&&run.dangerCount<=2)return 3;
  if(run.elapsedMs<=l.timeSilverSec*1000&&run.totalRescues<=1)return 2;
  return 1;
}
export function upgradePrice(id:UpgradeId,current:number){return Math.round(cfg.upgrades[id].basePrice*cfg.economy.priceExponent**current/10)*10;}
export function upgradeValue(id:UpgradeId,count:number){
  const spec=cfg.upgrades[id];
  if(id==='rescue_kit')return `${((cfg.physics.king.ejectGraceMs+count*(cfg.upgrades.rescue_kit.dangerGraceBonusSec*1000))/1000).toFixed(2)}s grace`;
  const bonus=(spec as {bonusPerLevel:number}).bonusPerLevel;
  if(id==='battery')return `${(cfg.physics.boost.durationSecAtFull*(1+count*bonus)).toFixed(2)}s Boost`;
  if(id==='grip')return `${(cfg.physics.king.friction*(1+count*bonus)).toFixed(3)} friction`;
  return `+${Math.round(count*bonus*100)}% ${id==='engine'?'thrust':'stability'}`;
}
export class LevelProgress {
  data:Profile=emptyProfile();error='';blocked=false;
  constructor(public backend:SaveBackend|null=localBackend()){
    try{
      const read=readCopies(backend,PROFILE_KEY,validProfile);
      if(read.copies.length)this.data=read.copies.sort((a,b)=>b.revision-a.revision)[0];
      else if(read.damaged){this.blocked=true;this.error='Profile copies are damaged. Wallet is preserved in storage; start/retry remains free.';}
      else{
        // Stage 3 unlocks migrate without inventing previous coin payments.
        const old=readCopies<any>(backend,'ddtk-level-progress-v1',(v:any):v is any=>!!v&&Number.isInteger(v.revision)&&validList(v.completedLevels)&&Number.isInteger(v.highestUnlockedLevel)&&v.highestUnlockedLevel>=1&&v.highestUnlockedLevel<=15);
        if(old.copies.length){const previous=old.copies.sort((a,b)=>b.revision-a.revision)[0];this.data.highestUnlockedLevel=previous.highestUnlockedLevel;this.data.completedLevels=[...previous.completedLevels];}
      }
      if(!backend)this.error='Profile storage unavailable. Keep this tab open.';
    }catch{this.error='Profile storage unavailable. Free gameplay remains available.';}
  }
  refresh(){
    const current=new LevelProgress(this.backend);
    if(current.blocked){this.blocked=true;this.error=current.error;return false;}
    if(current.data.revision>this.data.revision){this.data=current.data;this.blocked=false;this.error=current.error;return true;}
    return false;
  }
  private transaction(change:(draft:Profile)=>boolean){
    if(this.blocked)return false;
    try{
      const read=readCopies(this.backend,PROFILE_KEY,validProfile);
      if(read.copies.length){const latest=read.copies.sort((a,b)=>b.revision-a.revision)[0];if(latest.revision>this.data.revision)this.data=latest;}
      const draft=structuredClone(this.data);if(!change(draft))return false;
      draft.revision++;draft.lastSavedAt=Date.now();if(!validProfile(draft))throw new Error('Profile validation');
      commitCopy(this.backend,PROFILE_KEY,draft);this.data=draft;this.error='';return true;
    }catch{this.error='Save incomplete. Reload or retry to confirm the result; free gameplay remains available.';return false;}
  }
  dailyAvailable(now=new Date()){
    return localDay(now)>this.data.dailyChallengeDate&&(this.data.dailyClaimedAt===0||now.getTime()-this.data.dailyClaimedAt>=rules.daily.minimumClaimGapHours*3600000);
  }
  settle(run:RunState,now=new Date()):Receipt|null {
    if(run.status!=='complete')return null;
    // Reloading a completed run, repeated callbacks and save-recovery all use the same receipt.
    let receipt=this.data.settledRuns[run.runId];if(receipt)return receipt;
    this.transaction(d=>{
      if(d.settledRuns[run.runId]){receipt=d.settledRuns[run.runId];return false;}
      const l=allLevels.find(l=>l.id===run.levelId)!;const stars=starsFor(run);
      const first=d.claimedFirstClear.includes(l.id)?0:cfg.economy.firstClearBonusCoins;
      const daily=run.dailyChallengeDate===localDay(now)&&run.totalRescues===0&&run.retries===0&&run.dailyChallengeDate>d.dailyChallengeDate&&(d.dailyClaimedAt===0||now.getTime()-d.dailyClaimedAt>=rules.daily.minimumClaimGapHours*3600000)?rules.daily.reward:0;
      const base=cfg.economy.levelClearBaseCoins+(l.index-1)*cfg.economy.increasePerLevel,pickups=Math.min(cfg.economy.pickupCoinCapPerRun,run.runCoins),threeStar=stars===3?cfg.economy.threeStarBonusCoins:0;
      receipt={runId:run.runId,levelId:l.id,stars,seconds:run.elapsedMs/1000,coins:base+pickups+first+threeStar+daily,base,pickups,firstClear:first,threeStar,daily};
      d.settledRuns[run.runId]=receipt;d.coinsWallet+=receipt.coins;
      d.highestUnlockedLevel=Math.max(d.highestUnlockedLevel,Math.min(15,l.index+1));d.completedLevels=[...new Set([...d.completedLevels,l.id])];d.claimedFirstClear=[...new Set([...d.claimedFirstClear,l.id])];
      d.bestStars[l.id]=Math.max(d.bestStars[l.id]??0,stars);d.bestTimes[l.id]=Math.min(d.bestTimes[l.id]??Infinity,receipt.seconds);
      if(daily){d.dailyChallengeDate=run.dailyChallengeDate!;d.dailyClaimedAt=now.getTime();}
      return true;
    });
    return this.data.settledRuns[run.runId]??null;
  }
  purchase(id:UpgradeId,expectedLevel=this.data.upgradeLevels[id]){
    return this.transaction(d=>{const n=d.upgradeLevels[id];if(n!==expectedLevel){this.error='Upgrade changed in another save. Review the new level and price.';return false;}if(n>=cfg.upgrades[id].maxLevel){this.error='Already at maximum level.';return false;}const price=upgradePrice(id,n);if(d.coinsWallet<price){this.error='Not enough coins. Deliveries earn coins without ads.';return false;}d.coinsWallet-=price;d.upgradeLevels[id]++;return true;});
  }
  setMuted(value:boolean){return this.transaction(d=>{d.settings.muted=value;return true;});}
  claimMission(id:string){return this.transaction(d=>{const m=rules.missions.find(m=>m.id===id);if(!m||d.missions.claimed.includes(id)||!d.completedLevels.includes(m.levelId))return false;d.missions.claimed.push(id);d.coinsWallet+=m.reward;return true;});}
}
