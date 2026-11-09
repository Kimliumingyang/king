import {Simulation,cfg,level,activateLevel} from './physics';
import {allLevels,AVAILABLE_LEVELS} from './terrain';
import {LevelProgress,localDay,economyRules,zeroUpgrades} from './progress';
import {GameSaveService} from './game-save';
import {RunStore,newRun,type RunState} from './save';
import stage2 from '../data/prototype_stage2.json';
export class Session {
  progress:LevelProgress;saves:GameSaveService;memoryUnlocked=1;
  sim:Simulation; run:RunState; rescueMs=0; rescueFrom={x:0,y:0}; restored=false;
  private autosave=0; private previousDanger=false;
  constructor(public store=new RunStore()){
    this.saves=new GameSaveService(store);this.progress=this.saves.profile;this.memoryUnlocked=this.progress.data.highestUnlockedLevel;
    const saved=store.load();this.run=saved??newRun(this.progress.data.upgradeLevels);this.restored=!!saved;activateLevel(this.run.levelId);
    this.sim=this.atCheckpoint();
    if(saved?.status==='failed'){this.sim.state='FAIL_MENU';this.sim.failureX=saved.failureX;}
    else if(saved?.status==='complete'){this.sim.state='CLEAR';this.settle();}
    else if(saved?.status==='rescuing'){this.run.status='active';this.sim.protectionMs=cfg.revive.freeRescueInvulnerableMs;}
    if(!store.error)store.save(this.run);
  }
  private atCheckpoint(){const s=new Simulation(level,this.run.runUpgradeSnapshot as ReturnType<typeof zeroUpgrades>,this.run.dailyChallengeDate?economyRules.daily.boostScale:1);s.spawnAt(this.run.checkpointId?level.checkpointsMeters[this.run.checkpointId-1]*cfg.pixelsPerMeter:0);s.elapsed=this.run.elapsedMs;return s;}
  save(allowNewRun=false){this.run.elapsedMs=this.sim.elapsed;return this.store.save(this.run,allowNewRun);}
  restart(){this.store.needsReset=false;this.run=newRun(this.progress.data.upgradeLevels,this.run.dailyChallengeDate);this.sim=this.atCheckpoint();this.rescueMs=0;this.previousDanger=false;this.save(true);}
  startLevel(index:number,qa=false){
    if(index<1||index>AVAILABLE_LEVELS||(!qa&&index>Math.max(this.memoryUnlocked,this.progress.data.highestUnlockedLevel)))return false;
    activateLevel(allLevels[index-1].id);this.run.dailyChallengeDate=undefined;this.restart();return true;
  }
  settle(){
    const receipt=this.progress.settle(this.run);this.memoryUnlocked=Math.max(this.memoryUnlocked,Math.min(15,level.index+1));return receipt;
  }
  startDaily(){if(!this.startLevel(economyRules.daily.levelIndex))return false;this.run.dailyChallengeDate=localDay();this.sim=this.atCheckpoint();this.save();return true;}
  retry(){
    if(this.sim.state!=='FAIL_MENU')return false;
    this.run.retries++;this.run.runCoins=Math.max(0,Math.floor(this.run.runCoins*(1-cfg.revive.checkpointCoinLossFraction)));
    this.run.status='active';this.sim=this.atCheckpoint();this.rescueMs=0;this.previousDanger=false;this.save();return true;
  }
  rescue(){
    if(this.sim.state!=='FAIL_MENU'||this.run.freeRescueUsed)return false;
    const anchor=this.sim.safeAnchor(this.run.failureX);if(anchor===null){this.store.error='No safe rescue position. Retry the checkpoint for free.';return false;}
    // Commit expenditure before changing any physics or playing the animation.
    const next={...this.run,freeRescueUsed:true,totalRescues:this.run.totalRescues+1,status:'rescuing' as const};
    if(!this.store.save(next))return false;
    this.run=next;this.rescueFrom={...this.sim.king.position};
    this.sim.spawnAt(anchor);this.sim.elapsed=this.run.elapsedMs;
    this.sim.state='REVIVE_ANIMATION';this.rescueMs=0;return true;
  }
  claim(id:string,value:number){
    if(!['RUNNING','DANGER','DOCKING'].includes(this.sim.state)||this.run.claimedPickupIds.includes(id))return false;
    this.run.claimedPickupIds.push(id);this.run.runCoins=Math.min(cfg.economy.pickupCoinCapPerRun,this.run.runCoins+value);this.save();return true;
  }
  step(direction:number,boost:boolean){
    if(this.sim.state==='REVIVE_ANIMATION'){
      this.rescueMs+=1000/cfg.physics.fixedStepHz;
      if(this.rescueMs+1e-6>=stage2.rescueAnimationMs){this.sim.state='RUNNING';this.sim.protectionMs=cfg.revive.freeRescueInvulnerableMs;this.run.status='active';this.save();}
      return;
    }
    const was=this.sim.state;this.sim.step(direction,boost);
    if(['RUNNING','DANGER','DOCKING'].includes(this.sim.state)){
      this.run.elapsedMs=this.sim.elapsed;this.run.furthestX=Math.max(this.run.furthestX,this.sim.ufo.position.x);
      if(this.sim.state==='DANGER'&&!this.previousDanger)this.run.dangerCount++;
      this.previousDanger=this.sim.state==='DANGER';
      const checkpoint=level.checkpointsMeters.findIndex((m,i)=>i+1>this.run.checkpointId&&this.sim.ufo.position.x>=m*cfg.pixelsPerMeter&&this.sim.aboard);
      if(checkpoint>=0){this.run.checkpointId=this.run.lastCheckpointId=checkpoint+1;this.save();}
      for(const coin of this.sim.layout.pickups())if(Math.abs(this.sim.ufo.position.x-coin.x)<36&&this.sim.aboard)this.claim(coin.id,coin.value);
      this.autosave+=1000/cfg.physics.fixedStepHz;if(this.autosave>=stage2.autosaveMs){this.autosave=0;this.save();}
    }
    if(this.sim.state==='KING_EJECTED'&&was!=='KING_EJECTED'){
      this.run.status='failed';this.run.failureX=this.sim.failureX;this.run.elapsedMs=this.sim.elapsed;this.save();
    }
    if(this.sim.state==='CLEAR'&&was!=='CLEAR'){this.run.status='complete';this.save();this.settle();}
  }
}
