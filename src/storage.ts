export interface SaveBackend {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void;}
export class MemorySaveBackend implements SaveBackend {
  private values=new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
  removeItem(key:string){this.values.delete(key);}
}
export function localBackend():SaveBackend|null {try{return window.localStorage;}catch{return null;}}
export function readCopies<T>(backend:SaveBackend|null,key:string,valid:(v:any)=>v is T):{copies:T[];damaged:boolean}{
  const raw=[key,key+'-staging',key+'-backup'].map(k=>backend?.getItem(k)??null);
  const copies=raw.flatMap(text=>{try{const value=JSON.parse(text??'null');return valid(value)?[value]:[];}catch{return [];}});
  return{copies,damaged:raw.some(Boolean)&&!copies.length};
}
export function commitCopy(backend:SaveBackend|null,key:string,value:unknown){
  if(!backend)throw new Error('Storage unavailable');
  const text=JSON.stringify(value);backend.setItem(key+'-staging',text);
  if(backend.getItem(key+'-staging')!==text)throw new Error('Staging verification failed');
  backend.setItem(key,text);backend.setItem(key+'-backup',text);backend.removeItem(key+'-staging');
}
