import {allLevels} from './terrain';
interface Progress { revision:number; highestUnlockedLevel:number; completedLevels:string[]; }
const KEY='ddtk-level-progress-v1';
export class LevelProgress {
  data:Progress={revision:0,highestUnlockedLevel:1,completedLevels:[]};error='';
  constructor(){
    try{
      const copies=[KEY,KEY+'-staging',KEY+'-backup'].flatMap(k=>{try{const d=JSON.parse(localStorage.getItem(k)??'null');return d&&Number.isInteger(d.revision)&&Number.isInteger(d.highestUnlockedLevel)&&d.highestUnlockedLevel>=1&&d.highestUnlockedLevel<=allLevels.length&&Array.isArray(d.completedLevels)&&d.completedLevels.every((id:any)=>allLevels.some(l=>l.id===id))?[d]:[];}catch{return [];}});
      if(copies.length)this.data=copies.sort((a,b)=>b.revision-a.revision)[0];
      else if([KEY,KEY+'-staging',KEY+'-backup'].some(k=>localStorage.getItem(k)!==null))this.error='Level progress is damaged. Current run remains playable.';
    }catch{this.error='Progress storage unavailable.';}
  }
  complete(id:string){
    const level=allLevels.find(l=>l.id===id);if(!level)return;
    this.data.completedLevels=[...new Set([...this.data.completedLevels,id])];
    this.data.highestUnlockedLevel=Math.max(this.data.highestUnlockedLevel,Math.min(allLevels.length,level.index+1));
    this.data.revision++;
    try{const text=JSON.stringify(this.data);localStorage.setItem(KEY+'-staging',text);localStorage.setItem(KEY,text);localStorage.setItem(KEY+'-backup',text);localStorage.removeItem(KEY+'-staging');this.error='';}catch{this.error='Could not save level unlock. Keep this tab open.';}
  }
}
