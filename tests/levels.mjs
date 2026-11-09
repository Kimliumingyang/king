import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.TEST_URL||'http://localhost:5173/?debug=1');await page.waitForFunction(()=>window.__test?.loadLevel);
const results=[];const traces={};const mode=process.env.UPGRADE_MODE||'zero';
for(let index=1;index<=15;index++){
 const result=await page.evaluate(({index,mode})=>{
  const t=window.__test;t.session.progress.data.upgradeLevels=Object.fromEntries(['engine','stabilizer','grip','battery','rescue_kit'].map(k=>[k,mode==='zero'?0:mode==='basic'?1:k==='rescue_kit'?3:4]));t.loadLevel(index);t.setPaused(true);let s=t.sim;let rescued=false;
  const trace=[];let maxAngle=0,maxSeesaw=0,maxRisk=0,maxOffMs=0,bridgeFalls=0,steps=0;
  for(;steps<30000;steps++){
   const x=s.ufo.position.x,v=s.ufo.velocity.x*60;
   const maxLate=mode==='max'&&index>=12&&index<15;
   let target=x<s.layout.finish-130?(maxLate?80:index<=5?35:index===14?75:index===15?100:60):Math.max(0,(s.layout.finish-x)*.6),boost=false;
   if(index>=4)for(const section of s.layout.sections){
    if(x<section.x-100||x>section.end+100)continue;
    if(['crumbling_bridge','gap_jump','moving_platform'].includes(section.type)){
     target=index===15?150:maxLate||index===14?140:section.type==='moving_platform'?125:130;
     boost=x>section.gapStart-30&&x<section.gapEnd+15&&s.energy>.02;
    }
    if(['low_ceiling','seesaw'].includes(section.type)){target=index===15?50:maxLate?40:35;boost=false;}
    if(['rolling_waves','sudden_dip','steep_ramp','spring_mushroom'].includes(section.type)){target=index===15?50:maxLate?40:index===14?35:index>=11?30:35;boost=false;}
   }
   const direction=v<target-2?1:v>target+2?-1:0;t.step(direction,boost);
   if(mode==='basic'&&!rescued&&t.session.run.checkpointId>=1){t.dislodge();for(let n=0;n<180;n++)t.step(0);if(!t.session.rescue())throw Error('Rescue failed');t.step(0);for(let n=0;n<65;n++)t.step(0);s=t.sim;rescued=true;}
   maxAngle=Math.max(maxAngle,Math.abs(s.ufo.angle)*180/Math.PI);maxRisk=Math.max(maxRisk,s.risk);maxOffMs=Math.max(maxOffMs,s.offMs);
   for(const d of s.dynamics)if(d.type==='seesaw')maxSeesaw=Math.max(maxSeesaw,Math.abs(d.body.angle)*180/Math.PI);
   bridgeFalls=Math.max(bridgeFalls,s.dynamics.filter(d=>d.fallen).length);
   if(steps%30===0)trace.push({tick:steps,x:s.ufo.position.x,y:s.ufo.position.y,kingX:s.king.position.x,angle:s.ufo.angle,direction,boost,state:s.state});
   if(['KING_EJECTED','FAIL_MENU','CLEAR'].includes(s.state))break;
  }
  return{level:index,id:s.config.id,state:s.state,seconds:(steps+1)/60,kingIndependent:s.king!==s.ufo,maxAngle,maxSeesaw,maxRisk,maxOffMs,bridgeFalls,checkpoint:t.session.run.checkpointId,expectedCheckpoints:s.config.checkpointsMeters.length,upgradeMode:mode,upgradeSnapshot:t.session.run.runUpgradeSnapshot,freeRescueUsed:t.session.run.freeRescueUsed,retries:t.session.run.retries,layoutErrors:s.layout.errors,sections:s.layout.sections,trace};
 },{index,mode});
 traces[result.id]=result.trace;delete result.trace;
 console.log(result.id,result.state,result.seconds.toFixed(2)+'s','checkpoint',result.checkpoint,'seesaw',result.maxSeesaw.toFixed(1)+'°');
 assert.equal(result.state,'CLEAR',JSON.stringify(result));assert.equal(result.freeRescueUsed,mode==='basic');assert.equal(result.retries,0);assert.equal(result.checkpoint,result.expectedCheckpoints);assert.deepEqual(result.layoutErrors,[]);assert(result.maxSeesaw<=18);
 results.push(result);
 if(mode==='zero'&&[4,8,15].includes(index))await page.screenshot({path:`evidence/stage4-${result.id}-docked.png`});
}
writeFileSync(`evidence/stage4-${mode}-level-results.json`,JSON.stringify(results,null,2));writeFileSync(`evidence/stage4-${mode}-input-traces.json`,JSON.stringify(traces));assert.deepEqual(errors,[]);
await browser.close();
