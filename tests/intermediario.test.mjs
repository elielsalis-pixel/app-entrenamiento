// Pruebas del intermediario (herramientas/intermediario/worker.js) contra un Google de mentira. Uso: node tests/intermediario.test.mjs
import w from '../herramientas/intermediario/worker.mjs';
const llamadas=[]; globalThis.fetch=async(u,o)=>{ llamadas.push([u,String(o.body)]); const p=new URLSearchParams(String(o.body)); if(p.get('refresh_token')==='malo') return new Response(JSON.stringify({error:'invalid_grant',error_description:'Token has been expired or revoked.'}),{status:400}); return new Response(JSON.stringify({access_token:'a',expires_in:3599,scope:'s',token_type:'Bearer',id_token:'x',...(p.get('code')?{refresh_token:'r'}:{})}),{status:200}); };
const env={GOOGLE_CLIENT_SECRET:'secreto'}, O='https://elielsalis-pixel.github.io';
const pedir=async(m,origen,cuerpo,e=env)=>{ const r=await w.fetch(new Request('https://x.workers.dev/',{method:m,headers:origen?{Origin:origen,'Content-Type':'application/json'}:{},body:cuerpo}),e); return [r.status, r.status===204?null:await r.json(), r.headers.get('Access-Control-Allow-Origin')]; };
let fallas=0; const ok=(n,c)=>{ if(!c) fallas++; console.log((c?'✔ ':'✘ ')+'intermediario: '+n); };
let r=await pedir('POST',O,JSON.stringify({code:'c1'}));
ok('canjea el código', r[0]===200 && r[1].refresh_token==='r' && r[1].access_token==='a' && !('id_token' in r[1]) && r[2]===O && llamadas[0][1].includes('redirect_uri=postmessage') && llamadas[0][1].includes('client_secret=secreto') && llamadas[0][1].includes('grant_type=authorization_code'));
r=await pedir('POST',O,JSON.stringify({refresh_token:'r'}));
ok('renueva', r[0]===200 && r[1].access_token==='a' && !('refresh_token' in r[1]) && llamadas[1][1].includes('grant_type=refresh_token'));
r=await pedir('POST',O,JSON.stringify({refresh_token:'malo'}));
ok('pasa el rechazo de Google', r[0]===400 && r[1].error==='invalid_grant');
const n=llamadas.length;
r=await pedir('POST','https://otro.sitio',JSON.stringify({code:'c1'})); ok('otro origen: 403 sin llamar a Google', r[0]===403 && llamadas.length===n);
r=await pedir('POST',null,JSON.stringify({code:'c1'})); ok('sin origen: 403', r[0]===403);
r=await pedir('OPTIONS',O); ok('preflight', r[0]===204 && r[2]===O);
r=await pedir('GET',O); ok('GET: 405', r[0]===405);
r=await pedir('POST',O,'no es json'); ok('cuerpo ilegible: 400', r[0]===400 && llamadas.length===n);
r=await pedir('POST',O,JSON.stringify({code:5})); ok('pedido inválido: 400', r[0]===400 && llamadas.length===n);
r=await pedir('POST',O,JSON.stringify({code:'c'}),{}); ok('sin clave cargada: 500 y lo dice', r[0]===500 && r[1].error==='falta_configurar');
{ // Google no acepta 'postmessage' como destino: se canjea con el origen de la app
  const vistas=[]; const antes=globalThis.fetch;
  globalThis.fetch=async(u,o)=>{ const p=new URLSearchParams(String(o.body)); vistas.push(p.get('redirect_uri')); return p.get('redirect_uri')==='postmessage' ? new Response(JSON.stringify({error:'redirect_uri_mismatch'}),{status:400}) : new Response(JSON.stringify({access_token:'a',expires_in:3599,scope:'s',refresh_token:'r'}),{status:200}); };
  r=await pedir('POST',O,JSON.stringify({code:'c2'}));
  ok('si Google rechaza el primer destino del código, prueba con el origen de la app', r[0]===200 && r[1].refresh_token==='r' && vistas.join()==='postmessage,https://elielsalis-pixel.github.io');
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'redirect_uri_mismatch'}),{status:400});
  r=await pedir('POST',O,JSON.stringify({code:'c3'}));
  ok('si rechaza los dos, devuelve el rechazo', r[0]===400 && r[1].error==='redirect_uri_mismatch');
  globalThis.fetch=antes;
}
if(fallas) process.exit(1);
