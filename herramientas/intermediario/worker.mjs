// Intermediario de acceso de la app Entreno (Cloudflare Worker "entreno-acceso").
//
// Para qué: que Google no abra su ventana cada hora. La app le pide a Google un permiso duradero y este Worker
// lo canjea y lo renueva, porque para eso Google exige la clave secreta de la app y esa clave no puede ir en el celular.
//
// No guarda nada: ni datos de usuarios ni permisos. Recibe un pedido, le agrega la clave, se lo pasa a Google y devuelve la respuesta.
// La clave secreta se carga en Cloudflare como secreto del Worker con el nombre GOOGLE_CLIENT_SECRET (nunca va en este archivo).
//
// Pedidos (POST con JSON, solo desde la app publicada):
//   {code}           -> primera vez: canjea el código que dio la ventana de Google. Devuelve {access_token, expires_in, refresh_token, scope}
//   {refresh_token}  -> renovación silenciosa. Devuelve {access_token, expires_in, scope}
// Si Google rechaza el pedido, se devuelve su mismo código de estado con {error, error_description}.

const ORIGEN_APP = 'https://elielsalis-pixel.github.io';
const CLIENT_ID = '739404554059-2elvpkvd25oaj1e69ufm1nmsr8sbkde6.apps.googleusercontent.com';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const CORS = {
  'Access-Control-Allow-Origin': ORIGEN_APP,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

function responder(cuerpo, estado){
  return new Response(JSON.stringify(cuerpo), {status: estado, headers: {...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
}

// Con qué "redirect_uri" se canjea el código de la ventana emergente. La práctica extendida es 'postmessage'; la guía de Google
// dice que es el origen de la página. Se prueba en ese orden: si Google rechaza el primero por no coincidir, se usa el segundo.
const DESTINOS_DEL_CODIGO = ['postmessage', ORIGEN_APP];

// qué se le pide a Google según lo que mandó la app (una lista: se usa el primer pedido que Google no rechace por el destino);
// null si el pedido no es ninguno de los dos
function pedidosAGoogle(datos){
  if(datos && typeof datos.code === 'string' && datos.code) return DESTINOS_DEL_CODIGO.map(d=>({grant_type: 'authorization_code', code: datos.code, redirect_uri: d}));
  if(datos && typeof datos.refresh_token === 'string' && datos.refresh_token) return [{grant_type: 'refresh_token', refresh_token: datos.refresh_token}];
  return null;
}
async function pedirAGoogle(pedido, clave){
  const google = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({...pedido, client_id: CLIENT_ID, client_secret: clave})
  });
  return {ok: google.ok, estado: google.status, r: await google.json().catch(()=>({error: 'respuesta_ilegible'}))};
}

export default {
  async fetch(request, env){
    if(request.headers.get('Origin') !== ORIGEN_APP) return responder({error: 'origen_no_permitido'}, 403);
    if(request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
    if(request.method !== 'POST') return responder({error: 'metodo_no_permitido'}, 405);
    if(!env.GOOGLE_CLIENT_SECRET) return responder({error: 'falta_configurar', error_description: 'Falta cargar GOOGLE_CLIENT_SECRET en el Worker.'}, 500);

    const pedidos = pedidosAGoogle(await request.json().catch(()=>null));
    if(!pedidos) return responder({error: 'pedido_invalido'}, 400);

    let g;
    for(const pedido of pedidos){
      g = await pedirAGoogle(pedido, env.GOOGLE_CLIENT_SECRET);
      if(g.ok || g.r.error !== 'redirect_uri_mismatch') break;
    }
    const r = g.r;
    if(!g.ok) return responder({error: r.error || 'google_rechazo', error_description: r.error_description || ''}, g.estado);
    return responder({access_token: r.access_token, expires_in: r.expires_in, scope: r.scope, ...(r.refresh_token ? {refresh_token: r.refresh_token} : {})}, 200);
  }
};
