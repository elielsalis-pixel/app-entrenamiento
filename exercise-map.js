// Mapa de nombres de ejercicios (español, variantes comunes) a la imagen disponible.
// Fuente de las imágenes: chaosbastler/opentraining-exercises, autor Everkinetic,
// licencia Creative Commons Attribution-ShareAlike 3.0 Unported.
// Si un ejercicio no está acá, la app muestra el ícono genérico y podés
// agregar tu propia imagen después desde la pantalla de Rutina.

const EXERCISE_IMAGE_MAP = {
  // pecho
  'press banca': 'ejercicios/bench-press.svg',
  'press banca plano': 'ejercicios/bench-press.svg',
  'press banca con barra': 'ejercicios/bench-press.svg',
  'press banca agarre cerrado': 'ejercicios/narrow-grip-bench-press.svg',
  'press banca a una mano': 'ejercicios/one-arm-bench-press.svg',
  'aperturas con mancuernas': 'ejercicios/dumbbell-flys.svg',
  'aperturas inclinadas': 'ejercicios/dumbbell-decline-flys.svg',
  'pullover': 'ejercicios/bent-arm-pullover.svg',
  'fondos en paralelas': 'ejercicios/tricep-dips.svg',
  'fondos banco': 'ejercicios/bench-dips.svg',
  'flexiones': 'ejercicios/push-up.svg',
  'flexiones de brazos': 'ejercicios/push-ups.svg',
  'flexiones a una mano': 'ejercicios/one-armed-biased-push-up.svg',

  // espalda
  'remo t': 'ejercicios/t-bar-row.svg',
  'remo con barra t': 'ejercicios/t-bar-row.svg',
  'remo posterior': 'ejercicios/rear-deltoid-row.svg',
  'dominadas': 'ejercicios/gironda-sternum-chins.svg',
  'hiperextensiones': 'ejercicios/hyperextensions.svg',
  'extension lumbar': 'ejercicios/back-extension-on-stability-ball.svg',
  'supermans': 'ejercicios/supermans.svg',

  // hombro
  'press militar': 'ejercicios/one-arm-shoulder-press.svg',
  'press arnold': 'ejercicios/arnold-press.svg',
  'elevaciones laterales': 'ejercicios/dumbbell-lateral-raises.svg',
  'elevaciones laterales con mancuerna': 'ejercicios/dumbbell-lateral-raises.svg',
  'elevaciones frontales': 'ejercicios/dumbbell-front-raises.svg',
  'elevaciones frontales con barra': 'ejercicios/barbell-front-raises.svg',
  'remo al menton': 'ejercicios/barbell-upright-rows.svg',
  'remo al menton a una mano': 'ejercicios/one-arm-upright-row.svg',
  'encogimientos': 'ejercicios/barbell-shrugs.svg',
  'encogimientos de hombros': 'ejercicios/barbell-shrugs.svg',
  'pajaros': 'ejercicios/lying-rear-lateral-raise.svg',
  'pajaros a una mano': 'ejercicios/lying-one-arm-rear-lateral-raise.svg',

  // biceps
  'curl de biceps': 'ejercicios/bicep-curls.svg',
  'curl biceps': 'ejercicios/bicep-curls.svg',
  'curl martillo': 'ejercicios/bicep-hammer-curl.svg',
  'curl inverso': 'ejercicios/biceps-curl-reverse.svg',
  'curl concentrado': 'ejercicios/concentration-curls.svg',
  'curl banco scott': 'ejercicios/preacher-curl-3.svg',
  'curl predicador': 'ejercicios/preacher-curl-3.svg',
  'curl predicador a una mano': 'ejercicios/one-arm-preacher-curl.svg',
  'curl en polea': 'ejercicios/high-cable-curls.svg',
  'curl en polea acostado': 'ejercicios/lying-bicep-cable-curl.svg',
  'curl de pie': 'ejercicios/standing-biceps-curl.svg',
  'curl araña': 'ejercicios/spider-curl.svg',
  'curl con soga': 'ejercicios/hammer-curls-with-rope.svg',

  // triceps
  'extension de triceps': 'ejercicios/low-triceps-extension.svg',
  'extension triceps polea': 'ejercicios/low-triceps-extension.svg',
  'extension de triceps en polea': 'ejercicios/low-triceps-extension.svg',
  'extension de triceps acostado': 'ejercicios/lying-triceps-extension-across-face.svg',
  'extension de triceps inclinado': 'ejercicios/incline-triceps-extensions.svg',
  'extension de triceps a una mano': 'ejercicios/one-arm-triceps-extension.svg',
  'press frances': 'ejercicios/lying-close-grip-triceps-press-to-chin.svg',
  'press de triceps sentado': 'ejercicios/seated-triceps-press.svg',
  'patada de triceps': 'ejercicios/triceps-kickback.svg',

  // pierna
  'sentadilla': 'ejercicios/squats.svg',
  'sentadillas': 'ejercicios/squats.svg',
  'sentadilla con barra': 'ejercicios/squats-2.svg',
  'prensa': 'ejercicios/leg-press-1.svg',
  'prensa de pierna': 'ejercicios/leg-press-1.svg',
  'zancadas': 'ejercicios/lunges.svg',
  'estocadas': 'ejercicios/lunges.svg',
  'puente de gluteo': 'ejercicios/bridge.svg',
  'elevacion de cadera': 'ejercicios/bent-knee-hip-raise.svg',

  // abdomen
  'abdominales': 'ejercicios/crunches.svg',
  'crunch': 'ejercicios/crunches.svg',
  'crunch cruzado': 'ejercicios/cross-body-crunch.svg',
  'crunch declinado': 'ejercicios/decline-crunch.svg',
  'elevacion de piernas': 'ejercicios/leg-raises.svg',
  'plancha lateral': 'ejercicios/side-plank.svg'
};

function normalizar(str){
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,'')
    .trim();
}

function buscarImagen(nombreEjercicio){
  const n = normalizar(nombreEjercicio);
  if(EXERCISE_IMAGE_MAP[n]) return EXERCISE_IMAGE_MAP[n];
  // busca coincidencia parcial (por si el nombre tiene palabras extra)
  for(const key in EXERCISE_IMAGE_MAP){
    if(n.includes(key) || key.includes(n)) return EXERCISE_IMAGE_MAP[key];
  }
  return null;
}
