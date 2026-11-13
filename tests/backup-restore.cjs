const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.KLEVY_TEST_URL||'http://127.0.0.1:8000/ingles.html';
const KEY='english-path-offline',PREVIOUS='klevy-before-restore';
const seed=(answers=12)=>({level:'B1',answers,correct:Math.floor(answers/2),completed:[]});
const wrap=data=>({format:'klevy-backup',version:1,createdAt:'2026-11-13T10:00:00Z',data});
const file=(value,name='copia.json')=>({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];let cases=0;
 async function context(raw=JSON.stringify(seed(5)),width=390){
  const c=await browser.newContext({acceptDownloads:true,viewport:{width,height:844}});
  await c.addInitScript(({raw})=>{if(!sessionStorage.backupSeeded){if(raw!==null)localStorage.setItem('english-path-offline',raw);localStorage.setItem('klevy-theme','dark');sessionStorage.backupSeeded='yes'}},{raw});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForFunction(()=>window.klevyBackup);
  return {c,p};
 }
 async function open(p){await p.click('#nav-learning');await p.click('#learning-progress');await p.locator('details:has(#backup-open) summary').click();await p.click('#backup-open');assert(await p.locator('#backup-dialog').isVisible());}
 async function select(p,value,name){await p.locator('#backup-file').setInputFiles(file(value,name));await p.waitForFunction(()=>!document.querySelector('#backup-status').textContent.includes('Leyendo'));}
 async function apply(p){await Promise.all([p.waitForEvent('load'),p.click('#backup-apply')]);await p.waitForFunction(()=>window.klevyBackup);}
 async function snapshot(p){return p.evaluate(()=>({main:localStorage.getItem('english-path-offline'),previous:localStorage.getItem('klevy-before-restore')}));}
 async function downloaded(p,selector){const d=p.waitForEvent('download');await p.click(selector);const item=await d;return JSON.parse(await fs.readFile(await item.path(),'utf8'));}
 try{
  // Genuine populated export, including listening detail help, ongoing conversation, SRS and drafts.
  let populated,exported;
  {
   const {c,p}=await context();
   await p.click('#nav-explore');await p.click('#explore-context');await p.click('#context-natural-listening');await p.locator('[data-natural]').first().click();await p.locator('[data-natural-choice]').first().click();await p.click('#natural-next');await p.fill('#natural-detail','A different answer.');await p.click('#natural-check');
   await p.click('#nav-explore');await p.click('#explore-conversation');await p.locator('[data-conversation]').first().click();await p.click('#conv-begin');
   await p.evaluate(()=>{
    state.answers=37;state.correct=21;
    state.practice['B1:Gramática:1']={correct:false,attempts:2,lastAt:Date.now(),srs:{version:1,streak:0,intervalDays:1,dueAt:Date.now()+86400000,lastDay:'2026-11-12'}};
    state.skills.writing['B1:past-story']={text:'My saved story.',checks:[true,false,true],savedAt:Date.now(),reviewHistory:[{criteria:['Original point'],checks:[true],done:false,lastAt:null}]};
    state.skills.speaking['B1:daily-introduction']={reflection:'Speak more clearly.',checks:[true,false,true],done:true,lastAt:Date.now()};
    state.notebook['carry on']={term:'carry on',meaning:'continuar',example:'We carry on learning.',sentence:'Please carry on.',reviews:2,srs:{dueAt:Date.now()+200000,streak:2,intervalDays:3,lastDay:'2026-11-12'},source:{source:'Example source',url:'https://www.elllo.org/'}};
    state.context.lessons.example={answers:{0:1},notes:'A saved note.',oral:true};
    state.variety.records.example={draft:'An unfinished answer.',checks:[true],attempts:1};
    state.futureField={retained:true};save();
   });
   const article={id:'https://www.nasa.gov/example/',url:'https://www.nasa.gov/example/',title:'An example news article',excerpt:'This synthetic article is long enough to practise reading without a live external news request.',publisher:'NASA',publishedAt:'2026-11-11T10:00:00Z'};
   await p.evaluate(async article=>{await klevyNews.open({version:1,checkedAt:'2026-11-12T10:00:00Z',article});state.news.selections['2026-11-12']={version:1,checkedAt:'2026-11-12T10:00:00Z',article};state.news.drafts['B1:'+article.id].comprehension='A draft summary.';save()},article);
   await open(p);
   // Before confirmation there are no writes; closing returns focus to the launcher.
   const before=await snapshot(p);await select(p,wrap(seed(99)),'<img src=x onerror=alert(1)>.json');assert.equal(await p.locator('#backup-preview img').count(),0);assert((await p.locator('#backup-preview').textContent()).includes('<img'));assert.deepEqual(await snapshot(p),before);await p.keyboard.press('Escape');assert(await p.locator('#backup-dialog').isHidden());assert.equal(await p.evaluate(()=>document.activeElement.id),'backup-open');assert.deepEqual(await snapshot(p),before);
   exported=await downloaded(p,'#practice-history-download');assert.equal(exported.format,'klevy-backup');assert.equal(exported.version,1);populated=exported.data;
   assert.equal(populated.answers,37);assert.equal(Object.keys(populated.listening.drafts).length,1);assert.equal(Object.keys(populated.conversations.drafts).length,1);assert.equal(Object.keys(populated.news.drafts).length,1);
   assert(await p.evaluate(raw=>!!klevyBackup.prepare(raw),JSON.stringify(exported)));
   await c.close();cases++;
  }
  {
   const {c,p}=await context(undefined,320);await open(p);await select(p,exported);assert(await p.locator('#backup-apply').isEnabled());
   assert(await p.locator('#backup-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));assert(await p.locator('#backup-apply').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const previous=JSON.parse((await snapshot(p)).main);await apply(p);
   const got=await p.evaluate(()=>JSON.parse(localStorage.getItem('english-path-offline')));
   for(const key of ['answers','correct','practice','notebook','skills','listening','conversations','news','context','variety','futureField'])assert.deepEqual(got[key],populated[key],key);
   assert.equal(await p.evaluate(()=>localStorage.getItem('klevy-theme')),'dark');assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('klevy-before-restore')))).data.answers,previous.answers);
   // Native previous-state flow restores the old state and preserves the replaced copy.
   await open(p);const priorDownload=await downloaded(p,'#backup-previous-download');assert.equal(priorDownload.data.answers,previous.answers);await p.click('#backup-previous');await apply(p);assert.equal(await p.evaluate(()=>state.answers),previous.answers);assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('klevy-before-restore')))).data.answers,37);
   // Confirmed full reset removes the automatic copy but keeps appearance.
   await p.click('#nav-learning');await p.click('#learning-progress');await p.locator('details:has(#simple-reset) summary').click();p.once('dialog',d=>d.accept());await p.click('#simple-reset');assert.equal((await snapshot(p)).previous,null);assert.equal(await p.evaluate(()=>state.answers),0);assert.equal(await p.evaluate(()=>localStorage.getItem('klevy-theme')),'dark');await c.close();cases++;
  }
  // Historical raw/BOM copies migrate obsolete question records without losing attempts.
  {
   const {c,p}=await context();await open(p);const old={...seed(19),practice:{'B1:Gramática:140':{correct:true,attempts:3,lastAt:100}},skills:{writing:{'B1:past-story':{text:'An older story.',checks:[true,false,true]}}}};
   await select(p,'\uFEFF'+JSON.stringify(old));assert((await p.locator('#backup-preview').textContent()).includes('formato anterior'));await apply(p);assert.equal(await p.evaluate(()=>state.answers),19);assert.equal(await p.evaluate(()=>state.practiceArchive['B1:Gramática:140:v1'].record.attempts),3);assert.equal(await p.evaluate(()=>state.skills.writing['B1:past-story'].text),'An older story.');await p.reload();assert.equal(await p.evaluate(()=>state.answers),19);await c.close();cases++;
  }
  // Invalid files cannot change either saved snapshot, even after a valid preview.
  {
   const {c,p}=await context();await open(p);await p.evaluate(()=>localStorage.setItem('klevy-before-restore','old recovery bytes'));const before=await snapshot(p);
   const invalid=['{broken','',{},[],{format:'another-app',data:seed()},{...wrap(seed()),version:8},{...wrap(seed()),createdAt:'bad'}, {...seed(),level:'C3'}, {...seed(),answers:-1}, {...seed(),completed:null}, {...seed(),skills:{writing:{bad:{text:42}}}}, {...seed(),notebook:{bad:{term:'x',meaning:'y',source:{url:'javascript:alert(1)'}}}}, {...seed(),listening:{drafts:{bad:{id:'x',level:'B1',step:1,help:[],plays:[],oral:null}}}}, {...seed(),conversations:{drafts:{bad:{id:'x',level:'B1',turn:9,answers:[]}}}}, {...seed(),news:{selections:{bad:{version:1,checkedAt:'yesterday',article:{}}}}}, JSON.stringify(seed()).replace('"level"','"__proto__":{},"level"'), {...seed(),contentRevisions:{future:500}}];
   for(const value of invalid){await select(p,wrap(seed(8)));assert(await p.locator('#backup-apply').isEnabled());await select(p,value);assert(await p.locator('#backup-apply').isDisabled());assert(await p.locator('#backup-preview').isHidden());assert.deepEqual(await snapshot(p),before)}
   await p.locator('#backup-file').setInputFiles(file(' '.repeat(8*1024*1024+1)));assert((await p.locator('#backup-status').textContent()).includes('8 MB'));assert.deepEqual(await snapshot(p),before);
   await p.click('#backup-cancel');await c.close();cases++;
  }
  // The latest file selection wins, and a pending read cannot reopen a closed dialog.
  {
   const {c,p}=await context();await open(p);await p.evaluate(()=>{const read=File.prototype.text;File.prototype.text=function(){if(this.name==='slow.json')return new Promise(resolve=>window.finishSlow=()=>resolve(JSON.stringify({level:'B1',answers:91,correct:0,completed:[]})));return read.call(this)}});
   await p.locator('#backup-file').setInputFiles(file(seed(91),'slow.json'));await select(p,wrap(seed(23)),'fast.json');await p.evaluate(()=>finishSlow());assert((await p.locator('#backup-preview').textContent()).includes('fast.json'));await p.click('#backup-cancel');const before=await snapshot(p);await open(p);await p.locator('#backup-file').setInputFiles(file(seed(91),'slow.json'));await p.click('#backup-cancel');await p.evaluate(()=>finishSlow());assert(await p.locator('#backup-dialog').isHidden());assert.deepEqual(await snapshot(p),before);await c.close();cases++;
  }
  // Quota/permission failures before and after recovery storage preserve the current main value.
  for(const failKey of [PREVIOUS,KEY]){
   const {c,p}=await context();await open(p);await p.evaluate(()=>localStorage.setItem('klevy-before-restore','older recovery'));await select(p,wrap(seed(27)));const before=await snapshot(p);
   await p.evaluate(key=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('quota','QuotaExceededError');return write.call(this,k,v)}},failKey);
   await p.click('#backup-apply');assert((await p.locator('#backup-status').textContent()).includes('se conserva'));assert.deepEqual(await snapshot(p),before);assert(await p.locator('#backup-apply').isDisabled());await c.close();cases++;
  }
  {
   const {c,p}=await context();await open(p);const before=await snapshot(p);await p.evaluate(()=>{const read=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='english-path-offline')throw new DOMException('blocked','SecurityError');return read.call(this,k)}});await select(p,wrap(seed(77)));assert(await p.locator('#backup-apply').isDisabled());assert((await p.locator('#backup-status').textContent()).includes('almacenamiento'));await p.reload();assert.deepEqual(await snapshot(p),before);await c.close();cases++;
  }
  // A change in another tab or in-memory progress after preview invalidates confirmation.
  {
   const {c,p}=await context();await open(p);await select(p,wrap(seed(44)));const q=await c.newPage();await q.goto(base);await q.waitForFunction(()=>window.klevyBackup);await q.evaluate(()=>{state.answers=88;save()});await p.waitForFunction(()=>document.querySelector('#backup-apply').disabled);assert.equal(JSON.parse((await snapshot(p)).main).answers,88);assert.equal((await snapshot(p)).previous,null);await p.reload();await open(p);await select(p,wrap(seed(55)));await p.evaluate(()=>{state.answers=89});await p.click('#backup-apply');assert((await p.locator('#backup-status').textContent()).includes('cambió'));assert.equal(JSON.parse((await snapshot(p)).main).answers,88);assert.equal((await snapshot(p)).previous,null);await c.close();cases++;
  }
  // Corrupt original bytes can be recovered from the automatic copy metadata after import.
  {
   const {c,p}=await context('{unreadable');await open(p);await select(p,wrap(seed(66)));await apply(p);assert.equal(await p.evaluate(()=>state.answers),66);const previous=await p.evaluate(()=>JSON.parse(localStorage.getItem('klevy-before-restore')));assert.equal(previous.storedBeforeRestore,'{unreadable');assert.equal(previous.data.answers,0);await c.close();cases++;
  }
  // Opening from writing flushes a pending draft; later old callbacks cannot overwrite restoration.
  {
   const {c,p}=await context();await p.evaluate(()=>klevyProductive.openWriting('past-story'));await p.click('.simple-next');await p.fill('#prod-draft','Latest text before restoring.');await p.evaluate(()=>klevyBackup.open());await select(p,wrap(seed(51)));await apply(p);assert.equal(await p.evaluate(()=>state.answers),51);const previous=await p.evaluate(()=>JSON.parse(localStorage.getItem('klevy-before-restore')).data);assert.equal(previous.skills.writing['B1:past-story'].text,'Latest text before restoring.');await c.close();cases++;
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${cases} backup cases: genuine/legacy roundtrips, preview/cancel, prior-state recovery/download/reset, malformed/unsafe/large files, latest selection, quota/read failures, stale changes, corrupt originals and writing drafts; no JS errors.`);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
