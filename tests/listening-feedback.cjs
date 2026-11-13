const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.KLEVY_TEST_URL||'http://127.0.0.1:8000/ingles.html';

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];let cases=0;
 try{
  for(const [width,height,theme]of [[390,844,'light'],[320,568,'dark']]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,colorScheme:theme,reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);
   await page.evaluate(()=>{state.answers=43;state.skills.writing['B1:past-story']={text:'A previously saved story.'};save()});
   await page.click('#nav-explore');await page.click('#explore-context');await page.click('#context-natural-listening');
   const lessons=await page.evaluate(()=>klevyListening.lessons.map(l=>({id:l.id,level:l.level,gist:l.gist,detail:l.detail})));
   async function start(lesson,fresh=true){
    await page.evaluate(({lesson,fresh})=>{state.level=lesson.level;level.value=lesson.level;if(fresh)delete state.listening.drafts[lesson.level+':'+lesson.id];klevyListening.start(lesson.id)},{lesson,fresh});
   }
   for(const lesson of lessons){
    for(const right of [false,true]){
     await start(lesson);const choice=right?lesson.gist[2]:(lesson.gist[2]+1)%lesson.gist[1].length;
     await page.click('[data-natural-choice="'+choice+'"]');await page.waitForTimeout(300);
     assert.equal(await page.locator('#natural-correct-answer').textContent(),lesson.gist[1][lesson.gist[2]]);
     assert(await page.locator('#natural-correct-answer').isVisible());
     assert.equal(await page.locator('#natural-answer-result').textContent(),right?'✓ Tu respuesta es correcta.':'✗ Tu respuesta es incorrecta.');
     assert.equal(await page.locator('.natural-answer.wrong').count(),right?0:1);
     if(!right)assert.equal(await page.locator('#natural-selected-answer').textContent(),lesson.gist[1][choice]);
     assert(await page.locator('.natural-explanation p').isHidden());
     const answer=await page.locator('#natural-correct-answer').boundingBox(),next=await page.locator('#natural-next').boundingBox();
     assert(answer.y>=-1&&answer.y+answer.height<=height+1,'The English answer must be visible: '+JSON.stringify(answer));
     assert(next.y>=-1&&next.y+next.height<=height+1,'The next step must stay visible: '+JSON.stringify(next));
     assert(await page.locator('.natural-answered .options').isHidden());
     await page.locator('.natural-answered summary').click();
     const correct=page.locator('[data-natural-choice="'+lesson.gist[2]+'"]');
     assert(await correct.isVisible());assert.match(await correct.getAttribute('class'),/correct/);
     assert.match(await correct.locator('[data-natural-answer-marker]').textContent(),/Respuesta correcta/);
     assert.equal(await page.locator('.natural-answered .options button.correct').count(),1);
     assert.equal(await page.locator('.natural-answered .options button.wrong').count(),right?0:1);
     assert.equal(await page.locator('.natural-answered .options button:enabled').count(),0);
     if(!right)assert.match(await page.locator('[data-natural-choice="'+choice+'"] [data-natural-answer-marker]').textContent(),/Tu elección/);
     await page.locator('.natural-answered summary').click();
     await page.locator('.natural-explanation summary').click();
     assert.equal(await page.locator('.natural-explanation p').textContent(),lesson.gist[3]);
     if(process.env.KLEVY_SCREENSHOT_DIR&&!right&&lesson===lessons[0]){
      await page.locator('.natural-explanation summary').click();await page.locator('#natural-feedback').scrollIntoViewIfNeeded();
      await page.screenshot({path:process.env.KLEVY_SCREENSHOT_DIR+'/feedback-'+width+'.png'});
     }
     await page.click('#natural-next');assert.equal(await page.evaluate(()=>klevyListening.current.step),1);
     await page.fill('#natural-detail',lesson.detail.accepted[0]);await page.click('#natural-check');
     assert.equal(await page.locator('#natural-answer-result').textContent(),'✓ Respuesta aceptada.');
     assert.equal(await page.locator('#natural-correct-answer').textContent(),lesson.detail.answer);
     assert.equal(await page.locator('#natural-equivalent').count(),0);cases++;
    }
   }
   // Graded state survives reloading and the answer remains visible without opening history.
   const lesson=lessons[0];await start(lesson);const choice=(lesson.gist[2]+1)%3;
   await page.click('[data-natural-choice="'+choice+'"]');await page.reload();await start(lesson,false);
   assert.equal(await page.locator('#natural-correct-answer').textContent(),lesson.gist[1][lesson.gist[2]]);
   assert.match(await page.locator('[data-natural-choice="'+lesson.gist[2]+'"] [data-natural-answer-marker]').textContent(),/Respuesta correcta/);
   await page.click('#natural-next');const untrusted='<img src=x onerror=window.__testXss=true>';
   await page.fill('#natural-detail',untrusted);await page.click('#natural-check');
   assert.equal(await page.locator('#natural-selected-answer').textContent(),untrusted);
   assert.equal(await page.locator('#natural-feedback img').count(),0);assert.equal(await page.evaluate(()=>window.__testXss),undefined);
   assert.match(await page.locator('#natural-answer-result').textContent(),/no coincide/);
   await page.click('#natural-equivalent');assert.equal(await page.evaluate(()=>klevyListening.current.detail.correct),null);
   assert.equal(await page.locator('#natural-answer-result').textContent(),'Revisión personal registrada.');
   assert.equal(await page.locator('#natural-equivalent').count(),0);assert.equal(await page.locator('.natural-answer.wrong').count(),0);
   await page.reload();await start(lesson,false);
   assert.equal(await page.locator('#natural-answer-result').textContent(),'Revisión personal registrada.');
   await page.click('#natural-next');await page.fill('#natural-note','A useful phrase to practise.');await page.click('#natural-finish');
   assert.equal(await page.evaluate(k=>state.listening.records[k].detail.correct,lesson.level+':'+lesson.id),null);
   assert.equal(await page.evaluate(()=>state.answers),43);assert.equal(await page.evaluate(()=>state.skills.writing['B1:past-story'].text),'A previously saved story.');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   // The separate "Por habilidad → Escucha" flow still shows its correct English option.
   await page.evaluate(()=>englishPathApp.choose('Escucha'));await page.click('#ep-start');
   const question=await page.evaluate(()=>data[session.level][session.type][session.ids[session.index]]);
   await page.click('[data-answer="'+question[2]+'"]');assert((await page.locator('#feedback').textContent()).includes(question[1][question[2]]));
   assert.match(await page.locator('[data-answer="'+question[2]+'"]').getAttribute('class'),/correct/);
   await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS '+cases+' correct/incorrect listening selections across all 12 lessons; visible English answer and next step at 390/320px; marked options; optional Spanish explanation; accepted details and honest personal review; reload/progress preservation; escaped text; standard listening unchanged.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
