import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],results=[];
const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));const url=process.env.TEST_URL||'http://localhost:4186/';
await page.goto(url);await page.waitForFunction(()=>window.__test);await page.goto(url.split('?')[0]+'?review=1');await page.waitForFunction(()=>window.__test);await page.waitForTimeout(500);const before=await page.evaluate(()=>({...localStorage}));
const nav=page.getByRole('navigation',{name:'UI walkthrough'});
for(const size of [{width:1280,height:720},{width:844,height:390},{width:390,height:844}]){
 await page.setViewportSize(size);
 for(const name of ['Home','Routes','Pause','Failure','Results','Garage','Missions','Events','Worlds','Level 1']){
  await nav.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(100);
  if(name!=='Level 1'){assert.equal(await page.locator('#modal').isVisible(),true);const visible=await page.locator('.panel').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});assert(visible,`${name} ${size.width} panel in viewport`);}
  await page.screenshot({path:`evidence/stage5-final-${size.width}-${name.toLowerCase().replaceAll(' ','-')}.png`});
 }
 results.push({name:`10 review screens at ${size.width}x${size.height}`,pass:true});
}
assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);results.push({name:'review mode never changes persistent run or profile',pass:true});
await page.setViewportSize({width:1280,height:720});await nav.getByRole('button',{name:'Failure',exact:true}).click();await page.getByRole('button',{name:'ROYAL RESCUE — FREE',exact:true}).click();await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>window.__test.session.run.freeRescueUsed),true);assert.equal(await page.locator('#modal').isVisible(),false);results.push({name:'review failure supports real rescue return to play',pass:true});
await nav.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'GARAGE',exact:true}).click();await page.getByRole('button',{name:'BACK',exact:true}).click();assert.equal(await page.locator('#title').textContent(),'HIS MAJESTY NEEDS A RIDE.');results.push({name:'garage back returns to home before run starts',pass:true});
await page.getByRole('button',{name:'PLAY',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'MISSIONS / DAILY');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'PLAY');await page.keyboard.press('Space');assert.equal(await page.locator('#modal').isVisible(),false);results.push({name:'modal keyboard focus loops and Space activates Play',pass:true});
const transforms=await page.evaluate(()=>{const t=window.__test;t.setPaused(true);const scene=t.sim;const game=document.querySelector('canvas');return {king:scene.king.position.x,ufo:scene.ufo.position.x,canvas:!!game};});assert(transforms.canvas);assert.deepEqual(errors,[]);results.push({name:'SVG textures and all review screens load without runtime exceptions',pass:true});
writeFileSync('evidence/stage5-final-ui-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
