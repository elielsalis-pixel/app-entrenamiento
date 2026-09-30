"""Genera biblioteca.js y las fotos de ejercicios/fdb a partir de free-exercise-db + curado.py.

Uso (desde la raíz del repo):
  git clone --depth 1 https://github.com/yuhonas/free-exercise-db.git /tmp/fdb
  python3 herramientas/biblioteca/generar.py /tmp/fdb
Requiere Pillow (pip install pillow).
"""
import json, re, unicodedata, os, sys, shutil
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
FDB = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fdb'
exec(open(os.path.join(AQUI, 'curado.py')).read())

def norm(s):
    s = unicodedata.normalize('NFD', s.lower()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s)).strip()

MUS = {'quadriceps':'Cuádriceps','shoulders':'Hombros','abdominals':'Abdominales','chest':'Pecho','hamstrings':'Isquiotibiales','triceps':'Tríceps','biceps':'Bíceps','lats':'Dorsales','middle back':'Espalda media','calves':'Gemelos','lower back':'Zona lumbar','forearms':'Antebrazos','glutes':'Glúteos','traps':'Trapecios','adductors':'Aductores','neck':'Cuello','abductors':'Abductores'}
EQ = {'barbell':'Barra','dumbbell':'Mancuernas','cable':'Polea','machine':'Máquina','body only':'Peso corporal','kettlebells':'Kettlebell','e-z curl bar':'Barra Z','other':'Otro','bands':'Banda','medicine ball':'Balón medicinal','exercise ball':'Pelota',None:'Peso corporal'}
NIV = {'beginner':'Principiante','intermediate':'Intermedio','expert':'Avanzado'}
CAT = {'strength':'Fuerza e hipertrofia','powerlifting':'Fuerza e hipertrofia','olympic weightlifting':'Potencia','plyometrics':'Pliometría','strongman':'Cargas','cardio':'Cardio'}
TIPO_PATRON = {'core_flex':'Core','core_anti':'Core','core_rot':'Core','potencia':'Potencia','carga':'Cargas','pliometria':'Pliometría','cardio':'Cardio'}
PROPIOS = {
 'Dominadas asistidas en máquina':(['Dorsales'],['Bíceps','Espalda media'],'Máquina'),
 'Elevaciones laterales en máquina':(['Hombros'],[],'Máquina'),
 'Caminata de maleta (una mano)':(['Antebrazos'],['Abdominales','Trapecios'],'Mancuernas'),
 'Dead hang (colgado de la barra)':(['Antebrazos'],['Dorsales'],'Peso corporal'),
 'Superman (extensión lumbar en el piso)':(['Zona lumbar'],['Glúteos'],'Peso corporal'),
}
PATRONES = {'empuje_h':'Empuje horizontal','empuje_v':'Empuje vertical','tiron_h':'Tirón horizontal (remos)','tiron_v':'Tirón vertical (jalones y dominadas)',
 'sentadilla':'Sentadilla y prensa','bisagra':'Bisagra de cadera','unilateral':'Unilateral de pierna','cuadriceps':'Cuádriceps aislado','femoral':'Femoral aislado',
 'gluteo':'Glúteo','aductores':'Aductores','abductores':'Abductores','pecho_ais':'Pecho aislado (aperturas)','hombro_lat':'Hombro lateral','hombro_post':'Hombro posterior',
 'hombro_front':'Hombro frontal','trapecio':'Trapecio','biceps':'Bíceps','triceps':'Tríceps','gemelos':'Gemelos','antebrazo':'Antebrazo',
 'core_flex':'Core: flexión','core_anti':'Core: estabilidad','core_rot':'Core: rotación y lateral','carga':'Cargas y agarre','potencia':'Potencia','pliometria':'Pliometría','cardio':'Cardio'}

