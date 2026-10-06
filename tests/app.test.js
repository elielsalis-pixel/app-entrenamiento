// Pruebas de comportamiento de la app (Chromium headless, pantalla de celular, hora de Argentina).
// Uso: tests/verificar.sh   (levanta un servidor local, chequea sintaxis y corre esto)
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.APP_URL || 'http://localhost:8765/index.html';
const resultados = [];
function ok(nombre, cond, detalle){ resultados.push({nombre, ok: !!cond, detalle}); if(process.env.VERBOSE) console.log((cond?'✔ ':'✘ ')+nombre); }

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
  const tocar = (sel)=>page.click(sel);
  const mantener = async(loc)=>{ await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); await page.mouse.move(bb.x+10, bb.y+bb.height/2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(450); };
  const ses = ()=>ev(()=>state.activeSession);

  await page.goto(URL);
  await ev(()=>{ localStorage.clear(); indexedDB.deleteDatabase('entrenoMedia'); });
  await page.reload(); await page.waitForTimeout(300);

  // --- pantalla vacía
  ok('vacía: pide cargar rutina', await visible('Cargá tu rutina'));
  ok('vacía: botón restaurar copia', await page.isVisible('button:has-text("Restaurar")'));
  await tocar('text=Copiar prompt para pedírselo a una IA');
  ok('vacía: copia prompt generador', (await clip()).includes('DIA 1: [nombre del día'));
  await page.fill('#routinepaste', RUTINA);
  await tocar('button:has-text("Cargar rutina")');
  ok('carga rutina: 5 días', await ev(()=>state.routine.days.length===5));
  ok('carga rutina: campos parseados', await ev(()=>{ const e=state.routine.days[0].exercises[0]; return e.descanso===120&&e.calentamiento===1&&e.aproximacion===1&&e.series===3&&e.repsMin===8&&e.repsMax===12&&e.alternativas.length===2; }));

  // --- inicio
  ok('inicio: día de hoy', await page.isVisible('h1:has-text("Push")'));
  ok('inicio: semana sin plan (sin número inventado)', await visible('Hoy · Semana 1') && !(await visible('de 12')));
  ok('inicio: botones Spotify/YouTube', await page.isVisible('[aria-label="Abrir Spotify"]') && await page.isVisible('[aria-label="Abrir YouTube"]'));
  ok('inicio: 5 pestañas con Ajustes', await ev(()=>[...document.querySelectorAll('#tabbar button')].map(b=>b.textContent.trim()).join()==='Inicio,Sesión,Rutina,Historial,Ajustes'));
  await tocar('.semana [aria-label^="Pull"]');
  ok('inicio: expandir día muestra ejercicios', await visible('Remo con barra'));
  await tocar('text=Saltar este día');
  ok('inicio: saltar día avanza', await ev(()=>state.slot===1));
  await ev(()=>{ state.slot=0; saveState(); render(); });

  // --- historia previa con 45/40/30 para precarga
  await ev(()=>{
    state.history.push({fecha:'2026-09-22T12:00:00Z',dayName:'Push',exercises:[{nombre:'Fondo de máquina asistido',sets:[{peso:45,reps:10,tipo:'Normal',done:true},{peso:40,reps:10,tipo:'Normal',done:true},{peso:30,reps:10,tipo:'Normal',done:true},{peso:30,reps:10,tipo:'Normal',done:false}]}],duracionSeg:1800,volumenTotal:9999});
    state.lastSetsByDayExercise={'Push::Fondo de máquina asistido':[{peso:45,reps:10,tipo:'Normal'},{peso:40,reps:10,tipo:'Normal'},{peso:30,reps:10,tipo:'Normal'}]};
    state.lastByExercise={'Press banca plano':{peso:60,reps:10}}; state.ultimaCopia=new Date().toISOString(); saveState(); render();
  });

  // --- sesión de un día de la rutina
  await tocar('text=Empezar entrenamiento');
  ok('sesión: precarga cal/apx/normal por %', await ev(()=>state.activeSession.exercises[0].sets.map(s=>s.tipo[0]+s.peso).join(',')==='C30,A45,N60,N60,N60'));
  ok('sesión: foto automática en miniatura', await page.isVisible('.miniatura img'));
  ok('sesión: objetivo de reps y descanso del ejercicio', await visible('8–12 reps · descanso 2:00'));
  ok('sesión: nombres de ejercicios bajo la barra', await page.isVisible('.seglabel:has-text("Fondo de máquina asistido")'));
  ok('sesión: la primera serie pendiente es la activa', await page.isVisible('.serie-activa:has-text("Serie 1")'));
  // tocar la fila de la serie 3 la activa
  await tocar('.set-row >> nth=1');
  ok('sesión: tocar una serie la activa', await page.isVisible('.serie-activa:has-text("Serie 3")'));
  await tocar('button[aria-label="Sumar Kg"]');
  await tocar('button[aria-label="Restar Reps"]');
  ok('sesión: stepper peso +2.5 y reps -1', await ev(()=>{ const s=state.activeSession.exercises[0].sets[2]; return s.peso===62.5 && s.reps===9; }));
  for(let i=0;i<3;i++) await tocar('.serie-activa button[aria-label^="Tipo de serie"]');
  ok('sesión: cambiar tipo de serie', await ev(()=>state.activeSession.exercises[0].sets[2].tipo==='Fallo'));
  await tocar('.serie-activa button[aria-label^="Tipo de serie"]');
  // Más: recalcular
  await tocar('button:has-text("Más")');
  await tocar('text=Recalcular calentamiento/aproximación según peso de hoy');
  ok('sesión: recalcular cal/apx', await ev(()=>{ const s=state.activeSession.exercises[0].sets; return s[0].peso===31 && s[1].peso===47; }));
  // marcar la serie 3 como hecha (sigue activa al volver de Más)
  ok('sesión: la serie activa se mantiene al volver de Más', await page.isVisible('.serie-activa:has-text("Serie 3")'));
  await tocar('.serie-activa button:has-text("Hecha")');
  ok('sesión: marcar serie la marca hecha', await ev(()=>state.activeSession.exercises[0].sets[2].done));
  ok('sesión: marcar serie arranca descanso', await ev(()=>state.activeSession.descanso && state.activeSession.descanso.total===120));
  ok('sesión: barra de descanso visible', await page.isVisible('#restbar .tiempo'));
  ok('sesión: la primera vez queda como referencia, no como récord', await ev(()=>state.prByExercise['Press banca plano']>0 && !state.activeSession.exercises[0].pr));
  await tocar('button[aria-label="RPE 8"]');
  ok('sesión: RPE en serie hecha', await ev(()=>state.activeSession.exercises[0].sets[2].rpe===8));
  // descanso +15 / −15 / saltar
  const fin0 = await ev(()=>state.activeSession.descanso.finEn);
  await tocar('#restbar button[aria-label="Sumar 15 segundos"]');
  ok('descanso: +15 segundos', await ev((f)=>state.activeSession.descanso.finEn - f >= 14000, fin0));
  await tocar('#restbar button[aria-label="Restar 15 segundos"]');
  ok('descanso: −15 segundos', await ev((f)=>Math.abs(state.activeSession.descanso.finEn - f) < 2000, fin0));
  // 1RM en Más
  await tocar('button:has-text("Más")');
  ok('sesión: 1RM estimado visible', !(await page.textContent('.metric')).includes('—'));
  // editar descanso
  await page.fill('#editmin', '1'); await page.fill('#editsec', '45'); await tocar('text=Guardar descanso');
  ok('sesión: editar descanso se recuerda', await ev(()=>state.customDescanso['Press banca plano']===105));
  // agregar serie
  const antes = await ev(()=>state.activeSession.exercises[0].sets.length);
  await tocar('text=Agregar serie');
  ok('sesión: agregar serie copia la última', await ev((a)=>{ const s=state.activeSession.exercises[0].sets; return s.length===a+1 && s[s.length-1].peso===s[s.length-2].peso && !s[s.length-1].done; }, antes));
  // mantener presionado para borrar
  await mantener(page.locator('.set-row').nth(0));
  ok('sesión: mantener presionado activa borrar', await ev(()=>state.activeSession.exercises[0].sets.some(s=>s.deleteMode)));
  await tocar('button[aria-label="Borrar serie"]');
  ok('sesión: borrar serie', await ev((a)=>state.activeSession.exercises[0].sets.length===a, antes));
  // notas
  await tocar('button[aria-label="Notas del ejercicio"]');
  await page.fill('#notaText', 'Agarre cerrado'); await tocar('text=Guardar nota');
  ok('sesión: nota por ejercicio', await visible('Nota: Agarre cerrado'));
  // foto: pantalla grande
  await tocar('.miniatura');
  ok('sesión: foto grande con opción de cambiar', await page.isVisible('.foto-grande img') && await visible('Cambiar foto'));
  await tocar('text=Volver');
  // discos
  await tocar('button:has-text("Más")');
  await tocar('text=Calculadora de discos');
  await page.fill('.set-input >> nth=0', '100');
  ok('discos: calcula por lado', await ev(()=>{ const t=document.querySelector('#screen .card').textContent; return t.includes('25 kg × 1') && t.includes('15 kg × 1'); }));
  await tocar('text=Volver');
  // sustituir solo hoy
  await tocar('button:has-text("Cambiar")');
  await tocar('text=Solo hoy >> nth=0');
  ok('sustituir solo hoy', await ev(()=>state.activeSession.exercises[0].nombre==='Press con mancuernas' && state.routine.days[0].exercises[0].nombre==='Press banca plano'));
  // siguiente ejercicio: precarga y columna Anterior
  await tocar('button:has-text("Siguiente")');
  ok('sesión: precarga serie por serie 45/40/30', await ev(()=>state.activeSession.exercises[1].sets.map(s=>s.peso).join('/')==='45/40/30'));
  ok('sesión: columna Anterior con lo de la vez pasada', await page.isVisible('.set-row .ant:has-text("40 × 10")') && await visible('La vez pasada: 45 × 10'));
  ok('sesión: el descanso sigue visible al cambiar de ejercicio', await page.isVisible('#restbar:has-text("Press banca plano")'));
  await tocar('#restbar button[aria-label="Saltar descanso"]');
  ok('descanso: saltar lo cierra', await ev(()=>!state.activeSession.descanso) && !(await page.isVisible('#restbar')));
  // subí peso
  await ev(()=>{ state.activeSession.exercises[1].sets.forEach(s=>{ s.reps=12; s.done=true; }); saveState(); render(); });
  ok('sesión: sugerencia subir peso', await visible('subí peso la próxima'));
  // finalizar con pendientes
  await tocar('text=Finalizar sesión');
  ok('finalizar: avisa series pendientes', dialogos.some(d=>d.includes('sin marcar')));
  ok('finalizar: muestra resumen', await visible('Sesión completa'));
  ok('finalizar: guarda solo series hechas', await ev(()=>{ const h=state.history[state.history.length-1]; return h.exercises.every(e=>e.sets.every(s=>s.done)) && h.exercises.length===2; }));
  ok('finalizar: avanza el día', await ev(()=>state.slot===1));
  ok('finalizar: memoria por día y serie', await ev(()=>state.lastSetsByDayExercise['Push::Fondo de máquina asistido'].length===3));
  ok('finalizar: registro interno de cambios', await ev(()=>(state.logCambios||[]).length>0));
  await tocar('text=Volver al inicio');
  // cerrar sin nada
  await tocar('text=Empezar entrenamiento');
  await tocar('text=Finalizar sesión');
  ok('cerrar sin marcar no guarda ni avanza', await ev(()=>state.slot===1 && !state.activeSession && state.history.length===2));

  // --- rutina
  await ev(()=>setTab('rutina'));
  ok('rutina: lista de días', await visible('Remo con barra'));
  const rutinaAntes = await ev(()=>JSON.stringify(state.routine));
  await page.locator('.card:has-text("Pull") button:has-text("Editar")').click();
  ok('editor: abre lista visual del día', await visible('DÍA 2') && await page.inputValue('[aria-label="Nombre del día"]')==='Pull' && await visible('Remo con barra'));
  await tocar('.acciones-editor button:has-text("Cambiar")');
  ok('editor: cambiar muestra parecidos de la biblioteca', await visible('Parecidos'));
  await page.fill('[aria-label="Buscar ejercicio"]', 'remo sentado en polea');
  await page.locator('.item:has-text("Remo sentado en polea")').first().click();
  ok('editor: cambiar reemplaza en la rutina', await ev(()=>state.routine.days[1].exercises[0].nombre==='Remo sentado en polea'));
  await tocar('text=Agregar ejercicio');
  await page.fill('[aria-label="Buscar ejercicio"]', 'plancha');
  await page.locator('.item:has-text("Plancha")').first().click();
  ok('editor: agregar usa 3 series, 90 s y la medida de la biblioteca (sin reps si va en segundos)', await ev(()=>{ const e=state.routine.days[1].exercises[1]; return e.nombre==='Plancha' && e.series===3 && e.repsMin===null && e.descanso===90 && e.medida==='seg'; }));
  await page.fill('[aria-label="Series"]', '4'); await page.locator('[aria-label="Series"]').dispatchEvent('change');
  await page.fill('[aria-label="Reps máx"]', '6'); await page.locator('[aria-label="Reps máx"]').dispatchEvent('change');
  ok('editor: datos se guardan y el rango se completa', await ev(()=>{ const e=state.routine.days[1].exercises[1]; return e.series===4 && e.repsMin===6 && e.repsMax===6; }));
  await page.locator('.alt-card:has-text("Plancha") [aria-label="Subir"]').click();
  ok('editor: subir cambia el orden', await ev(()=>state.routine.days[1].exercises[0].nombre==='Plancha'));
  ok('editor: primero no se puede subir', await page.locator('.alt-card').first().locator('[aria-label="Subir"]').isDisabled());
  await page.locator('.alt-card:has-text("Plancha") [aria-label="Quitar"]').click();
  ok('editor: quitar ejercicio', await ev(()=>state.routine.days[1].exercises.length===1));
  await page.locator('.alt-card [aria-label="Quitar"]').click();
  ok('editor: no deja el día vacío', await ev(()=>state.routine.days[1].exercises.length===1));
  await ev(()=>{ state.lastSetsByDayExercise['Pull::Remo sentado en polea']=[{peso:50,reps:10,tipo:'Normal'}]; saveState(); });
  await page.fill('[aria-label="Nombre del día"]', 'Espalda'); await page.locator('[aria-label="Nombre del día"]').dispatchEvent('change');
  ok('editor: renombrar día conserva lo de la última vez', await ev(()=>state.routine.days[1].name==='Espalda' && state.lastSetsByDayExercise['Espalda::Remo sentado en polea'] && !state.lastSetsByDayExercise['Pull::Remo sentado en polea']));
  // editar como texto -> revisión
  await tocar('text=Editar como texto');
  await page.fill('#daypaste', 'DIA 2: Espalda\nJalon al pexho | series 3 | reps 8-12');
  await tocar('text=Guardar cambios de este día');
  ok('revisión: marca el nombre con error de tipeo', await visible('No lo encuentro en la biblioteca'));
  await page.locator('.alt-card .item:has-text("Jalón al pecho")').first().click();
  ok('revisión: elegir el parecido lo resuelve', await visible('Todo revisado'));
  await tocar('button:has-text("Guardar")');
  ok('revisión: guarda con el nombre de la biblioteca', await ev(()=>/^Jalón al pecho/.test(state.routine.days[1].exercises[0].nombre)));
  await page.locator('.card:has-text("Espalda") button:has-text("Editar")').click();
  await tocar('text=Editar como texto');
  await page.fill('#daypaste', 'DIA 2: Espalda\nEjercicio inventado xyz | series 3\nRemo Hammer casero | series 3');
  await tocar('text=Guardar cambios de este día');
  ok('revisión: cuenta los pendientes', await visible('2 ejercicios para revisar'));
  await page.locator('.alt-card:has-text("Ejercicio inventado xyz") button:has-text("Dejarlo así")').click();
  await page.locator('.alt-card:has-text("Remo Hammer casero") button:has-text("Es propio")').click();
  ok('revisión: ejercicio propio con el nombre precargado', await page.inputValue('#nuevoNombre')==='Remo Hammer casero');
  await tocar('text=Guardar ejercicio');
  ok('revisión: vuelve resuelta', await visible('Todo revisado'));
  await tocar('button:has-text("Guardar")');
  ok('revisión: guarda propios y dejados así', await ev(()=>state.routine.days[1].exercises.map(e=>e.nombre).join()==='Ejercicio inventado xyz,Remo Hammer casero' && state.bibliotecaPropia.some(x=>x.nombre==='Remo Hammer casero')));
  await ev(()=>{ state.noDisponibles=[buscarEjercicio('Prensa de piernas').id]; saveState(); render(); });
  await page.locator('.card:has-text("Espalda") button:has-text("Editar")').click();
  await tocar('text=Editar como texto');
  await page.fill('#daypaste', 'DIA 2: Espalda\nPrensa de piernas | series 3');
  await tocar('text=Guardar cambios de este día');
  ok('revisión: avisa lo que no hay en tu gimnasio', await visible('Marcaste que no hay en tu gimnasio') && await visible('Podés cambiarlo por'));
  await tocar('text=Volver');
  ok('revisión: volver devuelve el texto pegado', (await page.inputValue('#daypaste')).includes('Prensa de piernas'));
  ok('parse: medida desde la biblioteca', await ev(()=>parseRoutine('DIA 1: X\nPlancha | series 3').days[0].exercises[0].medida==='seg' && !('medida' in parseRoutine('DIA 1: X\nRemo con barra | series 3').days[0].exercises[0]) && !('medida' in parseRoutine('APARTE: T\nCrunch en polea | series 3').aparte[0].exercises[0])));
  ok('parse: rutina aparte con el encabezado nuevo y con el viejo', await ev(()=>parseRoutine('APARTE: Finde\nPlancha').aparte[0].name==='Finde' && parseRoutine('TARDE: Vieja\nPlancha').aparte[0].name==='Vieja' && parseRoutine('TARDE: Vieja\nPlancha').days.length===0));
  ok('parse: cardio dentro de un día de la rutina', await ev(()=>{ const d=parseRoutine('DIA 1: Mixto\nRemo con barra | series 3\nCARDIO: Cinta').days[0]; return d.exercises.length===2 && d.exercises[1].cardio===true && d.exercises[1].nombre==='Cinta' && JSON.stringify(parseRoutine(diaToText(d,0)).days[0])===JSON.stringify(d); }));
  ok('parse: días y rutinas aparte en un mismo texto', await ev(()=>{ const p=parseRoutine('DIA 1: A\nRemo con barra\nAPARTE: Finde\nCARDIO: Cinta\nDIA 2: B\nPlancha'); return p.days.map(d=>d.name+d.exercises.length).join()==='A1,B1' && p.aparte.length===1 && p.aparte[0].exercises[0].cardio; }));
  ok('parecidos: tolera errores de tipeo', await ev(()=>parecidos('Sentadila bulgara', 3)[0].nombre.startsWith('Sentadilla búlgara')));
  await ev(r=>{ state.routine=JSON.parse(r); state.noDisponibles=[]; state.bibliotecaPropia=[]; editor=null; saveState(); render(); }, rutinaAntes);

  // --- circuitos
  const DIA_CIRC = 'DIA 1: Circ\nPress banca plano | descanso 90 | series 1 | reps 8-12\nCIRCUITO 2 vueltas | descanso 60\nSentadilla goblet | reps 10-12\nPlancha\nFIN CIRCUITO';
  ok('circuito: se lee con vueltas y descanso', await ev(t=>{ const d=parseRoutine(t).days[0]; const [a,b,c]=d.exercises; return !a.circuito && b.circuito.vueltas===2 && b.circuito.descanso===60 && b.series===2 && c.circuito.id===b.circuito.id && c.medida==='seg'; }, DIA_CIRC));
  ok('circuito: texto ida y vuelta', await ev(t=>{ const d=parseRoutine(t).days[0]; return JSON.stringify(parseRoutine(diaToText(d,0)).days[0])===JSON.stringify(d) && diaToText(d,0).includes('CIRCUITO 2 vueltas | descanso 60\nSentadilla goblet | reps 10-12\nPlancha | medida seg\nFIN CIRCUITO'); }, DIA_CIRC));
  ok('circuito: también en una rutina aparte', await ev(()=>parseRoutine('APARTE: T\nCIRCUITO 3 vueltas | descanso 45\nPlancha\nCrunch en polea\nFIN CIRCUITO\nCARDIO: Cinta').aparte[0].exercises.filter(e=>e.circuito && e.circuito.vueltas===3).length===2));
  const estadoCirc = await ev(()=>JSON.stringify(state));
  await ev(t=>{ state.routine=parseRoutine(t); state.slot=0; state.activeSession=null; saveState(); empezarSesion(0); state.activeSession.focusIdx=1; saveState(); render(); }, DIA_CIRC);
  ok('circuito: banda con la vuelta', await visible('Vuelta 1 de 2') && await page.isVisible('.chip-circuito.actual:has-text("Sentadilla goblet")'));
  ok('circuito: barra agrupada', await page.locator('.segcirc .seg').count()===2 && await visible('Circuito (2)'));
  await tocar('button:has-text("Hecha")');
  ok('circuito: pasa al siguiente sin descanso', await ev(()=>state.activeSession.focusIdx===2 && !state.activeSession.descanso) && !(await page.isVisible('#cierre')));
  await tocar('button:has-text("Hecha")');
  ok('circuito: al cerrar la vuelta descansa y vuelve al primero', await ev(()=>state.activeSession.focusIdx===1 && state.activeSession.descanso && state.activeSession.descanso.total===60) && await visible('Vuelta 2 de 2'));
  await ev(()=>saltarDescanso());
  await tocar('button:has-text("Hecha")');
  await tocar('button:has-text("Hecha")');
  ok('circuito: al terminar, cierre con recomendaciones de todos', await page.isVisible('#cierre:has-text("Circuito: listo")') && await page.isVisible('#cierre:has-text("Sentadilla goblet:")') && await page.isVisible('#cierre:has-text("Sigue Press banca plano")'));
  await tocar('#cierre button:has-text("Quedarme")');
  await ev(()=>{ state.activeSession.exercises[0].sets.forEach(s=>s.done=true); finalizarSesion(); });
  ok('circuito: queda en el historial y el informe', await ev(()=>{ const h=state.history[state.history.length-1]; return h.exercises.find(e=>e.nombre==='Plancha').circuito===2 && generarInforme(0).includes('Sentadilla goblet (circuito, 2 vueltas)'); }));
  await ev(()=>{ setSessionView('activa'); setTab('rutina'); });
  ok('circuito: agrupado en la vista de rutina', await visible('Circuito · 2 vueltas · desc 1:00'));
  await page.locator('.card:has-text("Circ") button:has-text("Editar")').first().click();
  ok('circuito: bloque en el editor', await page.locator('.bloque-circuito').count()===1);
  await page.fill('[aria-label="Vueltas"]', '4'); await page.locator('[aria-label="Vueltas"]').dispatchEvent('change');
  ok('circuito: cambiar vueltas cambia las series de todos', await ev(()=>state.routine.days[0].exercises.filter(e=>e.circuito).every(e=>e.circuito.vueltas===4 && e.series===4)));
  await page.locator('.alt-card:has-text("Press banca plano") [aria-label="Bajar"]').click();
  ok('circuito: un ejercicio suelto salta el circuito entero', await ev(()=>state.routine.days[0].exercises.map(e=>e.nombre).join()==='Sentadilla goblet,Plancha,Press banca plano'));
  ok('circuito: dentro del circuito solo se mueve entre sus ejercicios', await page.locator('.alt-card:has-text("Sentadilla goblet") [aria-label="Subir"]').isDisabled() && await page.locator('.alt-card:has-text("Plancha") [aria-label="Bajar"]').isDisabled());
  await tocar('text=Agregar circuito');
  await page.fill('[aria-label="Buscar ejercicio"]', 'flexiones de brazos');
  await page.locator('.item:has-text("Flexiones de brazos")').first().click();
  await tocar('.bloque-circuito:has-text("Flexiones de brazos") >> text=Agregar al circuito');
  await page.fill('[aria-label="Buscar ejercicio"]', 'plancha');
  await page.locator('.item:has-text("Plancha")').first().click();
  ok('circuito: crear uno nuevo y sumarle ejercicios', await ev(()=>{ const ex=state.routine.days[0].exercises; const nuevo=ex.slice(3); return ex.length===5 && nuevo.every(e=>e.circuito && e.circuito.id===nuevo[0].circuito.id && e.series===3) && nuevo[0].circuito.id!==ex[0].circuito.id; }) && await page.locator('.bloque-circuito').count()===2);
  await ev(t=>{ Object.keys(state).forEach(k=>delete state[k]); Object.assign(state, JSON.parse(t)); editor=null; saveState(); setTab('rutina'); }, estadoCirc);

  // --- plan por bloques
  const estadoPlan = await ev(()=>JSON.stringify(state));
  ok('plan: se lee la línea PLAN', await ev(()=>{ const r=parseRoutine('PLAN: Hipertrofia 4 | Fuerza 3 semanas | Descarga 1\nDIA 1: A\nRemo con barra'); return r.plan.length===3 && r.plan[1].nombre==='Fuerza' && r.plan[1].semanas===3 && r.days.length===1 && parsePlan('cualquier cosa')===null; }));
  const plan = await ev(()=>{
    state.plan={bloques:[{nombre:'Hipertrofia',semanas:2},{nombre:'Fuerza',semanas:1}]}; state.semana=1; state.slot=0; state.aviso=null;
    const n=diasPorSemana(), r={};
    for(let i=0;i<n;i++) avanzarSlot();
    r.s2 = textoSemana(); r.aviso1 = state.aviso;
    for(let i=0;i<n;i++) avanzarSlot();
    r.aviso2 = state.aviso && textoAviso(state.aviso); r.s3 = textoSemana();
    for(let i=0;i<n;i++) avanzarSlot();
    r.aviso3 = state.aviso && textoAviso(state.aviso); r.s4 = textoSemana();
    state.plan=null; state.semana=1; state.slot=0; state.aviso=null;
    for(let i=0;i<4*n;i++) avanzarSlot();
    r.sinPlan = state.aviso && textoAviso(state.aviso);
    return r;
  });
  ok('plan: semana y bloque', plan.s2==='Semana 2 de 3 · Hipertrofia (2 de 2)' && plan.s3==='Semana 3 de 3 · Fuerza (1 de 1)' && plan.aviso1===null, JSON.stringify(plan));
  ok('plan: aviso al terminar el bloque sin nombrar el siguiente', plan.aviso2==='Terminaste el bloque Hipertrofia: exportá el informe y pedile a tu entrenador cómo seguir.');
  ok('plan: aviso al terminar el plan', plan.aviso3.startsWith('Terminaste el plan') && plan.s4==='Semana 4 · plan terminado');
  ok('plan: sin plan, aviso cada 4 semanas', plan.sinPlan==='Completaste la semana 4: exportá tu informe para tu entrenador.');
  await ev(()=>{ state.plan={bloques:[{nombre:'Hipertrofia',semanas:4},{nombre:'Fuerza',semanas:3}]}; state.semana=2; state.slot=0; state.activeSession=null; saveState(); setTab('rutina'); });
  ok('plan: tarjeta en Rutina con el bloque actual', await page.isVisible('.plan-bloque.actual:has-text("Hipertrofia")') && await visible('Semana 2 de 7') && await visible('Hipertrofia (2 de 4)'));
  await page.locator('.card:has(.plan-bloques) button:has-text("Editar")').click();
  await page.fill('#planTexto', 'PLAN: Fuerza 3 | Potencia 3');
  await page.fill('#planSemana', '4');
  await tocar('text=Guardar plan');
  ok('plan: editar desde la app', await ev(()=>state.plan.bloques.map(b=>b.nombre).join()==='Fuerza,Potencia' && state.semana===4) && await visible('Semana 4 de 6') && await visible('Potencia (1 de 3)'));
  await ev(()=>{ empezarSesion(0); state.activeSession.exercises[0].sets[0].done=true; finalizarSesion(); });
  ok('plan: la sesión queda marcada con su bloque', await ev(()=>state.history[state.history.length-1].bloque==='Potencia'));
  ok('plan: en el informe', await ev(()=>{ const t=generarInforme(0); return t.includes('PLAN: Fuerza 3 | Potencia 3\nHoy: Semana 4 de 6 · Potencia (1 de 3)') && / - Push \[Potencia\]/.test(t) && t.includes('=== RUTINA ACTUAL (mismo formato para cargarla) ===\nPLAN: Fuerza 3 | Potencia 3\nDIA 1'); }));
  await ev(t=>{ Object.keys(state).forEach(k=>delete state[k]); Object.assign(state, JSON.parse(t)); state.showWeekBanner=4; saveState(); }, estadoPlan);
  await page.reload(); await page.waitForTimeout(300);
  ok('plan: migra el aviso viejo', await ev(()=>state.aviso && state.aviso.tipo==='semana' && state.aviso.semana===4 && !('showWeekBanner' in state)));
  await ev(()=>{ state.aviso=null; saveState(); setSessionView('activa'); setTab('rutina'); });
  await tocar('text=Cargar rutina nueva completa');
  await tocar('text=Ver formato');
  ok('rutina: ver formato', await visible('Cada día empieza con'));
  await tocar('text=Volver');
  // rutinas aparte desde Rutina
  await tocar('[role="tab"]:has-text("Aparte")');
  await tocar('text=Pegar rutina');
  await page.fill('#apartePaste', TARDE);
  await tocar('text=Guardar rutina aparte');
  ok('aparte: guarda la rutina (acepta el encabezado viejo TARDE:)', await ev(()=>state.rutinasAparte.length===1 && state.rutinasAparte[0].name==='Cardio + Abs' && state.rutinasAparte[0].exercises.length===4 && state.rutinasAparte[0].exercises[3].medida==='kg+m' && rutinaSub===null));
  const idAparte = await ev(()=>state.rutinasAparte[0].id);
  await tocar('text=Pegar rutina');
  ok('aparte: pegar abre en blanco', await visible('Si ya tenés una con el mismo nombre') && (await page.inputValue('#apartePaste'))==='');
  await page.fill('#apartePaste', 'APARTE: Movilidad\nPlancha | series 2');
  await tocar('text=Guardar rutina aparte');
  ok('aparte: con otro nombre se suma a la lista', await ev(()=>state.rutinasAparte.map(r=>r.name).join()==='Cardio + Abs,Movilidad') && await visible('Movilidad'));
  await tocar('text=Pegar rutina');
  await page.fill('#apartePaste', 'APARTE: cardio + abs\nPlancha | series 2');
  dialogos.length = 0;
  await tocar('text=Guardar rutina aparte');
  ok('aparte: con el mismo nombre avisa y reemplaza la que ya estaba', dialogos.some(d=>d.includes('Ya tenés "cardio + abs"')) && await ev(id=>state.rutinasAparte.length===2 && state.rutinasAparte[0].id===id && state.rutinasAparte[0].exercises.length===1, idAparte));
  await tocar('text=Pegar rutina');
  await page.fill('#apartePaste', 'DIA 1: X\nPlancha');
  dialogos.length = 0;
  await tocar('text=Guardar rutina aparte');
  ok('aparte: no acepta días de la rutina', dialogos.some(d=>d.includes('días de la rutina')) && await ev(()=>state.rutinasAparte.length===2));
  await page.fill('#apartePaste', TARDE);
  await tocar('text=Guardar rutina aparte');
  await page.locator('.card:has-text("Movilidad") button:has-text("Editar")').click();
  await page.fill('input[aria-label="Nombre de la rutina"]', 'Cardio + Abs'); await page.locator('input[aria-label="Nombre de la rutina"]').blur();
  ok('aparte: no deja dos con el mismo nombre', await ev(()=>state.rutinasAparte[1].name==='Movilidad'));
  await tocar('text=Eliminar esta rutina');
  ok('aparte: eliminar una rutina', await ev(()=>state.rutinasAparte.length===1 && editor===null) && !(await page.isVisible('.card:has-text("Movilidad")')));
  await tocar('text=Armar a mano');
  await page.fill('input[aria-label="Buscar ejercicio"]', 'gemelos');
  await page.locator('.item').first().click();
  ok('aparte: armar a mano abre el editor con el ejercicio elegido', await visible('RUTINA APARTE') && await ev(()=>state.rutinasAparte.length===2 && state.rutinasAparte[1].name==='Rutina aparte' && state.rutinasAparte[1].exercises.length===1 && !state.rutinasAparte[1].exercises[0].cardio));
  await tocar('text=Eliminar esta rutina');
  await page.locator('.card:has-text("Cardio + Abs") button:has-text("Editar")').click();
  ok('aparte: editor visual', await visible('RUTINA APARTE') && await visible('Caminata del granjero'));
  await tocar('text=Agregar cardio');
  ok('aparte: agregar cardio lista las máquinas sin buscar', await page.locator('.item').count() > 3);
  await page.locator('.item').first().click();
  ok('aparte: cardio agregado', await ev(()=>state.rutinasAparte[0].exercises.length===5 && state.rutinasAparte[0].exercises[4].cardio===true));
  await page.locator('.alt-card').last().locator('[aria-label="Quitar"]').click();
  await tocar('text=Editar como texto');
  ok('aparte: texto precargado para editar (ida y vuelta)', await ev((t)=>{ const r=state.rutinasAparte[0]; return t.startsWith('APARTE: Cardio + Abs') && JSON.stringify(parseRoutine(t).aparte[0])===JSON.stringify({name:r.name, exercises:r.exercises}); }, await page.inputValue('#apartePaste')));
  await page.fill('#apartePaste', (await page.inputValue('#apartePaste')).replace('Cardio + Abs', 'Cardio y abdominales'));
  await tocar('text=Guardar cambios');
  ok('aparte: editar como texto cambia esa rutina, aunque cambie el nombre', await ev(id=>state.rutinasAparte.length===1 && state.rutinasAparte[0].id===id && state.rutinasAparte[0].name==='Cardio y abdominales' && state.rutinasAparte[0].exercises.length===4, idAparte));
  await ev(()=>{ state.rutinasAparte[0].name='Cardio + Abs'; saveState(); render(); });
  await tocar('[role="tab"]:has-text("Rutina")');
  await page.locator('.card:has-text("Push") button:has-text("Editar")').click();
  ok('rutina: cardio también en los días', await visible('Agregar cardio'));
  await tocar('text=Editar como texto');
  ok('rutina: texto de un día ida y vuelta', await ev(()=>state.routine.days.every((d,i)=>JSON.stringify(parseRoutine(diaToText(d,i)).days[0])===JSON.stringify(d))));
  await tocar('text=Volver'); await tocar('text=Volver');

  // --- ajustes
  await ev(()=>setTab('ajustes'));
  await tocar('text=Pegar ajustes sugeridos');
  await page.fill('#ajustesPaste', 'AJUSTE: Prensa de piernas | peso 52\nAJUSTE: Inexistente | peso 10');
  await tocar('text=Aplicar ajustes');
  ok('ajustes: aplica y reporta', await ev(()=>state.lastByExercise['Prensa de piernas'].peso===52) && await visible('No encontré "Inexistente"'));
  await tocar('text=Volver');
  await tocar('text=Copiar link');
  ok('ajustes: copiar link de la app', (await clip()).includes('index.html'));
  await tocar('button[role="switch"][aria-label="Frases motivadoras"]');
  ok('ajustes: apagar frases', await ev(()=>state.motivacionOn===false));
  await tocar('button[role="switch"][aria-label="Frases motivadoras"]');
  ok('ajustes: prender frases', await ev(()=>state.motivacionOn===true));
  await ev(()=>{ state.slot=2; saveState(); render(); });
  await tocar('text=Reiniciar semana actual');
  ok('ajustes: reiniciar semana', await ev(()=>state.slot===0));
  await tocar('.item:has-text("Sonido")');
  fs.writeFileSync('/tmp/sonido.mp3', Buffer.from('ID3fake'));
  const [ch] = await Promise.all([page.waitForEvent('filechooser'), tocar('button:has-text("Subir audio")')]);
  await ch.setFiles('/tmp/sonido.mp3'); await page.waitForTimeout(500);
  ok('sonidos: subir audio', await visible('sonido.mp3') && await ev(()=>state.sonidoPreferido==='custom'));
  await tocar('[role="tab"]:has-text("Beep predeterminado")');
  ok('sonidos: elegir beep', await ev(()=>state.sonidoPreferido==='beep'));
  await tocar('text=Quitar'); await page.waitForTimeout(300);
  ok('sonidos: quitar audio', await ev(()=>media.sounds.length===0));
  await tocar('text=Volver');

  // --- biblioteca
  ok('biblioteca: 433 ejercicios con datos completos', await ev(()=>BIBLIOTECA.length===433 && BIBLIOTECA.every(x=>x.nombre && x.patron in PATRONES && x.principal.length && ['baja','media','alta'].includes(x.lumbar))));
  ok('biblioteca: reconoce tus nombres (fondo de máquina asistido, remo en polea, curl femoral)', await ev(()=>
    buscarEjercicio('Fondo de máquina asistido').nombre==='Fondos en máquina' && buscarEjercicio('remo en polea').patron==='tiron_h' && buscarEjercicio('Curl femoral').patron==='femoral'));
  ok('biblioteca: fotos de la base en ejercicios sin ilustración', await ev(()=>imagenDe('Remo con barra').startsWith('ejercicios/fdb/')));
  ok('reemplazos: mismo movimiento, sin más carga lumbar, sin repetir el día', await ev(()=>{
    const r = sugerenciasReemplazo('Press banca plano con barra', ['Press inclinado con mancuernas']);
    return r.length>=5 && r.every(x=>x.patron==='empuje_h' && x.lumbar==='baja' && x.nombre!=='Press inclinado con mancuernas');
  }));
  ok('reemplazos: una sentadilla con barra sugiere opciones más suaves para la lumbar primero', await ev(()=>{
    const r = sugerenciasReemplazo('Sentadilla con barra', []);
    return r.slice(0,3).every(x=>x.lumbar!=='alta');
  }));
  await ev(()=>setTab('rutina'));
  await tocar('[role="tab"]:has-text("Biblioteca")');
  ok('biblioteca: pantalla con buscador y lista', await page.isVisible('input[aria-label="Buscar en la biblioteca"]') && (await page.$$('#screen .grupo .item')).length>=50);
  await page.fill('input[aria-label="Buscar en la biblioteca"]', 'press banca con mancuernas');
  await page.locator('#screen .item:has-text("Press banca con mancuernas")').first().click();
  ok('biblioteca: ficha del ejercicio', await visible('Músculo principal') && await page.isVisible('.foto-grande img'));
  await tocar('button[role="switch"][aria-label="Hay en mi gimnasio"]');
  ok('biblioteca: marcar "no hay en mi gimnasio"', await ev(()=>state.noDisponibles.includes('Dumbbell_Bench_Press')));
  ok('reemplazos: no sugiere lo que no hay', await ev(()=>!sugerenciasReemplazo('Press banca plano con barra', []).some(x=>x.id==='Dumbbell_Bench_Press')));
  await tocar('text=Volver');
  await tocar('text=Agregar ejercicio propio');
  await page.fill('#nuevoNombre', 'Press en máquina Hammer del gym');
  await page.selectOption('#nuevoPatron', 'empuje_h'); await page.selectOption('#nuevoMusculo', 'Pecho');
  await tocar('text=Guardar ejercicio');
  ok('biblioteca: agregar ejercicio propio', await ev(()=>state.bibliotecaPropia.length===1 && buscarEjercicio('press en maquina hammer del gym').propio));
  ok('reemplazos: incluye tus ejercicios propios', await ev(()=>sugerenciasReemplazo('Press banca plano con barra', []).some(x=>x.propio)));
  // cambiar en la sesión con la biblioteca
  await ev(()=>{ state.lastByExercise['Press de pecho en máquina'] = {peso:70, reps:10}; saveState(); setTab('inicio'); });
  await tocar('text=Empezar entrenamiento');
  await tocar('button:has-text("Cambiar")');
  ok('cambiar: muestra entrenador, biblioteca y buscador', await visible('Sugeridas por tu entrenador') && await visible('De la biblioteca') && await page.isVisible('input[aria-label="Buscar ejercicio"]'));
  await page.fill('input[aria-label="Buscar ejercicio"]', 'press de pecho en maquina');
  await page.locator('.alt-card:has-text("Press de pecho en máquina") >> text=Solo hoy').first().click();
  ok('cambiar: aplica el nuevo solo hoy', await ev(()=>state.activeSession.exercises[0].nombre==='Press de pecho en máquina' && state.routine.days[0].exercises[0].nombre==='Press banca plano'));
  ok('cambiar: precarga los pesos del ejercicio nuevo', await ev(()=>state.activeSession.exercises[0].sets.filter(s=>s.tipo==='Normal').every(s=>s.peso===70)));
  await tocar('text=Finalizar sesión');

  // --- volver arriba al cambiar de pestaña
  await ev(()=>window.scrollTo(0, 400));
  await ev(()=>setTab('rutina'));
  ok('cambiar de pestaña vuelve arriba', await ev(()=>window.scrollY===0));

  // --- sesión de una rutina aparte + paso automático al terminar cada ejercicio
  await ev(()=>setTab('inicio'));
  ok('inicio: lista las rutinas aparte', await visible('Rutinas aparte') && await page.isVisible('.item:has-text("Cardio + Abs")'));
  await tocar('[aria-label="Empezar Cardio + Abs"]');
  ok('aparte: la sesión lleva el nombre de la rutina', await page.isVisible('.top:has-text("Cardio + Abs · Ejercicio 1 de 4")'));
  ok('cardio: la sensación arranca sin elegir', await ev(()=>state.activeSession.exercises[0].cardioData.medicionValor==='') && !(await page.isVisible('.opciones button[aria-pressed="true"]')));
  await page.fill('#cardio-duracion', '30'); await page.fill('#cardio-velocidad', '6.5');
  await tocar('.opciones button:has-text("Difícil")');
  ok('aparte: sensación elegida', await ev(()=>state.activeSession.exercises[0].cardioData.medicionValor==='Difícil, casi no puedo hablar'));
  await tocar('text=Marcar como hecho');
  ok('aparte: cardio hecho', await ev(()=>state.activeSession.exercises[0].cardioHecho));
  ok('auto: al terminar un ejercicio avisa cuál sigue', await page.isVisible('#cierre:has-text("Sigue Crunch en polea")'));
  await tocar('#cierre button:has-text("Ir ahora")');
  ok('auto: "Ir ahora" pasa al siguiente', await ev(()=>state.activeSession.focusIdx===1) && !(await page.isVisible('#cierre')));
  await tocar('button:has-text("Más")');
  ok('aparte: kg+reps con discos y 1RM, como en cualquier rutina', await visible('Calculadora de discos') && await visible('1RM estimado hoy'));
  await tocar('text=Volver');
  await ev(()=>{ const e=state.activeSession.exercises[1]; e.sets.forEach((s,i)=>{ s.peso=20; s.reps=12; if(i<e.sets.length-1) s.done=true; }); saveState(); render(); });
  await ev(()=>{ const e=state.activeSession.exercises[1]; marcarHecha(e, e.sets.length-1); });
  ok('auto: muestra la recomendación del ejercicio', await page.isVisible('#cierre:has-text("Dentro del rango")'));
  await page.waitForTimeout(5600);
  ok('auto: pasa solo al siguiente a los 5 segundos', await ev(()=>state.activeSession.focusIdx===2) && !(await page.isVisible('#cierre')));
  ok('aparte: medida seg muestra Seg', await page.isVisible('.sets-head span:text-is("Seg")'));
  await ev(()=>{ const e=state.activeSession.exercises[2]; e.sets.forEach(s=>{ s.seg=60; }); marcarHecha(e,0); marcarHecha(e,1); });
  await tocar('#cierre button:has-text("Quedarme")');
  ok('auto: "Quedarme" cancela el paso', await ev(()=>state.activeSession.focusIdx===2) && !(await page.isVisible('#cierre')));
  await tocar('button:has-text("Siguiente")');
  ok('aparte: medida kg+m muestra Metros', await page.isVisible('.sets-head span:text-is("Metros")'));
  ok('último ejercicio: sin "Siguiente", con "Finalizar sesión"', !(await page.isVisible('#screen button:has-text("Siguiente")')) && await page.isVisible('#screen .fila2 button:has-text("Finalizar sesión")'));
  await ev(()=>{ const e=state.activeSession.exercises[3]; e.sets.forEach(s=>{ s.peso=24; s.m=40; }); marcarHecha(e,0); marcarHecha(e,1); });
  ok('auto: con todo hecho avisa que finaliza', await page.isVisible('#cierre:has-text("Finalizando en")'));
  await page.waitForTimeout(5600);
  ok('auto: finaliza sola la sesión', await ev(()=>!state.activeSession));
  ok('aparte: guarda aparte y no avanza día', await ev(()=>{ const h=state.historyAparte[0]; return state.historyAparte.length===1 && h.aparte===state.rutinasAparte[0].id && h.dayName==='Cardio + Abs' && state.slot===0; }));
  ok('aparte: el peso × reps queda como referencia del ejercicio', await ev(()=>state.lastByExercise['Crunch en polea'] && state.lastByExercise['Crunch en polea'].peso===20));
  ok('aparte: resumen', await visible('Sesión completa') && await visible('Cardio + Abs'));
  await tocar('text=Volver al inicio');
  await tocar('[aria-label="Empezar Cardio + Abs"]');
  ok('aparte: precarga la vez siguiente', await ev(()=>state.activeSession.exercises[3].sets.map(s=>s.peso+'/'+s.m).join(',')==='24/40,24/40'));
  ok('progresión: compara con la vez pasada en ejercicios sin rango de reps', await ev(()=>{
    const e = JSON.parse(JSON.stringify(state.activeSession.exercises[2])); e.sets.forEach(s=>{ s.seg=70; s.done=true; }); return recomendacion(e).tipo==='subir';
  }));
  await tocar('text=Finalizar sesión');

  // --- progresión sugerida en la precarga
  ok('progresión: si llegaste al tope de reps, precarga el peso siguiente según el equipo', await ev(()=>{
    state.lastSetsByDayExercise['Pull::Remo en polea'] = [{peso:50,reps:12,tipo:'Normal'},{peso:50,reps:12,tipo:'Normal'},{peso:50,reps:12,tipo:'Normal'}];
    const sets = seedSets({nombre:'Remo en polea', series:3, repsMin:8, repsMax:12}, 'Pull');
    return sets.every(s=>s.peso===52.5 && s.sugerido===2.5);
  }));
  ok('progresión: si no llegaste al tope, no cambia el peso', await ev(()=>{
    state.lastSetsByDayExercise['Pull::Remo en polea'] = [{peso:50,reps:12,tipo:'Normal'},{peso:50,reps:10,tipo:'Normal'}];
    return seedSets({nombre:'Remo en polea', series:2, repsMin:8, repsMax:12}, 'Pull').every(s=>s.peso===50 && !s.sugerido);
  }));

  // --- sueltos
  await ev(()=>setTab('inicio'));
  await tocar('button:has-text("Ejercicio suelto")');
  await tocar('#screen button:has-text("Cardio")');
  await page.fill('#cardio-duracion', '25'); await page.fill('#cardio-maquina', 'Elíptica'); await page.fill('#cardio-velocidad', '7');
  await tocar('button:has-text("Guardar")');
  await tocar('#screen button:has-text("Agarre")');
  await page.fill('input[placeholder="Valor"]', '35'); await tocar('button:has-text("Guardar")');
  await tocar('#screen button:has-text("Abdominales")');
  await page.fill('input[placeholder="Valor"]', '20'); await tocar('button:has-text("Guardar")');
  ok('sueltos: cardio, agarre y abs guardados', await ev(()=>state.actividadesExtra.map(a=>a.tipo).join(',')==='cardio,agarre,abdominales'));
  ok('sueltos: fecha de hoy en hora argentina', await ev(()=>state.actividadesExtra.every(a=>new Date(a.fecha).toLocaleDateString('es-AR')===new Date().toLocaleDateString('es-AR'))));
  ok('sueltos: cardio con los mismos campos que en las rutinas', await ev(()=>state.actividadesExtra[0].cardioData.velocidad==='7'));
  ok('sueltos: listado', await visible('Elíptica') && await visible('Dead hang') && await visible('Crunch'));
  const dels = await page.$$('button[aria-label="Borrar"]'); await dels[0].click();
  ok('sueltos: borrar registro', await ev(()=>state.actividadesExtra.length===2));
  const slotAntes = await ev(()=>state.slot);
  await tocar('#screen button:has-text("Otro ejercicio")');
  await page.fill('input[aria-label="Buscar ejercicio"]', 'gemelos');
  await page.locator('.item').first().click();
  ok('sueltos: otro ejercicio abre una sesión solo de ese ejercicio', await ev(()=>{ const a=state.activeSession; return !!a && a.aparte==='suelto' && a.exercises.length===1 && a.dayName==='Suelto: '+a.exercises[0].nombre && currentTab==='sesion'; }));
  await ev(()=>{ const e=state.activeSession.exercises[0]; e.sets.forEach(s=>{ s.peso=40; s.reps=15; s.done=true; }); finalizarSesion(); });
  ok('sueltos: el otro ejercicio queda en el historial sin avanzar la rotación', await ev(antes=>{ const h=state.historyAparte[state.historyAparte.length-1]; return h.aparte==='suelto' && h.dayName.startsWith('Suelto: ') && h.exercises[0].sets.length===3 && state.slot===antes; }, slotAntes));

  // --- historial, informe, CSV, gráfico
  await ev(()=>{ state.actividadesExtra.unshift({tipo:'cardio', fecha:'2026-08-01T15:00:00Z', duracionMin:20, modalidad:'Bici vieja', medicionTipo:'sensacion', medicionValor:'Fácil, puedo hablar normal'}); saveState(); });
  await ev(()=>setTab('historial'));
  ok('historial: sesiones de la rutina, aparte y sueltas', await page.isVisible('.item:has-text("Cardio + Abs")') && await page.isVisible('.item:has-text("Suelto: ")') && await page.isVisible('.item:has-text("Push")'));
  ok('historial: agrupado por semana', await visible('Semana del'));
  ok('historial: volumen de sesión vieja sin series fantasma', (await page.textContent('#screen')).includes('1150 kg'));
  await tocar('text=Copiar informe');
  const inf4 = await clip();
  ok('informe: últimas 4 semanas deja afuera lo viejo', inf4.includes('últimas 4 semanas') && !inf4.includes('Bici vieja'));
  await tocar('[role="tab"]:has-text("Todo")');
  await tocar('text=Copiar informe');
  const inf = await clip();
  const falta = ['Fondo de máquina asistido','=== RUTINAS APARTE','EJERCICIOS SUELTOS','Crunch en polea: 20kg x 12 reps','Cardio: Cinta · 30 min · vel 6.5 km/h · Sensación: Difícil','Suelto: ','Cardio: Bici vieja · 20 min','Agarre (Dead hang)'].filter(t=>!inf.includes(t));
  ok('informe: rutina, aparte y sueltos', !falta.length, 'falta: '+falta.join(', '));
  const analisis = await ev(()=>{
    const copia = JSON.stringify(state);
    const S = (fecha, sets)=>({fecha, dayName:'Push', exercises:[{nombre:'Press banca plano', sets}], duracionSeg:600});
    const n = (peso, reps, tipo)=>({peso, reps, tipo: tipo||'Normal', done:true});
    state.history = [
      S('2026-09-01T12:00:00Z', [n(20,10,'Calentamiento'), n(80,8), n(80,8)]),
      S('2026-09-03T12:00:00Z', [n(80,8)]), S('2026-09-08T12:00:00Z', [n(80,7)]), S('2026-09-10T12:00:00Z', [n(80,8)]),
      {fecha:'2026-09-10T13:00:00Z', dayName:'Push', exercises:[{nombre:'Plancha', medida:'seg', sets:[{seg:40, tipo:'Normal', done:true},{seg:60, tipo:'Normal', done:true}]},{nombre:'Fondo de máquina asistido', sets:[n(45,10), n(30,10)]},{nombre:'Invento xyz', sets:[n(10,10)]}], duracionSeg:600}];
    state.historyAparte = []; state.actividadesExtra = [];
    state.noDisponibles = [buscarEjercicio('Prensa de piernas').id];
    state.bibliotecaPropia = [{id:'propio-1', nombre:'Remo Hammer casero', alias:['remo hammer casero'], patron:'tiron_h', principal:['Dorsales'], secundarios:[], equipo:'Máquina', lumbar:'baja', medida:'kg+reps', fotos:[], propio:true}];
    const txt = generarInforme(0);
    const csv = generarCSV(0);
    Object.assign(state, JSON.parse(copia)); saveState();
    return {txt, csv};
  });
  const I = analisis.txt;
  ok('informe: series efectivas por semana sin calentamiento', /Semana del 31\/08\n  Pecho: 3 directas/.test(I) && /Tríceps: \d+ indirectas/.test(I), I.slice(I.indexOf('=== SERIES'), I.indexOf('=== SERIES')+300));
  ok('informe: sin datos de músculo', I.includes('Sin datos de músculo (no están en la biblioteca): Invento xyz'));
  ok('informe: progreso con 1RM y estancamiento', I.includes('Press banca plano: 101 → 101 kg 1RM estimado · 4 sesiones · ESTANCADO: 3 sesiones sin superar 101'), I.slice(I.indexOf('=== PROGRESO'), I.indexOf('=== PROGRESO')+400));
  ok('informe: medida en segundos y asistidos', I.includes('Plancha: 60 → 60 seg') && I.includes('Plancha: 40 seg (Normal), 60 seg (Normal)') && I.includes('kg de asistencia (menos es mejor)'));
  ok('informe: rutina actual en formato de carga', I.includes('=== RUTINA ACTUAL') && I.includes('DIA 1: Push') && I.includes('APARTE: Cardio + Abs'));
  ok('informe: biblioteca y gimnasio', I.includes('No hay en mi gimnasio: Prensa de piernas') && I.includes('Remo Hammer casero (') && I.includes('se mide en kg+reps'));
  ok('CSV: medida y columnas por tipo', analisis.csv.includes('"Plancha","1","seg","","","40"'));
  ok('cardio en un día: la sesión lo registra y sale en el informe y el CSV', await ev(()=>{
    const copia = JSON.stringify(state);
    state.activeSession = null; state.slot = 0;
    state.routine = {days: parseRoutine('DIA 1: Mixto\nRemo con barra | series 1 | reps 8-12\nCARDIO: Cinta').days};
    empezarSesion(0);
    const [a, b] = state.activeSession.exercises;
    Object.assign(a.sets[0], {peso:50, reps:10, done:true}); b.cardioData.duracion = '20'; b.cardioHecho = true;
    finalizarSesion();
    const h = state.history[state.history.length-1], inf = generarInforme(0), csv = generarCSV(0);
    const bien = h.dayName==='Mixto' && h.exercises.length===2 && h.exercises[1].cardio===true && inf.includes('  Cardio: Cinta · 20 min\n') && inf.includes('CARDIO: Cinta') && csv.includes('"Mixto","Cinta","","cardio"') && csv.includes('"Cinta · 20 min"');
    Object.assign(state, JSON.parse(copia)); saveState(); setSessionView('activa'); setTab('historial');
    return bien;
  }));
  await tocar('text=Copiar CSV');
  const csv = await clip();
  ok('CSV: tres bloques', csv.includes('"Fecha","Dia"') && csv.includes('"Fecha","Rutina aparte"') && csv.includes('"Fecha","Tipo"'));
  await page.locator('.item:has-text("Push")').first().click();
  ok('historial: detalle de sesión', await page.isVisible('h1:has-text("Push")') && await page.isVisible('.card:has-text("Fondo de máquina asistido") >> text=45kg x 12 reps') && !(await page.isVisible('.segmentos')));
  await tocar('text=Volver');
  await tocar('[role="tab"]:has-text("Progreso")');
  await page.selectOption('select.set-select', 'Fondo de máquina asistido');
  ok('gráfico de progreso', await page.isVisible('#screen svg path'));

  // --- copia de seguridad
  await ev(()=>setTab('ajustes'));
  const [dl] = await Promise.all([page.waitForEvent('download'), tocar('button:has-text("Descargar")')]);
  await dl.saveAs('/tmp/copia-test.json');
  const copia = JSON.parse(fs.readFileSync('/tmp/copia-test.json','utf8'));
  ok('copia: incluye todo', copia.app==='entreno' && copia.state.history.length===2 && copia.state.historyAparte.length===2 && copia.state.rutinasAparte.length===1);
  ok('copia: nombre con fecha local', dl.suggestedFilename()===`entreno-copia-${await ev(()=>hoyISO())}.json`);
  await ev(async()=>{ localStorage.clear(); await mediaClear(); });
  await page.reload(); await page.waitForTimeout(300);
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), tocar('button:has-text("Restaurar")')]);
  await ch2.setFiles('/tmp/copia-test.json'); await page.waitForTimeout(1200);
  ok('copia: restaura desde pantalla vacía', await ev(()=>state.history.length===2 && state.rutinasAparte.length===1));
  await ev(()=>{ state.ultimaCopia=null; saveState(); setTab('inicio'); });
  ok('recordatorio de copia en inicio', await visible('Todavía no hiciste una copia de seguridad'));

  // --- migraciones y robustez
  // una copia o un celular con el formato viejo: un solo "turno tarde" con su historial y su precarga
  const viejo = await ev(()=>{
    const st = JSON.parse(localStorage.entrenoState), r = st.rutinasAparte[0];
    st.routineTarde = {name: r.name, exercises: r.exercises};
    st.historyTarde = st.historyAparte.filter(h=>h.aparte===r.id).map(({aparte, ...h})=>({...h, turno:'tarde', dayName:'Turno tarde: '+h.dayName}));
    st.lastSetsByDayExercise = Object.fromEntries(Object.entries(st.lastSetsByDayExercise).map(([k,v])=>[k.replace('aparte:'+r.id+'::', 'Turno tarde::'), v]));
    st.activeSession = {turno:'tarde', dayName:'Turno tarde', rutinaNombre:r.name, inicio:Date.now(), focusIdx:0, firma:'', exercises:[{nombre:'Plancha', medida:'seg', descanso:45, alternativas:[], sets:[{tipo:'Normal', done:true, rpe:null, seg:30}]}]};
    st.lastResumen = st.historyTarde[0];
    delete st.rutinasAparte; delete st.historyAparte;
    localStorage.setItem('entrenoState', JSON.stringify(st));
    return {sesiones: st.historyTarde.length, claves: Object.keys(st.lastSetsByDayExercise).filter(k=>k.startsWith('Turno tarde::')).length};
  });
  await page.reload(); await page.waitForTimeout(400);
  ok('migración: el turno tarde viejo pasa a rutina aparte con su historial y su precarga', viejo.sesiones===1 && viejo.claves>0 && await ev(v=>{
    const r = state.rutinasAparte[0], g = JSON.parse(localStorage.entrenoState), claves = Object.keys(state.lastSetsByDayExercise);
    return state.rutinasAparte.length===1 && r.name==='Cardio + Abs' && r.exercises.length===4 && !('routineTarde' in g) && !('historyTarde' in g)
      && state.historyAparte.length===v.sesiones && state.historyAparte[0].aparte===r.id && state.historyAparte[0].dayName==='Cardio + Abs' && !('turno' in state.historyAparte[0])
      && claves.filter(k=>k.startsWith('aparte:'+r.id+'::')).length===v.claves && !claves.some(k=>k.startsWith('Turno tarde'))
      && state.activeSession.aparte===r.id && state.activeSession.dayName==='Cardio + Abs' && !('turno' in state.activeSession)
      && state.lastResumen.aparte===r.id;
  }, viejo));
  ok('migración: queda guardado en el celular el estado anterior, tal cual estaba', await ev(()=>{ const a = JSON.parse(localStorage.getItem('entrenoState_antes_de_aparte')); return a.routineTarde.name==='Cardio + Abs' && a.historyTarde.length===1 && a.historyTarde[0].turno==='tarde' && !('rutinasAparte' in a); }));
  await ev(()=>{ setTab('sesion'); });
  ok('migración: la sesión de tarde que estaba abierta sigue y se puede finalizar', await page.isVisible('.top:has-text("Cardio + Abs")') && await ev(()=>{ finalizarSesion(); return state.historyAparte.length===2 && state.historyAparte[1].dayName==='Cardio + Abs' && !state.activeSession; }));
  await ev(()=>{ setSessionView('activa'); setTab('inicio'); });
  await ev(()=>{ const st=JSON.parse(localStorage.entrenoState); st.customImages={'Remo en polea':'data:image/png;base64,iVBORw0KGgo='}; localStorage.setItem('entrenoState', JSON.stringify(st)); });
  await page.reload(); await page.waitForTimeout(600);
  ok('migración: fotos viejas a IndexedDB', await ev(()=>!!media.images['Remo en polea'] && !JSON.parse(localStorage.entrenoState).customImages));
  await ev(()=>{ localStorage.setItem('entrenoState','{roto'); });
  await page.reload(); await page.waitForTimeout(300);
  ok('estado dañado: la app arranca', await visible('Cargá tu rutina'));
  await ev(()=>{ Storage.prototype.setItem=function(){ throw new DOMException('x','QuotaExceededError'); }; saveState(); });
  ok('aviso si falla el guardado', await page.isVisible('#avisoGuardado'));

  // --- volver de otra app: Android recarga la página con lo guardado; ninguna pantalla puede quedar en blanco
  {
    const pr = await ctx.newPage(); pr.on('dialog', d=>d.accept());
    const errs=[]; pr.on('pageerror', e=>errs.push(e.message));
    await pr.goto(URL);
    await pr.evaluate(r=>{ localStorage.clear(); state.routine=parseRoutine(r); state.slot=0; state.activeSession=null; saveState(); }, RUTINA);
    await pr.reload(); await pr.waitForTimeout(200);
    for(const vista of ['sustituir','notas','foto','mas','discos']){
      await pr.evaluate(v=>{ if(!state.activeSession) empezarSesion(0); setSessionView(v); render(); }, vista);
      await pr.reload(); await pr.waitForTimeout(250);
      ok(`recarga en sesión/${vista}: no queda en blanco`, !errs.length && await pr.evaluate(()=>document.getElementById('screen').children.length>0), errs.join(' | '));
      errs.length=0;
    }
    ok('recarga en Cambiar: sigue en el mismo ejercicio', await pr.evaluate(()=>{ setSessionView('sustituir'); render(); return document.querySelector('#screen h2').textContent===state.activeSession.exercises[state.activeSession.focusIdx].nombre; }));
    await pr.evaluate(()=>{ state.activeSession.focusIdx=99; saveState(); });
    await pr.reload(); await pr.waitForTimeout(250);
    ok('si una pantalla falla: aviso con salida, no pantalla en blanco', await pr.isVisible('text=Esta pantalla falló') && await pr.isVisible('text=Descargar copia de seguridad') && errs.length>0);
    errs.length=0;
    await pr.evaluate(()=>{ state.activeSession.focusIdx=0; saveState(); });
    await pr.click('text=Volver al inicio');
    ok('pantalla de error: Volver al inicio funciona', await pr.isVisible('text=Continuar sesión en curso') && !errs.length);
    await pr.close();
  }

  // --- resumen de sesión: detalle de récords y de qué subió o bajó
  {
    const pr2 = await ctx.newPage(); pr2.on('dialog', d=>d.accept());
    await pr2.goto(URL);
    await pr2.evaluate(()=>{
      localStorage.clear();
      state.routine=parseRoutine('DIA 1: Push\nPress banca plano | series 2 | reps 8-12\nRemo con barra | series 2 | reps 8-12\nPlancha | series 1\nFondo de máquina asistido | series 1 | reps 8-12');
      const n=(peso,reps)=>({peso,reps,tipo:'Normal',done:true});
      state.history=[{fecha:'2026-09-28T12:00:00.000Z',dayName:'Push',duracionSeg:600,volumenTotal:2000,exercises:[
        {nombre:'Press banca plano',sets:[n(50,10),n(50,10)]},{nombre:'Remo con barra',sets:[n(40,10),n(40,10)]},
        {nombre:'Plancha',medida:'seg',sets:[{seg:40,tipo:'Normal',done:true}]},{nombre:'Fondo de máquina asistido',sets:[n(40,10)]}]}];
      state.prByExercise={'Press banca plano':500,'Remo con barra':400}; state.slot=0; state.activeSession=null; saveState();
      empezarSesion(0);
      const [press, remo, plancha, fondo] = state.activeSession.exercises;
      press.sets.forEach(s=>{ s.peso=52.5; s.reps=10; }); remo.sets.forEach(s=>{ s.peso=40; s.reps=8; }); plancha.sets[0].seg=40; fondo.sets[0].peso=30; fondo.sets[0].reps=10;
      [press, remo, plancha, fondo].forEach(e=>e.sets.forEach((s,i)=>{ s.done=true; registrarSetDone(e, s); }));
      finalizarSesion();
    });
    const texto = (await pr2.textContent('#screen')).replace(/\s+/g,' ');
    ok('resumen: récord con detalle y marca anterior', texto.includes('1 récord personal') && texto.includes('Press banca plano: 52,5 kg × 10 (525 kg; antes 500 kg)'), texto);
    ok('resumen: qué bajó, qué subió y qué quedó igual', texto.includes('▼ Remo con barra: 800 → 640 kg de volumen (-20%)') && texto.includes('▲ Press banca plano: 1.000 → 1.050 kg de volumen (+5%)') && texto.includes('= Plancha: 40 → 40 seg'), texto);
    ok('resumen: en los asistidos menos kilos es mejor y no cuenta como récord', texto.includes('▲ Fondo de máquina asistido: 40 → 30 kg de asistencia') && await pr2.evaluate(()=>!state.prByExercise['Fondo de máquina asistido']));
    ok('resumen: lo que bajó no se pinta de verde', await pr2.evaluate(()=>{ const p=[...document.querySelectorAll('#screen p')].find(x=>x.textContent.includes('Remo con barra')); return p.querySelector('span').style.color==='var(--warn)'; }));
    ok('resumen: el récord queda en el historial', await pr2.evaluate(()=>state.history[1].exercises[0].pr.antes===500 && state.history[1].prCount===1));
    await pr2.close();
  }

  // --- sesión iniciada sin nada marcado: toma los cambios de la rutina
  {
    const ps = await ctx.newPage(); ps.on('dialog', d=>d.accept());
    await ps.goto(URL);
    await ps.evaluate(r=>{ localStorage.clear(); state.routine=parseRoutine(r); state.slot=0; state.activeSession=null; saveState(); empezarSesion(0); setTab('rutina'); }, RUTINA);
    await ps.evaluate(()=>{ const d=state.routine.days[0]; d.exercises[0].nombre='Press banca con mancuernas'; d.exercises.unshift({nombre:'Rotación externa en polea', ...DEF_EJERCICIO, series:2, alternativas:[]}); saveState(); setTab('sesion'); });
    ok('sesión sin empezar: toma la rutina editada', await ps.evaluate(()=>state.activeSession.exercises.map(e=>e.nombre).slice(0,2).join()==='Rotación externa en polea,Press banca con mancuernas' && state.activeSession.exercises[0].sets.length===2) && await ps.isVisible('h1:has-text("Rotación externa en polea")'));
    await ps.evaluate(()=>{ state.activeSession.exercises[0].sets[0].done=true; state.routine.days[0].exercises[0].nombre='Rotación externa con mancuerna'; saveState(); setTab('inicio'); setTab('sesion'); });
    ok('sesión con series hechas: no se toca', await ps.evaluate(()=>state.activeSession.exercises[0].nombre==='Rotación externa en polea' && state.activeSession.exercises[0].sets[0].done));
    await ps.evaluate(()=>{ const s=state.activeSession; s.exercises[0].sets[0].done=false; delete s.firma; saveState(); });
    await ps.reload(); await ps.waitForTimeout(300);
    ok('sesión vieja sin empezar: se actualiza al abrir la app', await ps.evaluate(()=>state.activeSession.exercises[0].nombre==='Rotación externa con mancuerna'));
    await ps.close();
  }

  // --- copia automática en la nube (con una nube simulada que vive fuera de los datos de la app)
  {
    // sin service worker y sin acceso al SDK real: la prueba usa siempre la nube simulada
    const ctxN = await browser.newContext({viewport:{width:390,height:844}, timezoneId:'America/Argentina/Buenos_Aires', serviceWorkers:'block'});
    await ctxN.route('**/*gstatic.com/**', r=>r.abort());
    await ctxN.addInitScript(()=>{
      window.nubeFalsa = ()=>{
        const todo = ()=>JSON.parse(localStorage.getItem('nubeFalsa')||'{}');
        const guardar = t=>localStorage.setItem('nubeFalsa', JSON.stringify(t));
        let aviso = ()=>{};
        return {
          alCambiarUsuario: fn=>{ aviso = fn; const u = localStorage.getItem('nubeFalsaUsuario'); setTimeout(()=>fn(u ? {uid:'u1', email:u} : null)); },
          entrar: async()=>{ localStorage.setItem('nubeFalsaUsuario','eliel@prueba.com'); aviso({uid:'u1', email:'eliel@prueba.com'}); },
          salir: async()=>{ localStorage.removeItem('nubeFalsaUsuario'); aviso(null); },
          leer: async id=>todo()[id] || null,
          escribir: async(id, d)=>{ if(window.cortarRed) throw new Error('sin red'); const x = todo(); x[id] = d; guardar(x); },
          borrar: async id=>{ const x = todo(); delete x[id]; guardar(x); }
        };
      };
    });
    const pn = await ctxN.newPage(); pn.on('dialog', d=>d.accept());
    const errN=[]; pn.on('pageerror', e=>errN.push(e.message));
    const conNube = async()=>{ await pn.evaluate(()=>{ nube.adaptador = nubeFalsa(); iniciarNube(); }); await pn.waitForTimeout(250); await pn.waitForFunction(()=>!nube.subiendo); };
    const docs = ()=>pn.evaluate(()=>JSON.parse(localStorage.getItem('nubeFalsa')||'{}'));
    const idsDe = (d, pre)=>Object.keys(d).filter(k=>k.startsWith(pre+'.'));
    await pn.goto(URL);
    await pn.evaluate(r=>{ localStorage.clear(); state.routine=parseRoutine(r); state.history=[{fecha:'2026-10-01T12:00:00Z',dayName:'Push',exercises:[{nombre:'Press banca plano',sets:[{peso:60,reps:10,tipo:'Normal',done:true}]}],duracionSeg:600}]; saveState(); setTab('ajustes'); }, RUTINA);
    await pn.waitForTimeout(300);
    ok('nube: sin señal al abrir, la app funciona y avisa en Ajustes', await pn.isVisible('text=Copia automática en la nube') && await pn.isVisible('text=No se pudo conectar con la nube') && !errN.length);
    await conNube(); await pn.evaluate(()=>{ nube.error=''; render(); });
    ok('nube: se ofrece activar', await pn.isVisible('text=Activar con Google'));
    await pn.click('text=Activar con Google'); await pn.waitForTimeout(400);
    let d = await docs();
    ok('nube: al activar sube la copia, una semanal y los medios', !!d.indice && d.indice.actual.partes===idsDe(d,'actual').length && d.indice.semanales.length===1 && !!d.indice.media && await pn.evaluate(()=>nube.usuario.email==='eliel@prueba.com' && !nube.pendiente));
    ok('nube: activa, ya no dice que todo vive solo en el celular', await pn.isVisible('text=Tus datos ya se guardan solos en la nube') && !(await pn.isVisible('text=Todo vive solo en este celular')));
    ok('nube: estado visible en Ajustes', await pn.isVisible('text=Cuenta: eliel@prueba.com') && (await pn.textContent('#estadoNube')).startsWith('Última subida'));
    const selloAntes = d.indice.actual.sello;
    await pn.waitForTimeout(5);
    await pn.evaluate(()=>{ state.notasEjercicio={'Press banca plano':'ñ'.repeat(600000)}; saveState(); });
    ok('nube: un cambio queda pendiente y programa la subida', await pn.evaluate(()=>nube.pendiente && nube.temporizador!==null && JSON.parse(localStorage.entrenoNube).pendiente));
    await pn.evaluate(()=>subirANube());
    d = await docs();
    ok('nube: cada subida reemplaza a la anterior (no acumula)', d.indice.actual.sello!==selloAntes && idsDe(d,'actual').length===d.indice.actual.partes && idsDe(d,'actual').every(k=>k.includes(d.indice.actual.sello)) && d.indice.semanales.length===1);
    ok('nube: una copia grande se parte en varios documentos', d.indice.actual.partes>=3 && idsDe(d,'actual').every(k=>d[k].t.length<=250000));
    await pn.evaluate(()=>{ window.cortarRed=true; state.notasEjercicio={}; saveState(); return subirANube(); });
    ok('nube: sin red avisa y queda pendiente', await pn.evaluate(()=>nube.error==='sin red' && nube.pendiente) && (await pn.textContent('#estadoNube')).includes('Error'));
    const trasCorte = await docs();
    ok('nube: una subida cortada no rompe la copia vigente', trasCorte.indice.actual.sello===d.indice.actual.sello && await pn.evaluate(async()=>JSON.parse(await leerPartes(nube.indice.actual)).notasEjercicio['Press banca plano'].length===600000));
    await pn.evaluate(()=>{ window.cortarRed=false; return subirANube(); });
    ok('nube: al volver la red sube lo pendiente', await pn.evaluate(()=>!nube.error && !nube.pendiente));
    // el celular congela la app justo después de escribir en la nube y antes de anotarlo (pasa al mandarla a segundo plano)
    await pn.evaluate(()=>{
      const real = nube.adaptador.escribir;
      nube.adaptador.escribir = async(id, datos)=>{ await real(id, datos); if(id==='indice') await new Promise(()=>{}); };
      state.slot = state.slot; saveState(); subirANube();
    });
    await pn.waitForTimeout(300);
    const congelada = await docs();
    const baseAnotada = JSON.parse(await pn.evaluate(()=>localStorage.entrenoNube)).base;
    await pn.reload(); await pn.waitForTimeout(300); await conNube();
    ok('app congelada a mitad de subida: la copia propia no se toma por ajena', baseAnotada!==congelada.indice.actual.modificado && await pn.evaluate(()=>!nube.ofrecer && !!nube.usuario), JSON.stringify([baseAnotada, congelada.indice.actual, await pn.evaluate(()=>[nube.ofrecer, nube.error, localStorage.entrenoNube])]));
    // y si se congela antes de terminar, los pedazos sueltos se borran en la subida siguiente
    await pn.evaluate(()=>{
      const real = nube.adaptador.escribir;
      nube.adaptador.escribir = async(id, datos)=>{ if(id==='indice') await new Promise(()=>{}); await real(id, datos); };
      state.slot = state.slot; saveState(); subirANube();
    });
    await pn.waitForTimeout(300);
    const sueltos = idsDe(await docs(), 'actual').length;
    await pn.reload(); await pn.waitForTimeout(300); await conNube();
    await pn.evaluate(()=>{ saveState(); return subirANube(); });
    d = await docs();
    ok('subida cortada: los pedazos sueltos no se acumulan', sueltos === 2*d.indice.actual.partes && idsDe(d,'actual').length===d.indice.actual.partes && idsDe(d,'media').length===d.indice.media.partes, JSON.stringify([sueltos, d.indice.actual.partes, idsDe(d,'actual'), await pn.evaluate(()=>[nube.error, nube.ofrecer, localStorage.entrenoNube])]));
    await pn.evaluate(()=>setTab('ajustes'));
    // copias semanales: se guardan las últimas 4
    await pn.evaluate(()=>{ const x=JSON.parse(localStorage.nubeFalsa); Object.keys(x).filter(k=>k.startsWith('sem-')).forEach(k=>delete x[k]); x.indice.semanales=['2026-08-31','2026-09-07','2026-09-14','2026-09-21'].map(c=>{ x['sem-'+c+'.v.0']={t:'{}'}; return {clave:c, prefijo:'sem-'+c, sello:'v', partes:1, modificado:1}; }); localStorage.nubeFalsa=JSON.stringify(x); state.slot=state.slot; saveState(); return subirANube(); });
    d = await docs();
    ok('nube: quedan 4 copias semanales y se borra la más vieja', d.indice.semanales.length===4 && d.indice.semanales[0].clave==='2026-09-07' && !d['sem-2026-08-31.v.0'] && idsDe(d,'sem-'+d.indice.semanales[3].clave).length===d.indice.semanales[3].partes);
    // se borran los datos del navegador: la app queda vacía, la nube no
    const nubeAntes = JSON.stringify(d.indice.actual);
    await pn.evaluate(()=>{ localStorage.removeItem('entrenoState'); localStorage.removeItem('entrenoNube'); localStorage.removeItem('nubeFalsaUsuario'); });
    await pn.reload(); await pn.waitForTimeout(300); await conNube(); await pn.evaluate(()=>render());
    ok('datos borrados: ofrece recuperar de la nube', await pn.isVisible('text=Cargá tu rutina') && await pn.isVisible('text=Recuperar mi copia de la nube'));
    await pn.click('text=Recuperar mi copia de la nube'); await pn.waitForTimeout(400);
    ok('datos borrados: muestra la copia encontrada', await pn.isVisible('text=Encontré una copia tuya en la nube') && await pn.isVisible('text=Copia actual'));
    await pn.evaluate(()=>{ saveState(); return subirANube(); });
    ok('datos borrados: la app vacía nunca pisa la copia', JSON.stringify((await docs()).indice.actual)===nubeAntes);
    await pn.locator('.item:has-text("Copia actual") button:has-text("Restaurar")').click();
    await pn.waitForLoadState('load'); await pn.waitForTimeout(400); await conNube();
    ok('datos borrados: restaurar devuelve todo', await pn.evaluate(()=>state.routine.days.length===5 && state.history.length===1 && state.history[0].exercises[0].sets[0].peso===60));
    ok('tras restaurar: sigue activa, sin nada pendiente ni preguntas', await pn.evaluate(()=>nube.activa && !!nube.usuario && !nube.pendiente && !nube.ofrecer));
    // la nube tiene una copia que este celular no conoce: no se pisa sin preguntar
    await pn.evaluate(()=>{ nube.activa=false; const a=JSON.parse(localStorage.entrenoNube); a.base=123; a.pendiente=false; localStorage.entrenoNube=JSON.stringify(a); const s=JSON.parse(localStorage.entrenoState); s.currentTab='inicio'; localStorage.entrenoState=JSON.stringify(s); });
    await pn.reload(); await pn.waitForTimeout(300); await conNube();
    ok('copia desconocida en la nube: aviso en Inicio', await pn.isVisible('text=Hay una copia en la nube que no salió de este celular'));
    const antesDePreguntar = JSON.stringify((await docs()).indice.actual);
    await pn.evaluate(()=>{ saveState(); return subirANube(); });
    ok('copia desconocida: no se pisa hasta decidir', JSON.stringify((await docs()).indice.actual)===antesDePreguntar);
    await pn.click('text=Revisar');
    await pn.click('text=Quedarme con lo de este celular'); await pn.waitForTimeout(400);
    ok('copia desconocida: al elegir este celular, sube', await pn.evaluate(()=>!nube.ofrecer && !nube.pendiente) && JSON.stringify((await docs()).indice.actual)!==antesDePreguntar);
    await pn.evaluate(()=>setTab('ajustes'));
    await pn.click('text=Apagar la copia automática'); await pn.waitForTimeout(200);
    ok('nube: apagar deja de subir', await pn.evaluate(()=>{ nube.pendiente=false; saveState(); return !nube.activa && !nube.usuario && !nube.pendiente && !JSON.parse(localStorage.entrenoNube).activa; }) && await pn.isVisible('text=Activar con Google'));
    ok('nube: sin errores de JavaScript', !errN.length, errN.join(' | '));
    await ctxN.close();
  }

  // --- rotación con 4 días y aviso de bloque
  ok('rotación y aviso según días de la rutina', await ev(()=>{
    state.routine={days:[1,2,3,4].map(i=>({name:'D'+i,exercises:[]}))}; state.slot=0; state.semana=1; state.plan=null; const nombres=[]; const avisos=[];
    for(let i=0;i<32;i++){ nombres.push(state.routine.days[todayDayIndex()].name); avanzarSlot(); if(state.aviso) avisos.push(state.aviso.semana); }
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
  await p2.waitForFunction(()=>{ const i=document.querySelector('.miniatura img'); return i && i.complete && i.naturalWidth>0; });
  await p2.waitForTimeout(500);
  const guardada = await p2.evaluate(async()=>{ const src=document.querySelector('.miniatura img').src; for(const k of await caches.keys()){ if(await (await caches.open(k)).match(src)) return true; } return false; });
  ok('sin internet: la foto del ejercicio queda guardada', guardada);
  await ctx2.close();

  // --- modo oscuro: carga sin errores
  const ctx3 = await browser.newContext({viewport:{width:390,height:844}, colorScheme:'dark'});
  const p3 = await ctx3.newPage(); const err3=[]; p3.on('pageerror', e=>err3.push(e.message));
  await p3.goto(URL);
  ok('modo oscuro: fondo oscuro y sin errores', await p3.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(20, 20, 20)') && !err3.length);
  await ctx3.close();

  ok('sin errores de JavaScript', errores.length===0, errores.join(' | '));
  await browser.close();
  const fallas = resultados.filter(r=>!r.ok);
  resultados.forEach(r=>console.log(`${r.ok?'✔':'✘'} ${r.nombre}${r.ok||!r.detalle?'':' — '+r.detalle}`));
  console.log(`\n${resultados.length-fallas.length}/${resultados.length} pruebas OK`);
  process.exit(fallas.length?1:0);
})().catch(e=>{ console.error('ERROR EN LA PRUEBA:', e.message); process.exit(2); });
