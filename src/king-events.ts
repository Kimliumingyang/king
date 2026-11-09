import spec from '../data/king_events.json';
import tuning from '../data/stage5_tuning.json';
export type EventId=typeof spec.events[number]['id'];
export type EventDefinition=typeof spec.events[number];
export interface EventSnapshot {helpedAtFailure?:number;clock:number;sequence:number;nextAt:number;lastAt:number;lastById:Record<string,number>;pending:string|null;warningLeft:number;active:string|null;activeLeft:number;direction:number;fired:number;gentle:boolean;}
export const eventSpec=spec;
export class KingEvents {
 data:EventSnapshot={clock:0,sequence:0,nextAt:18000,lastAt:-18000,lastById:{},pending:null,warningLeft:0,active:null,activeLeft:0,direction:1,fired:0,gentle:false};
 history:{id:string;clock:number;gentle:boolean}[]=[];
 constructor(public seed:number,public level:number,public intensity:number,saved?:EventSnapshot){if(saved)this.data=structuredClone(saved);}
 get pending(){return spec.events.find(e=>e.id===this.data.pending);}
 get active(){return spec.events.find(e=>e.id===this.data.active);}
 random(index:number){let n=(this.seed^Math.imul(index+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return((n^(n>>>15))>>>0)/4294967296;}
 cancel(){this.data.pending=null;this.data.warningLeft=0;this.data.active=null;this.data.activeLeft=0;this.data.nextAt=Math.max(this.data.nextAt,this.data.clock+1500);}
 update(dt:number,safe:boolean,failures:number):EventDefinition|null {
  const s=this.data;s.clock+=dt;s.activeLeft=Math.max(0,s.activeLeft-dt);if(!s.activeLeft)s.active=null;
  if(!safe){if(s.pending){s.pending=null;s.warningLeft=0;s.nextAt=Math.max(s.nextAt,s.clock+1000);}return null;}
  if(s.pending){
   s.warningLeft=Math.max(0,s.warningLeft-dt);
   if(s.warningLeft>0)return null;
   const event=this.pending!;s.pending=null;s.active=event.id;s.activeLeft=tuning.eventActiveMs;s.lastAt=s.clock;s.lastById[event.id]=s.clock;s.fired++;
   s.gentle=failures>=tuning.gentleFirstEventAfterFailures&&event.physicsEffect.type!=='none'&&failures>(s.helpedAtFailure??0);if(s.gentle)s.helpedAtFailure=failures;s.nextAt=s.clock+spec.globalRules.minTimeBetweenEventsSec*1000;
   this.history.push({id:event.id,clock:s.clock,gentle:s.gentle});return event;
  }
  if(s.clock<s.nextAt||s.active)return null;
  const seq=s.sequence++;s.nextAt=s.clock+2500;
  if(this.random(seq*3)>tuning.eventChancePerWindow)return null;
  const choices=spec.events.filter(e=>e.minLevel<=this.level&&s.clock-(s.lastById[e.id]??-Infinity)>=e.cooldownSec*1000);
  if(!choices.length)return null;
  const event=choices[Math.floor(this.random(seq*3+1)*choices.length)];s.pending=event.id;s.direction=this.random(seq*3+2)<.5?-1:1;s.warningLeft=Math.max(event.warningMs,spec.globalRules.warnAtLeastMs);return null;
 }
}
export function validEventSnapshot(v:any):v is EventSnapshot {
 return !!v&&(v.helpedAtFailure===undefined||(Number.isInteger(v.helpedAtFailure)&&v.helpedAtFailure>=0))&&['clock','sequence','nextAt','warningLeft','activeLeft','fired'].every(k=>Number.isFinite(v[k])&&v[k]>=0)&&Number.isFinite(v.lastAt)&&[v.pending,v.active].every(id=>id===null||spec.events.some(e=>e.id===id))&&typeof v.gentle==='boolean'&&[-1,1].includes(v.direction)&&!!v.lastById&&Object.entries(v.lastById).every(([id,n])=>spec.events.some(e=>e.id===id)&&Number.isFinite(n)&&Number(n)>=0);
}
