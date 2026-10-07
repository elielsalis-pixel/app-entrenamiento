// Rutinas armadas: plantillas generales para empezar sin entrenador. No son un plan personalizado.
// Están escritas con ejercicios de la biblioteca de la app; las pruebas verifican que todos existan y que cada rutina se lea.
//
// Cada rutina se arma combinando "puestos" (un tipo de ejercicio) con el ejercicio que ocupa ese puesto según dónde se
// entrena. Cada puesto tiene dos ejercicios: el de la variante A y el de la variante B (misma estructura, otros ejercicios).

// puesto -> [ejercicio de la variante A, ejercicio de la variante B]
const PUESTOS_BASE = {
  gimnasio: {
    press_h: ['Press banca plano con barra', 'Press banca con mancuernas'],
    press_incl: ['Press inclinado con mancuernas', 'Press inclinado con barra'],
    press_maq: ['Press de pecho en máquina', 'Press inclinado en máquina'],
    aperturas: ['Peck deck (aperturas en máquina)', 'Cruce de poleas'],
    press_v: ['Press militar con barra de pie', 'Press de hombros sentado con mancuernas'],
    press_v_maq: ['Press de hombros en máquina', 'Press Arnold'],
    lateral: ['Elevaciones laterales con mancuernas', 'Elevaciones laterales en polea'],
    posterior: ['Face pull', 'Aperturas inversas en máquina'],
    remo: ['Remo con barra', 'Remo T con pecho apoyado'],
    remo_polea: ['Remo sentado en polea', 'Remo en máquina'],
    remo_manc: ['Remo con mancuerna a una mano', 'Remo con pecho apoyado en banco inclinado'],
    jalon: ['Jalón al pecho agarre abierto', 'Jalón con triángulo'],
    dominada: ['Dominadas asistidas en máquina', 'Jalón supino'],
    pullover: ['Pullover en polea (brazos rectos)', 'Pullover en polea con soga'],
    sentadilla: ['Sentadilla con barra', 'Sentadilla hack en máquina'],
    prensa: ['Prensa de piernas', 'Sentadilla en Smith'],
    bisagra: ['Peso muerto rumano con barra', 'Peso muerto rumano con mancuernas'],
    unilateral: ['Sentadilla búlgara con mancuernas', 'Estocadas con mancuernas'],
    cuadriceps: ['Extensión de cuádriceps', 'Extensión de cuádriceps a una pierna'],
    femoral: ['Curl femoral acostado', 'Curl femoral sentado'],
    gluteo: ['Hip thrust con barra', 'Puente de glúteo con barra'],
    gemelos: ['Gemelos de pie en máquina', 'Gemelos sentado en máquina'],
    biceps: ['Curl de bíceps con barra', 'Curl con barra Z'],
    biceps2: ['Curl martillo', 'Curl inclinado con mancuernas'],
    triceps: ['Extensión de tríceps en polea con soga', 'Extensión de tríceps en polea con barra'],
    triceps2: ['Press francés con barra Z', 'Extensión de tríceps trasnuca con mancuerna'],
    abs: ['Crunch en polea', 'Crunch en máquina'],
    abs2: ['Elevación de rodillas en paralelas (silla romana)', 'Elevación de piernas acostado'],
    plancha: ['Plancha', 'Plancha lateral'],
    cardio: ['Cinta (caminata)', 'Bicicleta fija'],
    cardio2: ['Elíptica', 'Remo ergómetro'],
    // fuerza: los levantamientos principales son los mismos en las dos variantes; cambian los accesorios
    f_sentadilla: ['Sentadilla con barra', 'Sentadilla con barra'],
    f_banca: ['Press banca plano con barra', 'Press banca plano con barra'],
    f_militar: ['Press militar con barra de pie', 'Press militar con barra de pie'],
    f_muerto: ['Peso muerto con barra', 'Peso muerto con barra'],
    f_sentadilla2: ['Sentadilla al cajón con barra', 'Sentadilla profunda con barra'],
    f_banca2: ['Press banca agarre cerrado', 'Press inclinado con barra']
  },
  casa: {
    press_h: ['Press en el piso con mancuernas', 'Flexiones de brazos'],
    press_v: ['Press de hombros de pie con mancuernas', 'Press Arnold'],
    lateral: ['Elevaciones laterales con mancuernas', 'Remo al mentón con mancuernas'],
    posterior: ['Pájaros con mancuernas', 'Pájaros a una mano'],
    remo: ['Remo con mancuerna a una mano', 'Remo inclinado con dos mancuernas'],
    remo2: ['Remo con mancuernas agarre neutro', 'Retracción escapular con mancuernas'],
    pullover: ['Pullover con mancuerna', 'Pullover con mancuerna brazos rectos'],
    sentadilla: ['Sentadilla con mancuernas', 'Sentadilla sumo con mancuerna'],
    bisagra: ['Peso muerto rumano con mancuernas', 'Puente de glúteo a una pierna'],
    unilateral: ['Estocadas hacia atrás con mancuernas', 'Sentadilla búlgara con mancuernas'],
    gluteo: ['Puente de glúteo', 'Patada de glúteo en el piso'],
    gemelos: ['Gemelos de pie con mancuerna', 'Gemelo sobre mancuerna a una pierna'],
    biceps: ['Curl de bíceps con mancuernas', 'Curl martillo'],
    triceps: ['Extensión de tríceps trasnuca con mancuerna', 'Patada de tríceps'],
    abs: ['Crunch abdominal', 'Bicicleta abdominal'],
    abs2: ['Elevación de piernas acostado', 'Giro ruso'],
    plancha: ['Plancha', 'Plancha lateral'],
    potencia: ['Swing vertical con mancuerna', 'Cargada con mancuernas']
  },
  sin: {
    press_h: ['Flexiones de brazos', 'Flexiones inclinadas (manos elevadas)'],
    press_h2: ['Flexiones cerradas (diamante)', 'Fondos en banco'],
    sentadilla: ['Sentadilla sin peso', 'Sentadilla con salto'],
    unilateral: ['Estocadas caminando', 'Subida al cajón con elevación de rodilla'],
    gluteo: ['Puente de glúteo', 'Puente de glúteo a una pierna'],
    bisagra: ['Extensión lumbar sin banco', 'Superman (extensión lumbar en el piso)'],
    abs: ['Crunch abdominal', 'Abdominales completos (sit-up)'],
    abs2: ['Escaladores', 'Bicicleta abdominal'],
    plancha: ['Plancha', 'Plancha lateral'],
    saltos: ['Saltos en estrella', 'Skipping rápido'],
    saltos2: ['Saltos en tijera', 'Salto con talones a los glúteos']
  }
};

