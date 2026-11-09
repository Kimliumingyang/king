import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const p=await browser.newPage();p.on('pageerror',e=>console.log('ERROR',e.message));await p.goto('http://localhost:5173/?debug=1');await p.waitForFunction(()=>window.__test?.loadLevel);
const results=[];for(let level=1;level<=5;level++){
 const result=await p.evaluate(index=>{
 const t=window.__test;t.loadLevel(index);t.setPaused(true);const s=t.sim;let trace=[];let maxAngle=0,maxRisk=0;
 for(let i=0;i<30000;i++){
  const x=s.ufo.position.x,v=s.ufo.velocity.x*60;
  let target=x<s.layout.finish-130?35:Math.max(0,(s.layout.finish-x)*.6);
  let boost=false;
  t.step(v<target-2?1:v>target+2?-1:0,boost);
  maxAngle=Math.max(maxAngle,Math.abs(s.ufo.angle)*180/Math.PI);maxRisk=Math.max(maxRisk,s.risk);
  if(i%600===0)trace.push([i,x,s.king.position.x-x,s.state]);
  if(['KING_EJECTED','FAIL_MENU','CLEAR'].includes(s.state))return {index,state:s.state,time:i/60,x:s.ufo.position.x,k:s.king.position.x-s.ufo.position.x,maxAngle,maxRisk,trace,sections:s.layout.sections};
 }
 return {index,state:s.state,trace};
 },level);results.push(result);console.log({level:result.index,state:result.state,time:result.time,x:result.x});
}
writeFileSync('evidence/stage3-gate-L01-L05.json',JSON.stringify(results,null,2));if(results.some(r=>r.state!=='CLEAR'))process.exitCode=1;await browser.close();
