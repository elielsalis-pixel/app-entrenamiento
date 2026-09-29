// Pruebas de comportamiento de la app (Chromium headless, pantalla de celular).
// Uso: tests/verificar.sh   (levanta un servidor local, chequea sintaxis y corre esto)
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.APP_URL || 'http://localhost:8765/index.html';
const resultados = [];
function ok(nombre, cond, detalle){ resultados.push({nombre, ok: !!cond, detalle}); if(process.env.VERBOSE) console.log((cond?"✔ ":"✘ ")+nombre); }

const RUTINA = `DIA 1: Push
Press banca plano | descanso 120 | calentamiento 1 | aproximacion 1 | series 3 | reps 8-12 | alt: Press con mancuernas, Press en máquina
Fondo de máquina asistido | descanso 90 | calentamiento 0 | aproximacion 0 | series 3 | reps 8-12
DIA 2: Pull
Remo con barra | descanso 90 | series 3 | reps 8-12
DIA 3: Legs
Prensa de piernas | descanso 90 | series 3 | reps 10-12
DIA 4: Tren superior
Press militar | descanso 90 | series 3 | reps 8-10
DIA 5: Pierna + brazos
Curl femoral | descanso 60 | series 3 | reps 10-12`;
const TARDE = `TARDE: Cardio + Abs
CARDIO: Cinta
Crunch en polea | series 3 | medida kg+reps | reps 12-15 | descanso 60
Plancha | series 2 | medida seg | descanso 45
Caminata del granjero | series 2 | medida kg+m | descanso 90`;

