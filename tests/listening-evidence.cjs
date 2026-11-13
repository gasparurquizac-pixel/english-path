const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.KLEVY_TEST_URL||'http://127.0.0.1:8000/ingles.html';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];let checked=0;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  await page.evaluate(()=>{state.answers=43;state.skills.writing['B1:past-story']={text:'My earlier writing draft.'};save()});
  await page.click('#nav-explore');await page.click('#explore-context');await page.click('#context-natural-listening');
  const lessons=await page.evaluate(()=>klevyListening.lessons);assert.equal(lessons.length,12);
  async function start(lesson,fresh=true){await page.evaluate(({lesson,fresh})=>{state.level=lesson.level;level.value=lesson.level;if(fresh)delete state.listening.drafts[lesson.level+':'+lesson.id];klevyListening.start(lesson.id)},{lesson,fresh})}
  for(let index=0;index<lessons.length;index++){
   const lesson=lessons[index];await start(lesson);
   assert.equal(await page.locator('#natural-evidence').count(),0);assert.equal(await page.locator('.natural-evidence-highlight').count(),0);
   // Opening the full transcript before answering still counts as help.
   if(index===0){await page.locator('#natural-transcript summary').click();await page.waitForFunction(()=>klevyListening.current.help[0]);assert.equal(await page.locator('.natural-evidence-highlight').count(),0);await start(lesson)}
   // Real same-origin playback stays intact; the evidence never starts or seeks audio itself.
   await page.evaluate(()=>document.querySelector('#natural-audio').play());await page.waitForFunction(()=>document.querySelector('#natural-audio').currentTime>.1);
   const choice=index%2===0?lesson.gist[2]:(lesson.gist[2]+1)%3;
   await page.click('[data-natural-choice="'+choice+'"]');
   for(const step of [0,1]){
    const kind=step===0?'gist':'detail',rows=lesson.evidence[kind];assert(rows?.length,lesson.id+' lacks '+kind+' evidence');
    for(const row of rows){assert.equal(typeof row.quote,'string');assert(lesson.lines[row.line].text.includes(row.quote));assert.equal(lesson.lines[row.line].text.indexOf(row.quote),lesson.lines[row.line].text.lastIndexOf(row.quote),'The quoted position must be unambiguous')}
    assert(await page.locator('#natural-evidence').isHidden());
    const correctBefore=await page.evaluate(()=>klevyListening.current.step===0?klevyListening.current.gist.correct:klevyListening.current.detail.correct);
    const playsBefore=await page.evaluate(()=>[...klevyListening.current.plays]);
    await page.locator('.natural-explanation summary').click();
    await page.waitForFunction(()=>klevyListening.current.reviewedTranscript?.[klevyListening.current.step]===true);
    const quotes=page.locator('#natural-evidence blockquote p');assert.equal(await quotes.count(),rows.length);
    for(let i=0;i<rows.length;i++){
     assert.equal(await quotes.nth(i).textContent(),rows[i].quote);
     assert.equal(await page.locator('#natural-evidence figcaption').nth(i).textContent(),lesson.lines[rows[i].line].speaker);
     assert.equal(await quotes.nth(i).getAttribute('data-context-material'),lesson.id);
    }
    assert.equal(await page.evaluate(()=>klevyListening.current.help[klevyListening.current.step]),false);
    assert.equal(await page.evaluate(()=>klevyListening.current.step===0?klevyListening.current.gist.correct:klevyListening.current.detail.correct),correctBefore);
    assert.deepEqual(await page.evaluate(()=>klevyListening.current.plays),playsBefore);
    // Quoted words keep the existing dictionary and source-aware notebook interaction.
    if(lesson.id==='listen-adelaide'&&step===0){await page.locator('#natural-evidence [data-kv-term="people"]').first().click();await page.click('#kv-save-expression');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.notebook.people.source.url),lesson.source)}
    await page.click('#natural-evidence-context');
    await page.waitForFunction(line=>document.activeElement?.id==='natural-line-'+line,rows[0].line);
    assert.equal(await page.locator('#natural-transcript').evaluate(e=>e.open),true);
    const marks=page.locator('#natural-transcript .natural-evidence-highlight');assert.equal(await marks.count(),rows.length);
    for(const row of rows)assert((await marks.allTextContents()).includes(row.quote));
    const first=await page.locator('#natural-line-'+rows[0].line+' .natural-evidence-highlight').first().boundingBox();assert(first.y>=-1&&first.y<844,'Highlighted evidence must be in view: '+lesson.id+' '+kind);
    assert.equal(await page.evaluate(()=>klevyListening.current.help[klevyListening.current.step]),false);
    if(process.env.KLEVY_SCREENSHOT_DIR&&lesson.id==='listen-adelaide'&&step===0)await page.screenshot({path:process.env.KLEVY_SCREENSHOT_DIR+'/evidence-context.png'});
    if(index===0&&step===0){await page.reload();await start(lesson,false);assert(await page.locator('#natural-evidence').isHidden());assert.equal(await page.evaluate(()=>klevyListening.current.reviewedTranscript[0]),true);assert.equal(await page.evaluate(()=>klevyListening.current.gist.help),false)}
    await page.click('#natural-next');checked++;
    if(step===0){assert.equal(await page.locator('#natural-evidence').count(),0);assert.equal(await page.locator('.natural-evidence-highlight').count(),0);await page.fill('#natural-detail',index%3===0?'a response to review':lesson.detail.accepted[0]);await page.click('#natural-check')}
   }
   await page.fill('#natural-note','A phrase I want to use.');await page.click('#natural-finish');
   const record=await page.evaluate(key=>state.listening.records[key],lesson.level+':'+lesson.id);
   assert.deepEqual(record.help,[false,false,false]);assert.deepEqual(record.reviewedTranscript,[true,true,false]);assert.equal(record.gist.correct,choice===lesson.gist[2]);
   assert.match(await page.locator('#app').textContent(),/Revisaste la transcripción después de responder/);
   assert.equal(await page.evaluate(()=>state.answers),43);assert.equal(await page.evaluate(()=>state.skills.writing['B1:past-story'].text),'My earlier writing draft.');
  }
  // Invalid editorial data cannot introduce invented quotations into feedback.
  const first=lessons[0];await start(first);await page.evaluate(id=>{klevyListening.lessons.find(l=>l.id===id).evidence.gist[0].quote='This quote is not in the source.'},first.id);await page.click('[data-natural-choice="'+first.gist[2]+'"]');assert.equal(await page.locator('#natural-evidence').count(),0);assert.equal(await page.locator('.natural-evidence-highlight').count(),0);assert(await page.locator('#natural-correct-answer').isVisible());
  assert.equal(await page.evaluate(()=>klevyStorage.status),'saved');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS '+checked+' exact transcript evidence sets for all 12 lessons; 12 real MP3s played; hidden before grading; contextual highlighting/focus including long source paragraphs and two excerpts in one line; dictionary/notebook attribution; help versus post-answer review; stable scores, drafts and reload; invalid quotations omitted.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
