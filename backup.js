/* Local backup import/export. No file contents leave this browser. */
(()=>{
'use strict';
const storage=window.klevyStorage;
if(!storage||window.klevyBackup)return;
const FORMAT='klevy-backup',VERSION=1,MAX_BYTES=8*1024*1024;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const number=x=>Number.isFinite(x)&&x>=0;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const level=x=>x==='B1'||x==='B2';
const text=x=>typeof x==='string';
const bool=x=>typeof x==='boolean';
const bools=x=>Array.isArray(x)&&x.every(bool);
const list=x=>Array.isArray(x)&&x.every(text);
function require(condition,message='La copia contiene datos incompletos o con un formato incorrecto.'){
 if(!condition)throw Error(message);
}
function optional(value,name,test){if(own(value,name))require(test(value[name]));}
function safeTree(value,depth=0,budget={nodes:0}){
 require(depth<=40&&++budget.nodes<=300000,'La estructura del archivo es demasiado compleja.');
 if(value===null||typeof value!=='object')return;
 for(const[k,v]of Object.entries(value)){
  require(k!=='__proto__'&&!(k==='constructor'&&object(v)&&own(v,'prototype')),'El archivo contiene una estructura no permitida.');
  safeTree(v,depth+1,budget);
 }
}
function httpURL(value,nasa=false){
 if(!text(value))return false;
 try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&(!nasa||(u.protocol==='https:'&&(u.hostname==='nasa.gov'||u.hostname.endsWith('.nasa.gov'))))}catch{return false}
}
function records(map,check){if(map===undefined)return;require(object(map));for(const record of Object.values(map)){require(object(record));check?.(record)}}
function schedule(value){require(object(value));for(const k of ['dueAt','streak','intervalDays'])optional(value,k,number);optional(value,'lastDay',text)}
function common(record,scalarHelp=false){
 for(const k of ['attempts','lastAt','savedAt','completedAt','createdAt','startedAt','consultations','lastConsulted','reviews'])optional(record,k,number);
 for(const k of ['done','selfReviewed','usedHelp','oral'])if(own(record,k)&&k!=='oral')require(bool(record[k]));
 for(const k of ['text','draft','note','notes','reflection','term','meaning','sentence','example','opinion','comprehension','improvement','materialId'])optional(record,k,text);
 for(const k of ['checks','reviewedTranscript'])optional(record,k,bools);optional(record,'help',scalarHelp?bool:bools);
 optional(record,'plays',x=>Array.isArray(x)&&x.every(number));
 optional(record,'srs',scheduleValue=>{schedule(scheduleValue);return true});
 optional(record,'correct',x=>x===null||bool(x));
 if(own(record,'reviewHistory')){
  require(Array.isArray(record.reviewHistory));
  record.reviewHistory.forEach(h=>{require(object(h));optional(h,'criteria',list);optional(h,'checks',bools);optional(h,'done',bool);optional(h,'lastAt',x=>x===null||number(x))});
 }
}
function plan(record){
 optional(record,'level',level);optional(record,'date',text);
 optional(record,'items',rows=>Array.isArray(rows)&&rows.every(x=>object(x)&&text(x.type)&&integer(x.index)));
 if(own(record,'answers')){require(object(record.answers));for(const x of Object.values(record.answers))require(object(x)||bool(x))}
 // Version-1 plans that could be resumed need an answer map; later app checks rebuild obsolete plans.
 if(record.version===1&&Array.isArray(record.items))require(object(record.answers));
 for(const k of ['speakingDone','writingDone'])optional(record,k,bool);
}
function conversation(record,draft=false){
 common(record);
 if(own(record,'answers')){require(Array.isArray(record.answers));record.answers.forEach(a=>{require(object(a));common(a)})}
 if(draft){require(text(record.id)&&level(record.level)&&[0,1,2].includes(record.turn)&&Array.isArray(record.answers));optional(record,'phase',x=>['intro','speak','review'].includes(x));optional(record,'branch',x=>x===null||text(x))}
}
function listening(record,draft=false){
 common(record);
 if(own(record,'oral')){require(object(record.oral));common(record.oral)}
 if(own(record,'gist')){require(object(record.gist));optional(record.gist,'choice',x=>integer(x)&&x<3);optional(record.gist,'correct',bool);optional(record.gist,'help',bool)}
 if(own(record,'detail')){require(object(record.detail));common(record.detail,true);optional(record.detail,'help',bool)}
 optional(record,'detailText',text);
 if(draft)require(text(record.id)&&level(record.level)&&[0,1,2].includes(record.step)&&Array.isArray(record.help)&&Array.isArray(record.plays)&&object(record.oral)&&bools(record.oral.checks)&&text(record.oral.note));
}
function newsSelection(record){
 require(record.version===1&&object(record.article)&&text(record.checkedAt)&&Number.isFinite(Date.parse(record.checkedAt)));
 const a=record.article;
 require(httpURL(a.url,true)&&a.id===a.url&&text(a.title)&&text(a.excerpt)&&text(a.publisher)&&Number.isFinite(Date.parse(a.publishedAt)));
 if(record.adaptation!=null){
  require(object(record.adaptation));
  for(const t of Object.values(record.adaptation)){
   require(object(t)&&text(t.text)&&Array.isArray(t.question)&&text(t.question[0])&&list(t.question[1])&&integer(t.question[2])&&t.question[2]<t.question[1].length&&text(t.question[3]));
   optional(t,'oral',text);optional(t,'model',text);
  }
 }
}
function newsDraft(record,draft=false){common(record);if(draft)require(level(record.level)&&httpURL(record.id,true)&&[0,1,2].includes(record.stage)&&bools(record.checks)&&text(record.comprehension)&&text(record.opinion));optional(record,'answer',x=>integer(x)&&x<3)}
function validate(data){
 require(object(data)&&level(data.level)&&integer(data.answers)&&integer(data.correct)&&list(data.completed),'Este archivo no contiene una copia reconocible de Klevy.');
 safeTree(data);require(storage.valid(data));
 records(data.practice,common);records(data.practiceArchive,r=>{if(r.record!==undefined){require(object(r.record));common(r.record)}});
 if(data.contentRevisions)for(const v of Object.values(data.contentRevisions)){
  require(integer(v));require(v<=(window.klevyContentReview?.revision||2),'Esta copia usa contenidos más nuevos. Actualizá Klevy antes de restaurarla.');
 }
 if(data.preferences){optional(data.preferences,'mode',text);optional(data.preferences,'practiceVoice',text);optional(data.preferences,'wordHelp',bool);optional(data.preferences,'size',x=>typeof x==='number'||typeof x==='string')}
 if(data.study){if(data.study.read)for(const v of Object.values(data.study.read))require(bool(v));if(data.study.checks)for(const v of Object.values(data.study.checks))require(integer(v)&&v<3);if(data.study.lastUnit)for(const v of Object.values(data.study.lastUnit))require(text(v))}
 records(data.skills?.speaking,common);records(data.skills?.writing,common);
 records(data.daily?.plans,plan);records(data.daily?.archivedPlans,r=>optional(r,'answers',object));
 records(data.notebook,r=>{common(r);require(text(r.term)&&text(r.meaning));if(r.source!==undefined){require(object(r.source)&&httpURL(r.source.url));optional(r.source,'source',text)}});
 records(data.context?.lessons,r=>{common(r);optional(r,'answers',object);optional(r,'oral',bool)});
 if(data.variety?.seen)require(data.variety.seen.every(x=>object(x)&&level(x.level)&&text(x.type)&&integer(x.index)));
 records(data.variety?.records,common);
 records(data.conversations?.records,r=>conversation(r));records(data.conversations?.drafts,r=>conversation(r,true));
 records(data.listening?.records,r=>listening(r));records(data.listening?.drafts,r=>listening(r,true));
 records(data.news?.selections,newsSelection);records(data.news?.records,r=>newsDraft(r));records(data.news?.drafts,r=>newsDraft(r,true));
 return data;
}
function envelope(data){return {format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),data}}
function prepare(raw){
 require(text(raw)&&raw.trim(),'El archivo está vacío.');
 let value;try{value=JSON.parse(raw.replace(/^\uFEFF/,''))}catch{throw Error('No pudimos leer este archivo. Seleccioná una copia JSON de Klevy.')}
 safeTree(value);require(object(value),'Este archivo no es una copia de Klevy.');
 let data=value,date=null,legacy=true;
 if(own(value,'format')){
  require(value.format===FORMAT,'Este archivo pertenece a otra aplicación.');
  require(value.version===VERSION,'Esta versión de copia no es compatible. Actualizá Klevy antes de restaurarla.');
  require(text(value.createdAt)&&Number.isFinite(Date.parse(value.createdAt)),'La copia no tiene una fecha válida.');
  data=value.data;date=value.createdAt;legacy=false;
 }
 validate(data);
 return {data,createdAt:date,legacy};
}
function summary(data){return {answers:data.answers,words:Object.keys(data.notebook||{}).length,drafts:Object.values(data.skills?.writing||{}).filter(r=>text(r.text)&&r.text.trim()).length,level:data.level}}
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dialog=document.createElement('dialog');dialog.id='backup-dialog';dialog.setAttribute('aria-labelledby','backup-title');
dialog.innerHTML='<div class="backup-heading"><h2 id="backup-title">Restaurar una copia</h2><button type="button" id="backup-close" aria-label="Cerrar restauración">×</button></div><p>Seleccioná el archivo de copia que descargaste de Klevy. Se lee en este dispositivo, sin subirlo a un servidor.</p><label for="backup-file">Archivo de copia de seguridad</label><input id="backup-file" type="file" accept=".json,application/json"><div id="backup-previous-section" hidden><p>Hay una copia automática del estado anterior a la última restauración. Se reemplaza en cada restauración; descargala si querés conservarla.</p><button type="button" id="backup-previous">Revisar estado anterior</button><button type="button" id="backup-previous-download">Descargar copia anterior</button></div><p id="backup-status" role="status" aria-live="polite"></p><div id="backup-preview" hidden></div><div class="backup-actions"><button type="button" id="backup-cancel">Cancelar</button><button type="button" id="backup-apply" class="primary" hidden disabled>Restaurar y reemplazar progreso</button></div>';
document.body.append(dialog);
const style=document.createElement('style');style.textContent='#backup-dialog{width:min(540px,calc(100vw - 24px));max-height:88vh;max-height:88dvh;overflow:auto;padding:22px;border:1px solid var(--ux-border);border-radius:16px;background:var(--ux-panel);color:var(--ux-text)}#backup-dialog::backdrop{background:#08140fb3}#backup-dialog p{line-height:1.7;font-size:14px}.backup-heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.backup-heading h2{margin:0;font-size:23px}.backup-heading button{min-width:44px;min-height:44px}#backup-file{display:block;width:100%;font:inherit;font-size:16px;margin:10px 0 18px}#backup-preview{border-top:1px solid var(--ux-border);margin-top:16px;padding-top:12px}#backup-preview table{width:100%;border-collapse:collapse;font-size:14px}#backup-preview th,#backup-preview td{text-align:left;padding:10px 5px;border-bottom:1px solid var(--ux-border);overflow-wrap:anywhere}#backup-preview th{font-weight:650}#backup-preview .backup-file-name{overflow-wrap:anywhere}.backup-actions{position:sticky;bottom:0;background:var(--ux-panel);padding:12px 0 0;border-top:1px solid var(--ux-border);display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:18px}.backup-actions button{min-height:44px}#backup-status:empty{display:none}#backup-previous-section{border-top:1px solid var(--ux-border);padding-top:8px}#backup-previous-section button{font-size:14px;margin:4px 4px 4px 0}#backup-dialog button:disabled{opacity:.65}html[data-theme="dark"] #backup-dialog{background:var(--ux-panel);color:var(--ux-text)}@media(max-width:400px){#backup-dialog{padding:16px}.backup-actions button{width:100%}}';document.head.append(style);
const input=dialog.querySelector('#backup-file'),status=dialog.querySelector('#backup-status'),preview=dialog.querySelector('#backup-preview'),apply=dialog.querySelector('#backup-apply');
let pending=null,epoch=0,busy=false;
function message(text){status.textContent=text;}
function clear(){pending=null;preview.replaceChildren();preview.hidden=true;apply.hidden=true;apply.disabled=true;message('')}
function refreshRecovery(){let raw=null;try{raw=storage.recovery()}catch{}dialog.querySelector('#backup-previous-section').hidden=!raw}
function open(){
 if(dialog.open)return;
 if(window.klevySimple.screen!=='stats')window.klevySimple.stats();const launcher=document.querySelector('#backup-open');if(launcher)launcher.closest('details').open=true;epoch++;busy=false;clear();input.value='';input.disabled=false;refreshRecovery();dialog.showModal();
}
function close(){if(busy)return;epoch++;clear();dialog.close();document.querySelector('#backup-open')?.focus()}
function show(parsed,name){
 const token=storage.capture(),current=JSON.parse(token.live),old=summary(current),incoming=summary(parsed.data);
 const date=parsed.createdAt?new Date(parsed.createdAt).toLocaleString('es-AR'):'Copia anterior sin fecha de exportación';
 const rows=[['Nivel',incoming.level,old.level],['Respuestas registradas',incoming.answers.toLocaleString('es-AR'),old.answers.toLocaleString('es-AR')],['Expresiones del cuaderno',incoming.words,old.words],['Borradores de escritura',incoming.drafts,old.drafts]];
 preview.innerHTML=`<p class="backup-file-name"><strong>${escape(name)}</strong><br>${escape(date)}</p><table><thead><tr><th scope="col">Contenido</th><th scope="col">Copia</th><th scope="col">Actual</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${escape(r[0])}</th><td>${escape(r[1])}</td><td>${escape(r[2])}</td></tr>`).join('')}</tbody></table><p><strong>La restauración reemplaza el progreso actual de este navegador.</strong> Antes de hacerlo, Klevy guardará una copia de ese estado para poder volver atrás.</p><p>Incluye los registros de práctica, rutas, repasos, cuaderno y borradores presentes en el archivo. Las grabaciones temporales no se incluyen.</p>${parsed.legacy?'<p>Esta es una copia del formato anterior. Las preguntas actualizadas pueden pasar al historial al abrirla; los intentos se conservan.</p>':''}${storage.status==='corrupt'?'<p>El guardado actual no se pudo leer. También se conservarán esos datos originales en la copia automática.</p>':''}`;
 pending={...parsed,name,token};preview.hidden=false;apply.hidden=false;apply.disabled=false;message('Revisá el resumen antes de confirmar.');
}
input.onchange=async()=>{
 const ticket=++epoch;clear();const file=input.files?.[0];if(!file)return;
 if(file.size>MAX_BYTES){message('La copia es demasiado grande. El tamaño máximo es 8 MB.');return}
 message('Leyendo y validando la copia…');
 try{const raw=await file.text();if(ticket!==epoch||!dialog.open)return;const parsed=prepare(raw);show(parsed,file.name)}catch(error){if(ticket===epoch&&dialog.open){clear();message(error.message||'No pudimos preparar esta copia.')}}
};
dialog.querySelector('#backup-previous').onclick=()=>{epoch++;clear();input.value='';try{const raw=storage.recovery();require(raw,'No hay una copia automática disponible.');show(prepare(raw),'Copia automática anterior')}catch(error){message(error.message)}};
dialog.querySelector('#backup-previous-download').onclick=()=>{try{const raw=storage.recovery();require(raw,'No hay una copia automática disponible.');storage.downloadRaw(raw,'klevy-estado-anterior.json');message('Se solicitó la descarga de la copia anterior.')}catch(error){message(error.message)}};
apply.onclick=()=>{
 if(!pending||busy)return;
 busy=true;apply.disabled=true;input.disabled=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);message('Guardando la copia anterior y restaurando…');
 try{
  // Validate again at the final boundary; the preview itself never writes imported data.
  validate(pending.data);storage.restore(pending.data,pending.token,envelope);
  message('Copia restaurada. Abriendo tu progreso…');location.reload();
 }catch(error){busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);input.disabled=false;apply.disabled=true;pending=null;message(error.message||'No se pudo restaurar. El progreso anterior se conserva.')}
};
dialog.querySelector('#backup-close').onclick=close;dialog.querySelector('#backup-cancel').onclick=close;
dialog.addEventListener('cancel',event=>{event.preventDefault();close()});dialog.addEventListener('close',()=>{epoch++;pending=null});
window.addEventListener('storage',event=>{if(dialog.open&&(event.key==='english-path-offline'||event.key===null)){pending=null;apply.disabled=true;message('El progreso cambió en otra pestaña. Recargá Klevy y volvé a seleccionar la copia.')}});
storage.exportWith(envelope);
window.klevyBackup={open,prepare,validate};
})();