# Correcciones al dataset: músculos mal cargados en free-exercise-db o que no coinciden con el patrón.
# id -> (principal, secundarios o None para dejar los del dataset)
CORRECCIONES = {
 'Cable_Hip_Adduction': (['Aductores'], None),                      # el dataset dice cuádriceps
 'Cable_Deadlifts': (['Isquiotibiales','Glúteos'], ['Zona lumbar']),  # el dataset dice cuádriceps
 'Leverage_Deadlift': (['Isquiotibiales','Glúteos'], ['Zona lumbar','Cuádriceps']),
 'Trap_Bar_Deadlift': (['Cuádriceps','Glúteos'], ['Isquiotibiales','Zona lumbar']),
 'Standing_Dumbbell_Upright_Row': (['Hombros','Trapecios'], None),
 'Upright_Cable_Row': (['Hombros','Trapecios'], None),
 'Smith_Machine_Upright_Row': (['Hombros','Trapecios'], None),
 'Mountain_Climbers': (['Abdominales'], ['Cuádriceps','Hombros']),
 'Flutter_Kicks': (['Abdominales'], ['Glúteos']),
 'Push_Up_to_Side_Plank': (['Abdominales','Pecho'], ['Hombros','Tríceps']),
 'Bent-Arm_Barbell_Pullover': (['Pecho','Dorsales'], ['Tríceps']),
}

base = {x['id']: x for x in json.load(open(os.path.join(FDB, 'dist', 'exercises.json')))}
out = []
for (bid, nombre, patron, lumbar, medida, alias, svg) in L:
    if bid:
        x = base[bid]
        principal = [MUS[m] for m in x['primaryMuscles']]; sec = [MUS[m] for m in x['secondaryMuscles'] if m in MUS]
        equipo = EQ[x['equipment']]; nivel = NIV[x['level']]; tipo = TIPO_PATRON.get(patron, CAT[x['category']])
        mec = {'compound':'Compuesto','isolation':'Aislamiento'}.get(x['mechanic'], '')
        fotos = [f'ejercicios/fdb/{i}' for i in x['images']]; eid = bid
        if bid in CORRECCIONES:
            principal, s2 = CORRECCIONES[bid]
            if s2 is not None: sec = s2
    else:
        principal, sec, equipo = PROPIOS[nombre]; nivel = 'Principiante'; tipo = TIPO_PATRON.get(patron, 'Fuerza e hipertrofia'); mec = ''; fotos = []
        eid = 'base-' + norm(nombre).replace(' ', '-')
    if equipo == 'Máquina' and 'Smith' in nombre: equipo = 'Smith'
    sec = [m for m in sec if m not in principal]   # un músculo no cuenta a la vez como principal y secundario
    rec = {'id':eid,'nombre':nombre,'alias':sorted({norm(nombre)} | {norm(a) for a in alias}),'patron':patron,'principal':principal,'secundarios':sec,
           'equipo':equipo,'tipo':tipo,'nivel':nivel,'lumbar':lumbar,'medida':medida or ('reps' if equipo == 'Peso corporal' else 'kg+reps'),'mecanica':mec,'fotos':fotos}
    if svg: rec['ilustracion'] = 'ejercicios/' + svg
    out.append(rec)

js = ("// Biblioteca de ejercicios de la app.\n"
      "// Base: free-exercise-db (https://github.com/yuhonas/free-exercise-db), dominio público (Unlicense).\n"
      "// Nombres en español, patrón de movimiento y carga lumbar: clasificación propia, revisable.\n"
      "// Generado por herramientas/biblioteca/generar.py: no editar a mano.\n"
      "const PATRONES = " + json.dumps(PATRONES, ensure_ascii=False) + ";\n"
      "const BIBLIOTECA = [\n" + ",\n".join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in out) + "\n];\n")
open(os.path.join(RAIZ, 'biblioteca.js'), 'w').write(js)

dst = os.path.join(RAIZ, 'ejercicios', 'fdb')
if os.path.exists(dst): shutil.rmtree(dst)
for (bid, *_rest) in L:
    if not bid: continue
    for img in base[bid]['images']:
        im = Image.open(os.path.join(FDB, 'exercises', img)).convert('RGB'); im.thumbnail((600, 600))
        p = os.path.join(dst, img); os.makedirs(os.path.dirname(p), exist_ok=True)
        im.save(p, 'JPEG', quality=70, optimize=True, progressive=True)
print(len(out), 'ejercicios')
