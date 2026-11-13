const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const url=process.env.KLEVY_TEST_URL||'http://127.0.0.1:8000/ingles.html';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
try{
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
 await c.addInitScript(()=>{if(sessionStorage.vocabSeeded)return;sessionStorage.vocabSeeded='yes';localStorage.setItem('english-path-offline',JSON.stringify({level:'B2',answers:31,correct:17,completed:[],practice:{'B1:Vocabulario:129':{correct:false,attempts:3,lastAt:1234,srs:{version:1,streak:0,dueAt:98765,lastDay:'2026-11-12'}},'B2:Vocabulario:94':{correct:true,attempts:2,lastAt:1234,srs:{version:1,streak:2,dueAt:87654,lastDay:'2026-11-12'}}},skills:{writing:{'B1:past-story':{text:'Preserve my story.',checks:[]}}}}))});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.klevyBackup);
 assert.equal(await p.evaluate(()=>state.practice['B1:Vocabulario:129'].attempts),3);assert.equal(await p.evaluate(()=>state.practice['B2:Vocabulario:94'].srs.dueAt),87654);assert.equal(await p.evaluate(()=>state.answers),31);
 const bank=await p.evaluate(()=>({B1:data.B1.Vocabulario,B2:data.B2.Vocabulario}));const rows=Object.entries(bank).flatMap(([level,qs])=>qs.map((q,index)=>({level,index,q})).filter(r=>r.q[5]?.audio));
 assert.equal(rows.length,125);assert.equal(rows.filter(r=>r.q[5].vocabulary?.kind==='meaning').length,55);assert.equal(rows.filter(r=>r.q[5].vocabulary?.kind==='recognition').length,55);assert.equal(rows.filter(r=>!r.q[5].vocabulary).length,15);
 for(const{q}of rows){assert(!q[5].audio.includes('___'));const v=q[5].vocabulary;if(v){assert(v.example.includes(v.term));assert.equal(q[1][q[2]],v.kind==='meaning'?v.meaning:v.term);if(v.kind==='meaning'){assert(q[0].includes('«'+v.term+'»'));assert.equal(q[5].audio,v.example)}else assert.equal(q[5].audio,v.term)}}
 // Exercise the rendered handlers of every vocabulary audio, both correct and incorrect.
 const result=await p.evaluate(rows=>{
  const failures=[],check=(ok,msg)=>{if(!ok)failures.push(msg)};let trials=0;
  speechSynthesis.speak=u=>{window.__vocabSpoken={text:u.text,lang:u.lang}};
  for(const{level,index}of rows)for(const correct of [true,false]){
   state.level=level;session={level,type:'Vocabulario',ids:[index],index:0,score:0,answered:false};question();
   const q=data[level].Vocabulario[index],v=q[5].vocabulary,tag=level+':'+index+':'+correct,choice=correct?q[2]:(q[2]+1)%3;
   check(!document.querySelector('#vocab-correct-answer'),tag+' no correction before grading');
   check(!document.querySelector('#vocab-example'),tag+' no completed example before grading');
   check(document.querySelector('#vocab-audio-instruction').textContent.includes(v?.kind==='meaning'?'español':'inglés'),tag+' task language');
   document.querySelector('#listen').click();check(__vocabSpoken.text===q[5].audio&&__vocabSpoken.lang==='en-GB',tag+' correct English speech input');
   const before=state.answers;document.querySelector('[data-answer="'+choice+'"]').click();
   check(state.answers===before+1,tag+' counts once');check(document.querySelector('#vocab-correct-answer').textContent.includes(q[1][q[2]]),tag+' expected answer visible');
   check(document.querySelector('[data-answer="'+q[2]+'"]').classList.contains('correct'),tag+' correct option marked');
   check(!!document.querySelector('#vocab-selected-answer')===!correct,tag+' wrong choice shown');
   if(v){check(document.querySelector('#vocab-heard').textContent===v.term,tag+' English term identified');check(document.querySelector('#vocab-example').textContent===v.example,tag+' completed English sentence');check(document.querySelector('#vocab-example mark').textContent===v.term,tag+' target highlighted');check(!document.querySelector('#vocab-example').textContent.includes('___'),tag+' no blank');check(document.querySelector('#vocab-heard').lang==='en',tag+' English language tag');if(v.kind==='meaning')check(document.querySelector('#vocab-correct-answer strong').lang==='es',tag+' Spanish meaning tag')}
   else check(document.querySelector('#vocab-audio-transcript').textContent===q[5].audio,tag+' contextual transcript retained');
   const answered=state.answers;document.querySelector('#vocab-replay-audio').click();check(__vocabSpoken.text===q[5].audio,tag+' replay original English audio');
   if(v?.kind==='recognition'){document.querySelector('#vocab-play-example').click();check(__vocabSpoken.text===v.example&&__vocabSpoken.lang==='en-GB',tag+' play complete English example');check(document.querySelector('#vocab-meaning').textContent===v.meaning,tag+' meaning shown separately')}
   check(state.answers===answered,tag+' replay does not regrade');answer(choice);check(state.answers===answered,tag+' duplicate grading ignored');trials++;
  }
  return {trials,failures};
 },rows.map(({level,index})=>({level,index})));
 assert.deepEqual(result.failures,[]);assert.equal(result.trials,250);
 async function show(level,index){await p.evaluate(({level,index})=>{state.level=level;session={level,type:'Vocabulario',ids:[index,0],index:0,score:0,answered:false};question()},{level,index})}
 // Independent reproductions: the sentence identifies the sense of turnover; headache remains an English recognition task.
 await show('B2',94);assert.match(await p.locator('.ep-q').textContent(),/«turnover»/);await p.click('#listen');assert.deepEqual(await p.evaluate(()=>__vocabSpoken),{text:'High staff turnover made it hard to build an experienced team.',lang:'en-GB'});await p.locator('[data-answer]').filter({hasText:'rotación de personal'}).click();assert.equal(await p.locator('#vocab-heard').textContent(),'turnover');assert.match(await p.locator('#vocab-correct-answer').textContent(),/rotación de personal/);assert(await p.locator('#vocab-example').isVisible());assert.equal(await p.locator('.vocab-explanation').evaluate(e=>e.open),false);await p.click('#next');assert.equal(await p.evaluate(()=>session.ids[session.index]),0);
 await show('B1',128);assert.match(await p.locator('#vocab-audio-instruction').textContent(),/inglés/);const q=bank.B1[128];await p.locator('[data-answer="'+((q[2]+1)%3)+'"]').click();assert.equal(await p.locator('#vocab-heard').textContent(),'headache');assert.equal(await p.locator('#vocab-meaning').textContent(),'dolor de cabeza');await p.click('#vocab-play-example');assert.equal(await p.evaluate(()=>__vocabSpoken.text),'I have a terrible headache and need to rest.');
 // Layout and keyboard activation of replay work in both appearances at 320px.
 await p.setViewportSize({width:320,height:740});for(const theme of ['light','dark']){await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#vocab-replay-audio').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>__vocabSpoken.text),'headache')}
 // Bad/stale cue metadata cannot label a contextual message with an unrelated word.
 await p.evaluate(()=>{data.B1.Vocabulario[203][5].vocabulary={kind:'meaning',term:'WRONG',meaning:'equivocado',example:'WRONG'};state.level='B1';session={level:'B1',type:'Vocabulario',ids:[203],index:0,score:0,answered:false};question();answer(0)});assert.equal(await p.locator('#vocab-heard').count(),0);assert(await p.locator('#vocab-correct-answer').isVisible());
 // Plain vocabulary gaps and the independent listening library keep their original rendering.
 await show('B2',4);assert.equal(await p.locator('#listen').count(),0);assert.equal(await p.locator('#vocab-audio-instruction').count(),0);await p.locator('[data-answer]').filter({hasText:'deadline'}).click();assert.equal(await p.locator('.vocab-audio-feedback').count(),0);assert.match(await p.locator('#feedback').textContent(),/deadline/);
 const beforeReload=await p.evaluate(()=>({answers:state.answers,correct:state.correct,record:state.practice['B2:Vocabulario:94'],draft:state.skills.writing['B1:past-story'].text}));await p.reload();assert.deepEqual(await p.evaluate(()=>({answers:state.answers,correct:state.correct,record:state.practice['B2:Vocabulario:94'],draft:state.skills.writing['B1:past-story'].text})),beforeReload);
 await p.click('#nav-learning');await p.click('#learning-progress');await p.locator('details:has(#practice-history-download) summary').click();const downloading=p.waitForEvent('download');await p.click('#practice-history-download');const d=await downloading,raw=await fs.readFile(await d.path(),'utf8');assert(await p.evaluate(raw=>!!klevyBackup.prepare(raw),raw));assert.equal(JSON.parse(raw).data.skills.writing['B1:past-story'].text,'Preserve my story.');assert.deepEqual(errors,[]);
 console.log('PASS 125 vocabulary audios / 250 rendered correct+incorrect cases: explicit English/Spanish tasks, complete contextual meaning audio, visible English term and sentence, separate translation, replay/keyboard, no regrading, metadata fallback, score/SRS/draft preservation, reload/export and 320px light/dark layout.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
