import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.TEST_URL||'http://localhost:5173/?debug=1');await page.waitForFunction(()=>window.__test?.loadLevel);
const results=[];const traces={};
for(let index=1;index<=15;index++){
 const result=await page.evaluate(index=>{
  const t=window.__test;t.loadLevel(index);t.setPaused(true);const s=t.sim;
  const trace=[];let maxAngle=0,maxSeesaw=0,maxRisk=0,maxOffMs=0,bridgeFalls=0,steps=0;
  for(;steps<30000;steps++){
   const x=s.ufo.position.x,v=s.ufo.velocity.x*60;
   let target=x<s.layout.finish-130?(index<=5?35:index===14?55:60):Math.max(0,(s.layout.finish-x)*.6),boost=false;
   if(index>5)for(const section of s.layout.sections){
    if(x<section.x-100||x>section.end+100)continue;
    if(['crumbling_bridge','gap_jump','moving_platform'].includes(section.type)){
     target=section.type==='moving_platform'?115:95;
     boost=x>section.gapStart-35&&x<section.gapEnd+35&&s.energy>.02;
    }
    if(['low_ceiling','seesaw'].includes(section.type)){target=35;boost=false;}
   }
   const direction=v<target-2?1:v>target+2?-1:0;t.step(direction,boost);
   maxAngle=Math.max(maxAngle,Math.abs(s.ufo.angle)*180/Math.PI);maxRisk=Math.max(maxRisk,s.risk);maxOffMs=Math.max(maxOffMs,s.offMs);
   for(const d of s.dynamics)if(d.type==='seesaw')maxSeesaw=Math.max(maxSeesaw,Math.abs(d.body.angle)*180/Math.PI);
   bridgeFalls=Math.max(bridgeFalls,s.dynamics.filter(d=>d.fallen).length);
   if(steps%30===0)trace.push({tick:steps,x:s.ufo.position.x,y:s.ufo.position.y,kingX:s.king.position.x,angle:s.ufo.angle,direction,boost,state:s.state});
   if(['KING_EJECTED','FAIL_MENU','CLEAR'].includes(s.state))break;
  }
  return{level:index,id:s.config.id,state:s.state,seconds:(steps+1)/60,kingIndependent:s.king!==s.ufo,maxAngle,maxSeesaw,maxRisk,maxOffMs,bridgeFalls,checkpoint:t.session.run.checkpointId,expectedCheckpoints:s.config.checkpointsMeters.length,freeRescueUsed:t.session.run.freeRescueUsed,retries:t.session.run.retries,layoutErrors:s.layout.errors,sections:s.layout.sections,trace};
 },index);
 traces[result.id]=result.trace;delete result.trace;
 console.log(result.id,result.state,result.seconds.toFixed(2)+'s','checkpoint',result.checkpoint,'seesaw',result.maxSeesaw.toFixed(1)+'°');
 assert.equal(result.state,'CLEAR',JSON.stringify(result));assert.equal(result.freeRescueUsed,false);assert.equal(result.retries,0);assert.equal(result.checkpoint,result.expectedCheckpoints);assert.deepEqual(result.layoutErrors,[]);assert(result.maxSeesaw<=18);
 results.push(result);
 if([4,8,15].includes(index))await page.screenshot({path:`evidence/stage3-${result.id}-docked.png`});
}
writeFileSync('evidence/stage3-level-results.json',JSON.stringify(results,null,2));writeFileSync('evidence/stage3-input-traces.json',JSON.stringify(traces));assert.deepEqual(errors,[]);
await browser.close();