// Renglones de cada día: "puesto tipo series reps descanso".
//   puesto~  usa el ejercicio de la otra variante (para no repetir dentro de la rutina)
//   tipo: c = compuesto (lleva calentamiento y cambia en los bloques de fuerza) · a = accesorio · t = por tiempo · k = cardio
//   "( vueltas descanso" abre un circuito y ")" lo cierra; adentro solo cuentan el puesto, el tipo y las reps
const RUTINAS_BASE = [
  {id: 'musculo-gimnasio-3', objetivo: 'musculo', lugar: 'gimnasio', nombre: 'Cuerpo completo', resumen: 'Todo el cuerpo en cada sesión. La mejor forma de arrancar o de entrenar con poco tiempo.', dias: [
    ['Cuerpo completo 1', ['sentadilla c 3 8-10 120', 'press_h c 3 8-10 120', 'remo_polea a 3 10-12 90', 'press_v_maq a 3 10-12 90', 'femoral a 3 10-12 60', 'biceps a 2 10-12 60', 'plancha t 3 - 60']],
    ['Cuerpo completo 2', ['bisagra c 3 8-10 120', 'press_incl c 3 8-12 90', 'jalon a 3 8-12 90', 'unilateral a 3 10-12 90', 'lateral a 3 12-15 60', 'triceps a 2 10-12 60', 'abs a 3 12-15 60']],
    ['Cuerpo completo 3', ['prensa c 3 10-12 120', 'press_maq a 3 10-12 90', 'remo_manc a 3 10-12 90', 'gluteo a 3 10-12 90', 'posterior a 3 12-15 60', 'gemelos a 3 12-15 60', 'abs2 a 3 10-15 60']]]},
  {id: 'musculo-gimnasio-4', objetivo: 'musculo', lugar: 'gimnasio', nombre: 'Torso y pierna', resumen: 'Dos días de tren superior y dos de piernas. Cada músculo se trabaja dos veces por semana.', dias: [
    ['Torso 1', ['press_h c 4 6-8 150', 'remo c 4 6-8 150', 'press_v c 3 8-10 120', 'jalon a 3 8-12 90', 'lateral a 3 12-15 60', 'triceps a 3 10-12 60', 'biceps a 3 10-12 60']],
    ['Pierna 1', ['sentadilla c 4 6-8 180', 'bisagra c 3 8-10 150', 'unilateral a 3 10-12 90', 'femoral a 3 10-12 60', 'gemelos a 4 10-15 60', 'abs a 3 12-15 60']],
    ['Torso 2', ['press_incl c 3 8-12 120', 'dominada c 3 8-12 120', 'press_maq a 3 10-12 90', 'remo_polea a 3 10-12 90', 'posterior a 3 12-15 60', 'biceps2 a 3 10-12 60', 'triceps2 a 3 10-12 60']],
    ['Pierna 2', ['prensa c 4 10-12 120', 'gluteo c 3 8-12 120', 'cuadriceps a 3 12-15 60', 'femoral~ a 3 12-15 60', 'gemelos~ a 4 12-15 60', 'plancha t 3 - 60']]]},
  {id: 'musculo-gimnasio-5', objetivo: 'musculo', lugar: 'gimnasio', nombre: 'Cinco días', resumen: 'Empuje, tirón y pierna, más un día de torso y otro de piernas y abdomen.', dias: [
    ['Empuje', ['press_h c 4 6-10 150', 'press_incl c 3 8-12 120', 'press_v_maq a 3 10-12 90', 'lateral a 4 12-15 60', 'triceps a 3 10-12 60', 'triceps2 a 2 10-12 60']],
    ['Tirón', ['remo c 4 6-10 150', 'jalon c 3 8-12 120', 'remo_polea a 3 10-12 90', 'posterior a 3 12-15 60', 'biceps a 3 8-12 60', 'biceps2 a 2 10-12 60']],
    ['Pierna', ['sentadilla c 4 6-10 180', 'bisagra c 3 8-10 150', 'prensa a 3 10-12 120', 'femoral a 3 10-12 60', 'gemelos a 4 10-15 60']],
    ['Torso', ['press_v c 3 8-10 120', 'dominada c 3 8-12 120', 'press_maq a 3 10-12 90', 'remo_manc a 3 10-12 90', 'aperturas a 3 12-15 60', 'lateral~ a 3 12-15 60']],
    ['Pierna y abdomen', ['gluteo c 4 8-12 120', 'unilateral a 3 10-12 90', 'cuadriceps a 3 12-15 60', 'femoral~ a 3 12-15 60', 'abs a 3 12-15 60', 'plancha t 3 - 60']]]},
  {id: 'musculo-gimnasio-6', objetivo: 'musculo', lugar: 'gimnasio', nombre: 'Empuje, tirón y pierna', resumen: 'La vuelta completa dos veces por semana. Para quien ya entrena seguido.', dias: [
    ['Empuje 1', ['press_h c 4 6-8 150', 'press_v c 3 8-10 120', 'press_incl a 3 8-12 90', 'lateral a 4 12-15 60', 'triceps a 3 10-12 60']],
    ['Tirón 1', ['remo c 4 6-8 150', 'jalon c 3 8-12 120', 'posterior a 3 12-15 60', 'biceps a 3 8-12 60', 'biceps2 a 2 10-12 60']],
    ['Pierna 1', ['sentadilla c 4 6-8 180', 'bisagra c 3 8-10 150', 'unilateral a 3 10-12 90', 'gemelos a 4 10-15 60', 'abs a 3 12-15 60']],
    ['Empuje 2', ['press_incl~ c 3 8-12 120', 'press_v_maq a 3 10-12 90', 'aperturas a 3 12-15 60', 'lateral~ a 3 12-15 60', 'triceps2 a 3 10-12 60']],
    ['Tirón 2', ['dominada c 3 8-12 120', 'remo_polea a 3 10-12 90', 'pullover a 3 12-15 60', 'posterior~ a 3 12-15 60', 'biceps~ a 3 10-12 60']],
    ['Pierna 2', ['prensa c 4 10-12 120', 'gluteo c 3 8-12 120', 'cuadriceps a 3 12-15 60', 'femoral a 3 10-15 60', 'gemelos~ a 4 12-15 60', 'plancha t 3 - 60']]]},
  {id: 'musculo-casa-3', objetivo: 'musculo', lugar: 'casa', nombre: 'Cuerpo completo en casa', resumen: 'Todo el cuerpo con un par de mancuernas. Cuando las repeticiones te queden fáciles, sumá peso o hacelas más lento.', dias: [
    ['Cuerpo completo 1', ['sentadilla c 3 10-15 90', 'press_h c 3 8-15 90', 'remo a 3 10-12 90', 'press_v a 3 10-12 90', 'gluteo a 3 12-15 60', 'biceps a 2 10-15 60', 'plancha t 3 - 60']],
    ['Cuerpo completo 2', ['bisagra c 3 10-12 90', 'remo2 a 3 10-15 90', 'press_h~ a 3 8-15 90', 'unilateral a 3 10-12 90', 'lateral a 3 12-15 60', 'triceps a 2 10-15 60', 'abs a 3 12-20 60']],
    ['Cuerpo completo 3', ['unilateral~ c 3 10-12 90', 'press_v~ a 3 10-12 90', 'remo~ a 3 10-12 90', 'pullover a 3 12-15 60', 'posterior a 3 12-15 60', 'gemelos a 3 12-20 60', 'abs2 a 3 12-20 60']]]},
  {id: 'musculo-casa-4', objetivo: 'musculo', lugar: 'casa', nombre: 'Torso y pierna en casa', resumen: 'Dos días de tren superior y dos de piernas, con mancuernas.', dias: [
    ['Torso 1', ['press_h c 4 8-15 90', 'remo c 4 8-12 90', 'press_v a 3 10-12 90', 'lateral a 3 12-15 60', 'biceps a 3 10-15 60', 'triceps a 3 10-15 60']],
    ['Pierna 1', ['sentadilla c 4 10-15 90', 'bisagra c 3 10-12 90', 'unilateral a 3 10-12 90', 'gemelos a 4 12-20 60', 'abs a 3 12-20 60']],
    ['Torso 2', ['press_v~ c 3 10-12 90', 'remo2 a 3 10-15 90', 'press_h~ a 3 8-15 90', 'pullover a 3 12-15 60', 'posterior a 3 12-15 60', 'biceps~ a 2 10-15 60', 'triceps~ a 2 10-15 60']],
    ['Pierna 2', ['unilateral~ c 3 10-12 90', 'gluteo a 3 12-15 60', 'sentadilla~ a 3 12-15 90', 'gemelos~ a 3 12-20 60', 'plancha t 3 - 60']]]},
  {id: 'fuerza-gimnasio-3', objetivo: 'fuerza', lugar: 'gimnasio', nombre: 'Fuerza en tres días', resumen: 'Sentadilla, press de banca y peso muerto como eje, con pocos accesorios. Pide técnica: si no la tenés, que te la miren.', dias: [
    ['Sentadilla', ['f_sentadilla c 4 5-7 180', 'f_banca c 4 5-7 180', 'remo c 3 6-8 150', 'plancha t 3 - 60']],
    ['Peso muerto', ['f_muerto c 3 4-6 210', 'f_militar c 4 5-7 180', 'dominada c 3 6-8 150', 'abs a 3 10-15 60']],
    ['Banca', ['f_banca2 c 4 6-8 150', 'f_sentadilla2 c 3 6-8 150', 'remo_polea a 3 8-10 120', 'gluteo a 3 8-10 120', 'triceps a 3 8-12 60']]]},
  {id: 'fuerza-gimnasio-4', objetivo: 'fuerza', lugar: 'gimnasio', nombre: 'Fuerza, torso y pierna', resumen: 'Cuatro días: dos de tren superior y dos de piernas, con un levantamiento pesado por sesión.', dias: [
    ['Torso pesado', ['f_banca c 4 5-7 180', 'remo c 4 5-7 150', 'press_v_maq a 3 8-10 120', 'dominada a 3 6-10 120', 'triceps a 3 8-12 60']],
    ['Pierna pesada', ['f_sentadilla c 4 5-7 180', 'bisagra c 3 6-8 150', 'unilateral a 3 8-10 120', 'abs a 3 10-15 60']],
    ['Torso 2', ['f_militar c 4 5-7 180', 'f_banca2 c 3 6-8 150', 'jalon a 3 8-10 120', 'remo_polea a 3 8-10 120', 'biceps a 3 8-12 60']],
    ['Pierna 2', ['f_muerto c 3 4-6 210', 'prensa c 3 8-10 150', 'femoral a 3 8-12 90', 'gemelos a 3 10-15 60', 'plancha t 3 - 60']]]},
  {id: 'peso-gimnasio-3', objetivo: 'peso', lugar: 'gimnasio', nombre: 'Pesas y aeróbico', resumen: 'Todo el cuerpo con pausas cortas y aeróbico al final de cada sesión. Bajar de peso depende sobre todo de lo que comés: el entrenamiento ayuda a que lo que pierdas no sea músculo.', dias: [
    ['Cuerpo completo 1', ['prensa c 3 12-15 75', 'press_maq a 3 12-15 60', 'remo_polea a 3 12-15 60', 'gluteo a 3 12-15 60', 'abs a 3 15-20 45', 'cardio k']],
    ['Cuerpo completo 2', ['unilateral a 3 12-15 60', 'jalon a 3 12-15 60', 'press_v_maq a 3 12-15 60', 'femoral a 3 12-15 60', 'plancha t 3 - 45', 'cardio2 k']],
    ['Cuerpo completo 3', ['bisagra c 3 10-12 90', 'press_incl a 3 12-15 60', 'remo_manc a 3 12-15 60', 'cuadriceps a 3 15-20 45', 'abs2 a 3 12-15 45', 'cardio~ k']]]},
  {id: 'peso-gimnasio-4', objetivo: 'peso', lugar: 'gimnasio', nombre: 'Torso, pierna y aeróbico', resumen: 'Cuatro días con pesas y aeróbico al final. Bajar de peso depende sobre todo de lo que comés: el entrenamiento ayuda a que lo que pierdas no sea músculo.', dias: [
    ['Torso 1', ['press_h c 3 10-12 90', 'remo_polea a 3 12-15 60', 'press_v_maq a 3 12-15 60', 'jalon a 3 12-15 60', 'abs a 3 15-20 45', 'cardio k']],
    ['Pierna 1', ['prensa c 3 12-15 90', 'bisagra c 3 10-12 90', 'unilateral a 3 12-15 60', 'gemelos a 3 15-20 45', 'cardio2 k']],
    ['Torso 2', ['press_incl c 3 10-12 90', 'remo_manc a 3 12-15 60', 'lateral a 3 12-15 45', 'triceps a 2 12-15 45', 'biceps a 2 12-15 45', 'cardio~ k']],
    ['Pierna 2', ['gluteo c 3 12-15 90', 'cuadriceps a 3 15-20 45', 'femoral a 3 12-15 60', 'plancha t 3 - 45', 'cardio2~ k']]]},
  {id: 'peso-casa-3', objetivo: 'peso', lugar: 'casa', nombre: 'Circuitos con mancuernas', resumen: 'Circuitos: un ejercicio atrás del otro y descanso al terminar la vuelta. Bajar de peso depende sobre todo de lo que comés.', dias: [
    ['Circuito 1', ['( 3 90', 'sentadilla a - 12-15 -', 'press_h a - 10-15 -', 'remo a - 12-15 -', 'potencia a - 12-15 -', 'plancha t - - -', ')']],
    ['Circuito 2', ['( 3 90', 'unilateral a - 10-12 -', 'press_v a - 10-12 -', 'bisagra a - 12-15 -', 'abs a - 15-20 -', 'abs2 a - 12-20 -', ')']],
    ['Circuito 3', ['( 4 75', 'sentadilla~ a - 12-15 -', 'remo2 a - 12-15 -', 'press_h~ a - 10-15 -', 'gluteo a - 15-20 -', 'potencia~ a - 10-12 -', ')']]]},
  {id: 'peso-sin-3', objetivo: 'peso', lugar: 'sin', nombre: 'Circuitos sin equipo', resumen: 'Circuitos con el peso del cuerpo. Sin nada donde colgarse casi no hay trabajo de espalda: si podés, sumá una barra o una banda. Bajar de peso depende sobre todo de lo que comés.', dias: [
    ['Circuito 1', ['( 3 90', 'sentadilla a - 15-20 -', 'press_h a - 8-15 -', 'gluteo a - 15-20 -', 'saltos a - 20-30 -', 'plancha t - - -', ')']],
    ['Circuito 2', ['( 3 90', 'unilateral a - 10-12 -', 'press_h2 a - 8-12 -', 'bisagra a - 12-15 -', 'abs2 a - 20-30 -', 'abs a - 15-20 -', ')']],
    ['Circuito 3', ['( 4 75', 'sentadilla~ a - 10-15 -', 'press_h~ a - 8-15 -', 'gluteo~ a - 10-15 -', 'saltos2 a - 20-30 -', 'plancha~ t - - -', ')']]]},
  {id: 'salud-gimnasio-3', objetivo: 'salud', lugar: 'gimnasio', nombre: 'Sesiones cortas', resumen: 'Unos 30 a 40 minutos: máquinas, pocas series y un rato de aeróbico. Para moverse y sentirse mejor.', dias: [
    ['Sesión 1', ['prensa c 2 10-12 90', 'press_maq a 2 10-12 90', 'remo_polea a 2 10-12 90', 'press_v_maq a 2 10-12 90', 'plancha t 2 - 60', 'cardio k']],
    ['Sesión 2', ['cuadriceps a 2 12-15 60', 'femoral a 2 12-15 60', 'jalon a 2 10-12 90', 'press_maq~ a 2 10-12 90', 'posterior a 2 12-15 60', 'abs a 2 12-15 60', 'cardio2 k']],
    ['Sesión 3', ['prensa~ c 2 10-12 90', 'remo_manc a 2 10-12 90', 'press_v_maq~ a 2 10-12 90', 'gluteo a 2 12-15 60', 'abs2 a 2 10-15 60', 'cardio~ k']]]},
  {id: 'salud-casa-3', objetivo: 'salud', lugar: 'casa', nombre: 'Sesiones cortas en casa', resumen: 'Unos 30 minutos con un par de mancuernas.', dias: [
    ['Sesión 1', ['sentadilla c 2 12-15 75', 'press_h a 2 8-15 75', 'remo a 2 10-12 75', 'gluteo a 2 12-15 60', 'plancha t 2 - 60']],
    ['Sesión 2', ['unilateral a 2 10-12 75', 'press_v a 2 10-12 75', 'remo2 a 2 10-15 75', 'bisagra a 2 10-12 75', 'abs a 2 12-20 60']],
    ['Sesión 3', ['sentadilla~ c 2 12-15 75', 'press_h~ a 2 8-15 75', 'pullover a 2 12-15 60', 'gemelos a 2 12-20 60', 'abs2 a 2 12-20 60']]]},
  {id: 'salud-sin-3', objetivo: 'salud', lugar: 'sin', nombre: 'Sesiones cortas sin equipo', resumen: 'Unos 25 minutos con el peso del cuerpo, en cualquier lugar.', dias: [
    ['Sesión 1', ['sentadilla c 2 12-15 60', 'press_h a 2 8-15 60', 'gluteo a 2 12-15 60', 'bisagra a 2 10-15 60', 'plancha t 2 - 60']],
    ['Sesión 2', ['unilateral a 2 10-12 60', 'press_h2 a 2 8-12 60', 'abs a 2 12-20 60', 'abs2 a 2 20-30 60', 'plancha~ t 2 - 45']],
    ['Sesión 3', ['sentadilla~ a 2 10-15 60', 'press_h~ a 2 8-15 60', 'gluteo~ a 2 10-15 60', 'saltos a 2 20-30 45', 'abs~ a 2 12-20 60']]]}
];
// Las de salud general también se ofrecen en dos días: son las dos primeras sesiones de la de tres.
const RUTINAS_BASE_DOS_DIAS = ['salud-gimnasio-3', 'salud-casa-3', 'salud-sin-3'];