(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390,height:844}, acceptDownloads:true, timezoneId:'America/Argentina/Buenos_Aires', permissions:['clipboard-read','clipboard-write']});
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  const dialogos=[]; page.on('dialog', d=>{ dialogos.push(d.message()); d.accept(); });
  const ev = (fn, arg)=>page.evaluate(fn, arg);
  const visible = (t)=>page.isVisible(`text=${t}`);
  const clip = ()=>ev(()=>navigator.clipboard.readText());

  await page.goto(URL);
  await ev(()=>{ localStorage.clear(); indexedDB.deleteDatabase('entrenoMedia'); });
  await page.reload(); await page.waitForTimeout(300);

  // --- pantalla vacía
  ok('vacía: pide cargar rutina', await visible('Cargá tu rutina'));
  ok('vacía: botón restaurar copia', await visible('Restaurar desde una copia'));
  await page.click('text=Copiar prompt para pedírselo a una IA');
  ok('vacía: copia prompt generador', (await clip()).includes('DIA 1: [nombre del día'));
  await page.fill('#routinepaste', RUTINA);
  await page.click('text=Cargar rutina');
  ok('carga rutina: 5 días', await ev(()=>state.routine.days.length===5));
  ok('carga rutina: campos parseados', await ev(()=>{ const e=state.routine.days[0].exercises[0]; return e.descanso===120&&e.calentamiento===1&&e.aproximacion===1&&e.series===3&&e.repsMin===8&&e.repsMax===12&&e.alternativas.length===2; }));

  // --- inicio
  ok('inicio: día de hoy', await page.isVisible('h1:has-text("Push")'));
  ok('inicio: semana 1 de 12', await visible('Semana 1 de 12'));
  ok('inicio: botones Spotify/YouTube', await visible('Spotify') && await visible('YouTube'));
  await page.click('text=Pull >> nth=0'); 
  ok('inicio: expandir día muestra ejercicios', await visible('Remo con barra'));
  await page.click('text=Saltar este día');
  ok('inicio: saltar día avanza', await ev(()=>state.slot===1));
  await ev(()=>{ state.slot=0; saveState(); render(); });

  // --- historia previa con 45/40/30 para precarga
  await ev(()=>{
    state.history.push({fecha:'2026-09-22T12:00:00Z',dayName:'Push',exercises:[{nombre:'Fondo de máquina asistido',sets:[{peso:45,reps:10,tipo:'Normal',done:true},{peso:40,reps:10,tipo:'Normal',done:true},{peso:30,reps:10,tipo:'Normal',done:true},{peso:30,reps:10,tipo:'Normal',done:false}]}],duracionSeg:1800,volumenTotal:9999});
    state.lastSetsByDayExercise={'Push::Fondo de máquina asistido':[{peso:45,reps:10,tipo:'Normal'},{peso:40,reps:10,tipo:'Normal'},{peso:30,reps:10,tipo:'Normal'}]};
    state.lastByExercise={'Press banca plano':{peso:60,reps:10}}; state.ultimaCopia=new Date().toISOString(); saveState(); render();
  });

  // --- sesión mañana
  await page.click('text=Empezar entrenamiento');
  ok('sesión: precarga cal/apx/normal por %', await ev(()=>state.activeSession.exercises[0].sets.map(s=>s.tipo[0]+s.peso).join(',')==='C30,A45,N60,N60,N60'));
  ok('sesión: foto automática', await visible('Foto sugerida automáticamente'));
  ok('sesión: objetivo reps', await visible('Objetivo: 8-12 reps'));
  ok('sesión: temporizador con descanso del ejercicio', (await page.textContent('.timerbox')).includes('02:00'));
  // stepper
  await page.click('button[aria-label="Sumar Kg"] >> nth=2');
  await page.click('button[aria-label="Restar Reps"] >> nth=2');
  ok('sesión: stepper peso +2.5 y reps -1', await ev(()=>{ const s=state.activeSession.exercises[0].sets[2]; return s.peso===62.5 && s.reps===9; }));
  // recalcular
  await page.click('text=Recalcular calentamiento/aproximación según peso de hoy');
  ok('sesión: recalcular cal/apx', await ev(()=>{ const s=state.activeSession.exercises[0].sets; return s[0].peso===31 && s[1].peso===47; }));
  // tipo y RPE
  await page.selectOption('select.set-select >> nth=4', 'Fallo');
  await page.selectOption('select[aria-label^="RPE"] >> nth=2', '8');
  ok('sesión: cambiar tipo y RPE', await ev(()=>{ const s=state.activeSession.exercises[0].sets[2]; return s.tipo==='Fallo' && s.rpe===8; }));
  // marcar serie -> timer y PR
  await ev(()=>{ const s=state.activeSession.exercises[0].sets[2]; s.tipo='Normal'; saveState(); render(); });
  const checks = await page.$$('button[aria-label="Marcar serie"], button[aria-label="Borrar serie"]');
  await checks[2].click();
  ok('sesión: marcar serie la marca hecha', await ev(()=>state.activeSession.exercises[0].sets[2].done));
  ok('sesión: marcar serie arranca descanso', await ev(()=>state.activeSession.exercises[0].timerCorriendo===true));
  ok('sesión: récord personal registrado', await ev(()=>state.prByExercise['Press banca plano']>0 && state.activeSession.exercises[0].prLogrado));
  ok('sesión: 1RM estimado visible', !(await page.textContent('.card >> nth=1')).includes('—'));
  // agregar serie
  const antes = await ev(()=>state.activeSession.exercises[0].sets.length);
  await page.click('text=Agregar serie');
  ok('sesión: agregar serie copia la última', await ev((a)=>{ const s=state.activeSession.exercises[0].sets; return s.length===a+1 && s[s.length-1].peso===s[s.length-2].peso && !s[s.length-1].done; }, antes));
  // mantener presionado para borrar
  const btns = await page.$$('button[aria-label="Marcar serie"], button[aria-label="Borrar serie"]');
  const b = btns[btns.length-1]; await b.scrollIntoViewIfNeeded(); const bb = await b.boundingBox();
  await page.mouse.move(bb.x+5, bb.y+5); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  ok('sesión: mantener presionado activa borrar', await ev(()=>{ const s=state.activeSession.exercises[0].sets; return s[s.length-1].deleteMode===true; }));
  const btns2 = await page.$$('button[aria-label="Marcar serie"], button[aria-label="Borrar serie"]'); await btns2[btns2.length-1].click();
  ok('sesión: borrar serie', await ev((a)=>state.activeSession.exercises[0].sets.length===a, antes));
  // editar descanso
  await page.click('.timerbox button:has(svg)');
  await page.fill('#editmin', '1'); await page.fill('#editsec', '45'); await page.click('.timerbox >> text=Guardar');
  ok('sesión: editar descanso se recuerda', await ev(()=>state.customDescanso['Press banca plano']===105));
  // notas
  await page.click('button[aria-label="Notas del ejercicio"]');
  await page.fill('#notaText', 'Agarre cerrado'); await page.click('text=Guardar nota');
  ok('sesión: nota por ejercicio', await visible('📝 Agarre cerrado'));
  // discos
  await page.click('text=Discos');
  await page.fill('.set-input >> nth=0', '100');
  ok('discos: calcula por lado', await ev(()=>{ const t=document.querySelector('#screen .card').textContent; return t.includes('25 kg × 1') && t.includes('15 kg × 1'); }));
  await page.click('text=Volver');
  // sustituir solo hoy
  await page.click('button:text-is("Cambiar")');
  await page.click('text=Solo hoy >> nth=0');
  ok('sustituir solo hoy', await ev(()=>state.activeSession.exercises[0].nombre==='Press con mancuernas' && state.routine.days[0].exercises[0].nombre==='Press banca plano'));
  // siguiente ejercicio: precarga por serie 45/40/30
  await page.click('text=Siguiente');
  ok('sesión: precarga serie por serie 45/40/30', await ev(()=>state.activeSession.exercises[1].sets.map(s=>s.peso).join('/')==='45/40/30'));
  ok('sesión: el reloj del ejercicio anterior no se muestra acá', (await page.textContent('.timerbox')).includes('01:30'));
  // subí peso
  await ev(()=>{ state.activeSession.exercises[1].sets.forEach(s=>{ s.reps=12; s.done=true; }); saveState(); render(); });
  ok('sesión: sugerencia subir peso', await visible('Subí peso la próxima'));
  // finalizar con pendientes
  await page.click('text=Finalizar sesión');
  ok('finalizar: avisa series pendientes', dialogos.some(d=>d.includes('sin marcar')));
  ok('finalizar: muestra resumen', await visible('Sesión completa'));
  ok('finalizar: guarda solo series hechas', await ev(()=>{ const h=state.history[state.history.length-1]; return h.exercises.every(e=>e.sets.every(s=>s.done)) && h.exercises.length===2; }));
  ok('finalizar: avanza el día', await ev(()=>state.slot===1));
  ok('finalizar: memoria por día y serie', await ev(()=>state.lastSetsByDayExercise['Push::Fondo de máquina asistido'].length===3));
  ok('finalizar: registro interno de cambios', await ev(()=>(state.logCambios||[]).length>0));
  await page.click('text=Volver al inicio');
  // cerrar sin nada
  await page.click('text=Empezar entrenamiento');
  await page.click('text=Finalizar sesión');
  ok('cerrar sin marcar no guarda ni avanza', await ev(()=>state.slot===1 && !state.activeSession && state.history.length===2));

  // --- rutina: editar día, ajustes, reinicios, formato
  await ev(()=>setTab('rutina'));
  ok('rutina: lista de días', await visible('Remo con barra'));
  const card = await page.$('.card:has-text("Pull")'); await card.scrollIntoViewIfNeeded(); const cb = await card.boundingBox();
  await page.mouse.move(cb.x+20, cb.y+20); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  ok('rutina: mantener presionado abre editor de día', await visible('Editar: Pull'));
  const txt = await page.inputValue('#daypaste');
  await page.fill('#daypaste', txt.replace('Remo con barra','Remo en polea'));
  await page.click('text=Guardar cambios de este día');
  ok('rutina: editar día guarda', await ev(()=>state.routine.days[1].exercises[0].nombre==='Remo en polea'));
  await page.fill('#ajustesPaste', 'AJUSTE: Prensa de piernas | peso 52\nAJUSTE: Inexistente | peso 10');
  await page.click('text=Aplicar ajustes');
  ok('ajustes: aplica y reporta', await ev(()=>state.lastByExercise['Prensa de piernas'].peso===52) && await visible('No encontré "Inexistente"'));
  await page.click('text=Ver formato >> nth=0');
  ok('rutina: ver formato', await visible('Cada día empieza con'));
  await page.click('text=Copiar link');
  ok('rutina: copiar link de la app', (await clip()).includes('index.html'));
  await page.click('text=Desactivar frases motivadoras');
  ok('rutina: apagar frases', await ev(()=>state.motivacionOn===false));
  await page.click('text=Activar frases motivadoras');
  await page.click('text=Reiniciar semana actual');
  ok('rutina: reiniciar semana', await ev(()=>state.slot===0));
  // sonidos
  fs.writeFileSync('/tmp/sonido.mp3', Buffer.from('ID3fake'));
  const [ch] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=+ Subir audio')]);
  await ch.setFiles('/tmp/sonido.mp3'); await page.waitForTimeout(500);
  ok('sonidos: subir audio', await visible('🔊 sonido.mp3') && await ev(()=>state.sonidoPreferido==='custom'));
  await page.click('text=Beep predeterminado');
  ok('sonidos: elegir beep', await ev(()=>state.sonidoPreferido==='beep'));
  await page.click('text=Quitar'); await page.waitForTimeout(300);
  ok('sonidos: quitar audio', await ev(()=>media.sounds.length===0));

  // --- turno tarde
  await page.fill('#tardePaste', TARDE);
  await page.click('text=Guardar turno tarde');
  ok('tarde: guarda rutina', await ev(()=>state.routineTarde.exercises.length===4 && state.routineTarde.exercises[3].medida==='kg+m'));
  ok('tarde: texto precargado para editar (ida y vuelta)', await ev((t)=>JSON.stringify(parseTarde(t))===JSON.stringify(state.routineTarde), await page.inputValue('#tardePaste')));
  ok('mañana: texto de un día ida y vuelta', await ev(()=>state.routine.days.every((d,i)=>JSON.stringify(parseRoutine(diaToText(d,i)).days[0])===JSON.stringify(d))));
  await ev(()=>setTab('inicio'));
  await page.click('text=Empezar turno tarde');
  const inputs = await page.$$('.card input.set-input');
  await inputs[1].fill('30'); await inputs[2].fill('6.5');
  await page.click('text=Marcar como hecho');
  ok('tarde: cardio hecho', await ev(()=>state.activeSession.exercises[0].cardioHecho));
  await page.click('text=Siguiente');
  ok('tarde: kg+reps sin discos', !(await visible('Discos')));
  await ev(()=>{ const e=state.activeSession.exercises[1]; e.sets.forEach(s=>{ s.peso=20; s.reps=12; s.done=true; }); saveState(); render(); });
  await page.click('text=Siguiente');
  ok('tarde: medida seg muestra Seg', (await page.textContent('#screen')).includes('Seg'));
  await ev(()=>{ const e=state.activeSession.exercises[2]; e.sets.forEach(s=>{ s.seg=60; s.done=true; }); saveState(); render(); });
  await page.click('text=Siguiente');
  ok('tarde: medida kg+m muestra Metros', await visible('Metros'));
  await ev(()=>{ const e=state.activeSession.exercises[3]; e.sets[0].peso=24; e.sets[0].m=40; e.sets[0].done=true; saveState(); render(); });
  await page.click('text=Finalizar sesión');
  ok('tarde: guarda aparte y no avanza día', await ev(()=>state.historyTarde.length===1 && state.slot===0));
  ok('tarde: resumen', await visible('Sesión completa'));
  await page.click('text=Volver al inicio');
  await page.click('text=Empezar turno tarde');
  ok('tarde: precarga la vez siguiente', await ev(()=>state.activeSession.exercises[3].sets.map(s=>s.peso+'/'+s.m).join(',')==='24/40,24/40'));
  await page.click('text=Finalizar sesión'); // sin nada -> descarta

  // --- sueltos
  await ev(()=>setTab('inicio'));
  await page.click('text=Cargar ejercicio suelto');
  await page.click('button:has-text("🏃 Cardio")');
  await page.fill('input[placeholder="ej. 30"]', '25'); await page.fill('input[placeholder^="ej. cinta"]', 'Elíptica'); await page.fill('input[placeholder="ej. 6.5"]', '7');
  await page.click('text=Guardar');
  await page.click('button:has-text("✊ Agarre")');
  await page.fill('input[placeholder="Valor"]', '35'); await page.click('text=Guardar');
  await page.click('button:has-text("🔥 Abdominales")');
  await page.fill('input[placeholder="Valor"]', '20'); await page.click('text=Guardar');
  ok('sueltos: cardio, agarre y abs guardados', await ev(()=>state.actividadesExtra.map(a=>a.tipo).join(',')==='cardio,agarre,abdominales'));
  ok('sueltos: fecha de hoy en hora argentina', await ev(()=>state.actividadesExtra.every(a=>new Date(a.fecha).toLocaleDateString('es-AR')===new Date().toLocaleDateString('es-AR'))));
  ok('sueltos: cardio con los mismos campos que la tarde', await ev(()=>state.actividadesExtra[0].cardioData.velocidad==='7'));
  ok('sueltos: listado', await visible('Elíptica') && await visible('Dead hang') && await visible('Crunch'));
  const dels = await page.$$('button[aria-label="Borrar"]'); await dels[0].click();
  ok('sueltos: borrar registro', await ev(()=>state.actividadesExtra.length===2));

  // --- historial, informe, CSV, gráfico
  await ev(()=>{ state.actividadesExtra.unshift({tipo:'cardio', fecha:'2026-09-01T15:00:00Z', duracionMin:20, modalidad:'Bici vieja', medicionTipo:'sensacion', medicionValor:'Fácil, puedo hablar normal'}); saveState(); });
  await ev(()=>setTab('historial'));
  ok('historial: sesiones de mañana y tarde', await visible('Turno tarde') && await page.isVisible('.hist-row'));
  ok('historial: volumen de sesión vieja sin series fantasma', (await page.textContent('#screen')).includes('1150 kg'));
  await page.click('text=Copiar informe completo');
  const inf = await clip();
  const falta = ['Fondo de máquina asistido','TURNO TARDE','EJERCICIOS SUELTOS','Crunch en polea (kg+reps)','Cardio: Cinta','Cardio: Bici vieja · 20 min','Agarre (Dead hang)'].filter(t=>!inf.includes(t));
  ok('informe: mañana, tarde y sueltos', !falta.length, 'falta: '+falta.join(', '));
  await page.click('text=Copiar como CSV');
  const csv = await clip();
  ok('CSV: tres bloques', csv.includes('"Fecha","Dia"') && csv.includes('"Turno tarde"') && csv.includes('"Fecha","Tipo"'));
  await page.selectOption('select.set-select', 'Fondo de máquina asistido');
  ok('gráfico de progreso', await page.isVisible('#screen svg path'));

  // --- copia de seguridad
  await ev(()=>setTab('rutina'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar copia')]);
  await dl.saveAs('/tmp/copia-test.json');
  const copia = JSON.parse(fs.readFileSync('/tmp/copia-test.json','utf8'));
  ok('copia: incluye todo', copia.app==='entreno' && copia.state.history.length===2 && copia.state.historyTarde.length===1);
  ok('copia: nombre con fecha local', dl.suggestedFilename()===`entreno-copia-${await ev(()=>hoyISO())}.json`);
  await ev(async()=>{ localStorage.clear(); await mediaClear(); });
  await page.reload(); await page.waitForTimeout(300);
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Restaurar desde una copia')]);
  await ch2.setFiles('/tmp/copia-test.json'); await page.waitForTimeout(1200);
  ok('copia: restaura desde pantalla vacía', await ev(()=>state.history.length===2 && !!state.routineTarde));
  await ev(()=>{ state.ultimaCopia=null; saveState(); setTab('inicio'); });
  ok('recordatorio de copia en inicio', await visible('Todavía no hiciste una copia de seguridad'));

  // --- migraciones y robustez
  await ev(()=>{ const st=JSON.parse(localStorage.entrenoState); st.customImages={'Remo en polea':'data:image/png;base64,iVBORw0KGgo='}; localStorage.setItem('entrenoState', JSON.stringify(st)); });
  await page.reload(); await page.waitForTimeout(600);
  ok('migración: fotos viejas a IndexedDB', await ev(()=>!!media.images['Remo en polea'] && !JSON.parse(localStorage.entrenoState).customImages));
  await ev(()=>{ localStorage.setItem('entrenoState','{roto'); });
  await page.reload(); await page.waitForTimeout(300);
  ok('estado dañado: la app arranca', await visible('Cargá tu rutina'));
  await ev(()=>{ Storage.prototype.setItem=function(){ throw new DOMException('x','QuotaExceededError'); }; saveState(); });
  ok('aviso si falla el guardado', await page.isVisible('#avisoGuardado'));

  // --- rotación con 4 días y aviso de bloque
  ok('rotación y aviso según días de la rutina', await ev(()=>{
    state.routine={days:[1,2,3,4].map(i=>({name:'D'+i,exercises:[]}))}; state.slot=0; const nombres=[]; const avisos=[];
    for(let i=0;i<32;i++){ nombres.push(state.routine.days[todayDayIndex()].name); avanzarSlot(); if(state.showWeekBanner) avisos.push(state.showWeekBanner); }
    return nombres.slice(0,6).join()==='D1,D2,D3,D4,D1,D2' && avisos.join()==='4,8';
  }));

  // --- sin internet: la foto del ejercicio queda guardada en el caché de la app
  // (se revisa el caché directo: el modo offline de Playwright no corta las descargas del service worker)
  const ctx2 = await browser.newContext({viewport:{width:390,height:844}});
  const p2 = await ctx2.newPage(); p2.on('dialog', d=>d.accept());
  await p2.goto(URL);
  await p2.evaluate((r)=>{ localStorage.setItem('entrenoState', JSON.stringify({routine: parseRoutine(r), history:[], lastByExercise:{}, prByExercise:{}, slot:0, activeSession:null, ultimaCopia:new Date().toISOString()})); }, RUTINA);
  await p2.evaluate(()=>navigator.serviceWorker.ready);
  await p2.reload(); await p2.click('text=Empezar entrenamiento');
  await p2.waitForFunction(()=>{ const i=document.querySelector('.exphoto img'); return i && i.complete && i.naturalWidth>0; });
  await p2.waitForTimeout(500);
  const guardada = await p2.evaluate(async()=>{ const src=document.querySelector('.exphoto img').src; for(const k of await caches.keys()){ if(await (await caches.open(k)).match(src)) return true; } return false; });
  ok('sin internet: la foto del ejercicio queda guardada', guardada);
  await ctx2.close();

  ok('sin errores de JavaScript', errores.length===0, errores.join(' | '));
  await browser.close();
  const fallas = resultados.filter(r=>!r.ok);
  resultados.forEach(r=>console.log(`${r.ok?'✔':'✘'} ${r.nombre}${r.ok||!r.detalle?'':' — '+r.detalle}`));
  console.log(`\n${resultados.length-fallas.length}/${resultados.length} pruebas OK`);
  process.exit(fallas.length?1:0);
})().catch(e=>{ console.error('ERROR EN LA PRUEBA:', e.message); process.exit(2); });
