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

  // --- sesión mañana
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
  ok('sesión: récord personal registrado', await ev(()=>state.prByExercise['Press banca plano']>0 && state.activeSession.exercises[0].prLogrado));
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
  ok('parse: medida desde la biblioteca', await ev(()=>parseRoutine('DIA 1: X\nPlancha | series 3').days[0].exercises[0].medida==='seg' && !('medida' in parseRoutine('DIA 1: X\nRemo con barra | series 3').days[0].exercises[0]) && parseTarde('TARDE: T\nCrunch en polea | series 3').exercises[0].medida==='kg+reps'));
  ok('parecidos: tolera errores de tipeo', await ev(()=>parecidos('Sentadila bulgara', 3)[0].nombre.startsWith('Sentadilla búlgara')));
  await ev(r=>{ state.routine=JSON.parse(r); state.noDisponibles=[]; state.bibliotecaPropia=[]; editor=null; saveState(); render(); }, rutinaAntes);

  // --- circuitos
  const DIA_CIRC = 'DIA 1: Circ\nPress banca plano | descanso 90 | series 1 | reps 8-12\nCIRCUITO 2 vueltas | descanso 60\nSentadilla goblet | reps 10-12\nPlancha\nFIN CIRCUITO';
  ok('circuito: se lee con vueltas y descanso', await ev(t=>{ const d=parseRoutine(t).days[0]; const [a,b,c]=d.exercises; return !a.circuito && b.circuito.vueltas===2 && b.circuito.descanso===60 && b.series===2 && c.circuito.id===b.circuito.id && c.medida==='seg'; }, DIA_CIRC));
  ok('circuito: texto ida y vuelta', await ev(t=>{ const d=parseRoutine(t).days[0]; return JSON.stringify(parseRoutine(diaToText(d,0)).days[0])===JSON.stringify(d) && diaToText(d,0).includes('CIRCUITO 2 vueltas | descanso 60\nSentadilla goblet | reps 10-12\nPlancha | medida seg\nFIN CIRCUITO'); }, DIA_CIRC));
  ok('circuito: también en el turno tarde', await ev(()=>parseTarde('TARDE: T\nCIRCUITO 3 vueltas | descanso 45\nPlancha\nCrunch en polea\nFIN CIRCUITO\nCARDIO: Cinta').exercises.filter(e=>e.circuito && e.circuito.vueltas===3).length===2));
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
  ok('plan: aviso al terminar el bloque sin nombrar el siguiente', plan.aviso2==='Terminaste el bloque Hipertrofia: exportá el informe y pedile al Project cómo seguir.');
  ok('plan: aviso al terminar el plan', plan.aviso3.startsWith('Terminaste el plan') && plan.s4==='Semana 4 · plan terminado');
  ok('plan: sin plan, aviso cada 4 semanas', plan.sinPlan==='Completaste la semana 4: exportá tu informe para el Project.');
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
  // turno tarde desde Rutina
  await tocar('[role="tab"]:has-text("Tarde")');
  await page.fill('#tardePaste', TARDE);
  await tocar('text=Guardar turno tarde');
  ok('tarde: guarda rutina', await ev(()=>state.routineTarde && state.routineTarde.exercises.length===4 && state.routineTarde.exercises[3].medida==='kg+m'));
  await page.locator('.card:has-text("Cardio + Abs") button:has-text("Editar")').click();
  ok('tarde: editor visual', await visible('TURNO TARDE') && await visible('Caminata del granjero'));
  await tocar('text=Agregar cardio');
  ok('tarde: agregar cardio lista las máquinas sin buscar', await page.locator('.item').count() > 3);
  await page.locator('.item').first().click();
  ok('tarde: cardio agregado', await ev(()=>state.routineTarde.exercises.length===5 && state.routineTarde.exercises[4].cardio===true));
  await page.locator('.alt-card').last().locator('[aria-label="Quitar"]').click();
  await tocar('text=Editar como texto');
  ok('tarde: texto precargado para editar (ida y vuelta)', await ev((t)=>JSON.stringify(parseTarde(t))===JSON.stringify(state.routineTarde), await page.inputValue('#tardePaste')));
  ok('mañana: texto de un día ida y vuelta', await ev(()=>state.routine.days.every((d,i)=>JSON.stringify(parseRoutine(diaToText(d,i)).days[0])===JSON.stringify(d))));
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
  ok('cambiar: muestra Project, biblioteca y buscador', await visible('Sugeridas por el Project') && await visible('De la biblioteca') && await page.isVisible('input[aria-label="Buscar ejercicio"]'));
  await page.fill('input[aria-label="Buscar ejercicio"]', 'press de pecho en maquina');
  await page.locator('.alt-card:has-text("Press de pecho en máquina") >> text=Solo hoy').first().click();
  ok('cambiar: aplica el nuevo solo hoy', await ev(()=>state.activeSession.exercises[0].nombre==='Press de pecho en máquina' && state.routine.days[0].exercises[0].nombre==='Press banca plano'));
  ok('cambiar: precarga los pesos del ejercicio nuevo', await ev(()=>state.activeSession.exercises[0].sets.filter(s=>s.tipo==='Normal').every(s=>s.peso===70)));
  await tocar('text=Finalizar sesión');

  // --- volver arriba al cambiar de pestaña
  await ev(()=>window.scrollTo(0, 400));
  await ev(()=>setTab('rutina'));
  ok('cambiar de pestaña vuelve arriba', await ev(()=>window.scrollY===0));

  // --- sesión de la tarde + paso automático al terminar cada ejercicio
  await ev(()=>setTab('inicio'));
  await tocar('text=Empezar turno tarde');
  await page.fill('#cardio-duracion', '30'); await page.fill('#cardio-velocidad', '6.5');
  await tocar('.opciones button:has-text("Difícil")');
  ok('tarde: sensación elegida', await ev(()=>state.activeSession.exercises[0].cardioData.medicionValor==='Difícil, casi no puedo hablar'));
  await tocar('text=Marcar como hecho');
  ok('tarde: cardio hecho', await ev(()=>state.activeSession.exercises[0].cardioHecho));
  ok('auto: al terminar un ejercicio avisa cuál sigue', await page.isVisible('#cierre:has-text("Sigue Crunch en polea")'));
  await tocar('#cierre button:has-text("Ir ahora")');
  ok('auto: "Ir ahora" pasa al siguiente', await ev(()=>state.activeSession.focusIdx===1) && !(await page.isVisible('#cierre')));
  await tocar('button:has-text("Más")');
  ok('tarde: kg+reps sin discos', !(await visible('Calculadora de discos')));
  await tocar('text=Volver');
  await ev(()=>{ const e=state.activeSession.exercises[1]; e.sets.forEach((s,i)=>{ s.peso=20; s.reps=12; if(i<e.sets.length-1) s.done=true; }); saveState(); render(); });
  await ev(()=>{ const e=state.activeSession.exercises[1]; marcarHecha(e, e.sets.length-1); });
  ok('auto: muestra la recomendación del ejercicio', await page.isVisible('#cierre:has-text("Dentro del rango")'));
  await page.waitForTimeout(5600);
  ok('auto: pasa solo al siguiente a los 5 segundos', await ev(()=>state.activeSession.focusIdx===2) && !(await page.isVisible('#cierre')));
  ok('tarde: medida seg muestra Seg', await page.isVisible('.sets-head span:text-is("Seg")'));
  await ev(()=>{ const e=state.activeSession.exercises[2]; e.sets.forEach(s=>{ s.seg=60; }); marcarHecha(e,0); marcarHecha(e,1); });
  await tocar('#cierre button:has-text("Quedarme")');
  ok('auto: "Quedarme" cancela el paso', await ev(()=>state.activeSession.focusIdx===2) && !(await page.isVisible('#cierre')));
  await tocar('button:has-text("Siguiente")');
  ok('tarde: medida kg+m muestra Metros', await page.isVisible('.sets-head span:text-is("Metros")'));
  ok('último ejercicio: sin "Siguiente", con "Finalizar sesión"', !(await page.isVisible('#screen button:has-text("Siguiente")')) && await page.isVisible('#screen .fila2 button:has-text("Finalizar sesión")'));
  await ev(()=>{ const e=state.activeSession.exercises[3]; e.sets.forEach(s=>{ s.peso=24; s.m=40; }); marcarHecha(e,0); marcarHecha(e,1); });
  ok('auto: con todo hecho avisa que finaliza', await page.isVisible('#cierre:has-text("Finalizando en")'));
  await page.waitForTimeout(5600);
  ok('auto: finaliza sola la sesión', await ev(()=>!state.activeSession));
  ok('tarde: guarda aparte y no avanza día', await ev(()=>state.historyTarde.length===1 && state.slot===0));
  ok('tarde: resumen', await visible('Sesión completa'));
  await tocar('text=Volver al inicio');
  await tocar('text=Empezar turno tarde');
  ok('tarde: precarga la vez siguiente', await ev(()=>state.activeSession.exercises[3].sets.map(s=>s.peso+'/'+s.m).join(',')==='24/40,24/40'));
  ok('progresión: compara con la vez pasada en ejercicios sin rango de reps', await ev(()=>{
    const e = JSON.parse(JSON.stringify(state.activeSession.exercises[2])); e.sets.forEach(s=>{ s.seg=70; s.done=true; }); return recomendacion(e).tipo==='subir';
  }));
  await tocar('text=Finalizar sesión');

  // --- progresión sugerida en la precarga
  ok('progresión: si llegaste al tope de reps, precarga el peso siguiente según el equipo', await ev(()=>{
    state.lastSetsByDayExercise['Pull::Remo en polea'] = [{peso:50,reps:12,tipo:'Normal'},{peso:50,reps:12,tipo:'Normal'},{peso:50,reps:12,tipo:'Normal'}];
    const sets = seedSets({nombre:'Remo en polea', series:3, repsMin:8, repsMax:12}, 'Pull', true);
    return sets.every(s=>s.peso===52.5 && s.sugerido===2.5);
  }));
  ok('progresión: si no llegaste al tope, no cambia el peso', await ev(()=>{
    state.lastSetsByDayExercise['Pull::Remo en polea'] = [{peso:50,reps:12,tipo:'Normal'},{peso:50,reps:10,tipo:'Normal'}];
    return seedSets({nombre:'Remo en polea', series:2, repsMin:8, repsMax:12}, 'Pull', true).every(s=>s.peso===50 && !s.sugerido);
  }));

  // --- sueltos
  await ev(()=>setTab('inicio'));
  await tocar('text=Cargar ejercicio suelto');
  await tocar('#screen button:has-text("Cardio")');
  await page.fill('#cardio-duracion', '25'); await page.fill('#cardio-maquina', 'Elíptica'); await page.fill('#cardio-velocidad', '7');
  await tocar('button:has-text("Guardar")');
  await tocar('#screen button:has-text("Agarre")');
  await page.fill('input[placeholder="Valor"]', '35'); await tocar('button:has-text("Guardar")');
  await tocar('#screen button:has-text("Abdominales")');
  await page.fill('input[placeholder="Valor"]', '20'); await tocar('button:has-text("Guardar")');
  ok('sueltos: cardio, agarre y abs guardados', await ev(()=>state.actividadesExtra.map(a=>a.tipo).join(',')==='cardio,agarre,abdominales'));
  ok('sueltos: fecha de hoy en hora argentina', await ev(()=>state.actividadesExtra.every(a=>new Date(a.fecha).toLocaleDateString('es-AR')===new Date().toLocaleDateString('es-AR'))));
  ok('sueltos: cardio con los mismos campos que la tarde', await ev(()=>state.actividadesExtra[0].cardioData.velocidad==='7'));
  ok('sueltos: listado', await visible('Elíptica') && await visible('Dead hang') && await visible('Crunch'));
  const dels = await page.$$('button[aria-label="Borrar"]'); await dels[0].click();
  ok('sueltos: borrar registro', await ev(()=>state.actividadesExtra.length===2));

  // --- historial, informe, CSV, gráfico
  await ev(()=>{ state.actividadesExtra.unshift({tipo:'cardio', fecha:'2026-08-01T15:00:00Z', duracionMin:20, modalidad:'Bici vieja', medicionTipo:'sensacion', medicionValor:'Fácil, puedo hablar normal'}); saveState(); });
  await ev(()=>setTab('historial'));
  ok('historial: sesiones de mañana y tarde', await visible('Turno tarde: Cardio + Abs') && await page.isVisible('.item:has-text("Push")'));
  ok('historial: agrupado por semana', await visible('Semana del'));
  ok('historial: volumen de sesión vieja sin series fantasma', (await page.textContent('#screen')).includes('1150 kg'));
  await tocar('text=Copiar informe');
  const inf4 = await clip();
  ok('informe: últimas 4 semanas deja afuera lo viejo', inf4.includes('últimas 4 semanas') && !inf4.includes('Bici vieja'));
  await tocar('[role="tab"]:has-text("Todo")');
  await tocar('text=Copiar informe');
  const inf = await clip();
  const falta = ['Fondo de máquina asistido','TURNO TARDE','EJERCICIOS SUELTOS','Crunch en polea (kg+reps)','Cardio: Cinta','Cardio: Bici vieja · 20 min','Agarre (Dead hang)'].filter(t=>!inf.includes(t));
  ok('informe: mañana, tarde y sueltos', !falta.length, 'falta: '+falta.join(', '));
  const analisis = await ev(()=>{
    const copia = JSON.stringify(state);
    const S = (fecha, sets)=>({fecha, dayName:'Push', exercises:[{nombre:'Press banca plano', sets}], duracionSeg:600});
    const n = (peso, reps, tipo)=>({peso, reps, tipo: tipo||'Normal', done:true});
    state.history = [
      S('2026-09-01T12:00:00Z', [n(20,10,'Calentamiento'), n(80,8), n(80,8)]),
      S('2026-09-03T12:00:00Z', [n(80,8)]), S('2026-09-08T12:00:00Z', [n(80,7)]), S('2026-09-10T12:00:00Z', [n(80,8)]),
      {fecha:'2026-09-10T13:00:00Z', dayName:'Push', exercises:[{nombre:'Plancha', medida:'seg', sets:[{seg:40, tipo:'Normal', done:true},{seg:60, tipo:'Normal', done:true}]},{nombre:'Fondo de máquina asistido', sets:[n(45,10), n(30,10)]},{nombre:'Invento xyz', sets:[n(10,10)]}], duracionSeg:600}];
    state.historyTarde = []; state.actividadesExtra = [];
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
  ok('informe: rutina actual en formato de carga', I.includes('=== RUTINA ACTUAL') && I.includes('DIA 1: Push') && I.includes('TARDE: Cardio + Abs'));
  ok('informe: biblioteca y gimnasio', I.includes('No hay en mi gimnasio: Prensa de piernas') && I.includes('Remo Hammer casero (') && I.includes('se mide en kg+reps'));
  ok('CSV: medida y columnas por tipo', analisis.csv.includes('"Plancha","1","seg","","","40"'));
  await tocar('text=Copiar CSV');
  const csv = await clip();
  ok('CSV: tres bloques', csv.includes('"Fecha","Dia"') && csv.includes('"Turno tarde"') && csv.includes('"Fecha","Tipo"'));
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
  ok('copia: incluye todo', copia.app==='entreno' && copia.state.history.length===2 && copia.state.historyTarde.length===1);
  ok('copia: nombre con fecha local', dl.suggestedFilename()===`entreno-copia-${await ev(()=>hoyISO())}.json`);
  await ev(async()=>{ localStorage.clear(); await mediaClear(); });
  await page.reload(); await page.waitForTimeout(300);
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), tocar('button:has-text("Restaurar")')]);
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