// Planes por bloques: cada bloque usa la misma rutina con otras series, repeticiones y descansos en los ejercicios compuestos.
//   detalle: qué cambia, dicho para quien entrena
//   compuesto: {series, reps, descanso} que reemplazan a los de la rutina (series: 'una más' suma una, hasta 5)
//   mitad: true baja las series de todo a la mitad (descarga)
const PLANES_BASE = {
  musculo: [
    {nombre: 'Hipertrofia', semanas: 4, detalle: 'las series y repeticiones de la rutina'},
    {nombre: 'Fuerza', semanas: 3, detalle: 'en los ejercicios principales, menos repeticiones con más peso y más descanso', compuesto: {series: 'una más', reps: '4-6', descanso: 180}},
    {nombre: 'Descarga', semanas: 1, detalle: 'la mitad de las series, para recuperarte', mitad: true}],
  fuerza: [
    {nombre: 'Base', semanas: 4, detalle: 'las series y repeticiones de la rutina'},
    {nombre: 'Fuerza', semanas: 4, detalle: 'en los ejercicios principales, menos repeticiones con más peso y más descanso', compuesto: {series: 5, reps: '3-5', descanso: 210}},
    {nombre: 'Descarga', semanas: 1, detalle: 'la mitad de las series, para recuperarte', mitad: true}]
};

// Rutinas aparte para sumar a cualquier rutina (fuera de la rotación de días).
const APARTE_BASE = [
  {nombre: 'Aeróbico', resumen: 'Un rato de aeróbico a ritmo cómodo, para cualquier día.', texto: 'APARTE: Aeróbico\nCARDIO: Cinta (caminata)'},
  {nombre: 'Abdominales', resumen: 'Diez minutos de abdomen, sin equipo.', texto: 'APARTE: Abdominales\nCIRCUITO 3 vueltas | descanso 60\nCrunch abdominal | reps 15-20\nElevación de piernas acostado | reps 10-15\nBicicleta abdominal | reps 20-30\nPlancha\nFIN CIRCUITO'},
  {nombre: 'Agarre y postura', resumen: 'Para el gimnasio: colgarse, cargar peso y trabajar la parte de atrás del hombro.', texto: 'APARTE: Agarre y postura\nDead hang (colgado de la barra) | series 3 | descanso 60\nCaminata del granjero | series 3 | descanso 90\nFace pull | series 3 | reps 12-15 | descanso 60'}
];
