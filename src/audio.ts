import {assetEntries} from './asset-loader';
const notes:Record<string,number[]>={menu:[60,64,67,72,67,64,62,65,69,72,69,65],royal_foothills:[60,67,64,72,69,67,65,69,62,67,64,60],wobbly_wastes:[57,64,60,67,63,60,58,65,62,68,64,59],moonlit_citadel:[62,69,65,74,72,69,67,70,65,69,64,62]};
/** Original lightweight synth placeholders; artist MP3 replacements keep the same cue IDs. */
export class RoyalAudio {
 context:AudioContext|null=null;master:GainNode|null=null;muted=false;paused=true;world='menu';clock=0;beat=0;nextBeat=0;
 events:{id:string;at:number}[]=[];cooldowns=new Map<string,number>();external=new Map<string,HTMLAudioElement>();loopNodes=new Map<string,{osc:OscillatorNode;gain:GainNode}>();unavailable=new Set<string>();
 async unlock(){try{if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.16;this.master.connect(this.context.destination);}if(this.context.state==='suspended')await this.context.resume();}catch{/* Silent free play if audio is unavailable. */}}
 mute(value:boolean){this.muted=value;if(this.master&&this.context)this.master.gain.setValueAtTime(value?0:.16,this.context.currentTime);for(const a of this.external.values())a.muted=value;}
 tone(f:number,duration:number,type:OscillatorType='sine',volume=.3,delay=0,end?:number){const c=this.context;if(!c||!this.master||this.muted||c.state!=='running')return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,c.currentTime+delay);if(end)o.frequency.exponentialRampToValueAtTime(end,c.currentTime+delay+duration);g.gain.setValueAtTime(.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(volume,c.currentTime+delay+.01);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);o.connect(g);g.connect(this.master);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.02);}
 replacement(id:string,loop=false){const entry=assetEntries.find(a=>a.enabled&&a.kind==='audio'&&a.id===id);if(!entry||this.unavailable.has(id))return false;let a=this.external.get(id);if(!a){a=new Audio('./'+entry.path);a.loop=loop;a.volume=id.startsWith('bgm_')?.18:id.startsWith('amb_')?.12:.45;a.muted=this.muted;a.addEventListener('error',()=>this.unavailable.add(id));this.external.set(id,a);}if(a.paused){if(!loop)a.currentTime=0;void a.play().catch(()=>{this.unavailable.add(id);});}else if(!loop){a.currentTime=0;void a.play().catch(()=>{});}return true;}
 play(id:string,minGap=180){if(this.muted||this.paused&& !['sfx_ui_click','sfx_ui_back','sfx_ui_denied','sfx_reward','sfx_upgrade','sfx_mission','sfx_fail'].includes(id))return;if(this.clock-(this.cooldowns.get(id)??-Infinity)<minGap)return;this.cooldowns.set(id,this.clock);this.events.push({id,at:this.clock});if(this.events.length>150)this.events.shift();if(this.replacement(id))return;
  if(['sfx_dock','sfx_reward','sfx_mission','sfx_upgrade'].includes(id)){[523,659,784].forEach((f,i)=>this.tone(f,.22,'triangle',.2,i*.1));return;}
  if(['sfx_warning','sfx_crown_drop'].includes(id)){this.tone(740,.12,'triangle',.25);this.tone(554,.15,'triangle',.2,.14);return;}
  if(['sfx_fail','sfx_eject'].includes(id)){this.tone(280,.45,'triangle',.25,0,70);return;}
  if(id==='sfx_rescue'){this.tone(150,.9,'sine',.3,0,900);return;}
  if(id==='sfx_nap'){this.tone(90,.65,'sine',.3,0,130);return;}
  const f=id==='sfx_pickup'?1050:id==='sfx_crown_hit'?470:id==='sfx_sneeze'?220:id==='sfx_hiccup'?130:id==='sfx_toast'?860:id==='sfx_scepter'?310:id==='sfx_hurry'?190:id==='sfx_slide'?100:440;
  this.tone(f,.15,'triangle',.2,0,f*.7);
 }
 setScene(world:string,paused:boolean){this.world=world;this.paused=paused;if(paused)this.stopLoops();}
 stopLoops(){for(const v of this.loopNodes.values()){v.osc.stop();}this.loopNodes.clear();for(const [id,a] of this.external)if(a.loop&&!id.startsWith('bgm_'))a.pause();}
 loop(id:string,on:boolean,freq:number){const ext=this.external.get(id);if(!on){const node=this.loopNodes.get(id);if(node){node.osc.stop();this.loopNodes.delete(id);}ext?.pause();return;}if(this.replacement(id,true))return;const c=this.context;if(!c||!this.master||this.muted||c.state!=='running')return;let n=this.loopNodes.get(id);if(!n){const osc=c.createOscillator(),gain=c.createGain();osc.type='sine';gain.gain.value=.06;osc.connect(gain);gain.connect(this.master);osc.start();n={osc,gain};this.loopNodes.set(id,n);}n.osc.frequency.setTargetAtTime(freq,c.currentTime,.12);}
 update(dt:number,playing:boolean,boost:boolean,speed:number){this.clock+=Math.min(dt,50);if(document.hidden||!this.context||this.context.state!=='running'){this.stopLoops();for(const a of this.external.values())a.pause();return;}const menu=this.world==='menu';const key=menu?'bgm_menu':this.world==='royal_foothills'?'bgm_foothills':this.world==='wobbly_wastes'?'bgm_wastes':'bgm_citadel';
  for(const [id,a] of this.external)if((id.startsWith('bgm_')&&id!==key)||(!menu&&!playing)||this.muted)a.pause();
  const music=(menu||playing)&&!this.muted;
  if(music&&!this.replacement(key,true)&&this.clock>=this.nextBeat){const seq=notes[this.world]??notes.menu;const midi=seq[this.beat++%seq.length];this.tone(440*2**((midi-69)/12),.4,'triangle',.08);if(this.beat%3===0)this.tone(440*2**((midi-81)/12),.55,'sine',.1);this.nextBeat=this.clock+(menu?490:430);}
  const amb=this.world==='royal_foothills'?'amb_foothills':this.world==='wobbly_wastes'?'amb_wastes':'amb_citadel';for(const [id,a] of this.external)if(id.startsWith('amb_')&&id!==amb)a.pause();if(playing)this.replacement(amb,true);else for(const [id,a] of this.external)if(id.startsWith('amb_'))a.pause();
  this.loop('sfx_hover_loop',playing,62+Math.min(25,speed*.12));this.loop('sfx_boost_loop',playing&&boost,120);
 }
 suspend(){this.stopLoops();for(const a of this.external.values())a.pause();void this.context?.suspend();}
}
