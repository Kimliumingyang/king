import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.TEST_URL||'http://localhost:5173/?debug=1';const KEY='ddtk-stage2-run-v1';const results=[];
const pass=(name,detail={})=>{results.push({name,pass:true,...detail});console.log('PASS',name);};
const load=async()=>{await page.goto(url);await page.waitForFunction(()=>window.__test?.dislodge);};
await load();await page.getByRole('button',{name:'PLAY',exact:true}).click();pass('first launch / real PLAY button');
await page.evaluate(()=>{const t=window.__test;t.reset();t.setPaused(true);let s=t.session;for(let i=0;i<1800&&s.sim.ufo.position.x<620;i++){const v=s.sim.ufo.velocity.x*60;s.step(v<33?1:v>37?-1:0,false);}});
let run=await page.evaluate(()=>window.__test.session.run);assert.equal(run.checkpointId,1);assert(run.claimedPickupIds.includes('L01-p01'));assert.equal(run.lastCheckpointId,run.checkpointId);pass('actual input traversal activates and saves 240m checkpoint',{checkpoint:run.checkpointId});
await page.evaluate(()=>{const t=window.__test;t.dislodge();for(let i=0;i<20;i++)t.step(0);});
assert.equal(await page.evaluate(()=>window.__test.sim.state),'DANGER');pass('departure starts real grace window');
await page.evaluate(()=>{const t=window.__test;for(let i=0;i<25;i++)t.step(0);});
assert.equal(await page.evaluate(()=>window.__test.sim.state),'KING_EJECTED');const frozen=await page.evaluate(()=>({coins:window.__test.session.run.runCoins,d:window.__test.session.run.furthestX,time:window.__test.session.run.elapsedMs}));
await page.evaluate(()=>{const t=window.__test;for(let i=0;i<80;i++)t.step(0);t.failMenu();});
assert.equal(await page.evaluate(()=>window.__test.sim.state),'FAIL_MENU');assert.deepEqual(await page.evaluate(()=>({coins:window.__test.session.run.runCoins,d:window.__test.session.run.furthestX,time:window.__test.session.run.elapsedMs})),frozen);pass('1.2s ejection / economy, distance and gameplay time frozen');
await page.screenshot({path:'evidence/stage2-failure-desktop.png'});
const runId=run.runId;
await page.getByRole('button',{name:'ROYAL RESCUE — FREE',exact:true}).click();
const rescue=await page.evaluate(()=>{const t=window.__test;t.setPaused(true);return {state:t.sim.state,run:t.session.run,overlaps:t.overlaps(),vx:t.sim.ufo.velocity.x,vy:t.sim.king.velocity.y};});
assert.equal(rescue.state,'REVIVE_ANIMATION');assert.equal(rescue.run.freeRescueUsed,true);assert.equal(rescue.overlaps,0);assert.equal(rescue.vx,0);assert.equal(rescue.vy,0);
await page.evaluate(()=>{for(let i=0;i<25;i++)window.__test.step(0);});await page.screenshot({path:'evidence/stage2-rescue-magnet.png'});pass('one free rescue / zero velocities / collision-safe spawn / magnet animation');
await page.reload();await page.waitForFunction(()=>window.__test?.dislodge);
run=await page.evaluate(()=>window.__test.session.run);assert.equal(run.runId,runId);assert.equal(run.freeRescueUsed,true);assert.equal(run.checkpointId,1);
await page.getByRole('button',{name:'CONTINUE',exact:true}).click();
let protection=await page.evaluate(()=>{const t=window.__test;t.setPaused(true);for(let i=0;i<60;i++)t.step(0);return {ms:t.sim.protectionMs,contact:t.sim.contacts.length,overlaps:t.overlaps(),mask:t.sim.king.collisionFilter.mask};});
assert(protection.ms>1300&&protection.ms<=1500);assert(protection.contact>0);assert.equal(protection.overlaps,0);assert.equal(protection.mask,0xFFFFFFFF);pass('refresh during rescue cannot restore ticket / 2.5s protection with collisions',{protection});
// Thirty repeated failures across eight L01 terrain positions, with fixture displacement only.
await page.evaluate(()=>{localStorage.setItem('ddtk-permanent-wallet-test','1234');});
const cycle=[];
for(let i=0;i<30;i++){
 const x=[0,180,330,576,780,850,1000,1150][i%8];
 await page.evaluate(x=>{const t=window.__test;t.setPaused(true);t.dislodge(x);for(let j=0;j<130;j++)t.step(0);t.failMenu();},x);
 assert.equal(await page.getByRole('button',{name:'ROYAL RESCUE — FREE',exact:true}).count(),0);
 const state=await page.evaluate(()=>({state:window.__test.sim.state,coins:window.__test.session.run.runCoins}));assert.equal(state.state,'FAIL_MENU');
 const retry=await page.evaluate(()=>{const t=window.__test;[...document.querySelectorAll('#actions button')].find(b=>b.textContent==='RETRY CHECKPOINT').click();t.setPaused(true);return {state:t.sim.state,x:t.sim.ufo.position.x,vx:t.sim.ufo.velocity.x,vy:t.sim.king.velocity.y,overlap:t.overlaps(),run:structuredClone(t.session.run)};});
 assert.equal(retry.state,'RUNNING');assert.equal(retry.x,576);assert.equal(retry.vx,0);assert.equal(retry.vy,0);assert.equal(retry.overlap,0);assert.equal(retry.run.freeRescueUsed,true);assert.equal(retry.run.runCoins,Math.floor(state.coins*.8));assert.equal(retry.run.runId,runId);
 const survival=await page.evaluate(()=>{const t=window.__test;for(let j=0;j<90;j++)t.step(0);return {state:t.sim.state,claim:t.session.claim('L01-p01',5)};});assert.equal(survival.state,'RUNNING');assert.equal(survival.claim,false);
 cycle.push({cycle:i+1,deathX:x,checkpointX:retry.x,retries:retry.run.retries,runCoins:retry.run.runCoins});
}
assert.equal(await page.evaluate(()=>localStorage.getItem('ddtk-permanent-wallet-test')),'1234');pass('30 failures/retries, no overlap or soft-lock; rescue stays used; no duplicate pickups',{cycles:cycle});
await page.reload();await page.waitForFunction(()=>window.__test?.dislodge);assert.equal(await page.evaluate(()=>window.__test.session.run.retries),30);assert.equal(await page.evaluate(()=>window.__test.session.run.freeRescueUsed),true);pass('30 retries survive refresh');
// Corrupt primary, retaining independently validated backup.
await page.evaluate(key=>{addEventListener('pagehide',e=>e.stopImmediatePropagation(),true);localStorage.setItem(key,'{broken');},KEY);await page.reload();await page.waitForFunction(()=>window.__test?.dislodge);assert.equal(await page.evaluate(()=>window.__test.session.run.freeRescueUsed),true);assert.equal(await page.evaluate(()=>window.__test.session.run.retries),30);pass('damaged primary restores valid backup without refunding rescue');
// Crash after staging commit, before main key: newer staging wins.
await page.evaluate(key=>{addEventListener('pagehide',e=>e.stopImmediatePropagation(),true);const v=JSON.parse(localStorage.getItem(key));v.revision+=1;v.retries=31;localStorage.setItem(key+'-staging',JSON.stringify(v));},KEY);await page.reload();await page.waitForFunction(()=>window.__test?.dislodge);assert.equal(await page.evaluate(()=>window.__test.session.run.retries),31);pass('interrupted atomic write recovers latest staging');
// Fail menu can be paused/refresh and always has free retry.
await page.getByRole('button',{name:'CONTINUE',exact:true}).click();await page.evaluate(()=>{const t=window.__test;t.setPaused(true);t.dislodge(850);for(let i=0;i<130;i++)t.step(0);t.failMenu();});
await page.reload();await page.waitForFunction(()=>window.__test?.dislodge);assert(await page.getByRole('button',{name:'RETRY CHECKPOINT',exact:true}).isVisible());assert.equal(await page.getByRole('button',{name:'ROYAL RESCUE — FREE',exact:true}).count(),0);pass('failed run reload stays on fail menu / free retry always visible');
await page.setViewportSize({width:844,height:390});await page.screenshot({path:'evidence/stage2-failure-landscape.png'});
const buttons=await page.locator('#actions button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));assert(buttons.every(Boolean));pass('failure buttons visible in 844x390 landscape');
await page.getByRole('button',{name:'RESTART LEVEL',exact:true}).click();await page.getByRole('button',{name:'RESTART',exact:true}).click();assert.equal(await page.evaluate(()=>window.__test.session.run.freeRescueUsed),false);assert.notEqual(await page.evaluate(()=>window.__test.session.run.runId),runId);pass('confirmed full restart makes new run and restores one ticket');
// Storage write failure cannot consume or grant a rescue; checkpoint still works.
await page.evaluate(()=>{const t=window.__test;t.setPaused(true);t.dislodge(330);for(let i=0;i<130;i++)t.step(0);t.failMenu();Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});
await page.getByRole('button',{name:'ROYAL RESCUE — FREE',exact:true}).click();assert.equal(await page.evaluate(()=>window.__test.session.run.freeRescueUsed),false);assert.equal(await page.evaluate(()=>window.__test.sim.state),'FAIL_MENU');await page.getByRole('button',{name:'RETRY CHECKPOINT',exact:true}).click();assert.notEqual(await page.evaluate(()=>window.__test.sim.state),'FAIL_MENU');pass('storage failure: no uncommitted rescue / checkpoint remains playable');
// A fresh browser profile verifies normal rescue completion and a real 30s blur pause.
const clean=await browser.newContext({viewport:{width:1280,height:720}});const normal=await clean.newPage();normal.on('pageerror',e=>errors.push(e.message));
await normal.goto(url);await normal.waitForFunction(()=>window.__test?.dislodge);
await normal.evaluate(()=>{const t=window.__test;t.reset();t.setPaused(true);t.dislodge(850);for(let i=0;i<130;i++)t.step(0);t.failMenu();});
await normal.evaluate(()=>{[...document.querySelectorAll('#actions button')].find(b=>b.textContent==='ROYAL RESCUE — FREE').click();window.__test.setPaused(true);});
const normalRescue=await normal.evaluate(()=>{const t=window.__test;t.setPaused(true);for(let i=0;i<60;i++)t.step(1,true);const result={state:t.sim.state,protection:t.sim.protectionMs,x:t.sim.ufo.position.x,energy:t.sim.energy};for(let i=0;i<151;i++)t.step(0,false);return {...result,after:t.sim.state,protectionEnd:t.sim.protectionMs,contact:t.sim.contacts.length};});
assert.equal(normalRescue.state,'RUNNING');assert.equal(normalRescue.protection,2500);assert.equal(normalRescue.energy,1);assert.equal(normalRescue.protectionEnd,0);assert(normalRescue.contact>0);pass('full one-second rescue freezes gameplay; protection expires after 2.5s',{normalRescue});
await normal.evaluate(()=>{window.__test.closeMenu();dispatchEvent(new Event('blur'));});
const pausedSnapshot=await normal.evaluate(()=>({elapsed:window.__test.sim.elapsed,x:window.__test.sim.ufo.position.x,protection:window.__test.sim.protectionMs}));
await normal.waitForTimeout(30000);
assert.deepEqual(await normal.evaluate(()=>({elapsed:window.__test.sim.elapsed,x:window.__test.sim.ufo.position.x,protection:window.__test.sim.protectionMs})),pausedSnapshot);
await normal.getByRole('button',{name:'RESUME',exact:true}).click();await normal.waitForTimeout(100);
assert.notEqual(await normal.evaluate(()=>window.__test.sim.state),'FAIL_MENU');pass('30s blur pause freezes physics/time, resume without a giant timestep');
// All save copies corrupt at startup (without a clean pagehide repairing them).
const damaged=await browser.newContext();await damaged.addInitScript(key=>{for(const suffix of ['', '-staging','-backup'])localStorage.setItem(key+suffix,'broken');},KEY);
const damagedPage=await damaged.newPage();damagedPage.on('pageerror',e=>errors.push(e.message));await damagedPage.goto(url);await damagedPage.waitForFunction(()=>window.__test?.dislodge);assert(await damagedPage.getByRole('button',{name:'START NEW RUN',exact:true}).isVisible());
assert.equal(await damagedPage.evaluate(key=>localStorage.getItem(key),KEY),'broken');await damagedPage.getByRole('button',{name:'START NEW RUN',exact:true}).click();assert.equal(await damagedPage.evaluate(()=>window.__test.sim.state),'RUNNING');pass('all save copies corrupt: explicit reset, no silent overwrite');
// A stale tab must not overwrite the new run from a second tab, including on pagehide.
const secondTab=await clean.newPage();await secondTab.goto(url);await secondTab.waitForFunction(()=>window.__test?.dislodge);const newId=await secondTab.evaluate(()=>{window.__test.reset();return window.__test.session.run.runId;});
const stale=await normal.evaluate(key=>({saved:window.__test.session.save(),runId:JSON.parse(localStorage.getItem(key)).runId}),KEY);assert.equal(stale.saved,false);assert.equal(stale.runId,newId);pass('stale tab cannot overwrite a newly restarted run');
const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}}));
const blockedPage=await blocked.newPage();blockedPage.on('pageerror',e=>errors.push(e.message));await blockedPage.goto(url);await blockedPage.waitForFunction(()=>window.__test?.dislodge);await blockedPage.getByRole('button',{name:'START NEW RUN',exact:true}).click();assert.equal(await blockedPage.evaluate(()=>window.__test.sim.state),'RUNNING');pass('storage access denied at boot still allows free gameplay');
assert.deepEqual(errors,[]);pass('no runtime exceptions',{errors});
writeFileSync('evidence/stage2-results.json',JSON.stringify(results,null,2));await browser.close();
