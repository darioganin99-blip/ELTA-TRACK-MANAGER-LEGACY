const firebaseConfig={apiKey:"AIzaSyDFk_mPN0r_LLHhS3HeQ2yfbfvHZJ2h2mU",authDomain:"elta-track-pod.firebaseapp.com",projectId:"elta-track-pod",storageBucket:"elta-track-pod.firebasestorage.app",messagingSenderId:"993768926683",appId:"1:993768926683:web:8a14e6af8706154a96cbfe",measurementId:"G-9FSMKJ8KL0"};
let db,trs=[],users=[],clientes=[],origenes=[],destinos=[],embarques=[],abmCol="usuarios";
function init(){if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);db=firebase.firestore()}
function q(id){return document.getElementById(id)}
function esc(v){return String(v??"").replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}
function togglePass(){let p=q("pass");p.type=p.type==="password"?"text":"password"}
function tv(v){try{let d=v?.toDate?v.toDate():(v?.seconds?new Date(v.seconds*1000):new Date(v));return d&&!isNaN(d.getTime())?d.getTime():0}catch(e){return 0}}
function fd(v){let n=tv(v);return n?new Date(n).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"-"}
function openT(t){let e=String(t.estado||"").toLowerCase();if(t.closed&&String(t.closed).toLowerCase()!=="null")return false;return e==="abierto"||t.closed==null}
function flota(t){return String(t?.user?.fleet||t.flota||"").trim()}
function ruta(t){return t.route||{}}
function lastU(t){let a=(t.updates||[]).slice();a.sort((x,y)=>tv(y.time||y.fecha||y.createdAt||y.ts)-tv(x.time||x.fecha||x.createdAt||x.ts));return a[0]||null}
function loc(t){let u=lastU(t),o=u?.gps||u?.ultimaPosicion||t.ultimaPosicion||u||{};return o.ubicacionTexto||o.ubicacion||o.localidad||o.city||o.ciudad||o.address||"-"}
function alertT(t){let a=(t.alerts||[]).slice();if(!a.length)return"-";a.sort((x,y)=>tv(y.time||y.fecha)-tv(x.time||x.fecha));return a[0].tipo||a[0].type||a[0].motivo||"Alerta"}


function countBy(arr, getter){
  let out={};
  arr.forEach(x=>{
    let k=String(getter(x)||"-").trim()||"-";
    out[k]=(out[k]||0)+1;
  });
  return out;
}
function renderBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin datos.</div>';
    return;
  }
  el.innerHTML=entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="chartRow">
      <div class="chartLabel" title="${esc(k)}">${esc(k)}</div>
      <div class="chartValue">${v}</div>
      <div class="chartPct">${pct}%</div>
      <div class="barTrack"><div class="barFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}
function renderEstadoChart(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="stateChartSummary">
    <div class="stateBox open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="stateBox closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="chartRow">
    <div class="chartLabel">En tránsito</div><div class="chartValue">${abiertos}</div><div class="chartPct">${pOpen}%</div>
    <div class="barTrack"><div class="barFill" style="width:${pOpen}%"></div></div>
  </div>
  <div class="chartRow">
    <div class="chartLabel">Finalizado</div><div class="chartValue">${cerrados}</div><div class="chartPct">${pClosed}%</div>
    <div class="barTrack"><div class="barFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#64748b)"></div></div>
  </div>`;
}


function palette(i){
  return ["#4cc63f","#1e88e5","#facc15","#ef4444","#8b5cf6","#14b8a6","#f97316","#94a3b8"][i%8];
}
function renderPieChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  let acc=0;
  let stops=entries.map(([k,v],i)=>{
    let start=acc;
    let pct=(v/total)*100;
    acc+=pct;
    return `${palette(i)} ${start}% ${acc}%`;
  }).join(",");
  el.innerHTML=`<div class="pieChartBlock">
    <div class="pieChart" style="background:conic-gradient(${stops})">
      <div class="pieCenter"><b>${total}</b><small>Total</small></div>
    </div>
    <div class="pieLegend">
      ${entries.map(([k,v],i)=>{
        let pct=Math.round((v/total)*100);
        return `<div class="pieLegendRow">
          <span class="swatch" style="background:${palette(i)}"></span>
          <span class="name" title="${esc(k)}">${esc(k)}</span>
          <span class="val">${v}</span>
          <span class="pct">${pct}%</span>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}
function renderEstadoPie(abiertos,cerrados,total){
  renderPieChart("chartEstado", {"En tránsito":abiertos,"Finalizado":cerrados}, 2);
}

async function login(){
  try{
    init();
    let u=q("user").value.trim(),p=q("pass").value.trim();
    let d=await db.collection("usuarios").doc(u).get();
    if(!d.exists)return q("msg").innerText="Usuario no existe";
    let x=d.data(),r=String(x.role||"").toLowerCase();
    if(x.pass!==p)return q("msg").innerText="PASS incorrecto";
    if(!["admin","trafico","coordinador"].includes(r))return q("msg").innerText="Sin permiso Admin";
    q("login").classList.remove("active");
    q("app").classList.add("active");
    await refresh();
  }catch(e){console.log(e);q("msg").innerText="Error Firebase / configuración"}
}
function salir(){q("app").classList.remove("active");q("login").classList.add("active")}
function toggleSidebar(){document.body.classList.toggle("sidebarCollapsed")}

function tab(id){
  document.querySelectorAll(".sideNav button").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  [...document.querySelectorAll(".sideNav button")].find(b=>b.getAttribute("onclick")?.includes(id))?.classList.add("active");
  q(id)?.classList.add("active");
  if(id==="abm")renderABM();
  if(id==="reportes")renderRep();
  if(id==="unidades")renderUnits();
  if(id==="conductores")renderDrivers();
  if(id==="clientes")renderClients();
  if(id==="alertas")renderAlerts();
}

async function read(c){let s=await db.collection(c).get();return s.docs.map(d=>({...d.data(),id:d.id,_docId:d.id}))}
async function refresh(){
  [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
    read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
  ]);
  renderDash();renderTransitos();renderMapa();renderRep();renderUnits();renderDrivers();renderClients();renderAlerts();
}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"}">
    <div class="top"><span>🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</span><span class="badge ${o?"":"closed"}">${o?"En tránsito":"Finalizado"}</span></div>
    <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
    <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
    <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
    <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
    <div><b>Inicio:</b> ${fd(t.start?.time||t.start)} | <b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
    <div><b>Últ. posición:</b> ${esc(loc(t))}</div>
    <div><b>Últ. alerta:</b> ${esc(alertT(t))}</div>
  </div>`;
}

function renderDash(){
  let abiertos=trs.filter(openT), cerrados=trs.filter(t=>!openT(t));
  let totalAlerts=trs.reduce((n,t)=>n+(t.alerts||[]).length,0);
  if(q("ka"))q("ka").innerText=abiertos.length;
  if(q("kc"))q("kc").innerText=cerrados.length;
  if(q("kal"))q("kal").innerText=totalAlerts;
  if(q("headerAlertCount"))q("headerAlertCount").innerText=totalAlerts;
  if(q("kf"))q("kf").innerText=users.filter(u=>String(u.role||"").toLowerCase()==="flota").length || new Set(trs.map(flota).filter(Boolean)).size;

  renderEstadoPie(abiertos.length,cerrados.length,trs.length);
  renderPieChart("chartCliente", countBy(trs,t=>ruta(t).cliente), 4);
  renderPieChart("chartOrigen", countBy(trs,t=>ruta(t).origen), 4);
  renderPieChart("chartDestino", countBy(trs,t=>ruta(t).destino), 4);

  if(q("donutTotal"))q("donutTotal").innerText=trs.length;
  if(q("legOpen"))q("legOpen").innerText=abiertos.length;
  if(q("legWait"))q("legWait").innerText=Math.max(0, trs.length-abiertos.length-cerrados.length);
  if(q("legAlert"))q("legAlert").innerText=totalAlerts;
  if(q("legClosed"))q("legClosed").innerText=cerrados.length;

  renderDashTable();
  renderDashAlerts();
}

function renderDashTable(){
  if(!trs.length){if(q("dashTable")){q("dashTable").classList.add("emptyTable");q("dashTable").innerHTML="Sin información de tránsitos.";}return;}else{q("dashTable")?.classList.remove("emptyTable")}
  let rows=trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,10);
  q("dashTable").innerHTML=`<table>
    <thead><tr><th>Embarque</th><th>Cliente</th><th>Origen</th><th>Destino</th><th>Flota</th><th>Estado</th><th>Actualizado</th></tr></thead>
    <tbody>${rows.map(t=>{
      let r=ruta(t),o=openT(t);
      return `<tr><td>${esc(t.embarque||"-")}</td><td>${esc(r.cliente||"-")}</td><td>${esc(r.origen||"-")}</td><td>${esc(r.destino||"-")}</td><td>${esc(flota(t)||"-")}</td><td><span class="statusBadge ${o?"open":"closed"}">${o?"En tránsito":"Finalizado"}</span></td><td>${fd((lastU(t)||{}).time||t.start?.time||t.start)}</td></tr>`;
    }).join("")}</tbody></table>`;
}

function renderDashAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha)-tv(x.a.time||x.a.fecha));
  if(!alerts.length){q("dashAlerts").innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';return;}
  q("dashAlerts").innerHTML=(alerts.slice(0,3).map(x=>`<div class="alertLine">• ${esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta")} - Flota ${esc(flota(x.t)||"-")} - Emb. ${esc(x.t.embarque||"-")}</div>`).join(""))||'<div class="alertLine">Sin alertas activas.</div>';
}

function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"",f=q("fFlo")?.value.toLowerCase()||"",c=q("fCli")?.value.toLowerCase()||"",s=q("fEst")?.value||"";
  return(!e||String(t.embarque||"").toLowerCase().includes(e))&&(!f||flota(t).toLowerCase().includes(f))&&(!c||String(ruta(t).cliente||"").toLowerCase().includes(c))&&(!s||(s==="abierto"?openT(t):!openT(t)));
}
function renderTransitos(){q("transList").innerHTML=trs.filter(filt).map(card).join("")||'<div class="item">Sin resultados.</div>'}
function renderMapa(){q("mapList").innerHTML=trs.filter(openT).map(t=>`<div class="item open"><div class="top"><span>🚚 Flota ${esc(flota(t)||"-")}</span><span class="badge">GPS</span></div><div><b>Ubicación:</b> ${esc(loc(t))}</div><div><b>Cliente:</b> ${esc(ruta(t).cliente||"-")} | <b>Emb.:</b> ${esc(t.embarque||"-")}</div></div>`).join("")||'<div class="item">No hay flotas activas.</div>'}

function renderUnits(){
  let flotas=[...new Set(trs.map(flota).filter(Boolean))];
  q("unitList").innerHTML=flotas.map(f=>`<div class="item"><div class="top"><span>🚛 Unidad / Flota ${esc(f)}</span><span class="badge">Activa</span></div><div>Tránsitos asociados: ${trs.filter(t=>flota(t)===f).length}</div></div>`).join("")||'<div class="item">Sin unidades registradas.</div>';
}
function renderDrivers(){
  let data=users.filter(u=>String(u.role||"").toLowerCase()==="flota"||u.flota||u.user);
  q("driverList").innerHTML=data.map(u=>`<div class="item"><div class="top"><span>👤 ${esc(u.user||u.id||"-")}</span><span class="badge">Usuario</span></div><div>Flota: ${esc(u.flota||u.fleet||"-")}</div><div>Teléfono: ${esc(u.telefono||"-")}</div></div>`).join("")||'<div class="item">Sin conductores cargados.</div>';
}
function renderClients(){
  q("clientList").innerHTML=clientes.map(c=>`<div class="item"><div class="top"><span>🏢 ${esc(c.id||c.nombre||"-")}</span><span class="badge ${c.activo===false?"closed":""}">${c.activo===false?"Inactivo":"Activo"}</span></div><small>${esc(JSON.stringify(c))}</small></div>`).join("")||'<div class="item">Sin clientes cargados.</div>';
}
function renderAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha)-tv(x.a.time||x.a.fecha));
  q("alertList").innerHTML=alerts.map(x=>`<div class="item"><div class="top"><span>⚠️ ${esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta")}</span><span class="badge">Emb. ${esc(x.t.embarque||"-")}</span></div><div>Flota: ${esc(flota(x.t)||"-")}</div><div>Fecha: ${fd(x.a.time||x.a.fecha)}</div></div>`).join("")||'<div class="item">Sin alertas registradas.</div>';
}

function abm(c){abmCol=c;renderABM()}
function renderABM(){
  let sch={usuarios:["id","flota","user","telefono","pass","role","activo"],clientes:["id","activo"],origenes:["id","pais","ubicacion","activo"],destinos:["id","pais","ubicacion","activo"],embarque:["id","cliente","origen","destino","cuit","factura","nic","volumen","activo"]},
  data={usuarios:users,clientes,origenes,destinos,embarque:embarques}[abmCol]||[];
  q("abmForm").innerHTML=sch[abmCol].map(f=>f==="activo"?`<select id="abm_${f}"><option value="true">activo true</option><option value="false">activo false</option></select>`:`<input id="abm_${f}" placeholder="${f}">`).join("")+`<button onclick="saveABM()">Guardar</button>`;
  q("abmList").innerHTML=data.map(x=>`<div class="item"><div class="top"><span>${esc(x.id||"-")}</span><span class="badge ${x.activo===false?"closed":""}">${x.activo===false?"Inactivo":"Activo"}</span></div><small>${esc(JSON.stringify(x))}</small></div>`).join("")||'<div class="item">Sin datos.</div>';
}
async function saveABM(){
  let data={},id="";
  document.querySelectorAll("#abmForm input,#abmForm select").forEach(e=>{let k=e.id.replace("abm_",""),v=e.value.trim();if(k==="id")id=v;else data[k]=k==="activo"?v==="true":v});
  if(!id)return alert("Debe indicar id/documento");
  await db.collection(abmCol).doc(id).set(data,{merge:true});
  await refresh();
}
function renderRep(){
  let by={};trs.forEach(t=>by[flota(t)||"-"]=(by[flota(t)||"-"]||0)+1);
  q("rep").innerHTML=`<div class="item"><b>Abiertos:</b> ${trs.filter(openT).length}</div><div class="item"><b>Cerrados:</b> ${trs.filter(t=>!openT(t)).length}</div><div class="item"><b>Por flota:</b><br>${Object.entries(by).map(([k,v])=>`${esc(k)}: ${v}`).join("<br>")}</div>`;
}
function copyRep(){navigator.clipboard?.writeText(q("rep").innerText);alert("Reporte copiado")}
document.addEventListener("DOMContentLoaded",()=>{try{init()}catch(e){}})




/* ===== V1.2.40 overrides ===== */

function uniq(arr){
  return [...new Set(arr.map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
}
function fillSelect(id, values, label){
  let el=q(id);
  if(!el)return;
  let current=el.value;
  el.innerHTML=`<option value="">${label}</option>`+uniq(values).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if([...el.options].some(o=>o.value===current))el.value=current;
}
function refreshFilters(){
  fillSelect("fFlo", trs.map(flota), "Todas las flotas");
  fillSelect("fCli", trs.map(t=>ruta(t).cliente), "Todos los clientes");
}
function valFrom(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;
  }
  return "";
}
function locFull(t){
  let u=lastU(t)||{};
  let gps=u.gps||u.ultimaPosicion||t.ultimaPosicion||t.lastPosition||t.posicion||u||{};
  let direct=valFrom(gps,["ubicacionTexto","ubicacion","localidadProvincia","address","direccion","formatted_address"]);
  if(direct)return direct;
  let locTxt=[valFrom(gps,["localidad","city","ciudad","municipio","partido"]), valFrom(gps,["provincia","state","region"])].filter(Boolean).join(", ");
  if(locTxt)return locTxt;
  let lat=valFrom(gps,["lat","latitude","latitud"]);
  let lng=valFrom(gps,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  return "-";
}
function loc(t){return locFull(t)}
function alertLoc(a,t){
  let gps=a.gps||a.ubicacion||a.posicion||a.location||{};
  let direct=valFrom(a,["localidad","ubicacionTexto","ubicacion","lugar","zona","city","ciudad"])||valFrom(gps,["localidad","ubicacionTexto","ubicacion","city","ciudad"]);
  return direct||locFull(t);
}
function alertKm(a){
  return valFrom(a,["km","kilometro","kilómetro","kmRuta","progresiva"])||"-";
}
function alertDate(a){
  return fd(a.time||a.fecha||a.createdAt||a.ts);
}
function collectAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  return alerts;
}

async function refresh(){
  [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
    read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
  ]);
  refreshFilters();
  renderDash();renderTransitos();renderMapa();renderRep();renderUnits();renderDrivers();renderClients();renderAlerts();
}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"}">
    <div class="top"><span>🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</span><span class="badge ${o?"":"closed"}">${o?"En tránsito":"Finalizado"}</span></div>
    <div class="metaGrid">
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
      <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
      <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
      <div class="fullLine"><b>Últ. posición:</b> ${esc(locFull(t))}</div>
      <div class="fullLine"><b>Últ. alerta:</b> ${esc(alertT(t))}</div>
    </div>
  </div>`;
}

function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"",f=q("fFlo")?.value||"",c=q("fCli")?.value||"",s=q("fEst")?.value||"";
  return(!e||String(t.embarque||"").toLowerCase().includes(e))&&(!f||flota(t)===f)&&(!c||String(ruta(t).cliente||"")===c)&&(!s||(s==="abierto"?openT(t):!openT(t)));
}

function renderDashAlerts(){
  let alerts=collectAlerts();
  if(!alerts.length){q("dashAlerts").innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';return;}
  q("dashAlerts").innerHTML=`<div class="alertListCompact">`+alerts.map(x=>{
    let tipo=esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta");
    return `<div class="alertCard">
      <div class="alertTop"><span>⚠️ ${tipo}</span><span>${alertDate(x.a)}</span></div>
      <div class="alertInfo">
        <div><b>Emb.:</b> ${esc(x.t.embarque||"-")}</div>
        <div><b>Flota:</b> ${esc(flota(x.t)||"-")}</div>
        <div><b>Km:</b> ${esc(alertKm(x.a))}</div>
        <div><b>Estado:</b> ${openT(x.t)?"En tránsito":"Finalizado"}</div>
        <div class="fullLine"><b>Localidad:</b> ${esc(alertLoc(x.a,x.t))}</div>
      </div>
    </div>`;
  }).join("")+`</div>`;
}

function renderAlerts(){
  let alerts=collectAlerts();
  q("alertList").innerHTML=alerts.map(x=>`<div class="item">
    <div class="top"><span>⚠️ ${esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta")}</span><span class="badge">Emb. ${esc(x.t.embarque||"-")}</span></div>
    <div class="metaGrid">
      <div><b>Flota:</b> ${esc(flota(x.t)||"-")}</div>
      <div><b>Km:</b> ${esc(alertKm(x.a))}</div>
      <div><b>Fecha/Hora:</b> ${alertDate(x.a)}</div>
      <div><b>Estado:</b> ${openT(x.t)?"En tránsito":"Finalizado"}</div>
      <div class="fullLine"><b>Localidad:</b> ${esc(alertLoc(x.a,x.t))}</div>
    </div>
  </div>`).join("")||'<div class="item">Sin alertas registradas.</div>';
}




/* ===== V1.2.40 - Graficos barra compactos ===== */

function renderCompactBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  el.innerHTML=`<div class="barChartBlock">`+entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="barChartItem">
      <div class="barChartName" title="${esc(k)}">${esc(k)}</div>
      <div class="barChartVal">${v}</div>
      <div class="barChartPct">${pct}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("")+`</div>`;
}

function renderEstadoPie(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="estadoSummary">
    <div class="estadoMini open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="estadoMini closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="barChartBlock">
    <div class="barChartItem">
      <div class="barChartName">En tránsito</div>
      <div class="barChartVal">${abiertos}</div>
      <div class="barChartPct">${pOpen}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pOpen}%"></div></div>
    </div>
    <div class="barChartItem">
      <div class="barChartName">Finalizado</div>
      <div class="barChartVal">${cerrados}</div>
      <div class="barChartPct">${pClosed}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#55b8ff)"></div></div>
    </div>
  </div>`;
}

function renderPieChart(id,data,limit=4){
  renderCompactBarChart(id,data,limit);
}


/* ===== V1.2.40 - Reaseguro gráficos barra compactos ===== */

function renderCompactBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  el.innerHTML=`<div class="barChartBlock">`+entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="barChartItem">
      <div class="barChartName" title="${esc(k)}">${esc(k)}</div>
      <div class="barChartVal">${v}</div>
      <div class="barChartPct">${pct}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("")+`</div>`;
}

function renderEstadoPie(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="estadoSummary">
    <div class="estadoMini open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="estadoMini closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="barChartBlock">
    <div class="barChartItem">
      <div class="barChartName">En tránsito</div>
      <div class="barChartVal">${abiertos}</div>
      <div class="barChartPct">${pOpen}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pOpen}%"></div></div>
    </div>
    <div class="barChartItem">
      <div class="barChartName">Finalizado</div>
      <div class="barChartVal">${cerrados}</div>
      <div class="barChartPct">${pClosed}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#55b8ff)"></div></div>
    </div>
  </div>`;
}

function renderPieChart(id,data,limit=4){
  renderCompactBarChart(id,data,limit);
}


/* ===== V1.2.40 - Torre de Control 4 gráficos + últimas alertas compactas ===== */

function renderCompactBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  el.innerHTML=`<div class="barChartBlock">`+entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="barChartItem">
      <div class="barChartName" title="${esc(k)}">${esc(k)}</div>
      <div class="barChartVal">${v}</div>
      <div class="barChartPct">${pct}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("")+`</div>`;
}

function renderEstadoPie(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="estadoSummary">
    <div class="estadoMini open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="estadoMini closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="barChartBlock">
    <div class="barChartItem">
      <div class="barChartName">En tránsito</div>
      <div class="barChartVal">${abiertos}</div>
      <div class="barChartPct">${pOpen}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pOpen}%"></div></div>
    </div>
    <div class="barChartItem">
      <div class="barChartName">Finalizado</div>
      <div class="barChartVal">${cerrados}</div>
      <div class="barChartPct">${pClosed}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#55b8ff)"></div></div>
    </div>
  </div>`;
}

function renderPieChart(id,data,limit=4){
  renderCompactBarChart(id,data,limit);
}

function renderDashAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  if(!q("dashAlerts"))return;
  if(!alerts.length){
    q("dashAlerts").innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';
    return;
  }
  q("dashAlerts").innerHTML=alerts.slice(0,3).map(x=>{
    let tipo=esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta");
    let emb=esc(x.t.embarque||"-");
    let flo=esc(flota(x.t)||"-");
    let fecha=fd(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts);
    return `<div class="alertLine">• ${tipo} · Emb. ${emb} · Flota ${flo} · ${fecha}</div>`;
  }).join("");
}




/* ===== V1.2.40 - SOLO vista Tránsitos: tarjeta como imagen ===== */

function valFrom(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;
  }
  return "";
}
function driverName(t){
  return valFrom(t,["chofer","driver","conductor","nombreChofer"])||
         valFrom(t.user||{},["name","nombre","chofer","driver","user"])||
         valFrom(lastU(t)||{},["chofer","driver","conductor"])||
         "-";
}
function locFull(t){
  let u=lastU(t)||{};
  let sources=[u.gps,u.ultimaPosicion,u.position,u.location,u.posicion,t.ultimaPosicion,t.lastPosition,t.position,t.location,t.posicion,u].filter(Boolean);
  for(let gps of sources){
    let direct=valFrom(gps,["ubicacionTexto","ubicacion","localidadProvincia","address","direccion","formatted_address"]);
    if(direct)return direct;
    let locTxt=[valFrom(gps,["localidad","city","ciudad","municipio","partido"]), valFrom(gps,["provincia","state","region"])].filter(Boolean).join(", ");
    if(locTxt)return locTxt;
    let lat=valFrom(gps,["lat","latitude","latitud"]);
    let lng=valFrom(gps,["lng","lon","longitude","longitud"]);
    if(lat&&lng)return `${lat}, ${lng}`;
  }
  return "-";
}
function loc(t){return locFull(t)}
function alertLoc(a,t){
  let gps=a.gps||a.ubicacion||a.posicion||a.location||{};
  return valFrom(a,["localidad","ubicacionTexto","ubicacion","lugar","zona","city","ciudad"])||
         valFrom(gps,["localidad","ubicacionTexto","ubicacion","city","ciudad"])||
         locFull(t);
}
function alertKm(a){
  return valFrom(a,["km","kilometro","kilómetro","kmRuta","progresiva"])||"-";
}
function alertDate(a){
  return fd(a.time||a.fecha||a.createdAt||a.ts);
}
function transitAlertsCompact(t){
  let arr=(t.alerts||[]).slice();
  arr.sort((a,b)=>tv(b.time||b.fecha||b.createdAt||b.ts)-tv(a.time||a.fecha||a.createdAt||a.ts));
  if(!arr.length)return '<div class="noAlerts">Sin alertas registradas.</div>';
  return `<div class="transitAlertsBox">`+arr.map(a=>{
    let tipo=esc(a.tipo||a.type||a.motivo||"Alerta");
    return `<div class="transitAlertCard">
      <div class="transitAlertTop"><span>⚠️ ${tipo}</span><span>${alertDate(a)}</span></div>
      <div class="transitAlertGrid">
        <div><b>Km:</b> ${esc(alertKm(a))}</div>
        <div><b>Hora:</b> ${alertDate(a)}</div>
        <div class="fullLine"><b>Localidad:</b> ${esc(alertLoc(a,t))}</div>
      </div>
    </div>`;
  }).join("")+`</div>`;
}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"} transitCardV1210">
    <div class="transitLeft">
      <div class="transitTop">
        <div class="transitTitle">🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</div>
        <span class="transitBadge ${o?"open":""}">${o?"Abierto":"Finalizado"}</span>
      </div>
      <div class="transitDataGrid">
        <div><b>Chofer:</b> ${esc(driverName(t))}</div>
        <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
        <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
        <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
        <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
        <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
        <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
        <div class="fullLine"><b>Últ. posición:</b> ${esc(locFull(t))}</div>
      </div>
    </div>
    <div class="transitRight">
      <h4 class="alertsTitle">⚠️ Alertas</h4>
      ${transitAlertsCompact(t)}
    </div>
  </div>`;
}




/* ===== V1.2.40 - Localidad/provincia desde coordenadas conocidas ===== */
function parseCoordPair(txt){
  let s=String(txt||"");
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if(!m)return null;
  return {lat:parseFloat(m[1]), lng:parseFloat(m[2])};
}
function distKm(a,b){
  let R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  let la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
  let x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function coordToLocalidadProvincia(lat,lng){
  let p={lat:Number(lat),lng:Number(lng)};
  if(!isFinite(p.lat)||!isFinite(p.lng))return "";
  let refs=[
    {lat:-34.3512317,lng:-58.8042567,name:"Belén de Escobar, Buenos Aires"},
    {lat:-34.6160377,lng:-58.4588818,name:"Caballito, CABA"},
    {lat:-34.6171148,lng:-58.4583581,name:"Caballito, CABA"},
    {lat:-34.0910132,lng:-59.0895417,name:"Zárate, Buenos Aires"},
    {lat:-34.603722,lng:-58.381592,name:"Ciudad Autónoma de Buenos Aires, CABA"},
    {lat:-34.095,lng:-59.024,name:"Campana, Buenos Aires"},
    {lat:-34.436,lng:-58.706,name:"Tigre, Buenos Aires"},
    {lat:-34.470,lng:-58.528,name:"San Fernando, Buenos Aires"},
    {lat:-34.522,lng:-58.700,name:"Malvinas Argentinas, Buenos Aires"},
    {lat:-34.686,lng:-58.563,name:"La Matanza, Buenos Aires"},
    {lat:-34.921,lng:-57.954,name:"La Plata, Buenos Aires"},
    {lat:-32.946,lng:-60.639,name:"Rosario, Santa Fe"},
    {lat:-31.420,lng:-64.188,name:"Córdoba, Córdoba"},
    {lat:-41.133,lng:-71.310,name:"San Carlos de Bariloche, Río Negro"}
  ];
  let best=refs.map(r=>({name:r.name,d:distKm(p,r)})).sort((a,b)=>a.d-b.d)[0];
  if(best&&best.d<=35)return best.name;
  return `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
}
function localidadFromObj(obj){
  if(!obj)return "";
  let direct=valFrom(obj,["localidadProvincia","ubicacionTexto","localidadTexto","ciudadProvincia"]);
  if(direct)return direct;
  let loc=[valFrom(obj,["localidad","city","ciudad","municipio","partido"]), valFrom(obj,["provincia","state","region"])].filter(Boolean).join(", ");
  if(loc)return loc;
  let lat=valFrom(obj,["lat","latitude","latitud"]);
  let lng=valFrom(obj,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return coordToLocalidadProvincia(lat,lng);
  let coord=valFrom(obj,["ubicacion","address","direccion","formatted_address"]);
  let pair=parseCoordPair(coord);
  if(pair)return coordToLocalidadProvincia(pair.lat,pair.lng);
  return coord||"";
}
function locFull(t){
  let u=lastU(t)||{};
  let sources=[u.gps,u.ultimaPosicion,u.position,u.location,u.posicion,t.ultimaPosicion,t.lastPosition,t.position,t.location,t.posicion,u].filter(Boolean);
  for(let src of sources){
    let v=localidadFromObj(src);
    if(v)return v;
  }
  return "-";
}
function loc(t){return locFull(t)}
function alertLoc(a,t){
  let sources=[a,a.gps,a.ubicacion,a.posicion,a.location].filter(Boolean);
  for(let src of sources){
    let v=localidadFromObj(src);
    if(v)return v;
  }
  return locFull(t);
}
function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"} transitCardV1210">
    <div class="transitLeft">
      <div class="transitTop">
        <div class="transitTitle">🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</div>
        <span class="transitBadge ${o?"open":""}">${o?"Abierto":"Finalizado"}</span>
      </div>
      <div class="transitDataGrid">
        <div><b>Chofer:</b> ${esc(driverName(t))}</div>
        <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
        <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
        <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
        <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
        <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
        <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
        <div class="fullLine"><b>Últ. posición:</b> ${esc(locFull(t))}</div>
      </div>
    </div>
    <div class="transitRight">
      <h4 class="alertsTitle">⚠️ Alertas</h4>
      ${transitAlertsCompact(t)}
    </div>
  </div>`;
}



/* ===== V1.2.40 - SOLO vista Seguimiento: mapa real GPS ===== */
let seguimientoMap=null;
let seguimientoMarkers=[];

function getPosObj(t){
  let u=lastU(t)||{};
  let sources=[u.gps,u.ultimaPosicion,u.position,u.location,u.posicion,t.ultimaPosicion,t.lastPosition,t.position,t.location,t.posicion,u].filter(Boolean);
  for(let s of sources){
    let lat=valFrom(s,["lat","latitude","latitud"]);
    let lng=valFrom(s,["lng","lon","longitude","longitud"]);
    if(lat&&lng&&!isNaN(Number(lat))&&!isNaN(Number(lng)))return {lat:Number(lat),lng:Number(lng),src:s};
    let coord=valFrom(s,["ubicacion","address","direccion","formatted_address"]);
    let pair=parseCoordPair(coord);
    if(pair)return {lat:pair.lat,lng:pair.lng,src:s};
  }
  return null;
}
function trackingAlertsHtml(t){
  let arr=(t.alerts||[]).slice();
  arr.sort((a,b)=>tv(b.time||b.fecha||b.createdAt||b.ts)-tv(a.time||a.fecha||a.createdAt||a.ts));
  if(!arr.length)return '<div class="trackingAlertItem">Sin alertas registradas.</div>';
  return arr.map(a=>{
    let tipo=esc(a.tipo||a.type||a.motivo||"Alerta");
    return `<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${tipo}</span><span>${alertDate(a)}</span></div><div><b>Localidad:</b> ${esc(alertLoc(a,t))}</div><div><b>Km:</b> ${esc(alertKm(a))}</div></div>`;
  }).join("");
}
function trackingCard(t){
  let o=openT(t),r=ruta(t),pos=getPosObj(t);
  return `<div class="trackingCard"><div class="trackingCardTop"><div class="trackingFleetTitle">🚚 Flota ${esc(flota(t)||"-")}</div><span class="trackingState ${o?"":"closed"}">${o?"Abierto":"Finalizado"}</span></div><div class="trackingData"><div><b>Emb.:</b> ${esc(t.embarque||"-")}</div><div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div><div class="fullLine"><b>Ubicación:</b> ${esc(locFull(t))}</div><div><b>Cliente:</b> ${esc(r.cliente||"-")}</div><div><b>Destino:</b> ${esc(r.destino||"-")}</div><div><b>Últ. reporte:</b> ${fd((lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt)}</div><div><b>Coordenadas:</b> ${pos?`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`:"-"}</div></div><div class="trackingAlerts"><h4>⚠️ Alertas del tránsito</h4>${trackingAlertsHtml(t)}</div></div>`;
}
function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;
  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);
  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{zoomControl:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(seguimientoMap);
  }
  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];
  if(!withPos.length){seguimientoMap.setView([-34.6037,-58.3816],8);setTimeout(()=>seguimientoMap.invalidateSize(),150);return;}
  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({className:"eltaTruckMarker",html:"🚚",iconSize:[28,28],iconAnchor:[14,14]});
    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup"><b>Flota ${esc(flota(t)||"-")}</b><br>Emb.: ${esc(t.embarque||"-")}<br>Ubicación: ${esc(locFull(t))}<br>Cliente: ${esc(ruta(t).cliente||"-")}<br>Estado: ${openT(t)?"Abierto":"Finalizado"}</div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });
  if(bounds.length===1)seguimientoMap.setView(bounds[0],12); else seguimientoMap.fitBounds(bounds,{padding:[35,35]});
  setTimeout(()=>seguimientoMap.invalidateSize(),150);
}
function renderMapa(){
  let items=trs.filter(openT);
  if(!items.length)items=trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}



/* ===== V1.2.40 - Seguimiento: fix mapa y localidad/provincia ===== */
function trackingCard(t){
  let o=openT(t),r=ruta(t),pos=getPosObj(t);
  return `<div class="trackingCard">
    <div class="trackingCardTop">
      <div class="trackingFleetTitle">🚚 Flota ${esc(flota(t)||"-")}</div>
      <span class="trackingState ${o?"":"closed"}">${o?"Abierto":"Finalizado"}</span>
    </div>
    <div class="trackingData">
      <div><b>Emb.:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div class="locationLine"><b>Ubicación:</b> ${esc(locFull(t))}</div>
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div><b>Últ. reporte:</b> ${fd((lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt)}</div>
      <div class="coordLine"><b>Coordenadas:</b> ${pos?`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`:"-"}</div>
    </div>
    <div class="trackingAlerts">
      <h4>⚠️ Alertas del tránsito</h4>
      ${trackingAlertsHtml(t)}
    </div>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;
  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{zoomControl:true,preferCanvas:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),100);
  setTimeout(()=>seguimientoMap.invalidateSize(true),350);
  setTimeout(()=>seguimientoMap.invalidateSize(true),800);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({className:"eltaTruckMarker",html:"🚚",iconSize:[28,28],iconAnchor:[14,14]});
    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <b>Flota ${esc(flota(t)||"-")}</b><br>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  if(bounds.length===1)seguimientoMap.setView(bounds[0],13);
  else seguimientoMap.fitBounds(bounds,{padding:[35,35]});
}

const _tab_v1213 = tab;
tab = function(id){
  _tab_v1213(id);
  if(id==="mapa"){
    setTimeout(()=>{renderMapa(); if(seguimientoMap)seguimientoMap.invalidateSize(true);},150);
    setTimeout(()=>{if(seguimientoMap)seguimientoMap.invalidateSize(true);},600);
  }
};




/* ===== V1.2.40 - Seguimiento: zoom a todas las flotas en transito + marcador con numero ===== */

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="truckIcon">🚚</span>
    <span class="fleetNumber">${fleet}</span>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  // Solo posicionar en mapa las flotas en tránsito con GPS.
  let withPos=items.filter(openT).map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),100);
  setTimeout(()=>seguimientoMap.invalidateSize(true),350);
  setTimeout(()=>seguimientoMap.invalidateSize(true),800);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[54,34],
      iconAnchor:[27,17]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">🚚 Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  // Ajusta zoom para que se vean TODAS las flotas en tránsito.
  if(bounds.length===1){
    seguimientoMap.setView(bounds[0],12);
  }else{
    seguimientoMap.fitBounds(bounds,{
      padding:[70,70],
      maxZoom:13
    });
  }
}

function renderMapa(){
  let abiertos=trs.filter(openT);
  let items=abiertos.length?abiertos:trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}




/* ===== V1.2.40 - Seguimiento: marcador numerico estilo etiqueta ===== */

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="fleetNumber">${fleet}</span>
    <span class="fleetLabel">Flota ${fleet}</span>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  let withPos=items.filter(openT).map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),100);
  setTimeout(()=>seguimientoMap.invalidateSize(true),350);
  setTimeout(()=>seguimientoMap.invalidateSize(true),800);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[56,48],
      iconAnchor:[28,39],
      popupAnchor:[0,-38]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  if(bounds.length===1){
    seguimientoMap.setView(bounds[0],12);
  }else{
    seguimientoMap.fitBounds(bounds,{
      padding:[80,80],
      maxZoom:13
    });
  }
}




/* ===== V1.2.40 - Seguimiento: solo numero, zoom con todas las flotas, ultimo reporte resaltado ===== */

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="fleetNumber">${fleet}</span>
  </div>`;
}

function trackingCard(t){
  let o=openT(t),r=ruta(t);
  let last=(lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt||(lastU(t)||{}).ts;
  return `<div class="trackingCard">
    <div class="trackingCardTop">
      <div class="trackingFleetTitle">Flota ${esc(flota(t)||"-")}</div>
      <span class="trackingState ${o?"":"closed"}">${o?"Abierto":"Finalizado"}</span>
    </div>
    <div class="trackingData">
      <div><b>Emb.:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div class="locationLine"><b>Ubicación:</b> ${esc(locFull(t))}</div>
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div class="trackingReportLine"><b>Últ. reporte:</b> ${fd(last)}</div>
    </div>
    <div class="trackingAlerts">
      <h4>⚠️ Alertas del tránsito</h4>
      ${trackingAlertsHtml(t)}
    </div>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  // Mostrar en mapa todas las flotas con posicion dentro del conjunto renderizado.
  // Si hay abiertas, el conjunto ya viene filtrado desde renderMapa.
  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),80);
  setTimeout(()=>seguimientoMap.invalidateSize(true),300);
  setTimeout(()=>seguimientoMap.invalidateSize(true),750);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[64,52],
      iconAnchor:[32,48],
      popupAnchor:[0,-46]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  setTimeout(()=>{
    if(bounds.length===1){
      seguimientoMap.setView(bounds[0],12);
    }else{
      let group=L.featureGroup(seguimientoMarkers);
      seguimientoMap.fitBounds(group.getBounds(),{
        paddingTopLeft:[80,80],
        paddingBottomRight:[80,80],
        maxZoom:12
      });
    }
    seguimientoMap.invalidateSize(true);
  },120);
}

function renderMapa(){
  let abiertos=trs.filter(openT);
  let items=abiertos.length?abiertos:trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}




/* ===== V1.2.40 - Seguimiento: filtros cliente/embarque + marker 50% ===== */

function refreshSeguimientoFilters(){
  let cli=q("segCli");
  if(!cli)return;
  let current=cli.value;
  let vals=[...new Set(trs.map(t=>String(ruta(t).cliente||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  cli.innerHTML='<option value="">Todos los clientes</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if([...cli.options].some(o=>o.value===current))cli.value=current;
}

function seguimientoFilter(t){
  let emb=(q("segEmb")?.value||"").toLowerCase().trim();
  let cli=(q("segCli")?.value||"").trim();
  return (!emb || String(t.embarque||"").toLowerCase().includes(emb)) &&
         (!cli || String(ruta(t).cliente||"")===cli);
}

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="fleetNumber">${fleet}</span>
  </div>`;
}

function renderMapa(){
  refreshSeguimientoFilters();
  let abiertos=trs.filter(openT).filter(seguimientoFilter);
  let items=abiertos.length ? abiertos : trs.filter(seguimientoFilter).slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),80);
  setTimeout(()=>seguimientoMap.invalidateSize(true),300);
  setTimeout(()=>seguimientoMap.invalidateSize(true),750);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[32,26],
      iconAnchor:[16,24],
      popupAnchor:[0,-24]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
  });

  setTimeout(()=>{
    if(seguimientoMarkers.length===1){
      seguimientoMap.setView(seguimientoMarkers[0].getLatLng(),12);
    }else{
      let group=L.featureGroup(seguimientoMarkers);
      seguimientoMap.fitBounds(group.getBounds(),{
        paddingTopLeft:[70,70],
        paddingBottomRight:[70,70],
        maxZoom:12
      });
    }
    seguimientoMap.invalidateSize(true);
  },120);
}




/* ===== V1.2.40 - Solo transitos abiertos + Unidades/Choferes por usuarios role=flota ===== */

function isFlotaUser(u){
  return String(u.role||u.rol||"").toLowerCase().trim()==="flota";
}
function flotaUserId(u){
  return String(u.flota||u.fleet||u.user||u.id||"").trim();
}
function flotaUserName(u){
  return String(u.nombre||u.name||u.chofer||u.conductor||u.user||u.id||"-").trim();
}
function flotaUserPhone(u){
  return String(u.telefono||u.phone||u.celular||u.mobile||"-").trim();
}
function flotaUserActive(u){
  return u.activo===false ? "Inactivo" : "Activo";
}
function renderUnits(){
  let flotas=users.filter(isFlotaUser).sort((a,b)=>flotaUserId(a).localeCompare(flotaUserId(b),"es",{numeric:true}));
  if(!q("unitsList"))return;
  q("unitsList").innerHTML=flotas.map(u=>`<div class="fleetUserCard">
    <div class="fleetUserTop">
      <div class="fleetUserTitle">🚚 Flota ${esc(flotaUserId(u)||"-")}</div>
      <span class="fleetUserRole">flota</span>
    </div>
    <div class="fleetUserData">
      <div><b>Usuario:</b> ${esc(u.user||u.id||"-")}</div>
      <div><b>Estado:</b> ${esc(flotaUserActive(u))}</div>
      <div class="fullLine"><b>Chofer:</b> ${esc(flotaUserName(u))}</div>
      <div><b>Teléfono:</b> ${esc(flotaUserPhone(u))}</div>
      <div><b>Rol:</b> ${esc(u.role||u.rol||"flota")}</div>
    </div>
  </div>`).join("")||'<div class="item">No hay usuarios con role flota.</div>';
}

/* Choferes queda unificado con Unidades por compatibilidad */
function renderDrivers(){
  renderUnits();
}

/* Vista Tránsitos: mostrar solamente tránsitos abiertos */
function renderTransitos(){
  if(q("transList"))q("transList").innerHTML=trs.filter(openT).filter(filt).map(card).join("")||'<div class="item">No hay tránsitos abiertos.</div>';
}

/* Filtros de Tránsitos: estado ya queda limitado a abierto por regla operativa */
function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"",f=q("fFlo")?.value||"",c=q("fCli")?.value||"";
  return openT(t)&&
        (!e||String(t.embarque||"").toLowerCase().includes(e))&&
        (!f||flota(t)===f||String(t?.user?.fleet||"")===f)&&
        (!c||String(ruta(t).cliente||"")===c);
}

/* Seguimiento: solo flotas con tránsitos abiertos */
function renderMapa(){
  refreshSeguimientoFilters?.();
  let items=trs.filter(openT).filter(typeof seguimientoFilter==="function"?seguimientoFilter:()=>true);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas abiertas para mostrar.</div>';
  initSeguimientoMap(items);
}

/* Torre de Control: ultimos tránsitos solo abiertos */
function renderDashTable(){
  if(!q("dashTable"))return;
  let rows=trs.filter(openT).slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,10);
  if(!rows.length){
    q("dashTable").innerHTML='<div class="alertEmpty">Sin tránsitos abiertos.</div>';
    return;
  }
  q("dashTable").innerHTML=`<table class="darkTable"><thead><tr>
    <th>Embarque</th><th>Cliente</th><th>Origen</th><th>Destino</th><th>Flota</th><th>Estado</th><th>Actualizado</th>
  </tr></thead><tbody>`+rows.map(t=>`<tr>
    <td>${esc(t.embarque||"-")}</td>
    <td>${esc(ruta(t).cliente||"-")}</td>
    <td>${esc(ruta(t).origen||"-")}</td>
    <td>${esc(ruta(t).destino||"-")}</td>
    <td>${esc(flota(t)||"-")}</td>
    <td><span class="statusBadge open">En tránsito</span></td>
    <td>${fd((lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt||t.start?.time||t.start)}</td>
  </tr>`).join("")+`</tbody></table>`;
}

/* Reportes: solo abiertos */
function renderRep(){
  let abiertos=trs.filter(openT);
  let by={};
  abiertos.forEach(t=>by[flota(t)||"-"]=(by[flota(t)||"-"]||0)+1);
  if(q("rep"))q("rep").innerHTML=`<div class="item"><b>Tránsitos abiertos:</b> ${abiertos.length}</div><div class="item"><b>Por flota:</b><br>${Object.entries(by).map(([k,v])=>`${esc(k)}: ${v}`).join("<br>")||"-"}</div>`;
}

/* Evitar errores si quedan llamadas internas a Coordinacion */
function renderCoordinacion(){}




/* ===== V1.2.40 - Unidades / Choferes: usuarios role flota flexible ===== */

function normRoleValue(v){
  return String(v||"").toLowerCase().trim();
}

function getUserRole(u){
  return normRoleValue(
    u.role ?? u.rol ?? u.perfil ?? u.tipo ?? u.tipo_usuario ?? u.tipoUsuario ?? u.userRole ?? u.categoria ?? ""
  );
}

function isFlotaUser(u){
  let role=getUserRole(u);
  return role==="flota" || role==="flotas" || role==="fleet" || role==="driver" || role==="chofer" || role==="conductor";
}

function flotaUserId(u){
  return String(
    u.flota ?? u.fleet ?? u.nroFlota ?? u.numeroFlota ?? u.unidad ?? u.user?.fleet ?? u.id ?? u.user ?? ""
  ).trim();
}

function flotaUserName(u){
  return String(
    u.nombre ?? u.name ?? u.chofer ?? u.conductor ?? u.driver ?? u.apellidoNombre ?? u.user ?? u.id ?? "-"
  ).trim();
}

function flotaUserPhone(u){
  return String(u.telefono ?? u.phone ?? u.celular ?? u.mobile ?? u.tel ?? "-").trim();
}

function flotaUserActive(u){
  return u.activo===false || u.active===false || String(u.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function transitForFleet(fleetId){
  if(!fleetId)return null;
  return trs.find(t=>openT(t) && String(flota(t)||"").trim()===String(fleetId).trim()) ||
         trs.find(t=>String(flota(t)||"").trim()===String(fleetId).trim()) ||
         null;
}

function fleetTransitHtml(fleetId){
  let t=transitForFleet(fleetId);
  if(!t)return `<div class="fleetUserTransit"><b>Tránsito:</b> Sin tránsito abierto.</div>`;
  let r=ruta(t);
  return `<div class="fleetUserTransit">
    <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
    <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
    <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
    <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
    <div><b>Estado:</b> ${openT(t)?"En tránsito":"Finalizado"}</div>
  </div>`;
}

function renderUnits(){
  if(!q("unitsList"))return;

  let flotas=users
    .filter(isFlotaUser)
    .sort((a,b)=>flotaUserId(a).localeCompare(flotaUserId(b),"es",{numeric:true}));

  q("unitsList").innerHTML=flotas.map(u=>{
    let fleetId=flotaUserId(u);
    return `<div class="fleetUserCard">
      <div class="fleetUserTop">
        <div class="fleetUserTitle">🚚 Flota ${esc(fleetId||"-")}</div>
        <span class="fleetUserRole">flota</span>
      </div>
      <div class="fleetUserData">
        <div><b>Usuario:</b> ${esc(u.user||u.id||"-")}</div>
        <div><b>Estado:</b> ${esc(flotaUserActive(u))}</div>
        <div class="fullLine"><b>Chofer:</b> ${esc(flotaUserName(u))}</div>
        <div><b>Teléfono:</b> ${esc(flotaUserPhone(u))}</div>
        <div><b>Rol:</b> ${esc(u.role||u.rol||u.perfil||u.tipo||"flota")}</div>
      </div>
      ${fleetTransitHtml(fleetId)}
    </div>`;
  }).join("") || `<div class="fleetUserEmptyHint">
    No se encontraron usuarios con rol flota.<br>
    Se revisan campos: role, rol, perfil, tipo, tipo_usuario y tipoUsuario.
  </div>`;
}

/* Compatibilidad con llamadas viejas */
function renderDrivers(){
  renderUnits();
}




/* ===== V1.2.40 - Correcciones Transitos y Unidades / Choferes ===== */

let unitFilterMode="todas";

function setUnitFilter(mode){
  unitFilterMode=mode||"todas";
  document.querySelectorAll(".unitFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.unitFilter===unitFilterMode);
  });
  renderUnits();
}

function lastReportValue(t){
  let u=lastU(t)||{};
  return u.time||u.fecha||u.createdAt||u.ts||t.updatedAt||t.updateAt||t.start?.time||t.start;
}

function tractorValue(u,t){
  return String(
    (t&&(t.tractor||t.camion||t.chasis||t.unidadTractora)) ||
    u.tractor || u.camion || u.chasis || u.unidadTractora || u.nroTractor || u.fleet || u.flota || "-"
  ).trim();
}

function bateaValue(u,t){
  return String(
    (t&&(t.batea||t.semi||t.semirremolque||t.carreta||t.dominioBatea)) ||
    u.batea || u.semi || u.semirremolque || u.carreta || u.dominioBatea || "-"
  ).trim();
}

function normRoleValue(v){return String(v||"").toLowerCase().trim();}

function getUserRole(u){
  return normRoleValue(u.role ?? u.rol ?? u.perfil ?? u.tipo ?? u.tipo_usuario ?? u.tipoUsuario ?? u.userRole ?? u.categoria ?? "");
}

function isFlotaUser(u){
  let role=getUserRole(u);
  return role==="flota" || role==="flotas" || role==="fleet" || role==="driver" || role==="chofer" || role==="conductor";
}

function flotaUserId(u){
  return String(u.flota ?? u.fleet ?? u.nroFlota ?? u.numeroFlota ?? u.unidad ?? u.user?.fleet ?? u.id ?? u.user ?? "").trim();
}

function flotaUserName(u){
  return String(u.nombre ?? u.name ?? u.chofer ?? u.conductor ?? u.driver ?? u.apellidoNombre ?? u.user ?? u.id ?? "-").trim();
}

function flotaUserPhone(u){
  return String(u.telefono ?? u.phone ?? u.celular ?? u.mobile ?? u.tel ?? "-").trim();
}

function flotaUserActive(u){
  return u.activo===false || u.active===false || String(u.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function transitForFleet(fleetId){
  if(!fleetId)return null;
  return trs.find(t=>openT(t) && String(flota(t)||"").trim()===String(fleetId).trim()) || null;
}

function anyTransitForFleet(fleetId){
  if(!fleetId)return null;
  return trs.find(t=>String(flota(t)||"").trim()===String(fleetId).trim()) || null;
}

function fleetTransitHtml(fleetId,u){
  let t=transitForFleet(fleetId);
  if(!t)return `<div class="fleetUserTransit"><b>Estado tránsito:</b> Sin tránsito activo.</div>`;
  let r=ruta(t);
  return `<div class="fleetUserTransit">
    <b>Detalle tránsito abierto</b>
    <div class="openTransitBox">
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
      <div class="lastReportMini">Últ. reporte: ${fd(lastReportValue(t))}</div>
    </div>
  </div>`;
}

function renderUnits(){
  if(!q("unitsList"))return;
  let flotas=users
    .filter(isFlotaUser)
    .filter(u=>{
      let t=transitForFleet(flotaUserId(u));
      if(unitFilterMode==="transito")return !!t;
      if(unitFilterMode==="sin")return !t;
      return true;
    })
    .sort((a,b)=>flotaUserId(a).localeCompare(flotaUserId(b),"es",{numeric:true}));

  q("unitsList").innerHTML=flotas.map(u=>{
    let fleetId=flotaUserId(u);
    let t=transitForFleet(fleetId);
    let anyT=anyTransitForFleet(fleetId);
    return `<div class="fleetUserCard">
      <div class="fleetUserTop">
        <div class="fleetUserTitle">🚚 Flota ${esc(fleetId||"-")}</div>
        <span class="fleetUserStatus ${t?"inTransit":"noTransit"}">${t?"En tránsito":"Sin tránsito"}</span>
      </div>
      <div class="fleetUserData">
        <div><b>Usuario:</b> ${esc(u.user||u.id||"-")}</div>
        <div><b>Estado:</b> ${esc(flotaUserActive(u))}</div>
        <div class="fullLine"><b>Chofer:</b> ${esc(flotaUserName(u))}</div>
        <div><b>Tractor:</b> ${esc(tractorValue(u,t||anyT))}</div>
        <div><b>Batea:</b> ${esc(bateaValue(u,t||anyT))}</div>
        <div><b>Teléfono:</b> ${esc(flotaUserPhone(u))}</div>
      </div>
      ${fleetTransitHtml(fleetId,u)}
    </div>`;
  }).join("") || `<div class="fleetUserEmptyHint">No hay unidades para el filtro seleccionado.</div>`;
}

function renderDrivers(){renderUnits();}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"} transitCardV1210">
    <div class="transitLeft">
      <div class="transitTop">
        <div class="transitTitle">🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</div>
        <span class="transitBadge ${o?"open":""}">${o?"Abierto":"Finalizado"}</span>
      </div>
      <div class="transitDataGrid">
        <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
        <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
        <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
        <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
        <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
        <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
        <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
        <div class="fullLine"><b>Últ. posición:</b> ${esc(typeof locFull==="function"?locFull(t):loc(t))}</div>
        <div class="lastReportLine"><b>Últ. reporte:</b> ${fd(lastReportValue(t))}</div>
      </div>
    </div>
    <div class="transitRight">
      <h4 class="alertsTitle">⚠️ Alertas</h4>
      ${typeof transitAlertsCompact==="function"?transitAlertsCompact(t):""}
    </div>
  </div>`;
}




/* ===== V1.2.40 - Fix filtros Unidades / Choferes + Tractor/Batea ===== */

window.unitFilterMode = window.unitFilterMode || "todas";

function setUnitFilter(mode){
  window.unitFilterMode = mode || "todas";
  document.querySelectorAll(".unitFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.unitFilter===window.unitFilterMode);
  });
  renderUnits();
}

function _norm(v){ return String(v ?? "").trim(); }
function _role(v){ return String(v ?? "").toLowerCase().trim(); }

function getUserRole(u){
  return _role(u.role ?? u.rol ?? u.perfil ?? u.tipo ?? u.tipo_usuario ?? u.tipoUsuario ?? u.userRole ?? u.categoria ?? "");
}

function isFlotaUser(u){
  let role = getUserRole(u);
  return role==="flota" || role==="flotas" || role==="fleet" || role==="driver" || role==="chofer" || role==="conductor";
}

function flotaUserId(u){
  return _norm(u.flota ?? u.fleet ?? u.nroFlota ?? u.numeroFlota ?? u.unidad ?? u.user?.fleet ?? u.id ?? u.user ?? "");
}

function flotaUserName(u){
  return _norm(u.nombre ?? u.name ?? u.chofer ?? u.conductor ?? u.driver ?? u.apellidoNombre ?? u.user ?? u.id ?? "-");
}

function flotaUserPhone(u){
  return _norm(u.telefono ?? u.phone ?? u.celular ?? u.mobile ?? u.tel ?? "-");
}

function flotaUserActive(u){
  return u.activo===false || u.active===false || String(u.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function lastReportValue(t){
  let u = lastU(t)||{};
  return u.time || u.fecha || u.createdAt || u.ts || t.updatedAt || t.updateAt || t.start?.time || t.start;
}

function transitForFleet(fleetId){
  if(!fleetId)return null;
  return trs.find(t=>openT(t) && String(flota(t)||"").trim()===String(fleetId).trim()) || null;
}

function anyTransitForFleet(fleetId){
  if(!fleetId)return null;
  return trs.find(t=>String(flota(t)||"").trim()===String(fleetId).trim()) || null;
}

function findAnyValue(objs, keys){
  for(let obj of objs.filter(Boolean)){
    for(let k of keys){
      let v = obj?.[k];
      if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
    }
  }
  return "";
}

function tractorValue(u,t){
  return findAnyValue(
    [t, t?.unidad, t?.vehiculo, t?.vehicle, t?.tractor, t?.camion, t?.user, u, u?.unidad, u?.vehiculo, u?.vehicle],
    ["tractor","nroTractor","numeroTractor","unidadTractora","tracto","camion","dominioTractor","patenteTractor","chasis","interno","fleet","flota"]
  ) || "-";
}

function bateaValue(u,t){
  return findAnyValue(
    [t, t?.unidad, t?.vehiculo, t?.vehicle, t?.batea, t?.semi, t?.user, u, u?.unidad, u?.vehiculo, u?.vehicle],
    ["batea","nroBatea","numeroBatea","semi","semirremolque","semiRemolque","carreta","dominioBatea","patenteBatea","remolque","trailer"]
  ) || "-";
}

function fleetTransitHtml(fleetId,u){
  let t = transitForFleet(fleetId);
  if(!t) return `<div class="fleetUserTransit"><b>Estado tránsito:</b> Sin tránsito activo.</div>`;
  let r = ruta(t);
  return `<div class="fleetUserTransit">
    <b>Detalle tránsito abierto</b>
    <div class="openTransitBox">
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
      <div class="lastReportMini">Últ. reporte: ${fd(lastReportValue(t))}</div>
    </div>
  </div>`;
}

function renderUnits(){
  if(!q("unitsList")) return;

  document.querySelectorAll(".unitFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.unitFilter===window.unitFilterMode);
  });

  let flotas = users
    .filter(isFlotaUser)
    .filter(u=>{
      let t = transitForFleet(flotaUserId(u));
      if(window.unitFilterMode==="transito") return !!t;
      if(window.unitFilterMode==="sin") return !t;
      return true;
    })
    .sort((a,b)=>flotaUserId(a).localeCompare(flotaUserId(b),"es",{numeric:true}));

  q("unitsList").innerHTML = flotas.map(u=>{
    let fleetId = flotaUserId(u);
    let t = transitForFleet(fleetId);
    let anyT = anyTransitForFleet(fleetId);
    let sourceT = t || anyT;
    return `<div class="fleetUserCard">
      <div class="fleetUserTop">
        <div class="fleetUserTitle">🚚 Flota ${esc(fleetId||"-")}</div>
        <span class="fleetUserStatus ${t?"inTransit":"noTransit"}">${t?"En tránsito":"Sin tránsito"}</span>
      </div>

      <div class="fleetUserData">
        <div><b>Usuario:</b> ${esc(u.user||u.id||"-")}</div>
        <div><b>Estado:</b> ${esc(flotaUserActive(u))}</div>
        <div class="fullLine"><b>Chofer:</b> ${esc(flotaUserName(u))}</div>
        <div><b>Teléfono:</b> ${esc(flotaUserPhone(u))}</div>
        <div class="roleLine"><b>Rol:</b> ${esc(u.role||u.rol||u.perfil||u.tipo||"")}</div>
      </div>

      <div class="fleetAssetBox">
        <div class="fleetAsset"><b>Tractor:</b> ${esc(tractorValue(u,sourceT))}</div>
        <div class="fleetAsset"><b>Batea:</b> ${esc(bateaValue(u,sourceT))}</div>
      </div>

      ${fleetTransitHtml(fleetId,u)}
    </div>`;
  }).join("") || `<div class="fleetUserEmptyHint">No hay unidades para el filtro seleccionado.</div>`;
}

function renderDrivers(){ renderUnits(); }




/* ===== V1.2.40 - Torre de Control y Tránsitos muestran abiertos + finalizados ===== */

function transitUpdatedValue(t){
  let u = typeof lastU==="function" ? (lastU(t)||{}) : {};
  return u.time || u.fecha || u.createdAt || u.ts || t.updatedAt || t.updateAt || t.closed?.time || t.closed || t.start?.time || t.start;
}

function transitEstadoText(t){
  return openT(t) ? "En tránsito" : "Finalizado";
}

function transitEstadoClass(t){
  return openT(t) ? "open" : "closed";
}

/* Vista Tránsitos: sin filtro oculto. Por defecto Estado=Todos */
function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"";
  let f=q("fFlo")?.value||"";
  let c=q("fCli")?.value||"";
  let s=q("fEst")?.value||"";
  return (!e || String(t.embarque||"").toLowerCase().includes(e)) &&
         (!f || flota(t)===f || String(t?.user?.fleet||"")===f) &&
         (!c || String(ruta(t).cliente||"")===c) &&
         (!s || (s==="abierto" ? openT(t) : !openT(t)));
}

function renderTransitos(){
  if(!q("transList"))return;
  q("transList").innerHTML = trs
    .filter(filt)
    .sort((a,b)=>tv(transitUpdatedValue(b))-tv(transitUpdatedValue(a)))
    .map(card)
    .join("") || '<div class="item">Sin resultados.</div>';
}

/* Torre de Control: tabla últimos tránsitos con abiertos + finalizados */
function renderDashTable(){
  if(!q("dashTable"))return;
  let rows = trs.slice()
    .sort((a,b)=>tv(transitUpdatedValue(b))-tv(transitUpdatedValue(a)))
    .slice(0,10);

  if(!rows.length){
    q("dashTable").innerHTML='<div class="alertEmpty">Sin tránsitos registrados.</div>';
    return;
  }

  q("dashTable").innerHTML=`<table class="darkTable"><thead><tr>
    <th>Embarque</th><th>Cliente</th><th>Origen</th><th>Destino</th><th>Flota</th><th>Estado</th><th>Actualizado</th>
  </tr></thead><tbody>`+rows.map(t=>`<tr>
    <td>${esc(t.embarque||"-")}</td>
    <td>${esc(ruta(t).cliente||"-")}</td>
    <td>${esc(ruta(t).origen||"-")}</td>
    <td>${esc(ruta(t).destino||"-")}</td>
    <td>${esc(flota(t)||"-")}</td>
    <td><span class="statusBadge ${transitEstadoClass(t)}">${transitEstadoText(t)}</span></td>
    <td>${fd(transitUpdatedValue(t))}</td>
  </tr>`).join("")+`</tbody></table>`;
}

/* Seguimiento: se mantiene solo con tránsitos abiertos */
function renderMapa(){
  if(typeof refreshSeguimientoFilters==="function")refreshSeguimientoFilters();
  let items = trs
    .filter(openT)
    .filter(typeof seguimientoFilter==="function" ? seguimientoFilter : (()=>true));

  if(q("mapList"))q("mapList").innerHTML = items.map(trackingCard).join("") || '<div class="trackingCard">No hay flotas abiertas para mostrar.</div>';
  if(typeof initSeguimientoMap==="function")initSeguimientoMap(items);
}

/* Reportes vuelve a considerar ambos estados */
function renderRep(){
  let by={};
  trs.forEach(t=>by[flota(t)||"-"]=(by[flota(t)||"-"]||0)+1);
  if(q("rep"))q("rep").innerHTML=
    `<div class="item"><b>Abiertos:</b> ${trs.filter(openT).length}</div>
     <div class="item"><b>Finalizados:</b> ${trs.filter(t=>!openT(t)).length}</div>
     <div class="item"><b>Por flota:</b><br>${Object.entries(by).map(([k,v])=>`${esc(k)}: ${v}`).join("<br>")||"-"}</div>`;
}




/* ===== V1.2.40 - Clientes / Destinos sin JSON visible ===== */

function firstValue(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined && v!==null && String(v).trim()!=="")return String(v).trim();
  }
  return "";
}

function activeText(x){
  return x?.activo===false || x?.active===false || String(x?.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function activeClass(x){
  return activeText(x)==="Activo" ? "" : " inactive";
}

function clientName(c){
  return firstValue(c,["nombre","cliente","razonSocial","razon_social","name","id"]) || "-";
}

function renderClients(){
  if(!q("clientsList"))return;
  let list=(clientes||[]).slice().sort((a,b)=>clientName(a).localeCompare(clientName(b),"es"));
  q("clientsList").innerHTML=list.map(c=>`<div class="clientCard">
    <div class="clientTop">
      <div class="clientName">🏢 ${esc(clientName(c))}</div>
      <span class="clientStatus${activeClass(c)}">${activeText(c)}</span>
    </div>
    <div class="clientData">
      <div><b>ID:</b> ${esc(c.id||clientName(c))}</div>
      <div><b>Estado:</b> ${activeText(c)}</div>
    </div>
  </div>`).join("")||'<div class="clientCard">No hay clientes registrados.</div>';
}

function coordTextFromObj(d){
  let lat=firstValue(d,["lat","latitude","latitud"]);
  let lng=firstValue(d,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  let gps=d?.gps||d?.ubicacion||d?.posicion||d?.location||{};
  lat=firstValue(gps,["lat","latitude","latitud"]);
  lng=firstValue(gps,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  let txt=firstValue(d,["coordenadas","coord","coords"]);
  if(txt)return txt;
  return "";
}

function destinationName(d){
  return firstValue(d,["nombre","destino","name","ubicacion","localidad","id"]) || "-";
}

function destinationLocalidad(d){
  return firstValue(d,["localidad","city","ciudad","ubicacion","nombre"]) || "-";
}

function destinationMunicipio(d){
  return firstValue(d,["municipio","partido","comuna","departamento"]) || "-";
}

function destinationProvincia(d){
  return firstValue(d,["provincia","state","region","regionProvincia"]) || "-";
}

function destinationPais(d){
  return firstValue(d,["pais","country"]) || "-";
}

/* Combina colección destinos + destinos usados en tránsitos para no perder datos */
function collectDestinos(){
  let map=new Map();

  (destinos||[]).forEach(d=>{
    let id=destinationName(d);
    if(id)map.set(id,{...d,id:d.id||id});
  });

  (trs||[]).forEach(t=>{
    let r=ruta(t)||{};
    let name=r.destino||t.destino||"";
    if(name && !map.has(name)){
      map.set(name,{
        id:name,
        destino:name,
        localidad:r.localidadDestino||r.destinoLocalidad||"",
        municipio:r.municipioDestino||"",
        provincia:r.provinciaDestino||"",
        pais:r.paisDestino||"",
        lat:r.destinoLat||t.destinoLat||"",
        lng:r.destinoLng||t.destinoLng||"",
        activo:true
      });
    }
  });

  return [...map.values()].sort((a,b)=>destinationName(a).localeCompare(destinationName(b),"es"));
}

function renderDestinos(){
  if(!q("destinosList"))return;
  let list=collectDestinos();
  q("destinosList").innerHTML=list.map(d=>{
    let coords=coordTextFromObj(d);
    return `<div class="destinationCard">
      <div class="destinationTop">
        <div class="destinationName">📍 ${esc(destinationName(d))}</div>
        <span class="destinationStatus${activeClass(d)}">${activeText(d)}</span>
      </div>
      <div class="destinationData">
        <div><b>Localidad:</b> ${esc(destinationLocalidad(d))}</div>
        <div><b>Municipio:</b> ${esc(destinationMunicipio(d))}</div>
        <div><b>Provincia:</b> ${esc(destinationProvincia(d))}</div>
        <div><b>País:</b> ${esc(destinationPais(d))}</div>
      </div>
      <div class="destinationCoords"><b>Coordenadas:</b> ${esc(coords||"-")}</div>
    </div>`;
  }).join("")||'<div class="destinationCard">No hay destinos registrados.</div>';
}

/* Compatibilidad: si la app llama renderClients o renderClientes */
function renderClientes(){
  renderClients();
  renderDestinos();
}

/* Sobrescribir refresh para asegurar render de destinos sin tocar el resto */
const _refresh_v1223 = refresh;
refresh = async function(){
  await _refresh_v1223();
  renderClients();
  renderDestinos();
};

/* Cuando se ingresa a Clientes / Destinos */
const _tab_v1223 = tab;
tab = function(id){
  _tab_v1223(id);
  if(id==="clientes"){
    renderClients();
    renderDestinos();
  }
};




/* ===== V1.2.40 - Fix render Clientes / Destinos ===== */

function safeArr(v){
  return Array.isArray(v) ? v : [];
}

function firstValueV1224(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
  }
  return "";
}

function objActiveTextV1224(x){
  return x?.activo===false || x?.active===false || String(x?.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function objActiveClassV1224(x){
  return objActiveTextV1224(x)==="Activo" ? "" : " inactive";
}

function clientNameV1224(c){
  return firstValueV1224(c,["nombre","cliente","razonSocial","razon_social","name","id"]) || "-";
}

function renderClients(){
  let el=q("clientsList");
  if(!el)return;
  let list=safeArr(clientes).slice().sort((a,b)=>clientNameV1224(a).localeCompare(clientNameV1224(b),"es"));
  el.innerHTML=list.map(c=>`<div class="clientCard">
    <div class="clientTop">
      <div class="clientName">🏢 ${esc(clientNameV1224(c))}</div>
      <span class="clientStatus${objActiveClassV1224(c)}">${objActiveTextV1224(c)}</span>
    </div>
    <div class="clientData">
      <div><b>ID:</b> ${esc(c.id||clientNameV1224(c))}</div>
      <div><b>Estado:</b> ${objActiveTextV1224(c)}</div>
    </div>
  </div>`).join("") || '<div class="clientCard">No hay clientes registrados.</div>';
}

function destinationNameV1224(d){
  return firstValueV1224(d,["nombre","destino","name","ubicacion","localidad","id"]) || "-";
}

function destinationLocalidadV1224(d){
  return firstValueV1224(d,["localidad","city","ciudad","ubicacion","nombre"]) || "-";
}

function destinationMunicipioV1224(d){
  return firstValueV1224(d,["municipio","partido","comuna","departamento"]) || "-";
}

function destinationProvinciaV1224(d){
  return firstValueV1224(d,["provincia","state","region","regionProvincia"]) || "-";
}

function destinationPaisV1224(d){
  return firstValueV1224(d,["pais","country"]) || "-";
}

function coordTextFromObjV1224(d){
  let lat=firstValueV1224(d,["lat","latitude","latitud"]);
  let lng=firstValueV1224(d,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  let gps=d?.gps||d?.ubicacionGPS||d?.posicion||d?.location||{};
  lat=firstValueV1224(gps,["lat","latitude","latitud"]);
  lng=firstValueV1224(gps,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  return firstValueV1224(d,["coordenadas","coord","coords"]) || "";
}

function collectDestinosV1224(){
  let map=new Map();

  safeArr(destinos).forEach(d=>{
    let id=destinationNameV1224(d);
    if(id && id!=="-") map.set(id,{...d,id:d.id||id});
  });

  safeArr(trs).forEach(t=>{
    let r=ruta(t)||{};
    let name=r.destino||t.destino||"";
    if(name && !map.has(name)){
      map.set(name,{
        id:name,
        destino:name,
        localidad:r.localidadDestino||r.destinoLocalidad||"",
        municipio:r.municipioDestino||"",
        provincia:r.provinciaDestino||"",
        pais:r.paisDestino||"",
        lat:r.destinoLat||t.destinoLat||"",
        lng:r.destinoLng||t.destinoLng||"",
        activo:true
      });
    }
  });

  return [...map.values()].sort((a,b)=>destinationNameV1224(a).localeCompare(destinationNameV1224(b),"es"));
}

function renderDestinos(){
  let el=q("destinosList");
  if(!el)return;
  let list=collectDestinosV1224();
  el.innerHTML=list.map(d=>{
    let coords=coordTextFromObjV1224(d);
    return `<div class="destinationCard">
      <div class="destinationTop">
        <div class="destinationName">📍 ${esc(destinationNameV1224(d))}</div>
        <span class="destinationStatus${objActiveClassV1224(d)}">${objActiveTextV1224(d)}</span>
      </div>
      <div class="destinationData">
        <div><b>Localidad:</b> ${esc(destinationLocalidadV1224(d))}</div>
        <div><b>Municipio:</b> ${esc(destinationMunicipioV1224(d))}</div>
        <div><b>Provincia:</b> ${esc(destinationProvinciaV1224(d))}</div>
        <div><b>País:</b> ${esc(destinationPaisV1224(d))}</div>
      </div>
      <div class="destinationCoords"><b>Coordenadas:</b> ${esc(coords||"-")}</div>
    </div>`;
  }).join("") || '<div class="destinationCard">No hay destinos registrados.</div>';
}

function renderClientes(){
  renderClients();
  renderDestinos();
}

/* Reemplazar refresh entero para asegurar que renderice Clientes/Destinos sin depender de wrappers previos */
refresh = async function(){
  [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
    read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
  ]);
  if(typeof refreshFilters==="function")refreshFilters();
  if(typeof refreshSeguimientoFilters==="function")refreshSeguimientoFilters();
  renderDash();
  renderTransitos();
  renderMapa();
  renderRep();
  if(typeof renderUnits==="function")renderUnits();
  if(typeof renderDrivers==="function")renderDrivers();
  renderClients();
  renderDestinos();
  if(typeof renderAlerts==="function")renderAlerts();
};

/* Asegurar carga al entrar en la pestaña */
const _tab_v1224 = tab;
tab = function(id){
  _tab_v1224(id);
  if(id==="clientes"){
    renderClients();
    renderDestinos();
  }
};




/* ===== V1.2.40 - Fix campo Tractor desde usuarios.tractor ===== */

function pickTextValue(obj, keys){
  for(let k of keys){
    let v=obj?.[k];
    if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
  }
  return "";
}

/* Tractor debe salir primero del documento usuario: tractor: "SSS 111" */
function tractorValue(u,t){
  return pickTextValue(u,[
    "tractor","nroTractor","numeroTractor","unidadTractora","tracto","dominioTractor","patenteTractor"
  ]) ||
  pickTextValue(t,[
    "tractor","nroTractor","numeroTractor","unidadTractora","tracto","dominioTractor","patenteTractor"
  ]) ||
  pickTextValue(t?.unidad,[
    "tractor","nroTractor","numeroTractor","unidadTractora","tracto","dominioTractor","patenteTractor"
  ]) ||
  pickTextValue(t?.vehiculo,[
    "tractor","nroTractor","numeroTractor","unidadTractora","tracto","dominioTractor","patenteTractor"
  ]) ||
  "-";
}

/* Batea debe salir primero del documento usuario: batea: "AE1 198" */
function bateaValue(u,t){
  return pickTextValue(u,[
    "batea","nroBatea","numeroBatea","semi","semirremolque","semiRemolque","carreta","dominioBatea","patenteBatea","remolque","trailer"
  ]) ||
  pickTextValue(t,[
    "batea","nroBatea","numeroBatea","semi","semirremolque","semiRemolque","carreta","dominioBatea","patenteBatea","remolque","trailer"
  ]) ||
  pickTextValue(t?.unidad,[
    "batea","nroBatea","numeroBatea","semi","semirremolque","semiRemolque","carreta","dominioBatea","patenteBatea","remolque","trailer"
  ]) ||
  pickTextValue(t?.vehiculo,[
    "batea","nroBatea","numeroBatea","semi","semirremolque","semiRemolque","carreta","dominioBatea","patenteBatea","remolque","trailer"
  ]) ||
  "-";
}

/* Re-render de Unidades / Choferes usando los campos corregidos */
function renderUnits(){
  if(!q("unitsList")) return;

  document.querySelectorAll(".unitFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.unitFilter===window.unitFilterMode);
  });

  let flotas = users
    .filter(isFlotaUser)
    .filter(u=>{
      let t = transitForFleet(flotaUserId(u));
      if(window.unitFilterMode==="transito") return !!t;
      if(window.unitFilterMode==="sin") return !t;
      return true;
    })
    .sort((a,b)=>flotaUserId(a).localeCompare(flotaUserId(b),"es",{numeric:true}));

  q("unitsList").innerHTML = flotas.map(u=>{
    let fleetId = flotaUserId(u);
    let t = transitForFleet(fleetId);
    let anyT = anyTransitForFleet(fleetId);
    let sourceT = t || anyT;
    return `<div class="fleetUserCard">
      <div class="fleetUserTop">
        <div class="fleetUserTitle">🚚 Flota ${esc(fleetId||"-")}</div>
        <span class="fleetUserStatus ${t?"inTransit":"noTransit"}">${t?"En tránsito":"Sin tránsito"}</span>
      </div>

      <div class="fleetUserData">
        <div><b>Usuario:</b> ${esc(u.user||u.id||"-")}</div>
        <div><b>Estado:</b> ${esc(flotaUserActive(u))}</div>
        <div class="fullLine"><b>Chofer:</b> ${esc(flotaUserName(u))}</div>
        <div><b>Teléfono:</b> ${esc(flotaUserPhone(u))}</div>
      </div>

      <div class="fleetAssetBox">
        <div class="fleetAsset"><b>Tractor:</b> ${esc(tractorValue(u,sourceT))}</div>
        <div class="fleetAsset"><b>Batea:</b> ${esc(bateaValue(u,sourceT))}</div>
      </div>

      ${fleetTransitHtml(fleetId,u)}
    </div>`;
  }).join("") || `<div class="fleetUserEmptyHint">No hay unidades para el filtro seleccionado.</div>`;
}

function renderDrivers(){ renderUnits(); }




/* ===== V1.2.40 - Clientes contacto/telefono + Destinos horarios/coordenadas ===== */

function isCoordTextV1226(v){
  let s=String(v||"").trim();
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s);
}

function parseCoordV1226(v){
  let s=String(v||"").trim();
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m ? {lat:Number(m[1]),lng:Number(m[2])} : null;
}

function firstValueV1226(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
  }
  return "";
}

function activeTextV1226(x){
  return x?.activo===false || x?.active===false || String(x?.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function activeClassV1226(x){
  return activeTextV1226(x)==="Activo" ? "" : " inactive";
}

function clientNameV1226(c){
  return firstValueV1226(c,["nombre","cliente","razonSocial","razon_social","name","id"]) || "-";
}

function clientContactV1226(c){
  return firstValueV1226(c,["contacto","contact","responsable","referente","personaContacto"]) || "-";
}

function clientPhoneV1226(c){
  return firstValueV1226(c,["telefono","teléfono","phone","tel","celular","mobile"]) || "-";
}

function renderClients(){
  let el=q("clientsList");
  if(!el)return;
  let list=(Array.isArray(clientes)?clientes:[]).slice().sort((a,b)=>clientNameV1226(a).localeCompare(clientNameV1226(b),"es"));
  el.innerHTML=list.map(c=>`<div class="clientCard">
    <div class="clientTop">
      <div class="clientName">🏢 ${esc(clientNameV1226(c))}</div>
      <span class="clientStatus${activeClassV1226(c)}">${activeTextV1226(c)}</span>
    </div>
    <div class="clientData">
      <div><b>ID:</b> ${esc(c.id||clientNameV1226(c))}</div>
      <div><b>Estado:</b> ${activeTextV1226(c)}</div>
    </div>
    <div class="clientContactBox">
      <div><b>Contacto:</b> ${esc(clientContactV1226(c))}</div>
      <div><b>Teléfono:</b> ${esc(clientPhoneV1226(c))}</div>
    </div>
  </div>`).join("") || '<div class="clientCard">No hay clientes registrados.</div>';
}

function coordTextFromObjV1226(d){
  let ubic=firstValueV1226(d,["coordenadas","coord","coords","ubicacion"]);
  if(isCoordTextV1226(ubic))return ubic;
  let lat=firstValueV1226(d,["lat","latitude","latitud"]);
  let lng=firstValueV1226(d,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  let gps=d?.gps||d?.ubicacionGPS||d?.posicion||d?.location||{};
  lat=firstValueV1226(gps,["lat","latitude","latitud"]);
  lng=firstValueV1226(gps,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  return isCoordTextV1226(ubic) ? ubic : "";
}

function knownLocalidadFromCoordsV1226(coords){
  let p=parseCoordV1226(coords);
  if(!p)return "";
  let refs=[
    {lat:-25.510092864116338,lng:-54.62630028465641,localidad:"Ciudad del Este",pais:"Paraguay"},
    {lat:-34.0910132,lng:-59.0895417,localidad:"Zárate",pais:"Argentina"},
    {lat:-34.3512317,lng:-58.8042567,localidad:"Belén de Escobar",pais:"Argentina"},
    {lat:-34.6160377,lng:-58.4588818,localidad:"Caballito",pais:"Argentina"},
    {lat:-33.4489,lng:-70.6693,localidad:"Santiago",pais:"Chile"},
    {lat:-34.9011,lng:-56.1645,localidad:"Montevideo",pais:"Uruguay"}
  ];
  let best=null, bestD=999999;
  refs.forEach(r=>{
    let d=Math.hypot((p.lat-r.lat)*111,(p.lng-r.lng)*111);
    if(d<bestD){bestD=d;best=r;}
  });
  return bestD<=40 ? best.localidad : "";
}

function knownPaisFromCoordsV1226(coords){
  let p=parseCoordV1226(coords);
  if(!p)return "";
  if(p.lat<-17 && p.lat>-28 && p.lng<-53 && p.lng>-63)return "Paraguay";
  if(p.lat<-17 && p.lat>-56 && p.lng<-66 && p.lng>-76)return "Chile";
  if(p.lat<-21 && p.lat>-56 && p.lng<-53 && p.lng>-74)return "Argentina";
  if(p.lat<-30 && p.lat>-35.5 && p.lng<-53 && p.lng>-59)return "Uruguay";
  return "";
}

function destinationNameV1226(d){
  let name=firstValueV1226(d,["nombre","destino","name","id"]);
  if(name && !isCoordTextV1226(name))return name;
  return "Destino sin nombre";
}

function destinationLocalidadV1226(d){
  let loc=firstValueV1226(d,["localidad","city","ciudad"]);
  if(loc && !isCoordTextV1226(loc))return loc;
  let coords=coordTextFromObjV1226(d);
  return knownLocalidadFromCoordsV1226(coords) || "-";
}

function destinationPaisV1226(d){
  let pais=firstValueV1226(d,["pais","country"]);
  if(pais && !isCoordTextV1226(pais))return pais;
  let coords=coordTextFromObjV1226(d);
  return knownPaisFromCoordsV1226(coords) || "-";
}

function destinationHorariosV1226(d){
  return firstValueV1226(d,["horarios","horario","hours","ventanaHoraria","ventana_horaria"]) || "-";
}

function collectDestinosV1226(){
  let map=new Map();

  (Array.isArray(destinos)?destinos:[]).forEach(d=>{
    let key=d.id || destinationNameV1226(d) || coordTextFromObjV1226(d);
    if(key)map.set(key,{...d,id:d.id||key});
  });

  (Array.isArray(trs)?trs:[]).forEach(t=>{
    let r=ruta(t)||{};
    let name=r.destino||t.destino||"";
    if(name && !map.has(name)){
      map.set(name,{
        id:name,
        nombre:name,
        localidad:r.localidadDestino||r.destinoLocalidad||"",
        pais:r.paisDestino||"",
        horarios:r.horariosDestino||"",
        coordenadas:r.coordenadasDestino||"",
        lat:r.destinoLat||t.destinoLat||"",
        lng:r.destinoLng||t.destinoLng||"",
        activo:true
      });
    }
  });

  return [...map.values()].sort((a,b)=>destinationNameV1226(a).localeCompare(destinationNameV1226(b),"es"));
}

function renderDestinos(){
  let el=q("destinosList");
  if(!el)return;
  let list=collectDestinosV1226();
  el.innerHTML=list.map(d=>{
    let coords=coordTextFromObjV1226(d);
    return `<div class="destinationCard">
      <div class="destinationTop">
        <div class="destinationName">📍 ${esc(destinationNameV1226(d))}</div>
        <span class="destinationStatus${activeClassV1226(d)}">${activeTextV1226(d)}</span>
      </div>
      <div class="destinationData">
        <div><b>Localidad:</b> ${esc(destinationLocalidadV1226(d))}</div>
        <div><b>País:</b> ${esc(destinationPaisV1226(d))}</div>
        <div class="fullLine"><b>Horarios:</b> ${esc(destinationHorariosV1226(d))}</div>
      </div>
      <div class="destinationCoords"><b>Coordenadas:</b> ${esc(coords||"-")}</div>
    </div>`;
  }).join("") || '<div class="destinationCard">No hay destinos registrados.</div>';
}

function renderClientes(){
  renderClients();
  renderDestinos();
}

const _tab_v1226 = tab;
tab = function(id){
  _tab_v1226(id);
  if(id==="clientes"){
    renderClients();
    renderDestinos();
  }
};




/* ===== V1.2.40 - Destinos solo desde coleccion destinos + contacto/telefonos ===== */

function textOrDefaultV1227(v){
  let s=String(v ?? "").trim();
  return s || "No informado";
}

function firstValueV1227(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
  }
  return "";
}

function isCoordTextV1227(v){
  let s=String(v||"").trim();
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s);
}

function parseCoordV1227(v){
  let s=String(v||"").trim();
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m ? {lat:Number(m[1]),lng:Number(m[2])} : null;
}

function activeTextV1227(x){
  return x?.activo===false || x?.active===false || String(x?.estado||"").toLowerCase()==="inactivo" ? "Inactivo" : "Activo";
}

function activeClassV1227(x){
  return activeTextV1227(x)==="Activo" ? "" : " inactive";
}

function coordTextFromObjV1227(d){
  let ubic=firstValueV1227(d,["coordenadas","coord","coords","ubicacion"]);
  if(isCoordTextV1227(ubic))return ubic;

  let lat=firstValueV1227(d,["lat","latitude","latitud"]);
  let lng=firstValueV1227(d,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;

  let gps=d?.gps||d?.ubicacionGPS||d?.posicion||d?.location||{};
  lat=firstValueV1227(gps,["lat","latitude","latitud"]);
  lng=firstValueV1227(gps,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;

  return "";
}

function knownLocalidadFromCoordsV1227(coords){
  let p=parseCoordV1227(coords);
  if(!p)return "";
  let refs=[
    {lat:-25.510092864116338,lng:-54.62630028465641,localidad:"Ciudad del Este"},
    {lat:-34.0910132,lng:-59.0895417,localidad:"Zárate"},
    {lat:-34.3512317,lng:-58.8042567,localidad:"Belén de Escobar"},
    {lat:-34.6160377,lng:-58.4588818,localidad:"Caballito"},
    {lat:-33.4489,lng:-70.6693,localidad:"Santiago"},
    {lat:-33.41262457164521,lng:-70.83997141903855,localidad:"Pudahuel"},
    {lat:-34.9011,lng:-56.1645,localidad:"Montevideo"}
  ];
  let best=null, bestD=999999;
  refs.forEach(r=>{
    let d=Math.hypot((p.lat-r.lat)*111,(p.lng-r.lng)*111);
    if(d<bestD){bestD=d;best=r;}
  });
  return bestD<=40 ? best.localidad : "";
}

function knownPaisFromCoordsV1227(coords){
  let p=parseCoordV1227(coords);
  if(!p)return "";
  if(p.lat<-17 && p.lat>-28 && p.lng<-53 && p.lng>-63)return "Paraguay";
  if(p.lat<-17 && p.lat>-56 && p.lng<-66 && p.lng>-76)return "Chile";
  if(p.lat<-21 && p.lat>-56 && p.lng<-53 && p.lng>-74)return "Argentina";
  if(p.lat<-30 && p.lat>-35.5 && p.lng<-53 && p.lng>-59)return "Uruguay";
  return "";
}

function destinationNameV1227(d){
  let name=firstValueV1227(d,["nombre","destino","name","id"]);
  if(name && !isCoordTextV1227(name))return name;
  return "Destino sin nombre";
}

function destinationLocalidadV1227(d){
  let loc=firstValueV1227(d,["localidad","city","ciudad"]);
  if(loc && !isCoordTextV1227(loc))return loc;
  return knownLocalidadFromCoordsV1227(coordTextFromObjV1227(d)) || "-";
}

function destinationPaisV1227(d){
  let pais=firstValueV1227(d,["pais","country"]);
  if(pais && !isCoordTextV1227(pais))return pais;
  return knownPaisFromCoordsV1227(coordTextFromObjV1227(d)) || "-";
}

function destinationHorariosV1227(d){
  return firstValueV1227(d,["horarios","horario","hours","ventanaHoraria","ventana_horaria"]) || "-";
}

function destinationContactoV1227(d){
  return firstValueV1227(d,["contacto","contact","responsable","referente","personaContacto"]) || "";
}

function destinationTelefonosV1227(d){
  return firstValueV1227(d,["telefonos","teléfonos","telefono","teléfono","phones","phone","tel","celular","mobile"]) || "";
}

/* Importante: destinos sale SOLO de la coleccion destinos para evitar duplicados desde transitos */
function collectDestinosV1227(){
  let map=new Map();

  (Array.isArray(destinos)?destinos:[]).forEach(d=>{
    let key=String(d.id || destinationNameV1227(d)).trim().toLowerCase();
    if(!key)return;

    if(!map.has(key)){
      map.set(key,{...d,id:d.id||destinationNameV1227(d)});
    }else{
      // fusionar por si llega duplicado desde la base
      let prev=map.get(key);
      map.set(key,{...d,...prev,id:prev.id||d.id||destinationNameV1227(d)});
    }
  });

  return [...map.values()].sort((a,b)=>destinationNameV1227(a).localeCompare(destinationNameV1227(b),"es"));
}

function renderDestinos(){
  let el=q("destinosList");
  if(!el)return;

  let list=collectDestinosV1227();

  el.innerHTML=list.map(d=>{
    let coords=coordTextFromObjV1227(d);
    return `<div class="destinationCard">
      <div class="destinationTop">
        <div class="destinationName">📍 ${esc(destinationNameV1227(d))}</div>
        <span class="destinationStatus${activeClassV1227(d)}">${activeTextV1227(d)}</span>
      </div>

      <div class="destinationData">
        <div><b>Localidad:</b> ${esc(destinationLocalidadV1227(d))}</div>
        <div><b>País:</b> ${esc(destinationPaisV1227(d))}</div>
        <div class="fullLine"><b>Horarios:</b> ${esc(destinationHorariosV1227(d))}</div>
      </div>

      <div class="destinationContactBox">
        <div><b>Contacto:</b> ${esc(textOrDefaultV1227(destinationContactoV1227(d)))}</div>
        <div><b>Teléfonos:</b> ${esc(textOrDefaultV1227(destinationTelefonosV1227(d)))}</div>
      </div>

      <div class="destinationCoords"><b>Coordenadas:</b> ${esc(coords||"-")}</div>
    </div>`;
  }).join("") || '<div class="destinationCard">No hay destinos registrados.</div>';
}

function renderClientes(){
  if(typeof renderClients==="function")renderClients();
  renderDestinos();
}

const _tab_v1227 = tab;
tab = function(id){
  _tab_v1227(id);
  if(id==="clientes"){
    if(typeof renderClients==="function")renderClients();
    renderDestinos();
  }
};




/* ===== V1.2.40 - Alertas con estado verificada/pendiente ===== */

window.alertFilterMode = window.alertFilterMode || "pendientes";

function setAlertFilter(mode){
  window.alertFilterMode=mode||"pendientes";
  document.querySelectorAll(".alertFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.alertFilter===window.alertFilterMode);
  });
  renderAlerts();
}

function alertId(t,a,idx){
  return String(a.id||a.alertaId||`${t.embarque||""}_${flota(t)||""}_${a.tipo||a.type||a.motivo||"alerta"}_${a.time||a.fecha||a.createdAt||a.ts||idx}`);
}

function alertSeenStore(){
  try{return JSON.parse(localStorage.getItem("eltaAlertasVerificadas")||"{}");}
  catch(e){return {};}
}

function saveAlertSeenStore(store){
  localStorage.setItem("eltaAlertasVerificadas",JSON.stringify(store||{}));
}

function isAlertVerified(t,a,idx){
  let id=alertId(t,a,idx);
  let local=alertSeenStore();
  return a.verificada===true || a.vista===true || a.verificado===true || local[id]?.verificada===true;
}

function alertVerifiedInfo(t,a,idx){
  let id=alertId(t,a,idx);
  let local=alertSeenStore();
  let por=a.verificadaPor||a.vistaPor||local[id]?.por||"";
  let fecha=a.verificadaFecha||a.vistaFecha||local[id]?.fecha||"";
  return {por,fecha};
}

function markAlertVerified(t,a,idx){
  let id=alertId(t,a,idx);
  let store=alertSeenStore();
  let user=(window.currentUser?.user||window.currentUser?.id||window.currentUser?.nombre||"admin");
  store[id]={verificada:true,por:user,fecha:new Date().toISOString()};
  saveAlertSeenStore(store);
  renderAlerts();
  renderBadge?.();
}

function alertTipo(a){
  return String(a.tipo||a.type||a.motivo||a.nombre||"Alerta");
}

function alertKmValue(a){
  return String(a.km||a.kilometro||a.kilómetro||a.kmRuta||a.progresiva||"-");
}

function alertDateValue(a){
  return fd(a.time||a.fecha||a.createdAt||a.ts);
}

function alertLocationValue(a,t){
  if(typeof alertLoc==="function")return alertLoc(a,t);
  let gps=a.gps||a.ubicacion||a.posicion||a.location||{};
  return a.localidad||a.ubicacionTexto||gps.localidad||gps.ubicacionTexto||locFull?.(t)||"-";
}

function collectOpenAlerts(){
  let rows=[];
  trs.filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      let verified=isAlertVerified(t,a,idx);
      if(window.alertFilterMode==="pendientes" && verified)return;
      if(window.alertFilterMode==="verificadas" && !verified)return;
      rows.push({t,a,idx,verified});
    });
  });
  return rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
}

function countBy(rows,fn){
  let out={};
  rows.forEach(r=>{
    let k=fn(r)||"-";
    out[k]=(out[k]||0)+1;
  });
  return out;
}

function barChartHtml(title, counts){
  let entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  let max=Math.max(1,...entries.map(x=>x[1]));
  return `<div class="alertChartCard">
    <div class="alertChartTitle">${title}</div>
    ${entries.length?entries.map(([k,v])=>`<div class="alertBarRow">
      <div class="alertBarLabel" title="${esc(k)}">${esc(k)}</div>
      <div class="alertBarTrack"><div class="alertBarFill" style="width:${Math.max(5,Math.round(v/max*100))}%"></div></div>
      <div class="alertBarValue">${v}</div>
    </div>`).join(""):'<div class="alertEmpty">Sin datos.</div>'}
  </div>`;
}

function renderAlertCharts(rows){
  if(!q("alertCharts"))return;
  let openRows=rows;
  let controlRows=openRows.filter(r=>alertTipo(r.a).toLowerCase().includes("control"));
  q("alertCharts").innerHTML=[
    barChartHtml("Tipo de alertas", countBy(openRows,r=>alertTipo(r.a))),
    barChartHtml("Alertas por flota", countBy(openRows,r=>`Flota ${flota(r.t)||"-"}`)),
    barChartHtml("Alertas por embarque", countBy(openRows,r=>`Emb. ${r.t.embarque||"-"}`)),
    barChartHtml("Control de carga por flota", countBy(controlRows,r=>`Flota ${flota(r.t)||"-"}`))
  ].join("");
}

function renderAlertCards(rows){
  if(!q("alertCards"))return;
  let byFleet={};
  rows.forEach(r=>{
    let key=flota(r.t)||"-";
    (byFleet[key]=byFleet[key]||[]).push(r);
  });

  let html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],"es",{numeric:true})).map(([fleet,list])=>{
    let pend=list.filter(r=>!r.verified).length;
    return `<div class="alertFleetCard">
      <div class="alertFleetTop">
        <div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div>
        <span class="alertPendingBadge">${pend} pendientes</span>
      </div>
      ${list.map(r=>{
        let info=alertVerifiedInfo(r.t,r.a,r.idx);
        return `<div class="alertItemCard">
          <div class="alertItemTop">
            <span>⚠️ ${esc(alertTipo(r.a))}</span>
            ${r.verified
              ? `<span class="alertVerifiedInfo">Verificada ${info.fecha?fd(info.fecha):""}</span>`
              : `<button class="alertVerifyBtn" onclick="markAlertVerified(trs.find(t=>String(t.embarque)==='${String(r.t.embarque||"").replace(/'/g,"\\'")}' && String(flota(t))==='${String(flota(r.t)||"").replace(/'/g,"\\'")}'), (trs.find(t=>String(t.embarque)==='${String(r.t.embarque||"").replace(/'/g,"\\'")}' && String(flota(t))==='${String(flota(r.t)||"").replace(/'/g,"\\'")}')?.alerts||[])[${r.idx}], ${r.idx})">Marcar verificada</button>`
            }
          </div>
          <div class="alertItemMeta">
            <div><b>Embarque:</b> ${esc(r.t.embarque||"-")}</div>
            <div><b>Km:</b> ${esc(alertKmValue(r.a))}</div>
            <div><b>Fecha/hora:</b> ${alertDateValue(r.a)}</div>
            <div><b>Localidad:</b> ${esc(alertLocationValue(r.a,r.t))}</div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }).join("");

  q("alertCards").innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
}

function renderAlerts(){
  document.querySelectorAll(".alertFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.alertFilter===window.alertFilterMode);
  });
  let rows=collectOpenAlerts();
  renderAlertCharts(rows);
  renderAlertCards(rows);
}

/* Badge superior: contar solo pendientes de verificar sobre transitos abiertos */
function pendingAlertsCount(){
  let count=0;
  trs.filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      if(!isAlertVerified(t,a,idx))count++;
    });
  });
  return count;
}

const _renderBadge_v1228 = typeof renderBadge==="function" ? renderBadge : null;
renderBadge = function(){
  let n=pendingAlertsCount();
  let els=document.querySelectorAll(".badgeCount,.alertBadge,.topAlertCount");
  els.forEach(el=>el.textContent=n);
  let common=q("alertCount")||q("badgeAlertas")||document.querySelector(".bell .count");
  if(common)common.textContent=n;
  if(_renderBadge_v1228){
    try{_renderBadge_v1228();}catch(e){}
    els.forEach(el=>el.textContent=n);
    if(common)common.textContent=n;
  }
};

const _tab_v1228 = tab;
tab = function(id){
  _tab_v1228(id);
  if(id==="alertas")renderAlerts();
};




/* ===== V1.2.40 - Render destinos sin texto Activo/Inactivo ===== */

function destinationStateClassV1229(d){
  let inactive = d?.activo===false || d?.active===false || String(d?.estado||"").toLowerCase()==="inactivo";
  return inactive ? "destinationInactive" : "destinationActive";
}

function renderDestinos(){
  let el=q("destinosList");
  if(!el)return;

  let list = typeof collectDestinosV1227==="function" ? collectDestinosV1227()
           : (typeof collectDestinosV1226==="function" ? collectDestinosV1226()
           : (Array.isArray(destinos)?destinos:[]));

  el.innerHTML=list.map(d=>{
    let coords = typeof coordTextFromObjV1227==="function" ? coordTextFromObjV1227(d)
              : (typeof coordTextFromObjV1226==="function" ? coordTextFromObjV1226(d) : "");
    let name = typeof destinationNameV1227==="function" ? destinationNameV1227(d)
             : (typeof destinationNameV1226==="function" ? destinationNameV1226(d) : (d.id||d.nombre||"-"));
    let localidad = typeof destinationLocalidadV1227==="function" ? destinationLocalidadV1227(d)
                  : (typeof destinationLocalidadV1226==="function" ? destinationLocalidadV1226(d) : (d.localidad||"-"));
    let pais = typeof destinationPaisV1227==="function" ? destinationPaisV1227(d)
             : (typeof destinationPaisV1226==="function" ? destinationPaisV1226(d) : (d.pais||"-"));
    let horarios = typeof destinationHorariosV1227==="function" ? destinationHorariosV1227(d)
                 : (typeof destinationHorariosV1226==="function" ? destinationHorariosV1226(d) : (d.horarios||"-"));
    let contacto = typeof destinationContactoV1227==="function" ? destinationContactoV1227(d)
                 : (typeof destinationContactoV1226==="function" ? destinationContactoV1226(d) : (d.contacto||""));
    let telefonos = typeof destinationTelefonosV1227==="function" ? destinationTelefonosV1227(d)
                  : (typeof destinationTelefonosV1226==="function" ? destinationTelefonosV1226(d) : (d.telefonos||d.telefono||""));
    let textDefault = typeof textOrDefaultV1227==="function" ? textOrDefaultV1227 : (v=>String(v||"").trim()||"No informado");

    return `<div class="destinationCard ${destinationStateClassV1229(d)}">
      <div class="destinationTop">
        <div class="destinationName">📍 ${esc(name)}</div>
      </div>

      <div class="destinationData">
        <div><b>Localidad:</b> ${esc(localidad)}</div>
        <div><b>País:</b> ${esc(pais)}</div>
        <div class="fullLine"><b>Horarios:</b> ${esc(horarios)}</div>
      </div>

      <div class="destinationContactBox">
        <div><b>Contacto:</b> ${esc(textDefault(contacto))}</div>
        <div><b>Teléfonos:</b> ${esc(textDefault(telefonos))}</div>
      </div>

      <div class="destinationCoords"><b>Coordenadas:</b> ${esc(coords||"-")}</div>
    </div>`;
  }).join("") || '<div class="destinationCard">No hay destinos registrados.</div>';
}




/* ===== V1.2.40 - Alertas: graficos con cantidad/% y boton funcional ===== */

function alertUniqueIdV1230(t,a,idx){
  return String(a.id||a.alertaId||`${t.embarque||""}_${flota(t)||""}_${alertTipo(a)}_${a.time||a.fecha||a.createdAt||a.ts||idx}`);
}

function markAlertVerifiedById(id){
  let store=alertSeenStore();
  let user=(window.currentUser?.user||window.currentUser?.id||window.currentUser?.nombre||"admin");
  store[id]={verificada:true,por:user,fecha:new Date().toISOString()};
  saveAlertSeenStore(store);
  renderAlerts();
  renderBadge?.();
}

function isAlertVerified(t,a,idx){
  let id=alertUniqueIdV1230(t,a,idx);
  let local=alertSeenStore();
  return a.verificada===true || a.vista===true || a.verificado===true || local[id]?.verificada===true;
}

function alertVerifiedInfo(t,a,idx){
  let id=alertUniqueIdV1230(t,a,idx);
  let local=alertSeenStore();
  let por=a.verificadaPor||a.vistaPor||local[id]?.por||"";
  let fecha=a.verificadaFecha||a.vistaFecha||local[id]?.fecha||"";
  return {por,fecha};
}

function collectOpenAlerts(){
  let rows=[];
  trs.filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      let verified=isAlertVerified(t,a,idx);
      if(window.alertFilterMode==="pendientes" && verified)return;
      if(window.alertFilterMode==="verificadas" && !verified)return;
      rows.push({
        t,a,idx,verified,
        id:alertUniqueIdV1230(t,a,idx)
      });
    });
  });
  return rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
}

function countBy(rows,fn){
  let out={};
  rows.forEach(r=>{
    let k=fn(r)||"-";
    out[k]=(out[k]||0)+1;
  });
  return out;
}

function barChartHtml(title, counts){
  let entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  let total=entries.reduce((a,b)=>a+b[1],0);
  let max=Math.max(1,...entries.map(x=>x[1]));
  return `<div class="alertChartCard">
    <div class="alertChartTitle">${title}</div>
    <div class="alertChartTotals">
      <div class="alertTotalBox">
        <div class="alertTotalNumber">${total}</div>
        <div class="alertTotalLabel">Total</div>
      </div>
      <div class="alertTotalBox">
        <div class="alertTotalNumber">${entries.length}</div>
        <div class="alertTotalLabel">Categorías</div>
      </div>
    </div>
    ${entries.length?entries.map(([k,v])=>{
      let pct=total?Math.round(v/total*100):0;
      return `<div class="alertBarRow">
        <div class="alertBarLabel" title="${esc(k)}">${esc(k)}</div>
        <div class="alertBarTrack"><div class="alertBarFill" style="width:${Math.max(5,Math.round(v/max*100))}%"></div></div>
        <div class="alertBarValue"><span>${v}</span><span class="alertBarPct">${pct}%</span></div>
      </div>`;
    }).join(""):'<div class="alertEmpty">Sin datos.</div>'}
  </div>`;
}

function renderAlertCharts(rows){
  if(!q("alertCharts"))return;
  let controlRows=rows.filter(r=>alertTipo(r.a).toLowerCase().includes("control"));
  q("alertCharts").innerHTML=[
    barChartHtml("Tipo de alertas", countBy(rows,r=>alertTipo(r.a))),
    barChartHtml("Alertas por flota", countBy(rows,r=>`Flota ${flota(r.t)||"-"}`)),
    barChartHtml("Alertas por embarque", countBy(rows,r=>`Emb. ${r.t.embarque||"-"}`)),
    barChartHtml("Control de carga por flota", countBy(controlRows,r=>`Flota ${flota(r.t)||"-"}`))
  ].join("");
}

function renderAlertCards(rows){
  if(!q("alertCards"))return;
  let byFleet={};
  rows.forEach(r=>{
    let key=flota(r.t)||"-";
    (byFleet[key]=byFleet[key]||[]).push(r);
  });

  let html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],"es",{numeric:true})).map(([fleet,list])=>{
    let pend=list.filter(r=>!r.verified).length;
    let total=list.length;
    return `<div class="alertFleetCard ${pend?"hasPending":"noPending"}">
      <div class="alertFleetTop">
        <div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div>
        <div class="alertFleetSummary">
          <span class="alertPendingBadge ${pend?"":"ok"}">${pend} pendientes</span>
          <span class="alertPendingBadge ok">${total} total</span>
        </div>
      </div>
      ${list.map(r=>{
        let info=alertVerifiedInfo(r.t,r.a,r.idx);
        return `<div class="alertItemCard">
          <div class="alertItemContent">
            <div class="alertItemTop">
              <span>⚠️ ${esc(alertTipo(r.a))}</span>
            </div>
            <div class="alertItemMeta">
              <div><b>Embarque:</b> ${esc(r.t.embarque||"-")}</div>
              <div><b>Km:</b> ${esc(alertKmValue(r.a))}</div>
              <div><b>Fecha/hora:</b> ${alertDateValue(r.a)}</div>
              <div><b>Localidad:</b> ${esc(alertLocationValue(r.a,r.t))}</div>
            </div>
          </div>
          <div class="alertItemAction">
            ${r.verified
              ? `<span class="alertVerifiedInfo">Verificada${info.fecha?`<br>${fd(info.fecha)}`:""}</span>`
              : `<button class="alertVerifyBtn" onclick="markAlertVerifiedById('${String(r.id).replace(/\\/g,"\\\\").replace(/'/g,"\\'")}')">Marcar<br>verificada</button>`
            }
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }).join("");

  q("alertCards").innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
}

function pendingAlertsCount(){
  let count=0;
  trs.filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      if(!isAlertVerified(t,a,idx))count++;
    });
  });
  return count;
}

renderBadge = function(){
  let n=pendingAlertsCount();
  document.querySelectorAll(".badgeCount,.alertBadge,.topAlertCount,#alertCount,#badgeAlertas").forEach(el=>el.textContent=n);
  let common=document.querySelector(".bell .count");
  if(common)common.textContent=n;
};

function renderAlerts(){
  document.querySelectorAll(".alertFilters button").forEach(b=>{
    b.classList.toggle("active", b.dataset.alertFilter===window.alertFilterMode);
  });
  let rows=collectOpenAlerts();
  renderAlertCharts(rows);
  renderAlertCards(rows);
}




/* ===== V1.2.40 - Render clientes sin texto Activo/Inactivo ===== */

function clientStateClassV1231(c){
  let inactive = c?.activo===false || c?.active===false || String(c?.estado||"").toLowerCase()==="inactivo";
  return inactive ? "clientInactive" : "clientActive";
}

function renderClients(){
  let el=q("clientsList");
  if(!el)return;

  let list=(Array.isArray(clientes)?clientes:[]).slice().sort((a,b)=>{
    let an = typeof clientNameV1226==="function" ? clientNameV1226(a) : (a.id||a.nombre||"");
    let bn = typeof clientNameV1226==="function" ? clientNameV1226(b) : (b.id||b.nombre||"");
    return an.localeCompare(bn,"es");
  });

  el.innerHTML=list.map(c=>{
    let name = typeof clientNameV1226==="function" ? clientNameV1226(c) : (c.id||c.nombre||"-");
    let contacto = typeof clientContactV1226==="function" ? clientContactV1226(c) : (c.contacto||"-");
    let telefono = typeof clientPhoneV1226==="function" ? clientPhoneV1226(c) : (c.telefono||c.telefonos||"-");
    return `<div class="clientCard ${clientStateClassV1231(c)}">
      <div class="clientTop">
        <div class="clientName">🏢 ${esc(name)}</div>
      </div>
      <div class="clientData">
        <div><b>ID:</b> ${esc(c.id||name)}</div>
        <div class="clientEstadoLine"><b>Estado:</b> ${c?.activo===false ? "Inactivo" : "Activo"}</div>
      </div>
      <div class="clientContactBox">
        <div><b>Contacto:</b> ${esc(String(contacto||"").trim()||"No informado")}</div>
        <div><b>Teléfono:</b> ${esc(String(telefono||"").trim()||"No informado")}</div>
      </div>
    </div>`;
  }).join("")||'<div class="clientCard">No hay clientes registrados.</div>';
}

function renderClientes(){
  renderClients();
  if(typeof renderDestinos==="function")renderDestinos();
}

const _tab_v1231 = tab;
tab = function(id){
  _tab_v1231(id);
  if(id==="clientes"){
    renderClients();
    if(typeof renderDestinos==="function")renderDestinos();
  }
};



/* ===== V1.2.40 - Alertas: fix contador, KM y detalle ===== */
window.ELTA_ALERT_INDEX = window.ELTA_ALERT_INDEX || {};
function normalizeAlertIdV1232(t,a,idx){
  return String(a.id||a.alertaId||a.uid||`${t.embarque||""}|${flota(t)||""}|${alertTipo(a)}|${a.time||a.fecha||a.createdAt||a.ts||""}|${idx}`);
}
function alertSeenStore(){try{return JSON.parse(localStorage.getItem("eltaAlertasVerificadas")||"{}");}catch(e){return {};}}
function saveAlertSeenStore(store){localStorage.setItem("eltaAlertasVerificadas",JSON.stringify(store||{}));}
function isAlertVerified(t,a,idx){
  let id=normalizeAlertIdV1232(t,a,idx), local=alertSeenStore();
  return a.verificada===true || a.vista===true || a.verificado===true || local[id]?.verificada===true;
}
function alertVerifiedInfo(t,a,idx){
  let id=normalizeAlertIdV1232(t,a,idx), local=alertSeenStore();
  return {por:a.verificadaPor||a.vistaPor||local[id]?.por||"",fecha:a.verificadaFecha||a.vistaFecha||local[id]?.fecha||""};
}
function markAlertVerifiedById(id){
  let store=alertSeenStore();
  let user=(window.currentUser?.user||window.currentUser?.id||window.currentUser?.nombre||"admin");
  store[id]={verificada:true,por:user,fecha:new Date().toISOString()};
  saveAlertSeenStore(store);
  renderAlerts();
  renderBadge();
}
function alertTipo(a){return String(a.tipo||a.type||a.motivo||a.nombre||"Alerta");}
function alertKmValue(a,t){
  let keys=["km","kilometro","kilómetro","kilometros","kilómetros","kmRuta","progresiva","distancia","distance"];
  for(let src of [a,a?.gps,a?.ubicacion,a?.posicion,a?.location,(typeof lastU==="function"?(lastU(t)||{}):{})]){
    for(let k of keys){
      let v=src?.[k];
      if(v!==undefined && v!==null && String(v).trim()!=="")return String(v).trim();
    }
  }
  return "-";
}
function alertDateValue(a){return fd(a.time||a.fecha||a.createdAt||a.ts||a.date||a.datetime);}
function alertLocationValue(a,t){
  if(typeof alertLoc==="function"){
    let v=alertLoc(a,t);
    if(v && String(v).trim() && String(v).trim()!=="-")return v;
  }
  let gps=a.gps||a.ubicacion||a.posicion||a.location||{};
  return a.localidad||a.ubicacionTexto||a.locationName||gps.localidad||gps.ubicacionTexto||gps.localidadTexto||(typeof locFull==="function"?locFull(t):"-")||"-";
}
function alertChoferValue(t){return typeof driverName==="function" ? driverName(t) : (t.chofer||t.driver||t.conductor||"-");}
function transitUpdatedV1232(t){
  let u=typeof lastU==="function" ? (lastU(t)||{}) : {};
  return u.time||u.fecha||u.createdAt||u.ts||t.updatedAt||t.updateAt||t.start?.time||t.start;
}
function collectOpenAlerts(){
  window.ELTA_ALERT_INDEX={};
  let rows=[];
  trs.filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      let id=normalizeAlertIdV1232(t,a,idx), verified=isAlertVerified(t,a,idx);
      if(window.alertFilterMode==="pendientes" && verified)return;
      if(window.alertFilterMode==="verificadas" && !verified)return;
      let row={t,a,idx,verified,id};
      rows.push(row); window.ELTA_ALERT_INDEX[id]=row;
    });
  });
  return rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
}
function pendingAlertsCount(){
  let count=0;
  trs.filter(openT).forEach(t=>(t.alerts||[]).forEach((a,idx)=>{if(!isAlertVerified(t,a,idx))count++;}));
  return count;
}
function updateAlertBadgeDom(n){
  document.querySelectorAll(".badgeCount,.alertBadge,.topAlertCount,#alertCount,#badgeAlertas,.bell .count,.bellCount,.notificationCount,.notifCount,[data-alert-count],[data-badge='alertas']").forEach(el=>el.textContent=n);
  document.querySelectorAll("button, .topbar, .header, .bell, .notification, .alertButton").forEach(el=>{
    if((el.textContent||"").includes("🔔")){
      el.querySelectorAll("span,b,small,div").forEach(s=>{
        let txt=(s.textContent||"").trim();
        if(/^\d+$/.test(txt) && Number(txt)>=0 && Number(txt)<999)s.textContent=n;
      });
    }
  });
}
renderBadge=function(){updateAlertBadgeDom(pendingAlertsCount());};
function barChartHtml(title, counts){
  let entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  let total=entries.reduce((a,b)=>a+b[1],0), max=Math.max(1,...entries.map(x=>x[1]));
  return `<div class="alertChartCard"><div class="alertChartTitle">${title}</div><div class="alertChartTotals"><div class="alertTotalBox"><div class="alertTotalNumber">${total}</div><div class="alertTotalLabel">Total</div></div><div class="alertTotalBox"><div class="alertTotalNumber">${entries.length}</div><div class="alertTotalLabel">Categorías</div></div></div>${entries.length?entries.map(([k,v])=>{let pct=total?Math.round(v/total*100):0;return `<div class="alertBarRow"><div class="alertBarLabel" title="${esc(k)}">${esc(k)}</div><div class="alertBarTrack"><div class="alertBarFill" style="width:${Math.max(5,Math.round(v/max*100))}%"></div></div><div class="alertBarValue"><span>${v}</span><span class="alertBarPct">${pct}%</span></div></div>`;}).join(""):'<div class="alertEmpty">Sin datos.</div>'}</div>`;
}
function renderAlertCards(rows){
  if(!q("alertCards"))return;
  let byFleet={}; rows.forEach(r=>{let key=flota(r.t)||"-";(byFleet[key]=byFleet[key]||[]).push(r);});
  let html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],"es",{numeric:true})).map(([fleet,list])=>{
    let pend=list.filter(r=>!r.verified).length,total=list.length;
    return `<div class="alertFleetCard ${pend?"hasPending":"noPending"}"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div><div class="alertFleetSummary"><span class="alertPendingBadge ${pend?"":"ok"}">${pend} pendientes</span><span class="alertPendingBadge ok">${total} total</span></div></div>${list.map(r=>{let info=alertVerifiedInfo(r.t,r.a,r.idx), rt=ruta(r.t)||{};return `<div class="alertItemCard"><div class="alertItemContent"><div class="alertItemTop"><span>⚠️ ${esc(alertTipo(r.a))}</span></div><div class="alertItemMeta"><div><b>Embarque:</b> ${esc(r.t.embarque||"-")}</div><div><b>Km:</b> <span class="alertKmHighlight">${esc(alertKmValue(r.a,r.t))}</span></div><div><b>Fecha/hora:</b> ${alertDateValue(r.a)}</div><div><b>Localidad:</b> ${esc(alertLocationValue(r.a,r.t))}</div></div><div class="alertTransitDetail"><div class="alertChoferLine"><b>Chofer:</b> ${esc(alertChoferValue(r.t))}</div><div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div><div><b>Origen:</b> ${esc(rt.origen||"-")}</div><div><b>Destino:</b> ${esc(rt.destino||"-")}</div><div><b>Estado:</b> ${openT(r.t)?"En tránsito":"Finalizado"}</div><div><b>Inicio:</b> ${fd(r.t.start?.time||r.t.start)}</div><div><b>Últ. reporte:</b> ${fd(transitUpdatedV1232(r.t))}</div><div><b>Lote/Carga:</b> ${esc(r.t.lote||r.t.carga||"-")}</div></div></div><div class="alertItemAction">${r.verified?`<span class="alertVerifiedInfo">Verificada${info.fecha?`<br>${fd(info.fecha)}`:""}</span>`:`<button class="alertVerifyBtn" onclick="markAlertVerifiedById('${String(r.id).replace(/\\/g,"\\\\").replace(/'/g,"\\'")}')">Marcar<br>verificada</button>`}</div></div>`;}).join("")}</div>`;
  }).join("");
  q("alertCards").innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
}
function renderAlerts(){
  document.querySelectorAll(".alertFilters button").forEach(b=>b.classList.toggle("active", b.dataset.alertFilter===window.alertFilterMode));
  let rows=collectOpenAlerts();
  renderAlertCharts(rows);
  renderAlertCards(rows);
  renderBadge();
}
const _refresh_v1232=typeof refresh==="function"?refresh:null;
refresh=async function(){
  if(_refresh_v1232)await _refresh_v1232();
  renderBadge();
};




/* ===== V1.2.40 - Alertas: iconos por tipo y mejora visual ===== */

function alertIcon(tipo){
  let t=String(tipo||"").toLowerCase();
  if(t.includes("niebla"))return "🌫️";
  if(t.includes("control")&&t.includes("carga"))return "📦";
  if(t.includes("ingreso")&&t.includes("aduana"))return "🛃";
  if(t.includes("egreso")&&t.includes("aduana"))return "🚛";
  if(t.includes("aduana"))return "🛃";
  if(t.includes("rotura")||t.includes("avería")||t.includes("averia"))return "🔧";
  if(t.includes("desv"))return "↪️";
  if(t.includes("demora")||t.includes("tarde"))return "⏱️";
  if(t.includes("velocidad"))return "🚨";
  if(t.includes("deten")||t.includes("parada"))return "🛑";
  if(t.includes("combustible")||t.includes("fuel"))return "⛽";
  if(t.includes("mantenimiento"))return "🛠️";
  if(t.includes("gps")||t.includes("señal")||t.includes("senal"))return "📡";
  if(t.includes("puerta"))return "🚪";
  if(t.includes("accidente")||t.includes("siniestro"))return "🚨";
  return "⚠️";
}

function alertTipoLabel(a){
  let tipo=alertTipo(a);
  return `<span class="alertTypeIcon">${alertIcon(tipo)}</span>${esc(tipo)}`;
}

function barChartHtml(title, counts){
  let entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  let total=entries.reduce((a,b)=>a+b[1],0), max=Math.max(1,...entries.map(x=>x[1]));
  return `<div class="alertChartCard">
    <div class="alertChartTitle">${title}</div>
    <div class="alertChartTotals">
      <div class="alertTotalBox"><div class="alertTotalNumber">${total}</div><div class="alertTotalLabel">Total</div></div>
      <div class="alertTotalBox"><div class="alertTotalNumber">${entries.length}</div><div class="alertTotalLabel">Categorías</div></div>
    </div>
    ${entries.length?entries.map(([k,v])=>{
      let pct=total?Math.round(v/total*100):0;
      let labelIcon=title.toLowerCase().includes("tipo") ? `<span>${alertIcon(k)}</span>` : "";
      return `<div class="alertBarRow">
        <div class="alertBarLabel" title="${esc(k)}">${labelIcon}<span>${esc(k)}</span></div>
        <div class="alertBarTrack"><div class="alertBarFill" style="width:${Math.max(5,Math.round(v/max*100))}%"></div></div>
        <div class="alertBarValue"><span>${v}</span><span class="alertBarPct">${pct}%</span></div>
      </div>`;
    }).join(""):'<div class="alertEmpty">Sin datos.</div>'}
  </div>`;
}

function renderAlertCards(rows){
  if(!q("alertCards"))return;
  let byFleet={};
  rows.forEach(r=>{
    let key=flota(r.t)||"-";
    (byFleet[key]=byFleet[key]||[]).push(r);
  });

  let html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],"es",{numeric:true})).map(([fleet,list])=>{
    let pend=list.filter(r=>!r.verified).length,total=list.length;
    return `<div class="alertFleetCard ${pend?"hasPending":"noPending"}">
      <div class="alertFleetTop">
        <div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div>
        <div class="alertFleetSummary">
          <span class="alertPendingBadge ${pend?"pending":"ok"}">${pend} pendientes</span>
          <span class="alertPendingBadge ok">${total} total</span>
        </div>
      </div>
      ${list.map(r=>{
        let info=alertVerifiedInfo(r.t,r.a,r.idx), rt=ruta(r.t)||{};
        return `<div class="alertItemCard ${r.verified?"verifiedAlert":"pendingAlert"}">
          <div class="alertItemContent">
            <div class="alertItemTop">
              <span>${alertTipoLabel(r.a)}</span>
            </div>
            <div class="alertItemMeta">
              <div><b>Embarque:</b> ${esc(r.t.embarque||"-")}</div>
              <div><b>Km:</b> <span class="alertKmHighlight">${esc(alertKmValue(r.a,r.t))}</span></div>
              <div><b>Fecha/hora:</b> ${alertDateValue(r.a)}</div>
              <div><b>Localidad:</b> ${esc(alertLocationValue(r.a,r.t))}</div>
            </div>
            <div class="alertTransitDetail">
              <div class="alertChoferLine"><b>Chofer:</b> ${esc(alertChoferValue(r.t))}</div>
              <div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div>
              <div><b>Origen:</b> ${esc(rt.origen||"-")}</div>
              <div><b>Destino:</b> ${esc(rt.destino||"-")}</div>
              <div><b>Estado:</b> ${openT(r.t)?"En tránsito":"Finalizado"}</div>
              <div><b>Inicio:</b> ${fd(r.t.start?.time||r.t.start)}</div>
              <div><b>Últ. reporte:</b> ${fd(transitUpdatedV1232(r.t))}</div>
              <div><b>Lote/Carga:</b> ${esc(r.t.lote||r.t.carga||"-")}</div>
            </div>
          </div>
          <div class="alertItemAction">
            ${r.verified
              ? `<span class="alertVerifiedInfo">Verificada${info.fecha?`<br>${fd(info.fecha)}`:""}</span>`
              : `<button class="alertVerifyBtn" onclick="markAlertVerifiedById('${String(r.id).replace(/\\/g,"\\\\").replace(/'/g,"\\'")}')">Marcar<br>verificada</button>`
            }
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }).join("");

  q("alertCards").innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
}

function updateAlertBadgeDom(n){
  document.querySelectorAll(".badgeCount,.alertBadge,.topAlertCount,#alertCount,#badgeAlertas,.bell .count,.bellCount,.notificationCount,.notifCount,[data-alert-count],[data-badge='alertas']").forEach(el=>{
    el.textContent=n;
    el.classList.toggle("alertMenuPendingBadge",Number(n)>0);
  });
  document.querySelectorAll("button, .topbar, .header, .bell, .notification, .alertButton").forEach(el=>{
    if((el.textContent||"").includes("🔔")){
      el.querySelectorAll("span,b,small,div").forEach(s=>{
        let txt=(s.textContent||"").trim();
        if(/^\d+$/.test(txt) && Number(txt)>=0 && Number(txt)<999){
          s.textContent=n;
          s.classList.toggle("alertMenuPendingBadge",Number(n)>0);
        }
      });
    }
  });
}

renderBadge=function(){updateAlertBadgeDom(pendingAlertsCount());};

function renderAlerts(){
  document.querySelectorAll(".alertFilters button").forEach(b=>b.classList.toggle("active", b.dataset.alertFilter===window.alertFilterMode));
  let rows=collectOpenAlerts();
  renderAlertCharts(rows);
  renderAlertCards(rows);
  renderBadge();
}



/* ===== V1.2.40 - Vista Clima ===== */
function parseCoordsClima(v){let s=String(v||"").trim();let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);return m?{lat:Number(m[1]),lng:Number(m[2]),text:`${m[1]}, ${m[2]}`} : null;}
function coordsFromObjClima(o){if(!o)return null;let c=parseCoordsClima(o.ubicacion||o.coordenadas||o.coords||o.coord||"");if(c)return c;let lat=o.lat||o.latitude||o.latitud,lng=o.lng||o.lon||o.longitude||o.longitud;if(lat&&lng)return{lat:Number(lat),lng:Number(lng),text:`${lat}, ${lng}`};return null;}
function weatherByCoords(c){if(!c)return{temp:"-",desc:"Sin coordenadas",wind:"-",sens:"-",icon:"☁️"};let lat=c.lat,lng=c.lng,desc="Parcialmente nublado",icon="⛅",temp=12,wind=8;if(lat<-32&&lat>-35&&lng<-72&&lng>-69){desc="Frío cordillerano";icon="❄️";temp=4;wind=22;}else if(lat<-25&&lat>-26&&lng<-55&&lng>-54){desc="Húmedo cálido";icon="🌦️";temp=24;wind=9;}else if(lat<-34&&lat>-35&&lng<-59&&lng>-57){desc="Parcialmente nublado";icon="☁️";temp=8;wind=4;}else if(lat<-33&&lat>-35&&lng<-71&&lng>-70){desc="Nublado";icon="☁️";temp=11;wind=10;}else if(lat<-34&&lat>-35.5&&lng<-57&&lng>-55){desc="Templado";icon="🌤️";temp=14;wind=12;}return{temp,desc,wind,sens:Math.max(-5,temp-2),icon};}
function destinationNameClima(d){return (typeof destinationNameV1227==="function"?destinationNameV1227(d):(typeof destinationNameV1226==="function"?destinationNameV1226(d):(d.nombre||d.destino||d.name||d.id||"Destino")));}
function destinoLocalidadClima(d){return (typeof destinationLocalidadV1227==="function"?destinationLocalidadV1227(d):(typeof destinationLocalidadV1226==="function"?destinationLocalidadV1226(d):(d.localidad||d.ciudad||"-")));}
function destinoPaisClima(d){return (typeof destinationPaisV1227==="function"?destinationPaisV1227(d):(typeof destinationPaisV1226==="function"?destinationPaisV1226(d):(d.pais||d.country||"-")));}
function weatherCard(title,subtitle,c,extra="",cls=""){let w=weatherByCoords(c);return `<div class="weatherCard ${cls}"><div class="weatherCardTop"><div><div class="weatherTitle">${title}</div><div class="weatherDesc">${w.icon} ${esc(w.desc)}</div></div><div class="weatherTemp">${esc(w.temp)}°</div></div><div class="weatherData"><div><b>Ubicación:</b> ${esc(subtitle||"-")}</div><div><b>Sensación:</b> ${esc(w.sens)}°</div><div><b>Viento:</b> ${esc(w.wind)} km/h</div><div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div></div>${extra}<div class="weatherCoords"><b>Coordenadas:</b> ${esc(c?.text||"-")}</div></div>`;}
function renderWeatherDestinations(){if(!q("weatherDestinations"))return;let list=Array.isArray(destinos)?destinos:[];q("weatherDestinations").innerHTML=list.map(d=>{let c=coordsFromObjClima(d);let sub=[destinoLocalidadClima(d),destinoPaisClima(d)].filter(x=>x&&x!=="-").join(", ");return weatherCard(`📍 ${esc(destinationNameClima(d))}`,sub,c);}).join("")||'<div class="weatherCard">No hay destinos registrados.</div>';}
function renderWeatherPasses(){if(!q("weatherPasses"))return;let paso={lat:-32.824,lng:-70.086,text:"-32.824, -70.086"};let w=weatherByCoords(paso);let status=(w.temp<=2||w.wind>=35)?"PASO VERIFICAR":"PASO OPERATIVO";let cls=status.includes("VERIFICAR")?"passWarning":"passOk";q("weatherPasses").innerHTML=`<div class="weatherCard ${cls}"><div class="weatherCardTop"><div><div class="weatherTitle">🚚 Paso Los Libertadores</div><div class="weatherDesc">${status}</div></div><div class="weatherTemp">${w.temp}°</div></div><div class="weatherData"><div><b>Zona:</b> Argentina / Chile</div><div><b>Condición:</b> ${w.icon} ${esc(w.desc)}</div><div><b>Viento:</b> ${w.wind} km/h</div><div><b>Sensación:</b> ${w.sens}°</div></div><div class="weatherCoords"><b>Coordenadas:</b> ${paso.text}</div></div>`;}
function lastGpsCoords(t){let u=typeof lastU==="function"?(lastU(t)||{}):{};return coordsFromObjClima(u)||coordsFromObjClima(t)||parseCoordsClima(u.coords||u.coordenadas||u.ubicacion||"");}
function renderWeatherFleets(){if(!q("weatherFleets"))return;let abiertos=trs.filter(openT);q("weatherFleets").innerHTML=abiertos.map(t=>{let c=lastGpsCoords(t),rt=ruta(t)||{};let upd=typeof transitUpdatedValue==="function"?transitUpdatedValue(t):(t.updatedAt||t.start?.time||t.start);let extra=`<div class="weatherFleetTransit"><div><b>Flota:</b> ${esc(flota(t)||"-")}</div><div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div><div><b>Embarque:</b> ${esc(t.embarque||"-")}</div><div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div><div><b>Origen:</b> ${esc(rt.origen||"-")}</div><div><b>Destino:</b> ${esc(rt.destino||"-")}</div><div><b>Últ. reporte:</b> ${fd(upd)}</div><div><b>Localidad GPS:</b> ${esc(typeof locFull==="function"?locFull(t):"-")}</div></div>`;return weatherCard(`🚚 Flota ${esc(flota(t)||"-")}`,typeof locFull==="function"?locFull(t):"",c,extra,"fleetWeatherCard");}).join("")||'<div class="weatherCard">No hay flotas en tránsito.</div>';}
function renderClima(){renderWeatherDestinations();renderWeatherPasses();renderWeatherFleets();}
const _tab_v1234=tab;tab=function(id){_tab_v1234(id);if(id==="clima")renderClima();};
const _refresh_v1234=typeof refresh==="function"?refresh:null;refresh=async function(){if(_refresh_v1234)await _refresh_v1234();if(q("clima")?.classList.contains("active"))renderClima();};




/* ===== V1.2.40 - Clima: carga de datos + iconos por tarjeta ===== */

function parseCoordsClima(v){
  let s=String(v||"").trim();
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m?{lat:Number(m[1]),lng:Number(m[2]),text:`${m[1]}, ${m[2]}`} : null;
}

function coordsFromObjClima(o){
  if(!o)return null;
  let c=parseCoordsClima(o.ubicacion||o.coordenadas||o.coords||o.coord||"");
  if(c)return c;
  let lat=o.lat||o.latitude||o.latitud;
  let lng=o.lng||o.lon||o.longitude||o.longitud;
  if(lat!==undefined && lng!==undefined && String(lat).trim()!=="" && String(lng).trim()!==""){
    return {lat:Number(lat),lng:Number(lng),text:`${lat}, ${lng}`};
  }
  return null;
}

function weatherByCoords(c){
  if(!c)return{temp:"-",desc:"Sin coordenadas",wind:"-",sens:"-",icon:"☁️"};
  let lat=c.lat,lng=c.lng,desc="Parcialmente nublado",icon="⛅",temp=12,wind=8;
  if(lat<-32&&lat>-35&&lng<-72&&lng>-69){desc="Frío cordillerano";icon="❄️";temp=4;wind=22;}
  else if(lat<-25&&lat>-26&&lng<-55&&lng>-54){desc="Húmedo cálido";icon="🌦️";temp=24;wind=9;}
  else if(lat<-34&&lat>-35&&lng<-59&&lng>-57){desc="Parcialmente nublado";icon="☁️";temp=8;wind=4;}
  else if(lat<-33&&lat>-35&&lng<-71&&lng>-70){desc="Nublado";icon="☁️";temp=11;wind=10;}
  else if(lat<-34&&lat>-35.5&&lng<-57&&lng>-55){desc="Templado";icon="🌤️";temp=14;wind=12;}
  return{temp,desc,wind,sens:Math.max(-5,temp-2),icon};
}

function destinationNameClima(d){
  return (typeof destinationNameV1227==="function"?destinationNameV1227(d):
    (typeof destinationNameV1226==="function"?destinationNameV1226(d):
    (d.nombre||d.destino||d.name||d.id||"Destino")));
}

function destinoLocalidadClima(d){
  return (typeof destinationLocalidadV1227==="function"?destinationLocalidadV1227(d):
    (typeof destinationLocalidadV1226==="function"?destinationLocalidadV1226(d):
    (d.localidad||d.ciudad||"-")));
}

function destinoPaisClima(d){
  return (typeof destinationPaisV1227==="function"?destinationPaisV1227(d):
    (typeof destinationPaisV1226==="function"?destinationPaisV1226(d):
    (d.pais||d.country||"-")));
}

function weatherCard(title,subtitle,c,extra="",cls="",iconOverride=""){
  let w=weatherByCoords(c);
  let icon=iconOverride||w.icon||"🌦️";
  return `<div class="weatherCard ${cls}">
    <div class="weatherCardTop">
      <div class="weatherTitleWrap">
        <span class="weatherIconBadge">${icon}</span>
        <div class="weatherTitleText">
          <div class="weatherTitle">${title}</div>
          <div class="weatherDesc">${w.icon} ${esc(w.desc)}</div>
        </div>
      </div>
      <div class="weatherTemp">${esc(w.temp)}°</div>
    </div>
    <div class="weatherData">
      <div><b>Ubicación:</b> ${esc(subtitle||"-")}</div>
      <div><b>Sensación:</b> ${esc(w.sens)}°</div>
      <div><b>Viento:</b> ${esc(w.wind)} km/h</div>
      <div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div>
    </div>
    ${extra}
    <div class="weatherCoords"><b>Coordenadas:</b> ${esc(c?.text||"-")}</div>
  </div>`;
}

function renderWeatherDestinations(){
  let el=q("weatherDestinations");
  if(!el)return;
  let list=Array.isArray(destinos)?destinos:[];
  el.innerHTML=list.map(d=>{
    let c=coordsFromObjClima(d);
    let sub=[destinoLocalidadClima(d),destinoPaisClima(d)].filter(x=>x&&x!=="-").join(", ");
    return weatherCard(`${esc(destinationNameClima(d))}`,sub,c,"","","📍");
  }).join("")||'<div class="weatherLoading">No hay destinos registrados o todavía no cargaron datos.</div>';
}

function renderWeatherPasses(){
  let el=q("weatherPasses");
  if(!el)return;
  let paso={lat:-32.824,lng:-70.086,text:"-32.824, -70.086"};
  let w=weatherByCoords(paso);
  let status=(w.temp<=2||w.wind>=35)?"PASO VERIFICAR":"PASO OPERATIVO";
  let cls=status.includes("VERIFICAR")?"passWarning":"passOk";
  el.innerHTML=`<div class="weatherCard ${cls}">
    <div class="weatherCardTop">
      <div class="weatherTitleWrap">
        <span class="weatherIconBadge">🚚</span>
        <div class="weatherTitleText">
          <div class="weatherTitle">Paso Los Libertadores</div>
          <div class="weatherDesc">${status}</div>
        </div>
      </div>
      <div class="weatherTemp">${w.temp}°</div>
    </div>
    <div class="weatherData">
      <div><b>Zona:</b> Argentina / Chile</div>
      <div><b>Condición:</b> ${w.icon} ${esc(w.desc)}</div>
      <div><b>Viento:</b> ${w.wind} km/h</div>
      <div><b>Sensación:</b> ${w.sens}°</div>
    </div>
    <div class="weatherCoords"><b>Coordenadas:</b> ${paso.text}</div>
  </div>`;
}

function lastGpsCoords(t){
  let u=typeof lastU==="function"?(lastU(t)||{}):{};
  return coordsFromObjClima(u)||coordsFromObjClima(t)||parseCoordsClima(u.coords||u.coordenadas||u.ubicacion||"");
}

function renderWeatherFleets(){
  let el=q("weatherFleets");
  if(!el)return;
  let abiertos=Array.isArray(trs)?trs.filter(openT):[];
  el.innerHTML=abiertos.map(t=>{
    let c=lastGpsCoords(t),rt=ruta(t)||{};
    let upd=typeof transitUpdatedValue==="function"?transitUpdatedValue(t):(t.updatedAt||t.start?.time||t.start);
    let extra=`<div class="weatherFleetTransit">
      <div><b>Flota:</b> ${esc(flota(t)||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div>
      <div><b>Origen:</b> ${esc(rt.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(rt.destino||"-")}</div>
      <div><b>Últ. reporte:</b> ${fd(upd)}</div>
      <div><b>Localidad GPS:</b> ${esc(typeof locFull==="function"?locFull(t):"-")}</div>
    </div>`;
    return weatherCard(`Flota ${esc(flota(t)||"-")}`,typeof locFull==="function"?locFull(t):"",c,extra,"fleetWeatherCard","🚚");
  }).join("")||'<div class="weatherLoading">No hay flotas en tránsito.</div>';
}

function renderClima(){
  renderWeatherDestinations();
  renderWeatherPasses();
  renderWeatherFleets();
}

/* Si los datos no estaban cargados cuando se abre Clima, cargarlos y renderizar. */
async function ensureClimaDataAndRender(){
  q("weatherDestinations") && (q("weatherDestinations").innerHTML='<div class="weatherLoading">Cargando destinos...</div>');
  q("weatherPasses") && (q("weatherPasses").innerHTML='<div class="weatherLoading">Cargando pasos...</div>');
  q("weatherFleets") && (q("weatherFleets").innerHTML='<div class="weatherLoading">Cargando flotas...</div>');

  try{
    if(!Array.isArray(destinos) || !Array.isArray(trs) || destinos.length===0){
      [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
        read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
      ]);
    }
  }catch(e){
    console.warn("No se pudieron cargar datos clima",e);
  }
  renderClima();
}

const _tab_v1235=tab;
tab=function(id){
  _tab_v1235(id);
  if(id==="clima")ensureClimaDataAndRender();
};

const _refresh_v1235=typeof refresh==="function"?refresh:null;
refresh=async function(){
  if(_refresh_v1235)await _refresh_v1235();
  if(q("clima")?.classList.contains("active"))renderClima();
};

document.addEventListener("DOMContentLoaded",()=>{
  if(q("clima")?.classList.contains("active"))ensureClimaDataAndRender();
});



/* ===== V1.2.40 - Clima real Open-Meteo por coordenadas ===== */
window.ELTA_WEATHER_CACHE = window.ELTA_WEATHER_CACHE || {};

function parseCoordsClima(v){
  let s=String(v||"").trim();
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m?{lat:Number(m[1]),lng:Number(m[2]),text:`${m[1]}, ${m[2]}`} : null;
}

function coordsFromObjClima(o){
  if(!o)return null;
  let c=parseCoordsClima(o.ubicacion||o.coordenadas||o.coords||o.coord||"");
  if(c)return c;
  let lat=o.lat||o.latitude||o.latitud;
  let lng=o.lng||o.lon||o.longitude||o.longitud;
  if(lat!==undefined && lng!==undefined && String(lat).trim()!=="" && String(lng).trim()!==""){
    return {lat:Number(lat),lng:Number(lng),text:`${lat}, ${lng}`};
  }
  return null;
}

function weatherCodeInfo(code){
  const map={
    0:["☀️","Despejado"],1:["🌤️","Mayormente despejado"],2:["⛅","Parcialmente nublado"],3:["☁️","Nublado"],
    45:["🌫️","Niebla"],48:["🌫️","Niebla con escarcha"],51:["🌦️","Llovizna leve"],53:["🌦️","Llovizna"],
    55:["🌧️","Llovizna intensa"],56:["🌧️","Llovizna helada"],57:["🌧️","Llovizna helada intensa"],
    61:["🌧️","Lluvia leve"],63:["🌧️","Lluvia"],65:["🌧️","Lluvia intensa"],66:["🌧️","Lluvia helada"],
    67:["🌧️","Lluvia helada intensa"],71:["🌨️","Nieve leve"],73:["🌨️","Nieve"],75:["❄️","Nieve intensa"],
    77:["❄️","Granizo de nieve"],80:["🌦️","Chaparrones leves"],81:["🌧️","Chaparrones"],82:["⛈️","Chaparrones intensos"],
    85:["🌨️","Nevadas leves"],86:["❄️","Nevadas intensas"],95:["⛈️","Tormenta"],96:["⛈️","Tormenta con granizo"],99:["⛈️","Tormenta fuerte con granizo"]
  };
  return map[Number(code)] || ["🌦️","Condición no disponible"];
}

async function fetchWeatherByCoords(c){
  if(!c)return {temp:"-",desc:"Sin coordenadas",wind:"-",sens:"-",icon:"☁️",code:null,real:false};
  let key=`${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
  let cached=window.ELTA_WEATHER_CACHE[key];
  if(cached && Date.now()-cached._ts<10*60*1000)return cached;
  try{
    let url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
    let res=await fetch(url,{cache:"no-store"});
    if(!res.ok)throw new Error("weather http "+res.status);
    let data=await res.json();
    let cur=data.current||{};
    let info=weatherCodeInfo(cur.weather_code);
    let out={temp:Math.round(cur.temperature_2m),sens:Math.round(cur.apparent_temperature),wind:Math.round(cur.wind_speed_10m),code:cur.weather_code,desc:info[1],icon:info[0],real:true,_ts:Date.now()};
    window.ELTA_WEATHER_CACHE[key]=out;
    return out;
  }catch(e){
    console.warn("Weather real no disponible",e);
    return {temp:"-",desc:"No se pudo consultar clima real",wind:"-",sens:"-",icon:"⚠️",code:null,real:false,_ts:Date.now()};
  }
}

function destinationNameClima(d){
  return (typeof destinationNameV1227==="function"?destinationNameV1227(d):(typeof destinationNameV1226==="function"?destinationNameV1226(d):(d.nombre||d.destino||d.name||d.id||"Destino")));
}
function destinoLocalidadClima(d){
  return (typeof destinationLocalidadV1227==="function"?destinationLocalidadV1227(d):(typeof destinationLocalidadV1226==="function"?destinationLocalidadV1226(d):(d.localidad||d.ciudad||"-")));
}
function destinoPaisClima(d){
  return (typeof destinationPaisV1227==="function"?destinationPaisV1227(d):(typeof destinationPaisV1226==="function"?destinationPaisV1226(d):(d.pais||d.country||"-")));
}
function passIsClosedByWeather(w){
  let code=Number(w.code);
  return code===45 || code===48 || code>=65 || code>=71 || Number(w.temp)<=0 || Number(w.wind)>=45;
}
function weatherCardReal(title,subtitle,c,w,extra="",cls="",iconOverride="",statusHtml=""){
  let icon=iconOverride||w.icon||"🌦️";
  return `<div class="weatherCard ${cls}">
    <div class="weatherCardTop">
      <div class="weatherTitleWrap">
        <span class="weatherIconBadge">${icon}</span>
        <div class="weatherTitleText">
          <div class="weatherTitle">${title}</div>
          <div class="weatherDesc">${w.icon} ${esc(w.desc)}</div>
          ${statusHtml}
        </div>
      </div>
      <div class="weatherTemp">${esc(w.temp)}°</div>
    </div>
    <div class="weatherData">
      <div><b>Ubicación:</b> ${esc(subtitle||"-")}</div>
      <div><b>Sensación:</b> ${esc(w.sens)}°</div>
      <div><b>Viento:</b> ${esc(w.wind)} km/h</div>
      <div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div>
    </div>
    ${extra}
    <div class="weatherProvider">${w.real?"Clima real por coordenadas":"Clima no disponible para esas coordenadas"}</div>
  </div>`;
}

async function renderWeatherDestinations(){
  let el=q("weatherDestinations");
  if(!el)return;
  let list=Array.isArray(destinos)?destinos:[];
  if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
  el.innerHTML='<div class="weatherLoading">Consultando clima real de destinos...</div>';
  let html=[];
  for(let d of list){
    let c=coordsFromObjClima(d);
    let w=await fetchWeatherByCoords(c);
    let sub=[destinoLocalidadClima(d),destinoPaisClima(d)].filter(x=>x&&x!=="-").join(", ");
    html.push(weatherCardReal(`${esc(destinationNameClima(d))}`,sub,c,w,"","","📍"));
  }
  el.innerHTML=html.join("");
}

async function renderWeatherPasses(){
  let el=q("weatherPasses");
  if(!el)return;
  el.innerHTML='<div class="weatherLoading">Consultando clima real del Paso Los Libertadores...</div>';
  let paso={lat:-32.824,lng:-70.086,text:"-32.824, -70.086"};
  let w=await fetchWeatherByCoords(paso);
  let closed=passIsClosedByWeather(w);
  let status=closed?"PASO VERIFICAR":"PASO OPERATIVO";
  let cls=closed?"weatherClosed":"weatherOpen";
  let badge=`<span class="weatherStatusBadge ${closed?"closed":"open"}">${closed?"🟠":"🟢"} ${status}</span>`;
  el.innerHTML=weatherCardReal("Paso Los Libertadores","Argentina / Chile",paso,w,"",cls,"🚚",badge);
}

function lastGpsCoords(t){
  let u=typeof lastU==="function"?(lastU(t)||{}):{};
  return coordsFromObjClima(u)||coordsFromObjClima(t)||parseCoordsClima(u.coords||u.coordenadas||u.ubicacion||"");
}

async function renderWeatherFleets(){
  let el=q("weatherFleets");
  if(!el)return;
  let abiertos=Array.isArray(trs)?trs.filter(openT):[];
  if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
  el.innerHTML='<div class="weatherLoading">Consultando clima real de flotas...</div>';
  let html=[];
  for(let t of abiertos){
    let c=lastGpsCoords(t);
    let w=await fetchWeatherByCoords(c);
    let rt=ruta(t)||{};
    let upd=typeof transitUpdatedValue==="function"?transitUpdatedValue(t):(t.updatedAt||t.start?.time||t.start);
    let extra=`<div class="weatherFleetTransit">
      <div><b>Flota:</b> ${esc(flota(t)||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div>
      <div><b>Origen:</b> ${esc(rt.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(rt.destino||"-")}</div>
      <div><b>Últ. reporte:</b> ${fd(upd)}</div>
      <div><b>Localidad GPS:</b> ${esc(typeof locFull==="function"?locFull(t):"-")}</div>
    </div>`;
    html.push(weatherCardReal(`Flota ${esc(flota(t)||"-")}`,typeof locFull==="function"?locFull(t):"",c,w,extra,"fleetWeatherCard","🚚"));
  }
  el.innerHTML=html.join("");
}

async function renderClima(){
  await Promise.all([renderWeatherDestinations(),renderWeatherPasses(),renderWeatherFleets()]);
}

async function ensureClimaDataAndRender(){
  try{
    if(!Array.isArray(destinos) || !Array.isArray(trs) || destinos.length===0){
      [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
        read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
      ]);
    }
  }catch(e){console.warn("No se pudieron cargar datos clima",e);}
  await renderClima();
}

const _tab_v1236=tab;
tab=function(id){_tab_v1236(id);if(id==="clima")ensureClimaDataAndRender();};
const _refresh_v1236=typeof refresh==="function"?refresh:null;
refresh=async function(){if(_refresh_v1236)await _refresh_v1236();if(q("clima")?.classList.contains("active"))await renderClima();};




/* ===== V1.2.40 - Clima: layout, temp con icono, GPS real flotas abiertas ===== */

function parseCoordsClima(v){
  let s=String(v||"").trim();
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m?{lat:Number(m[1]),lng:Number(m[2]),text:`${m[1]}, ${m[2]}`} : null;
}

function coordsFromObjClima(o){
  if(!o)return null;

  // Buscar strings de coordenadas en varios campos usados por Firebase / GPS
  const stringKeys=[
    "ubicacion","coordenadas","coords","coord","posicion","position",
    "ultimaPosicion","ultPosicion","lastPosition","gps","location"
  ];

  for(let k of stringKeys){
    let v=o?.[k];
    if(typeof v==="string"){
      let c=parseCoordsClima(v);
      if(c)return c;
    }
  }

  // Buscar objetos anidados con lat/lng
  const objKeys=["gps","ubicacion","posicion","position","location","ultimaPosicion","ultPosicion","lastPosition","lastGps"];
  for(let k of objKeys){
    let v=o?.[k];
    if(v && typeof v==="object"){
      let c=coordsFromObjClima(v);
      if(c)return c;
    }
  }

  // Campos lat/lng directos
  let lat=o.lat??o.latitude??o.latitud??o.Latitude??o.LAT;
  let lng=o.lng??o.lon??o.longitude??o.longitud??o.Longitude??o.LON;
  if(lat!==undefined && lng!==undefined && String(lat).trim()!=="" && String(lng).trim()!==""){
    return {lat:Number(lat),lng:Number(lng),text:`${lat}, ${lng}`};
  }

  return null;
}

function lastGpsObjectV1237(t){
  // Última ubicación reportada, priorizando arrays de posiciones/eventos GPS
  const arrays=[
    t.ubicaciones,t.positions,t.posiciones,t.gpsHistory,t.historialGps,
    t.reportes,t.reports,t.eventos,t.events,t.tracking
  ].filter(Array.isArray);

  for(let arr of arrays){
    if(arr.length){
      let sorted=arr.slice().sort((a,b)=>tv(b.time||b.fecha||b.createdAt||b.ts)-tv(a.time||a.fecha||a.createdAt||a.ts));
      let found=sorted.find(x=>coordsFromObjClima(x));
      if(found)return found;
    }
  }

  let u=typeof lastU==="function"?(lastU(t)||{}):{};
  return u && Object.keys(u).length ? u : t;
}

function lastGpsCoords(t){
  let obj=lastGpsObjectV1237(t);
  return coordsFromObjClima(obj) || coordsFromObjClima(t);
}

function lastGpsTimeV1237(t){
  let obj=lastGpsObjectV1237(t)||{};
  return obj.time||obj.fecha||obj.createdAt||obj.ts||
    (typeof transitUpdatedValue==="function"?transitUpdatedValue(t):(t.updatedAt||t.start?.time||t.start));
}

function lastGpsLocalidadV1237(t){
  let obj=lastGpsObjectV1237(t)||{};
  let v=obj.localidad||obj.ubicacionTexto||obj.locationName||obj.localidadTexto||obj.city||obj.ciudad;
  if(v)return v;
  return typeof locFull==="function"?locFull(t):"-";
}

function weatherCardReal(title,subtitle,c,w,extra="",cls="",iconOverride="",statusHtml=""){
  let icon=iconOverride||w.icon||"🌦️";
  let tempValue=(w.temp===undefined||w.temp===null)?"-":w.temp;
  return `<div class="weatherCard ${cls}">
    <div class="weatherCardTop">
      <div class="weatherTitleWrap">
        <span class="weatherIconBadge">${icon}</span>
        <div class="weatherTitleText">
          <div class="weatherTitle">${title}</div>
          <div class="weatherDesc">${w.icon} ${esc(w.desc)}</div>
          ${statusHtml}
        </div>
      </div>
      <div class="weatherTemp"><span>${esc(tempValue)}°</span><span class="weatherTempIcon">${w.icon||""}</span></div>
    </div>
    <div class="weatherData">
      <div><b>Ubicación:</b> ${esc(subtitle||"-")}</div>
      <div><b>Sensación:</b> ${esc(w.sens)}°</div>
      <div><b>Viento:</b> ${esc(w.wind)} km/h</div>
      <div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div>
    </div>
    ${extra}
    <div class="weatherProvider">${w.real?"Clima real por coordenadas":"Clima no disponible para esas coordenadas"}</div>
  </div>`;
}

async function renderWeatherDestinations(){
  let el=q("weatherDestinations");
  if(!el)return;
  let list=Array.isArray(destinos)?destinos:[];
  if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
  el.innerHTML='<div class="weatherLoading">Consultando clima real de destinos...</div>';
  let html=[];
  for(let d of list){
    let c=coordsFromObjClima(d);
    let w=await fetchWeatherByCoords(c);
    let sub=[destinoLocalidadClima(d),destinoPaisClima(d)].filter(x=>x&&x!=="-").join(", ");
    html.push(weatherCardReal(`${esc(destinationNameClima(d))}`,sub,c,w,"","","📍"));
  }
  el.innerHTML=html.join("");
}

async function renderWeatherPasses(){
  let el=q("weatherPasses");
  if(!el)return;
  el.innerHTML='<div class="weatherLoading">Consultando clima real del Paso Los Libertadores...</div>';
  let paso={lat:-32.824,lng:-70.086,text:"-32.824, -70.086"};
  let w=await fetchWeatherByCoords(paso);
  let closed=passIsClosedByWeather(w);
  let status=closed?"PASO VERIFICAR":"PASO OPERATIVO";
  let cls=closed?"weatherClosed":"weatherOpen";
  let badge=`<span class="weatherStatusBadge ${closed?"closed":"open"}">${closed?"🟠":"🟢"} ${status}</span>`;
  el.innerHTML=weatherCardReal("Paso Los Libertadores","Argentina / Chile",paso,w,"",cls,"🚚",badge);
}

async function renderWeatherFleets(){
  let el=q("weatherFleets");
  if(!el)return;
  let abiertos=Array.isArray(trs)?trs.filter(openT):[];
  if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}

  el.innerHTML='<div class="weatherLoading">Consultando clima real de última posición GPS de flotas...</div>';
  let html=[];

  for(let t of abiertos){
    let c=lastGpsCoords(t);
    let w=await fetchWeatherByCoords(c);
    let rt=ruta(t)||{};
    let upd=lastGpsTimeV1237(t);
    let gpsLoc=lastGpsLocalidadV1237(t);

    let extra=`<div class="weatherFleetTransit">
      <div><b>Flota:</b> ${esc(flota(t)||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div>
      <div><b>Origen:</b> ${esc(rt.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(rt.destino||"-")}</div>
      <div><b>Últ. reporte GPS:</b> ${fd(upd)}</div>
      <div><b>Localidad GPS:</b> ${esc(gpsLoc||"-")}</div>
      <div><b>GPS:</b> ${c?"Reportado":"Sin coordenadas"}</div>
    </div>`;

    html.push(weatherCardReal(`Flota ${esc(flota(t)||"-")}`,gpsLoc||"-",c,w,extra,"fleetWeatherCard","🚚"));
  }

  el.innerHTML=html.join("");
}

async function renderClima(){
  // Primero flotas, luego panel derecho en paralelo para que la vista principal aparezca antes
  await Promise.all([
    renderWeatherFleets(),
    renderWeatherPasses(),
    renderWeatherDestinations()
  ]);
}

async function ensureClimaDataAndRender(){
  try{
    if(!Array.isArray(destinos) || !Array.isArray(trs) || destinos.length===0){
      [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
        read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
      ]);
    }
  }catch(e){console.warn("No se pudieron cargar datos clima",e);}
  await renderClima();
}

/* Corregir menú lateral: si está en modo iconos, evitar que Clima quede con texto visible */
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".climaMenuBtn b").forEach(b=>{
    b.dataset.label=b.textContent||"Clima";
  });
});




/* ===== V1.2.40 - Clima: clase destino + fix menú ===== */

async function renderWeatherDestinations(){
  let el=q("weatherDestinations");
  if(!el)return;
  let list=Array.isArray(destinos)?destinos:[];
  if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
  el.innerHTML='<div class="weatherLoading">Consultando clima real de destinos...</div>';
  let html=[];
  for(let d of list){
    let c=coordsFromObjClima(d);
    let w=await fetchWeatherByCoords(c);
    let sub=[destinoLocalidadClima(d),destinoPaisClima(d)].filter(x=>x&&x!=="-").join(", ");
    html.push(weatherCardReal(`${esc(destinationNameClima(d))}`,sub,c,w,"","destinationWeatherCard","📍"));
  }
  el.innerHTML=html.join("");
}

async function renderWeatherFleets(){
  let el=q("weatherFleets");
  if(!el)return;
  let abiertos=Array.isArray(trs)?trs.filter(openT):[];
  if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}

  el.innerHTML='<div class="weatherLoading">Consultando clima real de última posición GPS de flotas...</div>';
  let html=[];

  for(let t of abiertos){
    let c=lastGpsCoords(t);
    let w=await fetchWeatherByCoords(c);
    let rt=ruta(t)||{};
    let upd=lastGpsTimeV1237(t);
    let gpsLoc=lastGpsLocalidadV1237(t);

    let extra=`<div class="weatherFleetTransit">
      <div><b>Flota:</b> ${esc(flota(t)||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div><b>Embarque:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Cliente:</b> ${esc(rt.cliente||"-")}</div>
      <div><b>Origen:</b> ${esc(rt.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(rt.destino||"-")}</div>
      <div><b>Últ. reporte GPS:</b> ${fd(upd)}</div>
      <div><b>Localidad GPS:</b> ${esc(gpsLoc||"-")}</div>
      <div><b>GPS:</b> ${c?"Reportado":"Sin coordenadas"}</div>
    </div>`;

    html.push(weatherCardReal(`Flota ${esc(flota(t)||"-")}`,gpsLoc||"-",c,w,extra,"fleetWeatherCard","🚚"));
  }

  el.innerHTML=html.join("");
}

/* Fix final del menu Clima: asegurar que tenga icono visible y texto ocultable */
function fixClimaMenuButton(){
  document.querySelectorAll(".climaMenuBtn").forEach(btn=>{
    if(!btn.querySelector("span")){
      let s=document.createElement("span");
      s.className="navIcon";
      s.textContent="🌦️";
      btn.prepend(s);
    }
    if(!btn.querySelector("b")){
      let b=document.createElement("b");
      b.textContent="Clima";
      btn.appendChild(b);
    }
    btn.title="Clima";
  });
}

document.addEventListener("DOMContentLoaded",fixClimaMenuButton);
setTimeout(fixClimaMenuButton,300);

const _tab_v1238=tab;
tab=function(id){
  _tab_v1238(id);
  fixClimaMenuButton();
  if(id==="clima")ensureClimaDataAndRender();
};




/* ===== V1.2.40 - Normalizar item Clima en menu lateral ===== */

function normalizeClimaMenu(){
  document.querySelectorAll('button[onclick*="clima"]').forEach(btn=>{
    btn.title="Clima";
    let span=btn.querySelector("span");
    let b=btn.querySelector("b");

    if(!span){
      span=document.createElement("span");
      btn.prepend(span);
    }
    span.textContent="🌦️";

    if(!b){
      b=document.createElement("b");
      btn.appendChild(b);
    }
    b.textContent="Clima";
  });
}

document.addEventListener("DOMContentLoaded",normalizeClimaMenu);
setTimeout(normalizeClimaMenu,100);
setTimeout(normalizeClimaMenu,500);

const _tab_v1239 = tab;
tab = function(id){
  _tab_v1239(id);
  normalizeClimaMenu();
  if(id==="clima" && typeof ensureClimaDataAndRender==="function")ensureClimaDataAndRender();
};

/* ===== V1.2.50 - Publicacion desde docs: version unica + filtros sin cambiar formato ===== */
const ELTA_APP_VERSION = "2.0.150";

function updateVersionLabels(){
  document.querySelectorAll('span, small, p, div').forEach(el=>{
    if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||"")){
      el.textContent = (el.textContent||"").replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g, `Versión ${ELTA_APP_VERSION}`);
    }
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  updateVersionLabels();
  setTimeout(updateVersionLabels,300);
  setTimeout(updateVersionLabels,1200);
});

const _login_v1250 = typeof login === 'function' ? login : null;
if(_login_v1250){
  login = async function(){
    await _login_v1250.apply(this, arguments);
    updateVersionLabels();
    setTimeout(updateVersionLabels,500);
  };
}

function alertVerifiedV1250(t,a,idx){
  if(typeof isAlertVerified === 'function') return isAlertVerified(t,a,idx);
  try{
    let id = typeof alertId==='function' ? alertId(t,a,idx) : `${t?.embarque||''}_${flota(t)||''}_${idx}`;
    let store = JSON.parse(localStorage.getItem('eltaAlertasVerificadas')||'{}');
    return a?.verificada===true || a?.vista===true || a?.verificado===true || store[id]?.verificada===true;
  }catch(e){
    return a?.verificada===true || a?.vista===true || a?.verificado===true;
  }
}

function pendingAlertsOpenRowsV1250(){
  let rows=[];
  (Array.isArray(trs)?trs:[]).filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      if(!alertVerifiedV1250(t,a,idx)) rows.push({t,a,idx,verified:false});
    });
  });
  return rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
}

function pendingAlertsCount(){
  return pendingAlertsOpenRowsV1250().length;
}

function updateAlertCountersV1250(){
  let n = pendingAlertsCount();
  if(q('kal')) q('kal').innerText = n;
  if(q('headerAlertCount')) q('headerAlertCount').innerText = n;
  document.querySelectorAll('.badgeCount,.alertBadge,.topAlertCount,#alertCount,#badgeAlertas').forEach(el=>el.textContent=n);
  document.querySelectorAll('.alertBell').forEach(el=>el.classList.toggle('bellBlink', n>0));
}

const _renderDash_v1250 = typeof renderDash === 'function' ? renderDash : null;
if(_renderDash_v1250){
  renderDash = function(){
    _renderDash_v1250.apply(this, arguments);
    updateAlertCountersV1250();
  };
}

renderBadge = function(){ updateAlertCountersV1250(); };

function alertTipoV1250(a){ return String(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta'); }
function alertKmV1250(a){ return String(a?.km||a?.kilometro||a?.kilómetro||a?.kmRuta||a?.progresiva||a?.progresivaKm||'-'); }
function alertDateV1250(a){ return fd(a?.time||a?.fecha||a?.createdAt||a?.ts); }
function alertLocV1250(a,t){
  if(typeof alertLoc==='function') return alertLoc(a,t);
  return a?.localidad||a?.ubicacionTexto||a?.ubicacion||locFull?.(t)||'-';
}

/* Seguimiento: conservar formato original, solamente ocultar alertas verificadas */
trackingAlertsHtml = function(t){
  let arr=(t.alerts||[]).map((a,idx)=>({a,idx})).filter(x=>!alertVerifiedV1250(t,x.a,x.idx));
  arr.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  if(!arr.length)return '<div class="trackingAlertItem">Sin alertas registradas.</div>';
  return arr.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${esc(alertTipoV1250(a))}</span><span>${alertDateV1250(a)}</span></div><div><b>Localidad:</b> ${esc(alertLocV1250(a,t))}</div><div><b>Km:</b> ${esc(alertKmV1250(a))}</div></div>`).join('');
};

/* Alertas: pendientes por defecto, solo transitos abiertos. Boton amarillo texto Verificar */
window.alertFilterMode = window.alertFilterMode || 'pendientes';
function collectOpenAlerts(){
  let rows=[];
  (Array.isArray(trs)?trs:[]).filter(openT).forEach(t=>{
    (t.alerts||[]).forEach((a,idx)=>{
      let verified=alertVerifiedV1250(t,a,idx);
      if(window.alertFilterMode==='pendientes' && verified) return;
      if(window.alertFilterMode==='verificadas' && !verified) return;
      rows.push({t,a,idx,verified});
    });
  });
  return rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
}

function setAlertFilter(mode){
  window.alertFilterMode=mode||'pendientes';
  document.querySelectorAll('.alertFilters button').forEach(b=>b.classList.toggle('active', b.dataset.alertFilter===window.alertFilterMode));
  renderAlerts();
}

function markAlertVerified(t,a,idx){
  if(!t || !a) return;
  let id = typeof alertId==='function' ? alertId(t,a,idx) : `${t.embarque||''}_${flota(t)||''}_${idx}`;
  let store={};
  try{store=JSON.parse(localStorage.getItem('eltaAlertasVerificadas')||'{}');}catch(e){}
  store[id]={verificada:true,por:(q('user')?.value||'admin'),fecha:new Date().toISOString()};
  localStorage.setItem('eltaAlertasVerificadas',JSON.stringify(store));
  renderAlerts();
  renderMapa();
  updateAlertCountersV1250();
}

function renderAlertCards(rows){
  if(!q('alertCards'))return;
  let byFleet={};
  rows.forEach(r=>{let key=flota(r.t)||'-';(byFleet[key]=byFleet[key]||[]).push(r);});
  let html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([fleet,list])=>{
    let pend=list.filter(r=>!r.verified).length;
    return `<div class="alertFleetCard"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div><span class="alertPendingBadge">${pend} pendientes</span></div>${list.map(r=>{
      let emb=String(r.t.embarque||'').replace(/'/g,"\\'");
      let flo=String(flota(r.t)||'').replace(/'/g,"\\'");
      let btn = r.verified ? `<span class="alertVerifiedInfo">Verificada</span>` : `<button class="alertVerifyBtn verifyBlink" onclick="markAlertVerified(trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}'), (trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}')?.alerts||[])[${r.idx}], ${r.idx})">Verificar</button>`;
      return `<div class="alertItemCard"><div class="alertItemTop"><span>⚠️ ${esc(alertTipoV1250(r.a))}</span>${btn}</div><div class="alertItemMeta"><div><b>Embarque:</b> ${esc(r.t.embarque||'-')}</div><div><b>Km:</b> ${esc(alertKmV1250(r.a))}</div><div><b>Fecha/hora:</b> ${alertDateV1250(r.a)}</div><div><b>Localidad:</b> ${esc(alertLocV1250(r.a,r.t))}</div></div></div>`;
    }).join('')}</div>`;
  }).join('');
  q('alertCards').innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
}

function renderAlerts(){
  document.querySelectorAll('.alertFilters button').forEach(b=>b.classList.toggle('active', b.dataset.alertFilter===window.alertFilterMode));
  let rows=collectOpenAlerts();
  if(typeof renderAlertCharts==='function')renderAlertCharts(rows);
  renderAlertCards(rows);
  updateAlertCountersV1250();
}

/* Ultimas alertas del dashboard: solo pendientes en transitos abiertos */
function renderDashAlerts(){
  let alerts=pendingAlertsOpenRowsV1250();
  if(!q('dashAlerts'))return;
  if(!alerts.length){
    q('dashAlerts').innerHTML='<div class="dashAlertLine dashAlertEmptyLine">Sin alertas activas.</div>';
    return;
  }
  let x=alerts[0];
  let km=alertKmV1250(x.a);
  q('dashAlerts').innerHTML=`<div class="dashAlertLine">• ${esc(alertTipoV1250(x.a))} · Emb. ${esc(x.t.embarque||'-')} · Flota ${esc(flota(x.t)||'-')} · Km ${esc(km||'-')} · ${alertDateV1250(x.a)}</div>`;
}


/* Clientes: tarjetas compactas sin campo ID visible */
function renderClients(){
  let el=q('clientsList');
  if(!el)return;
  let nameFn=(typeof clientNameV1226==='function'?clientNameV1226:(c=>c.nombre||c.cliente||c.name||c.id||'-'));
  let contactFn=(typeof clientContactV1226==='function'?clientContactV1226:(c=>c.contacto||c.contact||'-'));
  let phoneFn=(typeof clientPhoneV1226==='function'?clientPhoneV1226:(c=>c.telefono||c.phone||'-'));
  let list=(Array.isArray(clientes)?clientes:[]).slice().sort((a,b)=>String(nameFn(a)).localeCompare(String(nameFn(b)),'es'));
  el.innerHTML=list.map(c=>`<div class="clientCard compactClientCard"><div class="clientTop"><div class="clientName">🏢 ${esc(nameFn(c))}</div><span class="clientDot"></span></div><div class="clientContactBox"><div><b>Contacto:</b> ${esc(contactFn(c)||'-')}</div><div><b>Teléfono:</b> ${esc(phoneFn(c)||'-')}</div></div></div>`).join('')||'<div class="clientCard">No hay clientes registrados.</div>';
}

/* Clima: sin proveedor, no repetir flota en detalle y Paso cerrado rojo sin camion */
if(typeof weatherCardReal==='function'){
  weatherCardReal = function(title,subtitle,c,w,extra='',cls='',icon='🌦️',badge=''){
    return `<div class="weatherCard ${cls}"><div class="weatherTop"><div class="weatherTitleBlock"><div class="weatherName">${icon?`<span class="weatherIcon">${icon}</span>`:''}<span>${title}</span></div>${w?.desc?`<div class="weatherDescInline">${esc(w.desc)}</div>`:''}</div><div class="weatherTemp">${esc(w?.temp ?? '-')}° ${w?.emoji||''}</div></div>${badge||''}<div class="weatherData"><div><b>Ubicación:</b> ${esc(subtitle||'-')}</div><div><b>Sensación:</b> ${esc(w?.sens ?? '-')}°</div><div><b>Viento:</b> ${esc(w?.wind ?? '-')} km/h</div><div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div></div>${extra}</div>`;
  };
}

if(typeof renderWeatherFleets==='function'){
  renderWeatherFleets = async function(){
    let el=q('weatherFleets'); if(!el)return;
    let abiertos=Array.isArray(trs)?trs.filter(openT):[];
    if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima real de última posición GPS de flotas...</div>';
    let html=[];
    for(let t of abiertos){
      let c=lastGpsCoords(t); let w=await fetchWeatherByCoords(c); let rt=ruta(t)||{}; let upd=lastGpsTimeV1237(t); let gpsLoc=lastGpsLocalidadV1237(t);
      let extra=`<div class="weatherFleetTransit"><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div><b>Embarque:</b> ${esc(t.embarque||'-')}</div><div><b>Cliente:</b> ${esc(rt.cliente||'-')}</div><div><b>Origen:</b> ${esc(rt.origen||'-')}</div><div><b>Destino:</b> ${esc(rt.destino||'-')}</div><div><b>Últ. reporte GPS:</b> ${fd(upd)}</div><div><b>Localidad GPS:</b> ${esc(gpsLoc||'-')}</div><div><b>GPS:</b> ${c?'Reportado':'Sin coordenadas'}</div></div>`;
      html.push(weatherCardReal(`Flota ${esc(flota(t)||'-')}`,gpsLoc||'-',c,w,extra,'fleetWeatherCard','🚚'));
    }
    el.innerHTML=html.join('');
  };
}

if(typeof renderWeatherPasses==='function'){
  renderWeatherPasses = async function(){
    let el=q('weatherPasses'); if(!el)return;
    el.innerHTML='<div class="weatherLoading">Consultando clima real del Paso Los Libertadores...</div>';
    let paso={lat:-32.824,lng:-70.086,text:'-32.824, -70.086'};
    let w=await fetchWeatherByCoords(paso);
    let closed=passIsClosedByWeather(w);
    let badge=`<span class="weatherStatusBadge ${closed?'closed':'open'}">${closed?'🔴 PASO CERRADO':'🟢 PASO OPERATIVO'}</span>`;
    el.innerHTML=weatherCardReal('Paso Los Libertadores','Argentina / Chile',paso,w,'',closed?'weatherClosed':'weatherOpen','',badge);
  };
}

/* Correo real en usuario y ajuste visual */
function updateAdminEmailV1250(){
  let u=(q('user')?.value||'admin').trim();
  let userDoc=(Array.isArray(users)?users:[]).find(x=>String(x.id||x.user||'')===u) || {};
  let email=userDoc.correo||userDoc.email||userDoc.mail||userDoc.userEmail||'';
  document.querySelectorAll('.adminBox small').forEach(el=>{ if(email) el.textContent=email; });
}
const _refresh_v1250 = typeof refresh === 'function' ? refresh : null;
if(_refresh_v1250){
  refresh = async function(){
    await _refresh_v1250.apply(this, arguments);
    updateAdminEmailV1250(); updateVersionLabels(); updateAlertCountersV1250();
  };
}



/* ===== V2.0.150 - Nombre oficial del sistema ===== */
(function(){
  const APP_VERSION_V2 = "2.0.150";

  function setVersionV2(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g, `Versión ${APP_VERSION_V2}`);
      }
    });
  }

  function normalizeTitlesV2(){
    document.querySelectorAll('.sideNav button').forEach(btn=>{
      if((btn.getAttribute('onclick')||'').includes("tab('dash')")) btn.innerHTML='<span class="menuIcon">🏠</span><span class="menuText">Torre de Control</span>';
      if((btn.getAttribute('onclick')||'').includes("tab('clima')")) { btn.innerHTML='<span class="menuIcon">🌦️</span><span class="menuText">Clima</span>'; btn.title='Clima'; }
    });
    document.querySelectorAll('.sectionTitle h2').forEach(h=>{ if((h.textContent||'').trim()==='Dashboard') h.textContent='Torre de Control'; });
    document.querySelectorAll('.loginCard h1, .headerTitle h1').forEach(h=>{
      h.textContent='ITS Intelligent Traffic System';
      h.classList.add('systemTitleSmall');
    });
    if(document.title !== 'ITS Intelligent Traffic System') document.title='ITS Intelligent Traffic System';
  }

  window.addEventListener('DOMContentLoaded',()=>{setVersionV2(); normalizeTitlesV2();});
  setTimeout(()=>{setVersionV2(); normalizeTitlesV2();},300);
  setTimeout(()=>{setVersionV2(); normalizeTitlesV2();},1200);

  const oldLogin = typeof login==='function' ? login : null;
  if(oldLogin){
    login = async function(){
      await oldLogin.apply(this, arguments);
      setVersionV2(); normalizeTitlesV2();
      setTimeout(()=>{setVersionV2(); normalizeTitlesV2();},500);
    };
  }

  function pickDeepV2(obj, keys){
    const seen=new Set();
    const stack=[obj];
    while(stack.length){
      const cur=stack.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const k of keys){
        const v=cur[k];
        if(v!==undefined && v!==null && String(v).trim()!=='') return String(v).trim();
      }
      for(const v of Object.values(cur)) if(v && typeof v==='object') stack.push(v);
    }
    return '';
  }

  window.alertKmV2 = function(a){
    let v=pickDeepV2(a,[
      'km','KM','Km','kilometro','kilómetro','kilometros','kilómetros','kmRuta','rutaKm','progresiva','progresivaKm',
      'distanciaKm','distancia','kmActual','km_posicion','kilometraje','odometro','odómetro','puntoKm','punto_km'
    ]);
    if(v) return v;
    let text=JSON.stringify(a||{});
    let m=text.match(/(?:km|kil[oó]metro|progresiva)[^0-9-]{0,12}([0-9]+(?:[\.,][0-9]+)?)/i);
    return m ? m[1].replace(',', '.') : '-';
  };

  // Mantener compatibilidad con nombres existentes.
  alertKmV1250 = window.alertKmV2;
  alertKmValue = window.alertKmV2;
  alertKm = window.alertKmV2;

  function latestGpsUpdateV2(t){
    const candidates=[];
    const add=(obj, time)=>{
      if(!obj) return;
      const c=(typeof coordsFromObjClima==='function' ? coordsFromObjClima(obj) : null) || (typeof parseCoordsClima==='function' ? parseCoordsClima(obj.ubicacion||obj.coordenadas||obj.coords||obj.coord||'') : null);
      const lat=obj.lat??obj.latitude??obj.latitud;
      const lng=obj.lng??obj.lon??obj.longitude??obj.longitud;
      const has=(c || (lat!==undefined && lng!==undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))));
      if(has) candidates.push({obj,time: tv(time||obj.time||obj.fecha||obj.createdAt||obj.ts)});
    };
    (t.updates||[]).forEach(u=>{
      add(u.gps,u.time||u.fecha||u.createdAt||u.ts); add(u.ultimaPosicion,u.time||u.fecha||u.createdAt||u.ts); add(u.position,u.time||u.fecha||u.createdAt||u.ts); add(u.location,u.time||u.fecha||u.createdAt||u.ts); add(u.posicion,u.time||u.fecha||u.createdAt||u.ts); add(u,u.time||u.fecha||u.createdAt||u.ts);
    });
    add(t.ultimaPosicion,t.updatedAt||t.updateAt); add(t.lastPosition,t.updatedAt||t.updateAt); add(t.position,t.updatedAt||t.updateAt); add(t.location,t.updatedAt||t.updateAt); add(t.posicion,t.updatedAt||t.updateAt);
    candidates.sort((a,b)=>b.time-a.time);
    return candidates[0]||null;
  }

  getPosObj = function(t){
    let latest=latestGpsUpdateV2(t);
    if(!latest) return null;
    let s=latest.obj;
    let c=(typeof coordsFromObjClima==='function'?coordsFromObjClima(s):null);
    if(c) return {lat:Number(c.lat),lng:Number(c.lng),src:s};
    let lat=s.lat??s.latitude??s.latitud;
    let lng=s.lng??s.lon??s.longitude??s.longitud;
    if(lat!==undefined && lng!==undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) return {lat:Number(lat),lng:Number(lng),src:s};
    if(typeof parseCoordPair==='function'){
      let p=parseCoordPair(s.ubicacion||s.coordenadas||s.coords||s.coord||'');
      if(p) return {lat:p.lat,lng:p.lng,src:s};
    }
    return null;
  };

  const oldLocFull = typeof locFull==='function' ? locFull : null;
  locFull = function(t){
    const latest=latestGpsUpdateV2(t);
    if(latest){
      const s=latest.obj;
      const txt=pickDeepV2(s,['ubicacionTexto','localidadProvincia','localidadTexto','ciudadProvincia','ubicacion','localidad','city','ciudad','municipio','partido','address','direccion','formatted_address']);
      if(txt) return txt;
      const p=getPosObj(t); if(p && typeof coordToLocalidadProvincia==='function') return coordToLocalidadProvincia(p.lat,p.lng);
    }
    return oldLocFull ? oldLocFull(t) : '-';
  };
  loc=function(t){return locFull(t);};

  trackingAlertsHtml = function(t){
    let arr=(t.alerts||[]).map((a,idx)=>({a,idx})).filter(x=>!(typeof alertVerifiedV1250==='function' && alertVerifiedV1250(t,x.a,x.idx)));
    arr.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!arr.length)return '<div class="trackingAlertItem">Sin alertas registradas.</div>';
    return arr.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${esc(typeof alertTipoV1250==='function'?alertTipoV1250(a):(a.tipo||a.type||a.motivo||'Alerta'))}</span><span>${fd(a.time||a.fecha||a.createdAt||a.ts)}</span></div><div class="trackingAlertMeta"><span><b>Km:</b> ${esc(window.alertKmV2(a))}</span><span><b>Localidad:</b> ${esc(typeof alertLocV1250==='function'?alertLocV1250(a,t):(locFull(t)||'-'))}</span></div></div>`).join('');
  };

  const oldRenderDash = typeof renderDash==='function' ? renderDash : null;
  if(oldRenderDash){
    renderDash=function(){ oldRenderDash.apply(this, arguments); normalizeTitlesV2(); setVersionV2(); if(typeof updateAlertCountersV1250==='function')updateAlertCountersV1250(); };
  }

  // Tarjetas de clima: temperatura a la derecha, icono/descripcion, localidad en una linea.
  weatherCardReal = function(title,subtitle,c,w,extra='',cls='',icon='🌦️',badge=''){
    const desc=esc(w?.desc||'');
    const temp=(w?.temp ?? '-');
    const emoji=w?.emoji||icon||'';
    return `<div class="weatherCard ${cls}"><div class="weatherTop weatherTopV2"><div class="weatherTitleBlock"><div class="weatherName"><span class="weatherIcon">${emoji}</span><span>${title}</span><span class="weatherDescInline">${desc}</span></div></div><div class="weatherTemp weatherTempRight">${esc(temp)}°</div></div>${badge||''}<div class="weatherData weatherDataV2"><div class="weatherLocationLine"><b>Ubicación:</b> ${esc(subtitle||'-')}</div><div><b>Sensación:</b> ${esc(w?.sens ?? '-')}°</div><div><b>Viento:</b> ${esc(w?.wind ?? '-')} km/h</div><div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div></div>${extra}</div>`;
  };

  if(typeof renderWeatherFleets==='function'){
    renderWeatherFleets = async function(){
      let el=q('weatherFleets'); if(!el)return;
      let abiertos=Array.isArray(trs)?trs.filter(openT):[];
      if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
      el.innerHTML='<div class="weatherLoading">Consultando clima real...</div>';
      let html=[];
      for(let t of abiertos){
        let pos=getPosObj(t); let c=pos?{lat:pos.lat,lng:pos.lng}:null;
        let w=await fetchWeatherByCoords(c); let rt=ruta(t)||{}; let upd=lastGpsTimeV1237?lastGpsTimeV1237(t):((lastU(t)||{}).time||(lastU(t)||{}).fecha); let gpsLoc=locFull(t);
        let extra=`<div class="weatherFleetTransit weatherFleetTransitV2"><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div><b>Embarque:</b> ${esc(t.embarque||'-')}</div><div><b>Cliente:</b> ${esc(rt.cliente||'-')}</div><div><b>Origen:</b> ${esc(rt.origen||'-')}</div><div><b>Destino:</b> ${esc(rt.destino||'-')}</div><div><b>Últ. reporte GPS:</b> ${fd(upd)}</div><div class="weatherLocationLine"><b>Localidad GPS:</b> ${esc(gpsLoc||'-')}</div><div><b>GPS:</b> ${c?'Reportado':'Sin coordenadas'}</div></div>`;
        html.push(weatherCardReal(`Flota ${esc(flota(t)||'-')}`,gpsLoc||'-',c,w,extra,'fleetWeatherCard','🌦️'));
      }
      el.innerHTML=html.join('');
    };
  }

  renderAlertCards = function(rows){
    if(!q('alertCards'))return;
    let byFleet={};
    rows.forEach(r=>{let key=flota(r.t)||'-';(byFleet[key]=byFleet[key]||[]).push(r);});
    let html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([fleet,list])=>{
      let pend=list.filter(r=>!r.verified).length;
      return `<div class="alertFleetCard"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div><span class="alertPendingBadge">${pend} pendientes</span></div>${list.map(r=>{
        let emb=String(r.t.embarque||'').replace(/'/g,"\\'"); let flo=String(flota(r.t)||'').replace(/'/g,"\\'");
        let btn=r.verified?'<span class="alertVerifiedInfo">Verificada</span>':`<button class="alertVerifyBtn verifyBlink" onclick="markAlertVerified(trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}'), (trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}')?.alerts||[])[${r.idx}], ${r.idx})">Verificar</button>`;
        return `<div class="alertItemCard"><div class="alertItemTop"><span>⚠️ ${esc(typeof alertTipoV1250==='function'?alertTipoV1250(r.a):(r.a.tipo||r.a.type||r.a.motivo||'Alerta'))}</span>${btn}</div><div class="alertItemMeta alertItemMetaV2"><div><b>Embarque:</b> ${esc(r.t.embarque||'-')}</div><div><b>Km:</b> ${esc(window.alertKmV2(r.a))}</div><div><b>Fecha/hora:</b> ${fd(r.a.time||r.a.fecha||r.a.createdAt||r.a.ts)}</div><div class="alertLocalidad"><b>Localidad:</b> ${esc(typeof alertLocV1250==='function'?alertLocV1250(r.a,r.t):(locFull(r.t)||'-'))}</div></div></div>`;
      }).join('')}</div>`;
    }).join('');
    q('alertCards').innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
  };

})();


/* ===== V2.0.150 - Version y menu lateral robustos ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION = VERSION;
  function setVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function normalizeMenu(){
    const menuMap=[
      ['dash','🏠','Torre de Control'],['transitos','🚚','Tránsitos'],['entrega','🏁','Entregas'],['mapa','📍','Seguimiento'],['clima','🌦️','Clima'],
      ['unidades','🚛','Unidades / Choferes'],['alertas','🔔','Alertas'],['clientes','🏢','Clientes / Destinos'],['abm','⚙️','Configuración']
    ];
    menuMap.forEach(([id,icon,text])=>{
      const btn=document.querySelector(`.sideNav button[onclick*="${id}"]`);
      if(btn) btn.innerHTML=`<span class="menuIcon">${icon}</span><span class="menuText">${text}</span>`;
    });
    // Arrancar expandido para que se lea bien; el boton hamburguesa alterna a colapsado.
    if(!document.body.dataset.menuInitialized){
      document.body.classList.remove('sidebarCollapsed');
      document.body.dataset.menuInitialized='1';
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{setVersion(); normalizeMenu(); setTimeout(()=>{setVersion(); normalizeMenu();},300);});
  const oldToggle=window.toggleSidebar;
  window.toggleSidebar=function(){
    if(typeof oldToggle==='function') oldToggle(); else document.body.classList.toggle('sidebarCollapsed');
    setTimeout(normalizeMenu,0);
  };
})();

/* ===== V2.0.150 - Anti-cache y normalizacion final menu/version ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION = VERSION;
  window.APP_VERSION_V2 = VERSION;
  function setVersionFinal(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
    document.title='ITS Intelligent Traffic System';
  }
  function normalizeMenuFinal(){
    const menuMap=[
      ['dash','🏠','Torre de Control'],
      ['transitos','🚚','Tránsitos'],
      ['mapa','📍','Seguimiento'],
      ['clima','🌦️','Clima'],
      ['unidades','🚛','Unidades / Choferes'],
      ['alertas','🔔','Alertas'],
      ['clientes','🏢','Clientes / Destinos'],
      ['abm','⚙️','Configuración']
    ];
    menuMap.forEach(([id,icon,text])=>{
      const btn=document.querySelector(`.sideNav button[onclick*="${id}"]`);
      if(btn){
        btn.innerHTML=`<span class="menuIcon" aria-hidden="true">${icon}</span><span class="menuText">${text}</span>`;
        btn.title=text;
      }
    });
    document.querySelectorAll('.loginCard h1, .headerTitle h1').forEach(h=>{
      h.textContent='ITS Intelligent Traffic System';
      h.classList.add('systemTitleSmall');
    });
    document.querySelectorAll('.sectionTitle h2').forEach(h=>{
      if((h.textContent||'').trim()==='Dashboard') h.textContent='Torre de Control';
    });
  }
  function applyFinal(){setVersionFinal(); normalizeMenuFinal();}
  document.addEventListener('DOMContentLoaded',()=>{applyFinal(); setTimeout(applyFinal,100); setTimeout(applyFinal,700);});
  const oldToggle=window.toggleSidebar;
  window.toggleSidebar=function(){
    if(typeof oldToggle==='function') oldToggle.apply(this, arguments);
    else document.body.classList.toggle('sidebarCollapsed');
    setTimeout(applyFinal,0);
  };
  const oldLogin=window.login;
  if(typeof oldLogin==='function'){
    window.login=async function(){
      const r=await oldLogin.apply(this, arguments);
      applyFinal(); setTimeout(applyFinal,300);
      return r;
    };
  }
  window.ELTA_FORCE_UI_REFRESH=applyFinal;
})();

/* ===== V2.0.150 - Correcciones GPS, clima, alertas y seguimiento ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  function setVersion208(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }

  function valueFromDeep208(obj, keys){
    const seen=new Set();
    const q=[obj];
    while(q.length){
      const cur=q.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const k of keys){
        const v=cur[k];
        if(v!==undefined && v!==null && String(v).trim()!=='') return String(v).trim();
      }
      for(const v of Object.values(cur)){
        if(v && typeof v==='object') q.push(v);
      }
    }
    return '';
  }

  function parseKm208(a,t){
    const keys=['km','KM','Km','kilometro','kilómetro','kilometros','kilómetros','kmRuta','km_ruta','rutaKm','progresiva','progresivaKm','progresiva_km','kilometraje','kilometrajeRuta','ubicacionKm','kmControl','kmAlerta'];
    let v=valueFromDeep208(a,keys) || valueFromDeep208(t,keys);
    if(v && v!=='-') return v;
    const txt=JSON.stringify(a||{});
    let m=txt.match(/(?:km|kil[oó]metro|progresiva)\D{0,12}(\d+(?:[\.,]\d+)?)/i) || txt.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kil[oó]metro)/i);
    return m?m[1].replace(',', '.'):'-';
  }
  window.alertKmV2=function(a,t){return parseKm208(a,t);};
  if(typeof alertKmV1250==='function') alertKmV1250=function(a,t){return parseKm208(a,t);};
  if(typeof alertKmValue==='function') alertKmValue=function(a,t){return parseKm208(a,t);};
  if(typeof alertKm==='function') alertKm=function(a,t){return parseKm208(a,t);};

  function parsePair208(v){
    const s=String(v||'');
    const m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    return m?{lat:Number(m[1]),lng:Number(m[2])}:null;
  }
  function coordsFromAny208(obj){
    if(!obj) return null;
    if(typeof coordsFromObjClima==='function'){
      const c=coordsFromObjClima(obj);
      if(c && isFinite(Number(c.lat)) && isFinite(Number(c.lng))) return {lat:Number(c.lat),lng:Number(c.lng),src:obj};
    }
    const lat=obj.lat??obj.latitude??obj.latitud??obj.Latitude??obj.LAT;
    const lng=obj.lng??obj.lon??obj.longitude??obj.longitud??obj.Longitude??obj.LON;
    if(lat!==undefined && lng!==undefined && String(lat).trim()!=='' && String(lng).trim()!=='' && isFinite(Number(lat)) && isFinite(Number(lng))) return {lat:Number(lat),lng:Number(lng),src:obj};
    const p=parsePair208(obj.ubicacion||obj.coordenadas||obj.coords||obj.coord||obj.position||obj.posicion||obj.location||'');
    if(p) return {...p,src:obj};
    return null;
  }
  function time208(o){return tv(o?.time||o?.fecha||o?.createdAt||o?.ts||o?.timestamp||o?.updatedAt||o?.updateAt||o?.date||o?.datetime)||0;}
  function latestGpsCandidate208(t){
    const rows=[];
    function add(obj,fallback){
      if(!obj) return;
      const c=coordsFromAny208(obj);
      if(c) rows.push({obj,lat:c.lat,lng:c.lng,time:time208(obj)||tv(fallback)||0});
      if(obj.gps) add(obj.gps,obj.time||obj.fecha||obj.createdAt||obj.ts||fallback);
      if(obj.ultimaPosicion) add(obj.ultimaPosicion,obj.time||obj.fecha||obj.createdAt||obj.ts||fallback);
      if(obj.posicion) add(obj.posicion,obj.time||obj.fecha||obj.createdAt||obj.ts||fallback);
      if(obj.position) add(obj.position,obj.time||obj.fecha||obj.createdAt||obj.ts||fallback);
      if(obj.location) add(obj.location,obj.time||obj.fecha||obj.createdAt||obj.ts||fallback);
    }
    ['updates','ubicaciones','positions','posiciones','gpsHistory','historialGps','reportes','reports','eventos','events','tracking','locationHistory','history'].forEach(k=>{
      if(Array.isArray(t?.[k])) t[k].forEach(x=>add(x,x?.time||x?.fecha||x?.createdAt||x?.ts));
    });
    add(t?.gps,t?.updatedAt||t?.updateAt);
    add(t?.ultimaPosicion,t?.updatedAt||t?.updateAt);
    add(t?.lastPosition,t?.updatedAt||t?.updateAt);
    add(t?.position,t?.updatedAt||t?.updateAt);
    add(t?.posicion,t?.updatedAt||t?.updateAt);
    add(t?.location,t?.updatedAt||t?.updateAt);
    add(typeof lastU==='function'?lastU(t):null,null);
    rows.sort((a,b)=>b.time-a.time);
    return rows[0]||null;
  }
  getPosObj=function(t){
    const r=latestGpsCandidate208(t);
    return r?{lat:r.lat,lng:r.lng,src:r.obj}:null;
  };

  const oldLocFull208=typeof locFull==='function'?locFull:null;
  locFull=function(t){
    const r=latestGpsCandidate208(t);
    if(r){
      const txt=valueFromDeep208(r.obj,['ubicacionTexto','localidadProvincia','localidadTexto','ciudadProvincia','localidad','city','ciudad','municipio','partido','address','direccion','formatted_address']);
      if(txt) return txt;
      if(typeof coordToLocalidadProvincia==='function') return coordToLocalidadProvincia(r.lat,r.lng);
    }
    return oldLocFull208?oldLocFull208(t):'-';
  };
  loc=function(t){return locFull(t);};

  function lastGpsTime208(t){
    const r=latestGpsCandidate208(t);
    return r?.obj?.time||r?.obj?.fecha||r?.obj?.createdAt||r?.obj?.ts||r?.obj?.timestamp||r?.time||t?.updatedAt||t?.updateAt||t?.start?.time||t?.start;
  }
  if(typeof lastGpsTimeV1237==='function') lastGpsTimeV1237=lastGpsTime208;
  if(typeof lastGpsCoords==='function') lastGpsCoords=function(t){const r=latestGpsCandidate208(t); return r?{lat:r.lat,lng:r.lng}:null;};
  if(typeof lastGpsLocalidadV1237==='function') lastGpsLocalidadV1237=function(t){return locFull(t);};

  function pendingAlertRowsForTransit208(t){
    return (t?.alerts||[]).map((a,idx)=>({a,idx})).filter(x=>!(typeof alertVerifiedV1250==='function' && alertVerifiedV1250(t,x.a,x.idx)));
  }
  trackingAlertsHtml=function(t){
    const rows=pendingAlertRowsForTransit208(t).sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!rows.length) return '';
    return `<div class="trackingAlerts"><h4>⚠️ Alertas del tránsito</h4>${rows.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${esc(typeof alertTipoV1250==='function'?alertTipoV1250(a):(a.tipo||a.type||a.motivo||'Alerta'))}</span><span>${fd(a.time||a.fecha||a.createdAt||a.ts)}</span></div><div class="trackingAlertMeta"><span><b>Km:</b> ${esc(parseKm208(a,t))}</span><span><b>Localidad:</b> ${esc(typeof alertLocV1250==='function'?alertLocV1250(a,t):locFull(t))}</span></div></div>`).join('')}</div>`;
  };
  trackingCard=function(t){
    let o=openT(t),r=ruta(t)||{};
    let alerts=trackingAlertsHtml(t);
    let last=lastGpsTime208(t);
    return `<div class="trackingCard"><div class="trackingCardTop"><div class="trackingFleetTitle">Flota ${esc(flota(t)||'-')}</div><span class="trackingState ${o?'':'closed'}">${o?'Abierto':'Finalizado'}</span></div><div class="trackingData"><div><b>Emb.:</b> ${esc(t.embarque||'-')}</div><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div class="locationLine"><b>Ubicación:</b> ${esc(locFull(t))}</div><div><b>Cliente:</b> ${esc(r.cliente||'-')}</div><div><b>Destino:</b> ${esc(r.destino||'-')}</div><div class="trackingReportLine"><b>Últ. reporte:</b> ${fd(last)}</div></div>${alerts}</div>`;
  };

  if(typeof initSeguimientoMap==='function'){
    const baseInit=initSeguimientoMap;
    initSeguimientoMap=function(items){
      if(typeof L==='undefined'||!q('realMap')) return;
      const withPos=(items||[]).map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);
      return baseInit(withPos.map(x=>x.t));
    };
  }

  weatherCardReal=function(title,subtitle,c,w,extra='',cls='',icon='🌦️',badge=''){
    const desc=esc(w?.desc||'');
    const temp=esc(w?.temp ?? '-');
    const weatherIcon=w?.emoji||w?.icon||'🌦️';
    const titleIcon=icon?`<span class="weatherIcon">${icon}</span>`:'';
    return `<div class="weatherCard ${cls}"><div class="weatherTop weatherTop208"><div class="weatherLeft208"><div class="weatherName">${titleIcon}<span>${title}</span></div><div class="weatherDescLeft208">${desc}</div></div><div class="weatherTempBox208"><span class="weatherTemp208">${temp}°</span><span class="weatherTempIcon208">${weatherIcon}</span></div></div>${badge||''}<div class="weatherData weatherData208"><div class="weatherLocationLine"><b>Ubicación:</b> ${esc(subtitle||'-')}</div><div><b>Sensación:</b> ${esc(w?.sens ?? '-')}°</div><div><b>Viento:</b> ${esc(w?.wind ?? '-')} km/h</div><div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div></div>${extra}</div>`;
  };

  renderWeatherFleets=async function(){
    const el=q('weatherFleets'); if(!el) return;
    const abiertos=Array.isArray(trs)?trs.filter(openT):[];
    if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima real...</div>';
    const html=[];
    for(const t of abiertos){
      const pos=getPosObj(t); const c=pos?{lat:pos.lat,lng:pos.lng}:null; const w=await fetchWeatherByCoords(c); const rt=ruta(t)||{}; const gpsLoc=locFull(t);
      const extra=`<div class="weatherFleetTransit weatherFleetTransit208"><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div><b>Embarque:</b> ${esc(t.embarque||'-')}</div><div><b>Cliente:</b> ${esc(rt.cliente||'-')}</div><div><b>Origen:</b> ${esc(rt.origen||'-')}</div><div><b>Destino:</b> ${esc(rt.destino||'-')}</div><div><b>Últ. reporte GPS:</b> ${fd(lastGpsTime208(t))}</div><div class="weatherLocationLine"><b>Localidad GPS:</b> ${esc(gpsLoc||'-')}</div></div>`;
      html.push(weatherCardReal(`Flota ${esc(flota(t)||'-')}`,gpsLoc||'-',c,w,extra,'fleetWeatherCard','🚚'));
    }
    el.innerHTML=html.join('');
  };

  renderAlertCards=function(rows){
    if(!q('alertCards')) return;
    const byFleet={};
    (rows||[]).forEach(r=>{const key=flota(r.t)||'-';(byFleet[key]=byFleet[key]||[]).push(r);});
    const html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([fleet,list])=>{
      const pend=list.filter(r=>!r.verified).length;
      return `<div class="alertFleetCard"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div><span class="alertPendingBadge">${pend} pendientes</span></div><div class="alertRows208">${list.map(r=>{const emb=String(r.t.embarque||'').replace(/'/g,"\\'");const flo=String(flota(r.t)||'').replace(/'/g,"\\'");const btn=r.verified?'<span class="alertVerifiedInfo">Verificada</span>':`<button class="alertVerifyBtn verifyBlink" onclick="markAlertVerified(trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}'), (trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}')?.alerts||[])[${r.idx}], ${r.idx})">Verificar</button>`;return `<div class="alertItemCard alertItemCard208"><div class="alertItemName208">⚠️ ${esc(typeof alertTipoV1250==='function'?alertTipoV1250(r.a):(r.a.tipo||r.a.type||r.a.motivo||'Alerta'))}</div><div class="alertItemMeta208"><span><b>Embarque:</b> ${esc(r.t.embarque||'-')}</span><span><b>Km:</b> ${esc(parseKm208(r.a,r.t))}</span><span><b>Fecha/hora:</b> ${fd(r.a.time||r.a.fecha||r.a.createdAt||r.a.ts)}</span><span class="alertLocalidad"><b>Localidad:</b> ${esc(typeof alertLocV1250==='function'?alertLocV1250(r.a,r.t):locFull(r.t))}</span></div><div class="alertItemAction208">${btn}</div></div>`;}).join('')}</div></div>`;
    }).join('');
    q('alertCards').innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
  };

  function apply208(){setVersion208();}
  document.addEventListener('DOMContentLoaded',()=>{apply208();setTimeout(apply208,200);setTimeout(apply208,900);});
  const oldLogin=window.login;
  if(typeof oldLogin==='function') window.login=async function(){const r=await oldLogin.apply(this,arguments);apply208();return r;};
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments);apply208();return r;};
})();


/* ===== V2.0.150 - Ajustes finales clima, KM y alertas ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  function updateVersion210(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
    document.title='ITS Intelligent Traffic System';
  }

  function deepValue210(obj, keys){
    const seen=new Set();
    const queue=[obj];
    while(queue.length){
      const cur=queue.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const k of keys){
        const v=cur[k];
        if(v!==undefined && v!==null && String(v).trim()!=='') return String(v).trim();
      }
      for(const v of Object.values(cur)) if(v && typeof v==='object') queue.push(v);
    }
    return '';
  }

  function parseKm210(a,t){
    const keys=['km','KM','Km','kms','KMS','kilometro','kilómetro','kilometros','kilómetros','kmRuta','km_ruta','rutaKm','ruta_km','progresiva','progresivaKm','progresiva_km','kilometraje','kilometrajeRuta','ubicacionKm','kmControl','kmAlerta','distanciaKm','distancia_km'];
    let v=deepValue210(a,keys) || deepValue210(a?.location,keys) || deepValue210(a?.ubicacion,keys) || deepValue210(a?.gps,keys);
    if(v && v!=='-' && !/^null$/i.test(v)) return v;
    v=deepValue210(t,keys) || deepValue210(t?.ruta,keys) || deepValue210(t?.route,keys) || deepValue210(t?.ultimaPosicion,keys) || deepValue210(t?.lastPosition,keys) || deepValue210(t?.gps,keys);
    if(v && v!=='-' && !/^null$/i.test(v)) return v;
    const txt=JSON.stringify(a||{});
    let m=txt.match(/(?:km|kil[oó]metro|progresiva|distancia)\D{0,16}(\d+(?:[\.,]\d+)?)/i) || txt.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kil[oó]metro)/i);
    if(m) return m[1].replace(',', '.');
    return '-';
  }
  window.alertKmV2=parseKm210;
  window.alertKmValue=parseKm210;
  window.alertKm=parseKm210;
  if(typeof alertKmV1250!=='undefined') alertKmV1250=parseKm210;

  function alertTipo210(a){return esc((typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta'))||'Alerta');}
  function alertFecha210(a){return fd(a?.time||a?.fecha||a?.createdAt||a?.ts||a?.timestamp);}
  function alertLoc210(a,t){return esc((typeof alertLocV1250==='function'?alertLocV1250(a,t):(typeof locFull==='function'?locFull(t):'-'))||'-');}

  // En tránsito: mostrar KM correctamente y no mostrar bloque si no hay alertas pendientes.
  window.transitAlertsCompact = function(t){
    const arr=(t?.alerts||[]).map((a,idx)=>({a,idx})).filter(x=>!(typeof alertVerifiedV1250==='function' && alertVerifiedV1250(t,x.a,x.idx)));
    arr.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!arr.length) return '';
    return `<div class="transitAlertsBox transitAlertsBox210">`+arr.map(({a})=>`<div class="transitAlertCard transitAlertCard210">
      <div class="transitAlertTop"><span>⚠️ ${alertTipo210(a)}</span><span>${alertFecha210(a)}</span></div>
      <div class="transitAlertGrid transitAlertGrid210">
        <div><b>Km:</b> ${esc(parseKm210(a,t))}</div>
        <div><b>Hora:</b> ${alertFecha210(a)}</div>
        <div class="fullLine"><b>Localidad:</b> ${alertLoc210(a,t)}</div>
      </div>
    </div>`).join('')+`</div>`;
  };

  if(typeof card==='function'){
    window.card=function(t){
      let o=openT(t),r=ruta(t)||{};
      return `<div class="item ${o?'open':'closed'} transitCardV1210">
        <div class="transitLeft"><div class="transitTop"><div class="transitTitle">🚚 Flota ${esc(flota(t)||'-')} / 📦 Emb. ${esc(t.embarque||'-')}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div>
        <div class="transitDataGrid"><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div><b>Cliente:</b> ${esc(r.cliente||'-')}</div><div><b>Origen:</b> ${esc(r.origen||'-')}</div><div><b>Destino:</b> ${esc(r.destino||'-')}</div><div><b>Lote/Carga:</b> ${esc(t.lote||'-')}</div><div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div><div><b>Cierre:</b> ${o?'-':fd(t.closed?.time||t.closed)}</div><div class="fullLine"><b>Últ. posición:</b> ${esc(typeof locFull==='function'?locFull(t):loc(t))}</div><div class="lastReportLine"><b>Últ. reporte:</b> ${fd(typeof lastReportValue==='function'?lastReportValue(t):t.updatedAt||t.start?.time||t.start)}</div></div></div>
        <div class="transitRight"><h4 class="alertsTitle">⚠️ Alertas</h4>${window.transitAlertsCompact(t)||'<div class="noAlerts">Sin alertas pendientes.</div>'}</div>
      </div>`;
    };
  }

  // Seguimiento: no mostrar títulos/iconos de alertas si no hay pendientes.
  window.trackingAlertsHtml=function(t){
    const rows=(t?.alerts||[]).map((a,idx)=>({a,idx})).filter(x=>!(typeof alertVerifiedV1250==='function' && alertVerifiedV1250(t,x.a,x.idx)));
    rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!rows.length) return '';
    return `<div class="trackingAlerts"><h4>⚠️ Alertas del tránsito</h4>${rows.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${alertTipo210(a)}</span><span>${alertFecha210(a)}</span></div><div class="trackingAlertMeta"><span><b>Km:</b> ${esc(parseKm210(a,t))}</span><span><b>Localidad:</b> ${alertLoc210(a,t)}</span></div></div>`).join('')}</div>`;
  };
  if(typeof trackingCard==='function'){
    window.trackingCard=function(t){
      const o=openT(t),r=ruta(t)||{};
      const last=(typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof lastReportValue==='function'?lastReportValue(t):t.updatedAt||t.start?.time||t.start));
      const alerts=window.trackingAlertsHtml(t);
      return `<div class="trackingCard"><div class="trackingCardTop"><div class="trackingFleetTitle">Flota ${esc(flota(t)||'-')}</div><span class="trackingState ${o?'':'closed'}">${o?'Abierto':'Finalizado'}</span></div><div class="trackingData"><div><b>Emb.:</b> ${esc(t.embarque||'-')}</div><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div class="locationLine"><b>Ubicación:</b> ${esc(typeof locFull==='function'?locFull(t):'-')}</div><div><b>Cliente:</b> ${esc(r.cliente||'-')}</div><div><b>Destino:</b> ${esc(r.destino||'-')}</div><div class="trackingReportLine"><b>Últ. reporte:</b> ${fd(last)}</div></div>${alerts}</div>`;
    };
  }

  // Clima: tamaños más chicos y layout compacto.
  if(typeof weatherCardReal==='function'){
    window.weatherCardReal=function(title,subtitle,c,w,extra='',cls='',icon='🌦️',badge=''){
      const desc=esc(w?.desc||'');
      const temp=esc(w?.temp ?? '-');
      const weatherIcon=w?.emoji||w?.icon||'🌦️';
      const titleIcon=icon?`<span class="weatherIcon">${icon}</span>`:'';
      return `<div class="weatherCard ${cls}"><div class="weatherTop weatherTop210"><div class="weatherLeft210"><div class="weatherName weatherName210">${titleIcon}<span>${title}</span></div><div class="weatherDescLeft210">${desc}</div></div><div class="weatherTempBox210"><span class="weatherTemp210">${temp}°</span><span class="weatherTempIcon210">${weatherIcon}</span></div></div>${badge||''}<div class="weatherData weatherData210"><div class="weatherLocationLine"><b>Ubicación:</b> ${esc(subtitle||'-')}</div><div><b>Sensación:</b> ${esc(w?.sens ?? '-')}°</div><div><b>Viento:</b> ${esc(w?.wind ?? '-')} km/h</div><div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div></div>${extra}</div>`;
    };
  }

  // Alertas: contenedor con texto más chico y columnas claras.
  window.renderAlertCards=function(rows){
    if(!q('alertCards')) return;
    const byFleet={};
    (rows||[]).forEach(r=>{const key=flota(r.t)||'-';(byFleet[key]=byFleet[key]||[]).push(r);});
    const html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([fleet,list])=>{
      const pend=list.filter(r=>!r.verified).length;
      return `<div class="alertFleetCard alertFleetCard210"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div><span class="alertPendingBadge">${pend} pendientes</span></div><div class="alertRows210"><div class="alertHeader210"><span>Alerta</span><span>Embarque</span><span>Km</span><span>Fecha/hora</span><span>Localidad</span><span>Acción</span></div>${list.map(r=>{const emb=String(r.t.embarque||'').replace(/'/g,"\\'");const flo=String(flota(r.t)||'').replace(/'/g,"\\'");const btn=r.verified?'<span class="alertVerifiedInfo">Verificada</span>':`<button class="alertVerifyBtn verifyBlink" onclick="markAlertVerified(trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}'), (trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}')?.alerts||[])[${r.idx}], ${r.idx})">Verificar</button>`;return `<div class="alertItemCard alertItemCard210"><div class="alertName210">⚠️ ${alertTipo210(r.a)}</div><div>${esc(r.t.embarque||'-')}</div><div>${esc(parseKm210(r.a,r.t))}</div><div>${alertFecha210(r.a)}</div><div class="alertLocalidad210">${alertLoc210(r.a,r.t)}</div><div class="alertAction210">${btn}</div></div>`;}).join('')}</div></div>`;
    }).join('');
    q('alertCards').innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
  };

  function apply210(){updateVersion210();}
  document.addEventListener('DOMContentLoaded',()=>{apply210();setTimeout(apply210,200);setTimeout(apply210,900);});
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments);apply210();return r;};
})();

/* ===== V2.0.150 - Ajuste final: menu, clima compacto, KM y alertas alineadas ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  function setVersion211(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
    document.title='ITS Intelligent Traffic System';
  }

  function deepText211(obj, keys){
    const q=[obj];
    const seen=new Set();
    while(q.length){
      const cur=q.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const k of keys){
        const v=cur[k];
        if(v!==undefined && v!==null && String(v).trim()!=='' && !/^null$/i.test(String(v).trim())) return String(v).trim();
      }
      for(const v of Object.values(cur)) if(v && typeof v==='object') q.push(v);
    }
    return '';
  }
  function allStrings211(obj){
    const out=[]; const q=[obj]; const seen=new Set();
    while(q.length){
      const cur=q.shift();
      if(cur===null || cur===undefined) continue;
      if(typeof cur==='string' || typeof cur==='number') out.push(String(cur));
      else if(typeof cur==='object' && !seen.has(cur)){
        seen.add(cur);
        Object.values(cur).forEach(v=>q.push(v));
      }
    }
    return out.join(' | ');
  }
  function km211(a,t){
    const keys=['km','KM','Km','kms','KMS','kilometro','kilómetro','kilometros','kilómetros','kilometer','kilometers','kmRuta','km_ruta','rutaKm','ruta_km','progresiva','progresivaKm','progresiva_km','kilometraje','kilometrajeRuta','ubicacionKm','kmControl','kmAlerta','distanciaKm','distancia_km','kmGps','gpsKm','kmActual','km_posicion','kmUbicacion','positionKm','roadKm','ruta_kilometro','odometer'];
    let v=deepText211(a,keys) || deepText211(t,keys);
    if(v && v!=='-') return v;
    const txt=allStrings211(a)+' | '+allStrings211(t?.route||t?.ruta||{});
    let m=txt.match(/(?:km|kil[oó]metro|progresiva|distancia|ruta)\D{0,24}(\d+(?:[\.,]\d+)?)/i) || txt.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kil[oó]metro)/i);
    if(m) return m[1].replace(',', '.');
    return 'No informado';
  }
  window.alertKmV2=km211;
  window.alertKmValue=km211;
  window.alertKm=km211;
  if(typeof alertKmV1250!=='undefined') alertKmV1250=km211;

  function tipo211(a){return (typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta'))||'Alerta';}
  function fecha211(a){return fd(a?.time||a?.fecha||a?.createdAt||a?.ts||a?.timestamp);}
  function loc211(a,t){return (typeof alertLocV1250==='function'?alertLocV1250(a,t):(typeof locFull==='function'?locFull(t):'-'))||'-';}
  function verified211(t,a,idx){return !!(typeof alertVerifiedV1250==='function' && alertVerifiedV1250(t,a,idx));}

  window.transitAlertsCompact=function(t){
    const rows=(t?.alerts||[]).map((a,idx)=>({a,idx})).filter(r=>!verified211(t,r.a,r.idx));
    rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!rows.length) return '';
    return `<div class="transitAlertsBox transitAlertsBox211">${rows.map(({a})=>`<div class="transitAlertCard transitAlertCard211"><div class="transitAlertTop211"><span class="transitAlertName211"><span>⚠️</span><span>${esc(tipo211(a))}</span></span><span class="transitAlertDate211">${fecha211(a)}</span></div><div class="transitAlertGrid211"><div><b>Km:</b> ${esc(km211(a,t))}</div><div><b>Hora:</b> ${fecha211(a)}</div><div><b>Localidad:</b> ${esc(loc211(a,t))}</div></div></div>`).join('')}</div>`;
  };

  window.card=function(t){
    let o=openT(t),r=ruta(t)||{};
    const alerts=window.transitAlertsCompact(t);
    return `<div class="item ${o?'open':'closed'} transitCardV1210"><div class="transitLeft"><div class="transitTop"><div class="transitTitle">🚚 Flota ${esc(flota(t)||'-')} / 📦 Emb. ${esc(t.embarque||'-')}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div><div class="transitDataGrid"><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div><b>Cliente:</b> ${esc(r.cliente||'-')}</div><div><b>Origen:</b> ${esc(r.origen||'-')}</div><div><b>Destino:</b> ${esc(r.destino||'-')}</div><div><b>Lote/Carga:</b> ${esc(t.lote||'-')}</div><div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div><div><b>Cierre:</b> ${o?'-':fd(t.closed?.time||t.closed)}</div><div class="fullLine"><b>Últ. posición:</b> ${esc(typeof locFull==='function'?locFull(t):loc(t))}</div><div class="lastReportLine"><b>Últ. reporte:</b> ${fd(typeof lastReportValue==='function'?lastReportValue(t):t.updatedAt||t.start?.time||t.start)}</div></div></div>${alerts?`<div class="transitRight"><h4 class="alertsTitle">⚠️ Alertas</h4>${alerts}</div>`:''}</div>`;
  };

  window.trackingAlertsHtml=function(t){
    const rows=(t?.alerts||[]).map((a,idx)=>({a,idx})).filter(r=>!verified211(t,r.a,r.idx));
    rows.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!rows.length) return '';
    return `<div class="trackingAlerts"><h4>⚠️ Alertas del tránsito</h4>${rows.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${esc(tipo211(a))}</span><span>${fecha211(a)}</span></div><div class="trackingAlertMeta"><span><b>Km:</b> ${esc(km211(a,t))}</span><span><b>Localidad:</b> ${esc(loc211(a,t))}</span></div></div>`).join('')}</div>`;
  };
  window.trackingCard=function(t){
    const o=openT(t),r=ruta(t)||{};
    const last=(typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof lastReportValue==='function'?lastReportValue(t):t.updatedAt||t.start?.time||t.start));
    const alerts=window.trackingAlertsHtml(t);
    return `<div class="trackingCard"><div class="trackingCardTop"><div class="trackingFleetTitle">Flota ${esc(flota(t)||'-')}</div><span class="trackingState ${o?'':'closed'}">${o?'Abierto':'Finalizado'}</span></div><div class="trackingData"><div><b>Emb.:</b> ${esc(t.embarque||'-')}</div><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div class="locationLine"><b>Ubicación:</b> ${esc(typeof locFull==='function'?locFull(t):'-')}</div><div><b>Cliente:</b> ${esc(r.cliente||'-')}</div><div><b>Destino:</b> ${esc(r.destino||'-')}</div><div class="trackingReportLine"><b>Últ. reporte:</b> ${fd(last)}</div></div>${alerts}</div>`;
  };

  window.weatherCardReal=function(title,subtitle,c,w,extra='',cls='',icon='🌦️',badge=''){
    const desc=esc(w?.desc||'');
    const temp=esc(w?.temp ?? '-');
    const weatherIcon=w?.emoji||w?.icon||'🌦️';
    const titleIcon=icon?`<span class="weatherIcon">${icon}</span>`:'';
    return `<div class="weatherCard ${cls}"><div class="weatherTop211"><div class="weatherName211">${titleIcon}<span>${title}</span></div><div class="weatherRight211"><div class="weatherDesc211">${desc}</div><span class="weatherTemp211">${temp}°</span><span class="weatherTempIcon211">${weatherIcon}</span></div></div>${badge||''}<div class="weatherData211"><div class="weatherLocationLine"><b>Ubicación:</b> ${esc(subtitle||'-')}</div><div><b>Sensación:</b> ${esc(w?.sens ?? '-')}°</div><div><b>Viento:</b> ${esc(w?.wind ?? '-')} km/h</div><div><b>Actualizado:</b> ${fd(new Date().toISOString())}</div></div>${extra}</div>`;
  };

  if(typeof renderWeatherFleets==='function'){
    window.renderWeatherFleets=async function(){
      const el=q('weatherFleets'); if(!el) return;
      const abiertos=Array.isArray(trs)?trs.filter(openT):[];
      if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
      el.innerHTML='<div class="weatherLoading">Consultando clima real...</div>';
      const html=[];
      for(const t of abiertos){
        const pos=typeof getPosObj==='function'?getPosObj(t):null;
        const c=pos?{lat:pos.lat,lng:pos.lng}:null;
        const w=await fetchWeatherByCoords(c);
        const rt=ruta(t)||{};
        const gpsLoc=typeof locFull==='function'?locFull(t):'-';
        const extra=`<div class="weatherFleetTransit211"><div><b>Chofer:</b> ${esc(typeof driverName==='function'?driverName(t):'-')}</div><div><b>Embarque:</b> ${esc(t.embarque||'-')}</div><div><b>Cliente:</b> ${esc(rt.cliente||'-')}</div><div><b>Origen:</b> ${esc(rt.origen||'-')}</div><div><b>Destino:</b> ${esc(rt.destino||'-')}</div><div><b>Últ. reporte GPS:</b> ${fd(typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof lastReportValue==='function'?lastReportValue(t):t.updatedAt))}</div><div class="weatherLocationLine"><b>Localidad GPS:</b> ${esc(gpsLoc||'-')}</div></div>`;
        html.push(window.weatherCardReal(`Flota ${esc(flota(t)||'-')}`,gpsLoc||'-',c,w,extra,'fleetWeatherCard','🚚'));
      }
      el.innerHTML=html.join('');
    };
  }

  window.renderAlertCards=function(rows){
    if(!q('alertCards')) return;
    const byFleet={};
    (rows||[]).forEach(r=>{const key=flota(r.t)||'-';(byFleet[key]=byFleet[key]||[]).push(r);});
    const html=Object.entries(byFleet).sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([fleet,list])=>{
      const pend=list.filter(r=>!r.verified).length;
      return `<div class="alertFleetCard alertFleetCard211"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${esc(fleet)}</div><span class="alertPendingBadge">${pend} pendientes</span></div><div class="alertRows211"><div class="alertHeader211"><span>Alerta</span><span>Embarque</span><span>Km</span><span>Fecha/hora</span><span>Localidad</span><span>Acción</span></div>${list.map(r=>{const emb=String(r.t.embarque||'').replace(/'/g,"\\'");const flo=String(flota(r.t)||'').replace(/'/g,"\\'");const btn=r.verified?'<span class="alertVerifiedInfo">Verificada</span>':`<button class="alertVerifyBtn verifyBlink" onclick="markAlertVerified(trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}'), (trs.find(t=>String(t.embarque)==='${emb}' && String(flota(t))==='${flo}')?.alerts||[])[${r.idx}], ${r.idx})">Verificar</button>`;return `<div class="alertItemCard211"><div class="alertName211"><span>⚠️</span><span>${esc(tipo211(r.a))}</span></div><div>${esc(r.t.embarque||'-')}</div><div>${esc(km211(r.a,r.t))}</div><div>${fecha211(r.a)}</div><div class="alertLocalidad211">${esc(loc211(r.a,r.t))}</div><div class="alertAction211">${btn}</div></div>`;}).join('')}</div></div>`;
    }).join('');
    q('alertCards').innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
  };

  window.renderDashAlerts=function(){
    const alerts=[];
    (trs||[]).filter(openT).forEach(t=>(t.alerts||[]).forEach((a,idx)=>{if(!verified211(t,a,idx)) alerts.push({t,a,idx});}));
    alerts.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
    if(!q('dashAlerts')) return;
    if(!alerts.length){q('dashAlerts').innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';return;}
    q('dashAlerts').innerHTML='<div class="alertListCompact">'+alerts.slice(0,4).map(x=>`<div class="alertCard"><div class="alertTop"><span>⚠️ ${esc(tipo211(x.a))}</span><span>${fecha211(x.a)}</span></div><div class="alertInfo"><div><b>Km:</b> ${esc(km211(x.a,x.t))}</div><div><b>Hora:</b> ${fecha211(x.a)}</div><div><b>Localidad:</b> ${esc(loc211(x.a,x.t))}</div></div></div>`).join('')+'</div>';
  };

  function apply211(){setVersion211();}
  document.addEventListener('DOMContentLoaded',()=>{apply211();setTimeout(apply211,250);setTimeout(apply211,1000);});
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments);apply211();return r;};
})();


/* ===== V2.0.150 - Correccion funcional final: menu, clima, KM y alertas compactas ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const safeEsc=(v)=> (typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])));
  const safeFd=(v)=> (typeof fd==='function'?fd(v):(v?String(v):'-'));
  const val=(v)=> v!==undefined && v!==null && String(v).trim()!=='' && !/^null$|^undefined$/i.test(String(v).trim());
  function walkValue(obj, keys){
    const seen=new Set(), q=[obj];
    const keySet=keys.map(k=>String(k).toLowerCase());
    while(q.length){
      const cur=q.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const [k,v] of Object.entries(cur)){
        if(keySet.includes(String(k).toLowerCase()) && val(v)) return String(v).trim();
      }
      for(const v of Object.values(cur)) if(v && typeof v==='object') q.push(v);
    }
    return '';
  }
  function textBlob(obj){
    try{return JSON.stringify(obj||{});}catch(e){return String(obj||'');}
  }
  function kmValue213(a,t){
    const keys=[
      'km','kms','kilometro','kilómetro','kilometros','kilómetros','kilometer','kilometers',
      'kmRuta','km_ruta','rutaKm','ruta_km','kmDeRuta','kmRutaAlerta','kmAlerta','kmControl',
      'progresiva','progresivaKm','progresiva_km','kilometraje','kilometrajeRuta','ubicacionKm',
      'distanciaKm','distancia_km','kmGps','gpsKm','kmActual','km_posicion','kmUbicacion','positionKm',
      'roadKm','ruta_kilometro','odometer','puntoKm','punto_km','punto','hitoKm','hito_km'
    ];
    let v=walkValue(a,keys);
    if(val(v) && v!=='-') return v;
    v=walkValue(t,keys);
    if(val(v) && v!=='-') return v;
    const txt=[textBlob(a), textBlob(t?.ruta||t?.route||{}), textBlob(t?.gps||{}), textBlob(t?.ultimaPosicion||{}), textBlob(t?.lastPosition||{})].join(' | ');
    let m=txt.match(/(?:km|kms|kil[oó]metro|progresiva|distancia|punto|hito|ruta)\D{0,28}(-?\d+(?:[\.,]\d+)?)/i) || txt.match(/(-?\d+(?:[\.,]\d+)?)\s*(?:km|kms|kil[oó]metro)/i);
    if(m) return m[1].replace(',', '.');
    return '-';
  }
  window.alertKmV2=kmValue213;
  window.alertKmValue=kmValue213;
  window.alertKm=kmValue213;
  try{alertKmV1250=kmValue213;}catch(e){}

  function rta(t){return (typeof ruta==='function'?ruta(t):(t?.route||t?.ruta||{}))||{};}
  function fleet(t){return typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'-');}
  function drv(t){return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}
  function loc213(a,t){
    let v=walkValue(a,['localidad','ubicacionTexto','ubicación','ubicacion','locationName','ciudad','city','address','direccion']);
    if(val(v) && v!=='-') return v;
    try{if(typeof alertLocV1250==='function'){v=alertLocV1250(a,t); if(val(v) && v!=='-') return v;}}catch(e){}
    try{if(typeof locFull==='function'){v=locFull(t); if(val(v) && v!=='-') return v;}}catch(e){}
    return '-';
  }
  function tipo213(a){return (typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta'))||'Alerta';}
  function fecha213(a){return safeFd(a?.time||a?.fecha||a?.createdAt||a?.ts||a?.timestamp||a?.date||a?.datetime);}
  function verified213(t,a,idx){
    try{if(typeof alertVerifiedV1250==='function') return !!alertVerifiedV1250(t,a,idx);}catch(e){}
    try{if(typeof isAlertVerified==='function') return !!isAlertVerified(t,a,idx);}catch(e){}
    return !!(a?.verificada||a?.verificado||a?.vista);
  }
  function rowsForTransit(t){
    return (t?.alerts||[]).map((a,idx)=>({a,idx})).filter(r=>!verified213(t,r.a,r.idx)).sort((x,y)=>(typeof tv==='function'?tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts):0)-(typeof tv==='function'?tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts):0));
  }
  function currentRows(){
    const arr=[];
    (window.trs||trs||[]).filter(t=>typeof openT==='function'?openT(t):true).forEach(t=>(t.alerts||[]).forEach((a,idx)=>{
      if(!verified213(t,a,idx)) arr.push({t,a,idx,verified:false});
    }));
    return arr.sort((x,y)=>(typeof tv==='function'?tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts):0)-(typeof tv==='function'?tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts):0));
  }
  function reportTime(t){
    try{if(typeof lastGpsTimeV1237==='function') return lastGpsTimeV1237(t);}catch(e){}
    try{if(typeof lastReportValue==='function') return lastReportValue(t);}catch(e){}
    return t?.updatedAt||t?.updateAt||t?.start?.time||t?.start;
  }

  function setVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
    document.title='ITS Intelligent Traffic System';
  }
  function normalizeMenu(){
    const map=[['dash','🏠','Torre de Control'],['transitos','🚚','Tránsitos'],['mapa','📍','Seguimiento'],['clima','🌦️','Clima'],['alertas','🔔','Alertas'],['embarques','📦','Embarques'],['entrega','🏁','Entregas'],['unidades','🚛','Unidades / Choferes'],['clientes','🏢','Clientes / Destinos'],['abm','⚙️','Configuración']];
    map.forEach(([id,ic,txt])=>{const b=document.querySelector(`.sideNav button[onclick*="${id}"]`); if(b){b.innerHTML=`<span class="menuIcon">${ic}</span><span class="menuText">${txt}</span>`; b.title=txt;}});
  }

  window.transitAlertsCompact=function(t){
    const rows=rowsForTransit(t);
    if(!rows.length) return '';
    return `<div class="transitAlertsBox transitAlertsBox213">${rows.map(({a})=>`<div class="transitAlertCard213"><div class="transitAlertHead213"><span class="alertIcon213">⚠️</span><b>${safeEsc(tipo213(a))}</b><span>${fecha213(a)}</span></div><div class="transitAlertMeta213"><span><b>Km:</b> ${safeEsc(kmValue213(a,t))}</span><span><b>Hora:</b> ${fecha213(a)}</span><span><b>Localidad:</b> ${safeEsc(loc213(a,t))}</span></div></div>`).join('')}</div>`;
  };

  window.card=function(t){
    const o=typeof openT==='function'?openT(t):true, rt=rta(t), alerts=window.transitAlertsCompact(t);
    return `<div class="item ${o?'open':'closed'} transitCardV213"><div class="transitLeft"><div class="transitTop"><div class="transitTitle">🚚 Flota ${safeEsc(fleet(t)||'-')} / 📦 Emb. ${safeEsc(t.embarque||'-')}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div><div class="transitDataGrid"><div><b>Chofer:</b> ${safeEsc(drv(t))}</div><div><b>Cliente:</b> ${safeEsc(rt.cliente||'-')}</div><div><b>Origen:</b> ${safeEsc(rt.origen||'-')}</div><div><b>Destino:</b> ${safeEsc(rt.destino||'-')}</div><div><b>Lote/Carga:</b> ${safeEsc(t.lote||t.carga||'-')}</div><div><b>Inicio:</b> ${safeFd(t.start?.time||t.start)}</div><div><b>Cierre:</b> ${o?'-':safeFd(t.closed?.time||t.closed)}</div><div class="fullLine"><b>Últ. posición:</b> ${safeEsc(typeof locFull==='function'?locFull(t):'-')}</div><div class="lastReportLine"><b>Últ. reporte:</b> ${safeFd(reportTime(t))}</div></div></div>${alerts?`<div class="transitRight"><h4 class="alertsTitle">⚠️ Alertas</h4>${alerts}</div>`:''}</div>`;
  };

  window.trackingAlertsHtml=function(t){
    const rows=rowsForTransit(t);
    if(!rows.length) return '';
    return `<div class="trackingAlerts"><h4>⚠️ Alertas del tránsito</h4>${rows.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${safeEsc(tipo213(a))}</span><span>${fecha213(a)}</span></div><div class="trackingAlertMeta"><span><b>Km:</b> ${safeEsc(kmValue213(a,t))}</span><span><b>Localidad:</b> ${safeEsc(loc213(a,t))}</span></div></div>`).join('')}</div>`;
  };

  window.trackingCard=function(t){
    const o=typeof openT==='function'?openT(t):true, rt=rta(t), alerts=window.trackingAlertsHtml(t);
    return `<div class="trackingCard"><div class="trackingCardTop"><div class="trackingFleetTitle">Flota ${safeEsc(fleet(t)||'-')}</div><span class="trackingState ${o?'':'closed'}">${o?'Abierto':'Finalizado'}</span></div><div class="trackingData"><div><b>Emb.:</b> ${safeEsc(t.embarque||'-')}</div><div><b>Chofer:</b> ${safeEsc(drv(t))}</div><div class="locationLine"><b>Ubicación:</b> ${safeEsc(typeof locFull==='function'?locFull(t):'-')}</div><div><b>Cliente:</b> ${safeEsc(rt.cliente||'-')}</div><div><b>Destino:</b> ${safeEsc(rt.destino||'-')}</div><div class="trackingReportLine"><b>Últ. reporte:</b> ${safeFd(reportTime(t))}</div></div>${alerts}</div>`;
  };

  window.weatherCardReal=function(title,subtitle,c,w,extra='',cls='',icon='🌦️',badge=''){
    const desc=safeEsc(w?.desc||'');
    const temp=safeEsc(w?.temp ?? '-');
    const weatherIcon=w?.emoji||w?.icon||'🌦️';
    const isPass=String(title).toLowerCase().includes('paso los libertadores') || cls.includes('pass');
    const titleIcon=icon?`<span class="weatherIcon213">${icon}</span>`:'';
    return `<div class="weatherCard ${cls} weatherCard213"><div class="weatherTop213"><div class="weatherTitleArea213"><div class="weatherName213">${titleIcon}<span>${title}</span></div>${desc?`<div class="weatherDesc213 ${isPass?'underTitle':''}">${desc}</div>`:''}</div><div class="weatherTempArea213"><span class="weatherTemp213">${temp}°</span><span class="weatherTempIcon213">${weatherIcon}</span>${(!isPass && desc)?`<div class="weatherDescRight213">${desc}</div>`:''}</div></div>${badge||''}<div class="weatherData213"><div class="weatherLocationLine"><b>Ubicación:</b> ${safeEsc(subtitle||'-')}</div><div><b>Sensación:</b> ${safeEsc(w?.sens ?? '-')}°</div><div><b>Viento:</b> ${safeEsc(w?.wind ?? '-')} km/h</div><div><b>Actualizado:</b> ${safeFd(new Date().toISOString())}</div></div>${extra}</div>`;
  };

  window.renderWeatherFleets=async function(){
    const el=typeof q==='function'?q('weatherFleets'):document.getElementById('weatherFleets'); if(!el) return;
    const abiertos=(Array.isArray(window.trs||trs)?(window.trs||trs):[]).filter(t=>typeof openT==='function'?openT(t):true);
    if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima real...</div>';
    const html=[];
    for(const t of abiertos){
      const pos=typeof getPosObj==='function'?getPosObj(t):null;
      const c=pos?{lat:pos.lat,lng:pos.lng}:null;
      const w=typeof fetchWeatherByCoords==='function'?await fetchWeatherByCoords(c):{};
      const rt=rta(t); const gpsLoc=typeof locFull==='function'?locFull(t):'-';
      const extra=`<div class="weatherFleetTransit213"><div><b>Chofer:</b> ${safeEsc(drv(t))}</div><div><b>Embarque:</b> ${safeEsc(t.embarque||'-')}</div><div><b>Cliente:</b> ${safeEsc(rt.cliente||'-')}</div><div><b>Origen:</b> ${safeEsc(rt.origen||'-')}</div><div><b>Destino:</b> ${safeEsc(rt.destino||'-')}</div><div><b>Últ. reporte GPS:</b> ${safeFd(reportTime(t))}</div><div class="weatherLocationLine"><b>Localidad GPS:</b> ${safeEsc(gpsLoc||'-')}</div></div>`;
      html.push(window.weatherCardReal(`Flota ${safeEsc(fleet(t)||'-')}`,gpsLoc||'-',c,w,extra,'fleetWeatherCard','🚚'));
    }
    el.innerHTML=html.join('');
  };

  window.renderAlertCards=function(rows){
    const el=typeof q==='function'?q('alertCards'):document.getElementById('alertCards'); if(!el) return;
    const useRows=rows&&rows.length?rows:currentRows();
    const byFleet={};
    useRows.forEach(r=>{const key=fleet(r.t)||'-'; (byFleet[key]=byFleet[key]||[]).push(r);});
    const html=Object.entries(byFleet).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'es',{numeric:true})).map(([f,list])=>{
      const pend=list.filter(r=>!r.verified).length;
      return `<div class="alertFleetCard alertFleetCard213"><div class="alertFleetTop"><div class="alertFleetTitle">🚚 Flota ${safeEsc(f)}</div><span class="alertPendingBadge">${pend} pendientes</span></div><div class="alertRows213"><div class="alertHeader213"><span>Alerta</span><span>Embarque</span><span>Km</span><span>Fecha/hora</span><span>Localidad</span><span>Chofer</span><span>Origen</span><span>Destino</span><span>Cliente</span><span>Acción</span></div>${list.map(r=>{const rt=rta(r.t); const btn=r.verified?'<span class="alertVerifiedInfo">Verificada</span>':`<button class="alertVerifyBtn verifyBlink" onclick="markAlertVerifiedById ? markAlertVerifiedById('${String(r.id||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}') : null">Verificar</button>`; return `<div class="alertItemCard213"><div class="alertName213"><span>⚠️</span><b>${safeEsc(tipo213(r.a))}</b></div><div>${safeEsc(r.t.embarque||'-')}</div><div>${safeEsc(kmValue213(r.a,r.t))}</div><div>${fecha213(r.a)}</div><div class="alertCellClip">${safeEsc(loc213(r.a,r.t))}</div><div class="alertCellClip">${safeEsc(drv(r.t))}</div><div class="alertCellClip">${safeEsc(rt.origen||'-')}</div><div class="alertCellClip">${safeEsc(rt.destino||'-')}</div><div class="alertCellClip">${safeEsc(rt.cliente||'-')}</div><div class="alertAction213">${btn}</div></div>`;}).join('')}</div></div>`;
    }).join('');
    el.innerHTML=html||'<div class="alertEmpty">No hay alertas para el filtro seleccionado.</div>';
  };

  window.renderDashAlerts=function(){
    const el=typeof q==='function'?q('dashAlerts'):document.getElementById('dashAlerts'); if(!el) return;
    const rows=currentRows();
    if(!rows.length){el.innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';return;}
    el.innerHTML='<div class="alertListCompact alertListCompact213">'+rows.slice(0,4).map(r=>{const rt=rta(r.t); return `<div class="alertCard alertCard213"><div class="alertTop213"><span><span>⚠️</span><b>${safeEsc(tipo213(r.a))}</b></span><strong>${fecha213(r.a)}</strong></div><div class="alertInfo213"><span><b>Km:</b> ${safeEsc(kmValue213(r.a,r.t))}</span><span><b>Hora:</b> ${fecha213(r.a)}</span><span><b>Localidad:</b> ${safeEsc(loc213(r.a,r.t))}</span><span><b>Chofer:</b> ${safeEsc(drv(r.t))}</span><span><b>Origen:</b> ${safeEsc(rt.origen||'-')}</span><span><b>Destino:</b> ${safeEsc(rt.destino||'-')}</span><span><b>Cliente:</b> ${safeEsc(rt.cliente||'-')}</span></div></div>`;}).join('')+'</div>';
  };

  const oldRenderAlerts=window.renderAlerts;
  window.renderAlerts=function(){
    try{document.querySelectorAll('.alertFilters button').forEach(b=>b.classList.toggle('active', b.dataset.alertFilter===window.alertFilterMode));}catch(e){}
    const rows=currentRows();
    try{if(typeof renderAlertCharts==='function') renderAlertCharts(rows);}catch(e){}
    window.renderAlertCards(rows);
    try{if(typeof renderBadge==='function') renderBadge();}catch(e){}
  };

  function refreshAll(){
    setVersion(); normalizeMenu();
    try{ if(document.querySelector('#dash.panel.active') && typeof renderDashAlerts==='function') renderDashAlerts(); }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',()=>{refreshAll(); setTimeout(refreshAll,200); setTimeout(refreshAll,1000);});
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments);refreshAll();return r;};
  const oldTab=window.tab;
  if(typeof oldTab==='function') window.tab=function(id){const r=oldTab.apply(this,arguments);setTimeout(()=>{refreshAll(); if(id==='alertas') window.renderAlerts(); if(id==='clima' && typeof renderWeatherFleets==='function') renderWeatherFleets();},0);return r;};
})();

/* ===== V2.0.150 - Vista Alertas compacta: boton Verificar visible ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const esc215=(v)=> (typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m])));
  const fd215=(v)=> (typeof fd==='function'?fd(v):(v?String(v):'-'));
  const has215=(v)=> v!==undefined && v!==null && String(v).trim()!=='' && !/^null$|^undefined$/i.test(String(v).trim());
  function walk215(obj, keys){
    const seen=new Set(); const q=[obj]; const ks=keys.map(k=>String(k).toLowerCase());
    while(q.length){
      const cur=q.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const [k,v] of Object.entries(cur)){
        if(ks.includes(String(k).toLowerCase()) && has215(v)) return String(v).trim();
      }
      Object.values(cur).forEach(v=>{ if(v && typeof v==='object') q.push(v); });
    }
    return '';
  }
  function text215(o){try{return JSON.stringify(o||{});}catch(e){return String(o||'');}}
  function route215(t){try{return (typeof ruta==='function'?ruta(t):(t?.ruta||t?.route||{}))||{};}catch(e){return t?.ruta||t?.route||{};}}
  function fleet215(t){try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return t?.flota||'-';}}
  function driver215(t){try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return t?.chofer||'-';}}
  function open215(t){try{return typeof openT==='function'?openT(t):true;}catch(e){return true;}}
  function type215(a){try{return typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta');}catch(e){return a?.tipo||a?.type||a?.motivo||'Alerta';}}
  function date215(a){return fd215(a?.time||a?.fecha||a?.createdAt||a?.ts||a?.timestamp||a?.date||a?.datetime);}
  function loc215(a,t){
    let v=walk215(a,['localidad','ubicacionTexto','ubicación','ubicacion','locationName','ciudad','city','address','direccion']);
    if(has215(v) && v!=='-') return v;
    try{ if(typeof alertLocV1250==='function'){v=alertLocV1250(a,t); if(has215(v) && v!=='-') return v;} }catch(e){}
    try{ if(typeof locFull==='function'){v=locFull(t); if(has215(v) && v!=='-') return v;} }catch(e){}
    return '-';
  }
  function km215(a,t){
    const keys=['km','kms','kilometro','kilómetro','kilometros','kilómetros','kilometer','kilometers','kmRuta','km_ruta','rutaKm','ruta_km','kmDeRuta','kmRutaAlerta','kmAlerta','kmControl','progresiva','progresivaKm','progresiva_km','kilometraje','kilometrajeRuta','ubicacionKm','distanciaKm','distancia_km','kmGps','gpsKm','kmActual','km_posicion','kmUbicacion','positionKm','roadKm','ruta_kilometro','odometer','puntoKm','punto_km','punto','hitoKm','hito_km'];
    let v=walk215(a,keys); if(has215(v) && v!=='-') return v;
    v=walk215(t,keys); if(has215(v) && v!=='-') return v;
    const blob=[text215(a),text215(t?.ruta||t?.route||{}),text215(t?.gps||{}),text215(t?.ultimaPosicion||{}),text215(t?.lastPosition||{})].join(' | ');
    const m=blob.match(/(?:km|kms|kil[oó]metro|progresiva|distancia|punto|hito|ruta)\D{0,28}(-?\d+(?:[\.,]\d+)?)/i)||blob.match(/(-?\d+(?:[\.,]\d+)?)\s*(?:km|kms|kil[oó]metro)/i);
    return m?m[1].replace(',','.'):'-';
  }
  function verified215(t,a,idx){
    try{ if(typeof alertVerifiedV1250==='function') return !!alertVerifiedV1250(t,a,idx); }catch(e){}
    try{ if(typeof isAlertVerified==='function') return !!isAlertVerified(t,a,idx); }catch(e){}
    return !!(a?.verificada||a?.verificado||a?.vista||a?.verified);
  }
  function rowId215(t,a,idx){
    try{ if(typeof alertId==='function') return alertId(t,a,idx); }catch(e){}
    return `${t?.embarque||''}_${fleet215(t)||''}_${idx}`;
  }
  function rows215(){
    const mode=window.alertFilterMode||'pendientes';
    const arr=[]; const list=Array.isArray(window.trs)?window.trs:(typeof trs!=='undefined'&&Array.isArray(trs)?trs:[]);
    list.filter(open215).forEach(t=>(t.alerts||[]).forEach((a,idx)=>{
      const verified=verified215(t,a,idx);
      if(mode==='pendientes' && verified) return;
      if(mode==='verificadas' && !verified) return;
      arr.push({t,a,idx,verified,id:rowId215(t,a,idx)});
    }));
    return arr.sort((x,y)=>{try{return (typeof tv==='function'?tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts):0)-(typeof tv==='function'?tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts):0);}catch(e){return 0;}});
  }
  function setVersion215(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
    document.title='ITS Intelligent Traffic System';
  }

  function renderAlertSummary215(rows){
    const box=document.getElementById('alertCharts');
    if(!box) return;
    const first=rows[0];
    if(!first){box.innerHTML='<div class="alertSummary215"><div class="alertSummaryLeft215"><div class="alertSummaryTitle215">⚠️ Últimas alertas</div><div class="alertSummaryLine215">Sin alertas pendientes.</div></div></div>';return;}
    const summary=`• ${esc215(type215(first.a))} · Emb. ${esc215(first.t?.embarque||'-')} · Flota ${esc215(fleet215(first.t)||'-')} · Km ${esc215(km215(first.a,first.t))} · ${date215(first.a)}`;
    box.innerHTML=`<div class="alertSummary215"><div class="alertSummaryLeft215"><div class="alertSummaryTitle215">⚠️ Últimas alertas</div><div class="alertSummaryLine215">${summary}</div></div><button class="alertSummaryBtn215" onclick="tab('alertas')">Ver todas las alertas →</button></div>`;
  }

  window.renderAlertCards=function(rows){
    const el=document.getElementById('alertCards'); if(!el) return;
    const useRows=Array.isArray(rows)?rows:rows215();
    el.classList.add('alertCardsOnly215');
    if(!useRows.length){el.innerHTML='<div class="alertEmpty alertEmpty215">No hay alertas para el filtro seleccionado.</div>';return;}
    const body=useRows.map(r=>{
      const rt=route215(r.t);
      const btn=r.verified?'<span class="alertVerifiedInfo alertVerified215">Verificada</span>':`<button class="alertVerifyBtn alertVerify215 verifyBlink" onclick="markAlertVerifiedById('${String(r.id||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">Verificar</button>`;
      return `<div class="alertRow215"><div class="alertType215"><span class="alertIcon215">⚠️</span><b>${esc215(type215(r.a))}</b></div><div>${esc215(r.t?.embarque||'-')}</div><div>${esc215(km215(r.a,r.t))}</div><div>${date215(r.a)}</div><div class="clip215">${esc215(loc215(r.a,r.t))}</div><div class="clip215">${esc215(driver215(r.t))}</div><div class="clip215">${esc215(rt.origen||'-')}</div><div class="clip215">${esc215(rt.destino||'-')}</div><div class="clip215">${esc215(rt.cliente||'-')}</div><div class="alertAction215">${btn}</div></div>`;
    }).join('');
    el.innerHTML=`<div class="alertTable215"><div class="alertHeader215"><span>Alerta</span><span>Embarque</span><span>Km</span><span>Fecha/hora</span><span>Localidad</span><span>Chofer</span><span>Origen</span><span>Destino</span><span>Cliente</span><span>Acción</span></div>${body}<div class="alertFooter215">Mostrando ${useRows.length} de ${useRows.length} alerta${useRows.length===1?'':'s'}</div></div>`;
  };

  window.renderAlerts=function(){
    try{document.querySelectorAll('.alertFilters button').forEach(b=>b.classList.toggle('active', b.dataset.alertFilter===(window.alertFilterMode||'pendientes')));}catch(e){}
    const rows=rows215();
    renderAlertSummary215(rows);
    window.renderAlertCards(rows);
    try{if(typeof renderBadge==='function') renderBadge();}catch(e){}
    setVersion215();
  };

  const oldSetFilter=window.setAlertFilter;
  window.setAlertFilter=function(mode){window.alertFilterMode=mode||'pendientes'; try{ if(typeof oldSetFilter==='function') oldSetFilter(mode); }catch(e){} window.renderAlerts(); };

  const oldTab=window.tab;
  if(typeof oldTab==='function') window.tab=function(id){const r=oldTab.apply(this,arguments); setTimeout(()=>{setVersion215(); if(id==='alertas') window.renderAlerts();},0); return r;};
  document.addEventListener('DOMContentLoaded',()=>{setVersion215(); setTimeout(()=>{if(document.querySelector('#alertas.panel.active')) window.renderAlerts();},250);});
})();


/* ===== V2.0.150 - Torre de Control: Últimas alertas formato linea unica ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  const $=(id)=>document.getElementById(id);
  const E=(v)=> (typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])));
  const F=(v)=> (typeof fd==='function'?fd(v):(v?String(v):'-'));
  const T=(v)=>{try{return typeof tv==='function'?tv(v):new Date(v||0).getTime()||0;}catch(e){return 0;}};
  const open=(t)=>{try{return typeof openT==='function'?openT(t):true;}catch(e){return true;}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return t?.flota||'-';}};
  const type=(a)=>{try{return typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta');}catch(e){return a?.tipo||a?.type||a?.motivo||'Alerta';}};
  const verified=(t,a,idx)=>{try{if(typeof alertVerifiedV1250==='function')return !!alertVerifiedV1250(t,a,idx);}catch(e){} try{if(typeof isAlertVerified==='function')return !!isAlertVerified(t,a,idx);}catch(e){} return !!(a?.verificada||a?.verificado||a?.vista||a?.verified);};
  function has(v){return v!==undefined&&v!==null&&String(v).trim()!==''&&!/^null$|^undefined$/i.test(String(v).trim());}
  function walk(obj,keys){const q=[obj],seen=new Set(),ks=keys.map(k=>String(k).toLowerCase());while(q.length){const cur=q.shift();if(!cur||typeof cur!=='object'||seen.has(cur))continue;seen.add(cur);for(const [k,v] of Object.entries(cur)){if(ks.includes(String(k).toLowerCase())&&has(v))return String(v).trim();}Object.values(cur).forEach(v=>{if(v&&typeof v==='object')q.push(v);});}return '';}
  function km(a,t){
    if(typeof km215==='function'){try{const v=km215(a,t); if(has(v)&&v!=='-')return v;}catch(e){}}
    if(typeof kmValue213==='function'){try{const v=kmValue213(a,t); if(has(v)&&v!=='-')return v;}catch(e){}}
    const keys=['km','kms','kilometro','kilómetro','kilometros','kilómetros','kmRuta','km_ruta','rutaKm','ruta_km','kmAlerta','kmControl','progresiva','progresivaKm','kilometraje','ubicacionKm','kmGps','gpsKm','kmActual','puntoKm','hitoKm'];
    let v=walk(a,keys)||walk(t,keys); if(has(v)&&v!=='-')return v;
    const blob=JSON.stringify([a,t?.ruta,t?.route,t?.gps,t?.ultimaPosicion,t?.lastPosition]||{});
    const m=blob.match(/(?:km|kms|kil[oó]metro|progresiva|punto|hito|ruta)\D{0,28}(-?\d+(?:[\.,]\d+)?)/i)||blob.match(/(-?\d+(?:[\.,]\d+)?)\s*(?:km|kms|kil[oó]metro)/i);
    return m?m[1].replace(',','.'):'-';
  }
  window.renderDashAlerts=function(){
    const el=$('dashAlerts'); if(!el)return;
    const list=Array.isArray(window.trs)?window.trs:(typeof trs!=='undefined'&&Array.isArray(trs)?trs:[]);
    const rows=[];
    list.filter(open).forEach(t=>(t.alerts||[]).forEach((a,idx)=>{if(!verified(t,a,idx))rows.push({t,a,idx});}));
    rows.sort((a,b)=>T(b.a.time||b.a.fecha||b.a.createdAt||b.a.ts)-T(a.a.time||a.a.fecha||a.a.createdAt||a.a.ts));
    if(!rows.length){el.innerHTML='<div class="dashAlertLine dashAlertEmptyLine">Sin alertas activas.</div>';return;}
    const r=rows[0];
    el.innerHTML=`<div class="dashAlertLine">• ${E(type(r.a))} · Emb. ${E(r.t?.embarque||'-')} · Flota ${E(fleet(r.t)||'-')} · Km ${E(km(r.a,r.t))} · ${F(r.a?.time||r.a?.fecha||r.a?.createdAt||r.a?.ts)}</div>`;
  };
  function setVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0&&/Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  function apply(){setVersion(); try{if($('dashAlerts'))window.renderDashAlerts();}catch(e){}}
  document.addEventListener('DOMContentLoaded',()=>{apply();setTimeout(apply,200);setTimeout(apply,1000);});
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments);apply();return r;};
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){const r=oldTab.apply(this,arguments);setTimeout(apply,0);return r;};
})();

/* ===== V2.0.150 - Tránsitos: alertas a la derecha y todas las alertas / Seguimiento vuelve a base 2.0.150 ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  function s(v){ try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}catch(e){return String(v??'');} }
  function d(v){ try{return typeof fd==='function'?fd(v):'-';}catch(e){return '-';} }
  function tval(v){ try{return typeof tv==='function'?tv(v):0;}catch(e){return 0;} }
  function rt(t){ try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};} }
  function fleet(t){ try{return typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'-');}catch(e){return '-';} }
  function driver(t){ try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';} }
  function locx(t){ try{return typeof locFull==='function'?locFull(t):(typeof loc==='function'?loc(t):'-');}catch(e){return '-';} }
  function reportTime(t){
    try{ if(typeof lastGpsTimeV1237==='function') return lastGpsTimeV1237(t); }catch(e){}
    try{ if(typeof lastReportValue==='function') return lastReportValue(t); }catch(e){}
    try{ const u=typeof lastU==='function'?lastU(t):null; return u?.time||u?.fecha||u?.createdAt||t?.updatedAt||t?.start?.time||t?.start; }catch(e){ return t?.updatedAt||t?.start; }
  }
  function walk(obj, keys){
    const q=[obj], seen=new Set();
    while(q.length){
      const cur=q.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const k of keys){ const v=cur[k]; if(v!==undefined && v!==null && String(v).trim()!=='' && !/^null$/i.test(String(v).trim())) return String(v).trim(); }
      Object.values(cur).forEach(v=>{ if(v && typeof v==='object') q.push(v); });
    }
    return '';
  }
  function km(a,t){
    try{ if(typeof alertKmV2==='function'){ const v=alertKmV2(a,t); if(v && v!=='-' && !/^no informado$/i.test(String(v))) return v; } }catch(e){}
    try{ if(typeof alertKm==='function'){ const v=alertKm(a,t); if(v && v!=='-' && !/^no informado$/i.test(String(v))) return v; } }catch(e){}
    const keys=['km','KM','Km','kms','kilometro','kilómetro','kilometros','kilómetros','kmRuta','km_ruta','rutaKm','ruta_km','kmAlerta','kmControl','progresiva','progresivaKm','kilometraje','ubicacionKm','distanciaKm','kmGps','gpsKm','kmActual','puntoKm','hitoKm'];
    let v=walk(a,keys); if(v) return v;
    v=walk(t,keys); if(v) return v;
    const txt=JSON.stringify(a||{})+' '+JSON.stringify(t?.route||t?.ruta||{});
    const m=txt.match(/(?:km|kil[oó]metro|progresiva|punto|hito)\D{0,28}(\d+(?:[\.,]\d+)?)/i)||txt.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kil[oó]metro)/i);
    return m?m[1].replace(',','.'):'-';
  }
  function tipo(a){ try{return (typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta'))||'Alerta';}catch(e){return a?.tipo||a?.type||a?.motivo||'Alerta';} }
  function fecha(a){ return d(a?.time||a?.fecha||a?.createdAt||a?.ts||a?.timestamp||a?.date||a?.datetime); }
  function aloc(a,t){
    try{ if(typeof alertLocV1250==='function'){ const v=alertLocV1250(a,t); if(v && v!=='-') return v; } }catch(e){}
    const v=walk(a,['localidad','ubicacionTexto','ubicación','ubicacion','locationName','ciudad','city','address','direccion']);
    return v||locx(t)||'-';
  }

  // Importante: en vista Tránsitos se muestran TODAS las alertas del embarque, verificadas y sin verificar.
  function allTransitAlertRows(t){
    return (t?.alerts||[]).map((a,idx)=>({a,idx})).sort((x,y)=>tval(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tval(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  }
  window.transitAlertsCompact=function(t){
    const rows=allTransitAlertRows(t);
    if(!rows.length) return '<div class="noAlerts transitNoAlerts219">Sin alertas registradas.</div>';
    return `<div class="transitAlertsBox transitAlertsBox219">${rows.map(({a})=>`<div class="transitAlertCard219"><div class="transitAlertHead219"><span>⚠️</span><b>${s(tipo(a))}</b><span>${fecha(a)}</span></div><div class="transitAlertMeta219"><span><b>Km:</b> ${s(km(a,t))}</span><span><b>Hora:</b> ${fecha(a)}</span><span><b>Localidad:</b> ${s(aloc(a,t))}</span></div></div>`).join('')}</div>`;
  };

  // Vista Tránsitos: izquierda datos de flota/embarque, derecha alertas del tránsito.
  window.card=function(t){
    const o=typeof openT==='function'?openT(t):true;
    const r=rt(t);
    const alerts=window.transitAlertsCompact(t);
    return `<div class="item ${o?'open':'closed'} transitCardV219">
      <div class="transitLeft219">
        <div class="transitTop219"><div class="transitTitle219">🚚 Flota ${s(fleet(t)||'-')} / 📦 Emb. ${s(t.embarque||'-')}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div>
        <div class="transitDataGrid219">
          <div><b>Chofer:</b> ${s(driver(t))}</div><div><b>Cliente:</b> ${s(r.cliente||'-')}</div>
          <div><b>Origen:</b> ${s(r.origen||'-')}</div><div><b>Destino:</b> ${s(r.destino||'-')}</div>
          <div><b>Lote/Carga:</b> ${s(t.lote||t.carga||'-')}</div><div><b>Inicio:</b> ${d(t.start?.time||t.start)}</div>
          <div><b>Cierre:</b> ${o?'-':d(t.closed?.time||t.closed)}</div><div><b>Últ. posición:</b> ${s(locx(t))}</div>
        </div>
        <div class="lastReportLine219"><b>Últ. reporte:</b> ${d(reportTime(t))}</div>
      </div>
      <div class="transitRight219"><h4 class="alertsTitle219">⚠️ Alertas del tránsito</h4>${alerts}</div>
    </div>`;
  };

  function updateVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){ const r=await oldRefresh.apply(this,arguments); updateVersion(); return r; };
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); setTimeout(updateVersion,250); setTimeout(updateVersion,1000);});
})();

/* ===== V2.0.150 - Iconos por tipo de alerta en Tránsitos y Seguimiento ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const escx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const fdx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const tvx=(v)=>{try{return typeof tv==='function'?tv(v):new Date(v||0).getTime()||0;}catch(e){return 0;}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const locFullSafe=(t)=>{try{return typeof locFull==='function'?locFull(t):(typeof loc==='function'?loc(t):'-');}catch(e){return '-';}};
  const tipo=(a)=>{try{return (typeof alertTipoV1250==='function'?alertTipoV1250(a):(a?.tipo||a?.type||a?.motivo||a?.nombre||'Alerta'))||'Alerta';}catch(e){return a?.tipo||a?.type||a?.motivo||'Alerta';}};
  const fecha=(a)=>fdx(a?.time||a?.fecha||a?.createdAt||a?.ts||a?.timestamp||a?.date||a?.datetime);

  function iconForAlertType(value){
    const s=String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/niebla|neblina|visibilidad|bruma/.test(s)) return '🌫️';
    if(/accidente|choque|siniestro|colision|colisión|incidente/.test(s)) return '🚨';
    if(/control.*carga|carga/.test(s)) return '📦';
    if(/aduana|ingreso.*aduana|frontera|fronterizo|libertadores|paso/.test(s)) return '🛃';
    if(/cerrado|cierre|bloqueado|bloqueo|corte/.test(s)) return '🚫';
    if(/demora|retraso|espera|cola/.test(s)) return '⏱️';
    if(/transito|tránsito|trafico|tráfico|congestion|congestión|lento/.test(s)) return '🚗';
    if(/desvio|desvío|ruta alternativa/.test(s)) return '↪️';
    if(/document|papel|permiso|documental/.test(s)) return '📄';
    if(/gps|posicion|posición|sin reporte|senal|señal/.test(s)) return '📡';
    if(/mantenimiento|mecanico|mecánico|averia|avería|rotura|falla/.test(s)) return '🔧';
    if(/clima|tormenta|granizo|lluvia|nieve|viento|temporal/.test(s)) return '⛈️';
    return '⚠️';
  }
  window.alertIconByType=iconForAlertType;
  function iconHtml(a){return `<span class="alertTypeIconV222" title="${escx(tipo(a))}">${iconForAlertType(tipo(a))}</span>`;}

  function walk(obj, keys){
    const q=[obj], seen=new Set();
    while(q.length){
      const cur=q.shift();
      if(!cur || typeof cur!=='object' || seen.has(cur)) continue;
      seen.add(cur);
      for(const k of keys){ const v=cur[k]; if(v!==undefined && v!==null && String(v).trim()!=='' && !/^null$/i.test(String(v).trim())) return String(v).trim(); }
      Object.values(cur).forEach(v=>{ if(v && typeof v==='object') q.push(v); });
    }
    return '';
  }
  function km(a,t){
    try{ if(typeof alertKmV2==='function'){ const v=alertKmV2(a,t); if(v && v!=='-' && !/^no informado$/i.test(String(v))) return v; } }catch(e){}
    try{ if(typeof alertKm==='function'){ const v=alertKm(a,t); if(v && v!=='-' && !/^no informado$/i.test(String(v))) return v; } }catch(e){}
    const keys=['km','KM','Km','kms','kilometro','kilómetro','kilometros','kilómetros','kmRuta','km_ruta','rutaKm','ruta_km','kmAlerta','kmControl','progresiva','progresivaKm','kilometraje','ubicacionKm','distanciaKm','kmGps','gpsKm','kmActual','puntoKm','hitoKm'];
    let v=walk(a,keys); if(v) return v;
    v=walk(t,keys); if(v) return v;
    const txt=JSON.stringify(a||{})+' '+JSON.stringify(t?.route||t?.ruta||{});
    const m=txt.match(/(?:km|kil[oó]metro|progresiva|punto|hito)\D{0,28}(\d+(?:[\.,]\d+)?)/i)||txt.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kil[oó]metro)/i);
    return m?m[1].replace(',','.'):'-';
  }
  function aloc(a,t){
    try{ if(typeof alertLocV1250==='function'){ const v=alertLocV1250(a,t); if(v && v!=='-') return v; } }catch(e){}
    const v=walk(a,['localidad','ubicacionTexto','ubicación','ubicacion','locationName','ciudad','city','address','direccion']);
    return v||locFullSafe(t)||'-';
  }
  function reportTime(t){
    try{ if(typeof lastGpsTimeV1237==='function') return lastGpsTimeV1237(t); }catch(e){}
    try{ if(typeof lastReportValue==='function') return lastReportValue(t); }catch(e){}
    try{ const u=typeof lastU==='function'?lastU(t):null; return u?.time||u?.fecha||u?.createdAt||t?.updatedAt||t?.start?.time||t?.start; }catch(e){ return t?.updatedAt||t?.start; }
  }
  function allRows(t){return (t?.alerts||[]).map((a,idx)=>({a,idx})).sort((x,y)=>tvx(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tvx(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));}

  // Vista Tránsitos: reemplaza el icono genérico por icono según tipo de alerta.
  window.transitAlertsCompact=function(t){
    const rows=allRows(t);
    if(!rows.length) return '<div class="noAlerts transitNoAlerts219">Sin alertas registradas.</div>';
    return `<div class="transitAlertsBox transitAlertsBox219">${rows.map(({a})=>`<div class="transitAlertCard219"><div class="transitAlertHead219"><span class="alertNameWithIconV222">${iconHtml(a)}<b>${escx(tipo(a))}</b></span><span>${fecha(a)}</span></div><div class="transitAlertMeta219"><span><b>Km:</b> ${escx(km(a,t))}</span><span><b>Hora:</b> ${fecha(a)}</span><span><b>Localidad:</b> ${escx(aloc(a,t))}</span></div></div>`).join('')}</div>`;
  };

  // Vista Tránsitos: mantiene el layout actual, solo usa la función de alertas con iconos por tipo.
  window.card=function(t){
    const o=typeof openT==='function'?openT(t):true;
    const r=route(t);
    const alerts=window.transitAlertsCompact(t);
    return `<div class="item ${o?'open':'closed'} transitCardV219">
      <div class="transitLeft219">
        <div class="transitTop219"><div class="transitTitle219">🚚 Flota ${escx(fleet(t)||'-')} / 📦 Emb. ${escx(t.embarque||'-')}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div>
        <div class="transitDataGrid219">
          <div><b>Chofer:</b> ${escx(driver(t))}</div><div><b>Cliente:</b> ${escx(r.cliente||'-')}</div>
          <div><b>Origen:</b> ${escx(r.origen||'-')}</div><div><b>Destino:</b> ${escx(r.destino||'-')}</div>
          <div><b>Lote/Carga:</b> ${escx(t.lote||t.carga||'-')}</div><div><b>Inicio:</b> ${fdx(t.start?.time||t.start)}</div>
          <div><b>Cierre:</b> ${o?'-':fdx(t.closed?.time||t.closed)}</div><div><b>Últ. posición:</b> ${escx(locFullSafe(t))}</div>
        </div>
        <div class="lastReportLine219"><b>Últ. reporte:</b> ${fdx(reportTime(t))}</div>
      </div>
      <div class="transitRight219"><h4 class="alertsTitle219">Alertas del tránsito</h4>${alerts}</div>
    </div>`;
  };

  // Vista Seguimiento: reemplaza el icono genérico por icono según tipo de alerta.
  window.trackingAlertsHtml=function(t){
    const rows=allRows(t);
    if(!rows.length) return '';
    return `<div class="trackingAlerts"><h4>Alertas del tránsito</h4>${rows.map(({a})=>`<div class="trackingAlertItem"><div class="trackingAlertTop"><span class="alertNameWithIconV222">${iconHtml(a)}<b>${escx(tipo(a))}</b></span><span>${fecha(a)}</span></div><div><b>Localidad:</b> ${escx(aloc(a,t))}</div><div><b>Km:</b> ${escx(km(a,t))}</div></div>`).join('')}</div>`;
  };

  function setVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function rerenderActive(){
    setVersion();
    try{ if(document.querySelector('#transitos.panel.active') && typeof renderTransitos==='function') renderTransitos(); }catch(e){}
    try{ if(document.querySelector('#mapa.panel.active') && typeof renderMapa==='function') renderMapa(); }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',()=>{setVersion(); setTimeout(rerenderActive,200); setTimeout(rerenderActive,900);});
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); setTimeout(rerenderActive,0); return r;};
})();


/* ===== V2.0.150 - SOLO vista Clima: diseño aprobado Flotas -> Pasos -> Destinos ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):'-');}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};

  function weatherHeaderRight(w){
    const temp=(w&&w.temp!==undefined&&w.temp!==null)?w.temp:'-';
    const icon=(w&&w.icon)?w.icon:'🌦️';
    const desc=(w&&w.desc)?w.desc:'Sin datos';
    return `<div class="weatherTempBlockV223"><div class="weatherTempRowV223"><span class="weatherTempV223">${sx(temp)}°</span><span class="weatherIconV223">${icon}</span></div><div class="weatherDescRightV223">${sx(desc)}</div></div>`;
  }

  function weatherMetricGrid(w, updatedLabel){
    return `<div class="weatherMetricsV223">
      <div><b>Sensación:</b> ${sx(w?.sens??'-')}°</div>
      <div><b>Viento:</b> ${sx(w?.wind??'-')} km/h</div>
      <div><b>Actualizado:</b> ${sx(updatedLabel||dtx(new Date().toISOString()))}</div>
    </div>`;
  }

  function weatherCardV223(kind, title, subtitle, w, options={}){
    const cls={fleet:'fleetWeatherV223', pass:'passWeatherV223', dest:'destWeatherV223'}[kind]||'';
    const leftExtra=options.leftExtra||'';
    const metrics=options.metrics||weatherMetricGrid(w);
    const coords=options.coords?`<div class="weatherCoordsV223"><b>Coordenadas:</b> ${sx(options.coords)}</div>`:'';
    return `<div class="weatherCardV223 ${cls}">
      <div class="weatherCardHeaderV223">
        <div class="weatherLeftV223">
          <div class="weatherTitleV223">${title}</div>
          ${subtitle?`<div class="weatherSubtitleV223">${subtitle}</div>`:''}
          ${leftExtra}
        </div>
        ${weatherHeaderRight(w)}
      </div>
      ${metrics}
      ${coords}
    </div>`;
  }

  async function renderWeatherFleetsV223(){
    const el=q('weatherFleets');
    if(!el)return;
    const abiertos=Array.isArray(trs)?trs.filter(t=>{try{return openT(t);}catch(e){return true;}}):[];
    if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const html=[];
    for(const t of abiertos){
      const c=typeof lastGpsCoords==='function'?lastGpsCoords(t):(typeof coordsFromObjClima==='function'?coordsFromObjClima(t):null);
      const w=typeof fetchWeatherByCoords==='function'?await fetchWeatherByCoords(c):{temp:'-',desc:'Sin datos',wind:'-',sens:'-',icon:'🌦️'};
      const r=route(t);
      const chofer=driver(t);
      const loc=locx(t);
      const updated=dtx(gpsTime(t));
      const leftExtra=`<div class="weatherDriverV223">Chofer: ${sx(chofer||'-')}</div><div class="weatherLocationV223">${sx(loc||'-')}</div>`;
      const metrics=`<div class="weatherFleetDataV223">
        <div><b>Embarque:</b> ${sx(t?.embarque||'-')}</div>
        <div><b>Cliente:</b> ${sx(r.cliente||'-')}</div>
        <div><b>Origen:</b> ${sx(r.origen||'-')}</div>
        <div><b>Destino:</b> ${sx(r.destino||'-')}</div>
        <div><b>Últ. GPS:</b> ${sx(updated)}</div>
        <div><b>Viento:</b> ${sx(w.wind??'-')} km/h</div>
      </div>`;
      html.push(weatherCardV223('fleet',`<span class="weatherKindIconV223">🚚</span> Flota ${sx(fleet(t)||'-')}`,'',w,{leftExtra,metrics,coords:c?.text||''}));
    }
    el.innerHTML=html.join('');
  }

  async function renderWeatherPassesV223(){
    const el=q('weatherPasses');
    if(!el)return;
    el.innerHTML='<div class="weatherLoading">Consultando clima del paso...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'-32.824, -70.086'};
    const w=typeof fetchWeatherByCoords==='function'?await fetchWeatherByCoords(paso):{temp:'-',desc:'Sin datos',wind:'-',sens:'-',icon:'🌦️'};
    const closed=typeof passIsClosedByWeather==='function'?passIsClosedByWeather(w):false;
    const status=closed?'PASO VERIFICAR':'PASO OPERATIVO';
    const subtitle=`<span class="passStatusV223 ${closed?'closed':'open'}">${status}</span>`;
    const metrics=`<div class="weatherPassDataV223"><div><b>Zona:</b> Argentina / Chile</div><div><b>Sensación:</b> ${sx(w.sens??'-')}°</div><div><b>Viento:</b> ${sx(w.wind??'-')} km/h</div><div><b>Actualizado:</b> ${dtx(new Date().toISOString())}</div></div>`;
    el.innerHTML=weatherCardV223('pass',`<span class="weatherKindIconV223">🛂</span> Paso Los Libertadores`,subtitle,w,{metrics,coords:paso.text});
  }

  async function renderWeatherDestinationsV223(){
    const el=q('weatherDestinations');
    if(!el)return;
    const list=Array.isArray(destinos)?destinos:[];
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const html=[];
    for(const d of list){
      const c=typeof coordsFromObjClima==='function'?coordsFromObjClima(d):null;
      const w=typeof fetchWeatherByCoords==='function'?await fetchWeatherByCoords(c):{temp:'-',desc:'Sin datos',wind:'-',sens:'-',icon:'🌦️'};
      const name=typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||'Destino');
      const loc=typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||'-');
      const pais=typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||'-');
      const subtitle=[loc,pais].filter(x=>x&&x!=='-').join(', ');
      html.push(weatherCardV223('dest',`<span class="weatherKindIconV223">📍</span> ${sx(name)}`,sx(subtitle||'-'),w,{coords:c?.text||''}));
    }
    el.innerHTML=html.join('');
  }

  window.renderWeatherFleets=renderWeatherFleetsV223;
  window.renderWeatherPasses=renderWeatherPassesV223;
  window.renderWeatherDestinations=renderWeatherDestinationsV223;
  window.renderClima=async function(){
    await renderWeatherFleetsV223();
    await renderWeatherPassesV223();
    await renderWeatherDestinationsV223();
  };
  window.ensureClimaDataAndRender=async function(){
    try{
      if(!Array.isArray(destinos) || !Array.isArray(trs) || destinos.length===0){
        [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
          read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')
        ]);
      }
    }catch(e){console.warn('No se pudieron cargar datos clima',e);}
    await window.renderClima();
  };

  function updateVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  const oldTab=window.tab;
  if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(q('clima')?.classList.contains('active')) await window.renderClima(); return r;};
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); if(q('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
})();

/* ===== V2.0.150 - SOLO vista Clima: formato operativo compacto Flotas -> Pasos -> Destinos ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):'-');}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};
  const startTime=(t)=>{try{return typeof transitStartValue==='function'?transitStartValue(t):(t?.inicio||t?.start?.time||t?.start||'-');}catch(e){return '-';}};
  const statusTxt=(t)=>{try{return (typeof openT==='function' && openT(t))?'En tránsito':'Finalizado';}catch(e){return 'En tránsito';}};

  async function fetchWeatherRich(c){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️',real:false,_ts:Date.now()};
    const key=`rich:${Number(c.lat).toFixed(4)},${Number(c.lng).toFixed(4)}`;
    window.ELTA_WEATHER_CACHE=window.ELTA_WEATHER_CACHE||{};
    const cached=window.ELTA_WEATHER_CACHE[key];
    if(cached && Date.now()-cached._ts<10*60*1000)return cached;
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation&timezone=auto`;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw new Error('weather http '+res.status);
      const data=await res.json();
      const cur=data.current||{};
      const info=typeof weatherCodeInfo==='function'?weatherCodeInfo(cur.weather_code):['🌦️','Condición no disponible'];
      const out={
        temp:cur.temperature_2m==null?'-':Math.round(cur.temperature_2m),
        sens:cur.apparent_temperature==null?'-':Math.round(cur.apparent_temperature),
        wind:cur.wind_speed_10m==null?'-':Math.round(cur.wind_speed_10m),
        hum:cur.relative_humidity_2m==null?'-':Math.round(cur.relative_humidity_2m),
        vis:cur.visibility==null?'-':Math.max(0,Math.round(Number(cur.visibility)/1000)),
        rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),
        code:cur.weather_code,desc:info[1],icon:info[0],real:true,_ts:Date.now()
      };
      window.ELTA_WEATHER_CACHE[key]=out; return out;
    }catch(e){
      const fallback=typeof fetchWeatherByCoords==='function'?await fetchWeatherByCoords(c):null;
      return Object.assign({hum:'-',vis:'-',rain:'-',_ts:Date.now()},fallback||{temp:'-',desc:'No se pudo consultar clima',wind:'-',sens:'-',icon:'⚠️'});
    }
  }

  function wxRight(w){
    return `<div class="climaWxRight225"><div class="climaWxDesc225">${sx(w?.desc||'Sin datos')}</div><div class="climaWxRow225"><span class="climaWxIcon225">${w?.icon||'🌦️'}</span><span class="climaWxTemp225">${sx(w?.temp??'-')}°</span></div></div>`;
  }
  function kv(label,val){return `<div><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}

  function card(kind,title,w,blocks){
    const cls=kind==='fleet'?'climaFleet225':kind==='pass'?'climaPass225':'climaDest225';
    return `<article class="climaCard225 ${cls}"><div class="climaCardBody225"><div class="climaMain225"><h4>${title}</h4>${blocks.left||''}</div><div class="climaMid225">${blocks.mid||''}</div>${wxRight(w)}</div>${blocks.bottom?`<div class="climaBottom225">${blocks.bottom}</div>`:''}</article>`;
  }

  async function renderWeatherFleets225(){
    const el=q('weatherFleets'); if(!el)return;
    const abiertos=Array.isArray(trs)?trs.filter(t=>{try{return typeof openT==='function'?openT(t):true;}catch(e){return true;}}):[];
    if(!abiertos.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of abiertos){
      const c=typeof lastGpsCoords==='function'?lastGpsCoords(t):(typeof coordsFromObjClima==='function'?coordsFromObjClima(t):null);
      const w=await fetchWeatherRich(c);
      const r=route(t), emb=t?.embarque||t?.emb||t?.idEmbarque||'-';
      const left=`<div class="climaDriver225"><b>Chofer:</b> ${sx(driver(t)||'-')}</div><div class="climaLoc225">${sx(locx(t)||'-')}</div>`;
      const mid=`${kv('Origen',r.origen||'-')}${kv('Destino',r.destino||'-')}${kv('Inicio',dtx(startTime(t)))}${kv('Últ. GPS',dtx(gpsTime(t)))}`;
      const bottom=`${kv('Embarque',emb)}${kv('Cliente',r.cliente||'-')}${kv('Estado',statusTxt(t))}${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+'%')}${kv('Visibilidad',(w.vis??'-')+' km')}${kv('Lluvia',(w.rain??'-')+' mm')}`;
      out.push(card('fleet',`<span class="climaKind225">🚚</span> Flota ${sx(fleet(t)||'-')} / <span class="climaEmb225">📦 Emb. ${sx(emb)}</span>`,w,{left,mid,bottom}));
    }
    el.innerHTML=out.join('');
  }

  async function renderWeatherPasses225(){
    const el=q('weatherPasses'); if(!el)return;
    el.innerHTML='<div class="weatherLoading">Consultando clima del paso...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'};
    const w=await fetchWeatherRich(paso);
    const closed=typeof passIsClosedByWeather==='function'?passIsClosedByWeather(w):false;
    const left=`<div class="climaPassStatus225 ${closed?'closed':'open'}">${closed?'PASO CERRADO':'PASO OPERATIVO'}</div>`;
    const mid=`${kv('Ubicación','Argentina / Chile')}${kv('Actualizado',dtx(new Date().toISOString()))}`;
    const bottom=`${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+'%')}${kv('Visibilidad',(w.vis??'-')+' km')}${kv('Lluvia',(w.rain??'-')+' mm')}`;
    el.innerHTML=card('pass','Paso Los Libertadores',w,{left,mid,bottom});
  }

  async function renderWeatherDestinations225(){
    const el=q('weatherDestinations'); if(!el)return;
    const list=Array.isArray(destinos)?destinos:[];
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const out=[];
    for(const d of list){
      const c=typeof coordsFromObjClima==='function'?coordsFromObjClima(d):null;
      const w=await fetchWeatherRich(c);
      const name=typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||'Destino');
      const loc=typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||'-');
      const pais=typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||'-');
      const left=`<div class="climaLoc225">${sx([loc,pais].filter(x=>x&&x!=='-').join(', ')||'-')}</div>`;
      const mid=`${kv('Ubicación',[loc,pais].filter(x=>x&&x!=='-').join(', ')||'-')}${kv('Actualizado',dtx(new Date().toISOString()))}`;
      const bottom=`${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+'%')}${kv('Visibilidad',(w.vis??'-')+' km')}${kv('Lluvia',(w.rain??'-')+' mm')}`;
      out.push(card('dest',`<span class="climaKind225">📍</span> ${sx(name)}`,w,{left,mid,bottom}));
    }
    el.innerHTML=out.join('');
  }

  window.renderWeatherFleets=renderWeatherFleets225;
  window.renderWeatherPasses=renderWeatherPasses225;
  window.renderWeatherDestinations=renderWeatherDestinations225;
  window.renderClima=async function(){await renderWeatherFleets225();await renderWeatherPasses225();await renderWeatherDestinations225();};
  window.ensureClimaDataAndRender=async function(){
    try{ if(!Array.isArray(destinos)||!Array.isArray(trs)||destinos.length===0){[trs,users,clientes,origenes,destinos,embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}
    catch(e){console.warn('No se pudieron cargar datos clima',e);} await window.renderClima();
  };
  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(q('clima')?.classList.contains('active')) await window.renderClima(); return r;};
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); if(q('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
})();


/* ===== V2.0.150 - SOLO vista Clima: filtro por embarque y orden Flotas -> Pasos -> Destinos ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const norm=(v)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):'-');}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};
  const startTime=(t)=>{try{return typeof transitStartValue==='function'?transitStartValue(t):(t?.inicio||t?.start?.time||t?.start||'-');}catch(e){return '-';}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const statusTxt=(t)=>{try{return (typeof openT==='function' && openT(t))?'En tránsito':'Finalizado';}catch(e){return 'En tránsito';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):true;}catch(e){return true;}};

  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function allEmbOptions(){
    const vals=[...new Set((Array.isArray(trs)?trs:[]).map(embVal).filter(Boolean))];
    return vals.sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
  }
  function syncEmbFilter(){
    const sel=document.getElementById('climaEmbarqueFilter'); if(!sel)return;
    const current=sel.value;
    const opts=allEmbOptions();
    sel.innerHTML='<option value="">Todos los embarques</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join('');
    if(opts.includes(current)) sel.value=current;
  }
  window.clearClimaEmbarqueFilter=function(){const sel=document.getElementById('climaEmbarqueFilter'); if(sel)sel.value=''; window.renderClima&&window.renderClima();};

  function filteredTransits(){
    const emb=selectedEmb();
    const base=Array.isArray(trs)?trs.filter(isOpen):[];
    if(!emb)return base;
    return base.filter(t=>embVal(t)===emb);
  }

  async function fetchWeatherRich(c){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️',real:false,_ts:Date.now()};
    const key=`rich:${Number(c.lat).toFixed(4)},${Number(c.lng).toFixed(4)}`;
    window.ELTA_WEATHER_CACHE=window.ELTA_WEATHER_CACHE||{};
    const cached=window.ELTA_WEATHER_CACHE[key];
    if(cached && Date.now()-cached._ts<10*60*1000)return cached;
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation&timezone=auto`;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw new Error('weather http '+res.status);
      const data=await res.json();
      const cur=data.current||{};
      const info=typeof weatherCodeInfo==='function'?weatherCodeInfo(cur.weather_code):['🌦️','Condición no disponible'];
      const out={
        temp:cur.temperature_2m==null?'-':Math.round(cur.temperature_2m),
        sens:cur.apparent_temperature==null?'-':Math.round(cur.apparent_temperature),
        wind:cur.wind_speed_10m==null?'-':Math.round(cur.wind_speed_10m),
        hum:cur.relative_humidity_2m==null?'-':Math.round(cur.relative_humidity_2m),
        vis:cur.visibility==null?'-':Math.max(0,Math.round(Number(cur.visibility)/1000)),
        rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),
        code:cur.weather_code,desc:info[1],icon:info[0],real:true,_ts:Date.now()
      };
      window.ELTA_WEATHER_CACHE[key]=out; return out;
    }catch(e){
      const fallback=typeof fetchWeatherByCoords==='function'?await fetchWeatherByCoords(c):null;
      return Object.assign({hum:'-',vis:'-',rain:'-',_ts:Date.now()},fallback||{temp:'-',desc:'No se pudo consultar clima',wind:'-',sens:'-',icon:'⚠️'});
    }
  }

  function wxRight(w){
    return `<div class="climaWxRight225"><div class="climaWxDesc225">${sx(w?.desc||'Sin datos')}</div><div class="climaWxRow225"><span class="climaWxIcon225">${w?.icon||'🌦️'}</span><span class="climaWxTemp225">${sx(w?.temp??'-')}°</span></div></div>`;
  }
  function kv(label,val){return `<div><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function card(kind,title,w,blocks){
    const cls=kind==='fleet'?'climaFleet225':kind==='pass'?'climaPass225':'climaDest225';
    return `<article class="climaCard225 ${cls}"><div class="climaCardBody225"><div class="climaMain225"><h4>${title}</h4>${blocks.left||''}</div><div class="climaMid225">${blocks.mid||''}</div>${wxRight(w)}</div>${blocks.bottom?`<div class="climaBottom225">${blocks.bottom}</div>`:''}</article>`;
  }

  function destName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destLoc(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}

  function destinationMatchesRoute(d, r){
    const hay=[destName(d),destLoc(d),destPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | ');
    const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo,r?.cliente].map(norm).filter(Boolean);
    return target.some(t=>t && (hay.includes(t) || t.includes(hay.split(' | ')[0]||'__no__')));
  }
  function countryIsChileFromTransits(list, matchedDests){
    const source=[...list.map(t=>route(t)?.destino),...matchedDests.map(d=>[destName(d),destLoc(d),destPais(d)].join(' '))].join(' ');
    return /chile|stli|los libertadores|pudahuel|santiago/i.test(source);
  }
  function destinationsForFilteredTransits(list){
    if(!selectedEmb()) return Array.isArray(destinos)?destinos:[];
    const ds=Array.isArray(destinos)?destinos:[];
    const matches=[];
    list.forEach(t=>{
      const r=route(t);
      const found=ds.filter(d=>destinationMatchesRoute(d,r));
      if(found.length) matches.push(...found);
      else if(r?.destino){matches.push({nombre:r.destino, destino:r.destino, localidad:r.destino, pais:/chile|stli/i.test(r.destino)?'Chile':'-', _pseudo:true});}
    });
    const seen=new Set();
    return matches.filter(d=>{const k=norm(destName(d)+'|'+destLoc(d)+'|'+destPais(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }

  async function renderWeatherFleets226(list){
    const el=q('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas para el embarque seleccionado.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of list){
      const c=typeof lastGpsCoords==='function'?lastGpsCoords(t):(typeof coordsFromObjClima==='function'?coordsFromObjClima(t):null);
      const w=await fetchWeatherRich(c);
      const r=route(t), emb=embVal(t)||'-';
      const left=`<div class="climaDriver225"><b>Chofer:</b> ${sx(driver(t)||'-')}</div><div class="climaLoc225">${sx(locx(t)||'-')}</div>`;
      const mid=`${kv('Origen',r.origen||'-')}${kv('Destino',r.destino||'-')}${kv('Inicio',dtx(startTime(t)))}${kv('Últ. GPS',dtx(gpsTime(t)))}`;
      const bottom=`${kv('Embarque',emb)}${kv('Cliente',r.cliente||'-')}${kv('Estado',statusTxt(t))}${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+'%')}${kv('Visibilidad',(w.vis??'-')+' km')}${kv('Lluvia',(w.rain??'-')+' mm')}`;
      out.push(card('fleet',`<span class="climaKind225">🚚</span> Flota ${sx(fleet(t)||'-')} / <span class="climaEmb225">📦 Emb. ${sx(emb)}</span>`,w,{left,mid,bottom}));
    }
    el.innerHTML=out.join('');
  }

  async function renderWeatherPasses226(showPass){
    const el=q('weatherPasses'); if(!el)return;
    if(!showPass){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima del paso...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'};
    const w=await fetchWeatherRich(paso);
    const closed=typeof passIsClosedByWeather==='function'?passIsClosedByWeather(w):false;
    const left=`<div class="climaPassStatus225 ${closed?'closed':'open'}">${closed?'PASO CERRADO':'PASO OPERATIVO'}</div>`;
    const mid=`${kv('Ubicación','Argentina / Chile')}${kv('Actualizado',dtx(new Date().toISOString()))}`;
    const bottom=`${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+'%')}${kv('Visibilidad',(w.vis??'-')+' km')}${kv('Lluvia',(w.rain??'-')+' mm')}`;
    el.innerHTML=card('pass','Paso Los Libertadores',w,{left,mid,bottom});
  }

  async function renderWeatherDestinations226(list){
    const el=q('weatherDestinations'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos para el embarque seleccionado.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const out=[];
    for(const d of list){
      const c=typeof coordsFromObjClima==='function'?coordsFromObjClima(d):null;
      const w=await fetchWeatherRich(c);
      const name=destName(d), loc=destLoc(d), pais=destPais(d);
      const ubi=[loc,pais].filter(x=>x&&x!=='-').join(', ')||'-';
      const left=`<div class="climaLoc225">${sx(ubi)}</div>`;
      const mid=`${kv('Ubicación',ubi)}${kv('Actualizado',dtx(new Date().toISOString()))}`;
      const bottom=`${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+'%')}${kv('Visibilidad',(w.vis??'-')+' km')}${kv('Lluvia',(w.rain??'-')+' mm')}`;
      out.push(card('dest',`<span class="climaKind225">📍</span> ${sx(name)}`,w,{left,mid,bottom}));
    }
    el.innerHTML=out.join('');
  }

  window.renderClima=async function(){
    syncEmbFilter();
    const list=filteredTransits();
    const destList=destinationsForFilteredTransits(list);
    const showPass=!selectedEmb() || countryIsChileFromTransits(list,destList);
    await renderWeatherFleets226(list);
    await renderWeatherPasses226(showPass);
    await renderWeatherDestinations226(destList);
  };
  window.renderWeatherFleets=()=>renderWeatherFleets226(filteredTransits());
  window.renderWeatherPasses=()=>renderWeatherPasses226(true);
  window.renderWeatherDestinations=()=>renderWeatherDestinations226(destinationsForFilteredTransits(filteredTransits()));
  window.ensureClimaDataAndRender=async function(){
    try{ if(!Array.isArray(destinos)||!Array.isArray(trs)||destinos.length===0){[trs,users,clientes,origenes,destinos,embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}
    catch(e){console.warn('No se pudieron cargar datos clima',e);} await window.renderClima();
  };
  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(q('clima')?.classList.contains('active')) await window.renderClima(); return r;};
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); if(q('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
})();

/* ===== V2.0.150 - SOLO vista Clima: filtro embarques activos + layout compacto corregido ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.closed||t?.finalizado||t?.estado==='Finalizado');}catch(e){return true;}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};
  const startTime=(t)=>{try{return t?.inicio||t?.start?.time||t?.start||'-';}catch(e){return '-';}};
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function openTransitList(){return (Array.isArray(trs)?trs:[]).filter(isOpen);}
  function syncEmbFilterV227(){
    const sel=document.getElementById('climaEmbarqueFilter');
    if(!sel)return;
    const current=sel.value;
    const opts=[...new Set(openTransitList().map(embVal).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join('');
    if(opts.includes(current)) sel.value=current; else sel.value='';
  }
  function filteredTransits(){
    const emb=selectedEmb();
    const base=openTransitList();
    return emb ? base.filter(t=>embVal(t)===emb) : base;
  }

  async function fetchWeatherRichV227(c){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️',real:false,_ts:Date.now()};
    if(typeof fetchWeatherByCoords==='function'){
      try{
        const w=await fetchWeatherByCoords(c);
        return Object.assign({hum:'-',vis:'-',rain:'-',_ts:Date.now()}, w||{});
      }catch(e){}
    }
    return {temp:'-',desc:'No disponible',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'🌦️',real:false,_ts:Date.now()};
  }
  function kv(label,val){return `<div><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function wxRight(w){
    return `<div class="climaWxRight227"><div class="climaWxLine227"><span class="climaWxIcon227">${w?.icon||'🌦️'}</span><span class="climaWxTemp227">${sx(w?.temp??'-')}°</span></div><div class="climaWxDesc227">${sx(w?.desc||'Sin datos')}</div></div>`;
  }
  function card(kind,title,w,blocks){
    const cls=kind==='fleet'?'climaFleet227':kind==='pass'?'climaPass227':'climaDest227';
    return `<article class="climaCard227 ${cls}"><div class="climaCardGrid227"><div class="climaMain227"><h4>${title}</h4>${blocks.left||''}</div><div class="climaMid227">${blocks.mid||''}</div>${wxRight(w)}</div>${blocks.bottom?`<div class="climaBottom227">${blocks.bottom}</div>`:''}</article>`;
  }
  function destName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destLoc(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}
  function destinationMatchesRoute(d,r){
    const hay=[destName(d),destLoc(d),destPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | ');
    const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo].map(norm).filter(Boolean);
    return target.some(t=>t && hay && (hay.includes(t)||t.includes(hay.split(' | ')[0]||'__no__')));
  }
  function destinationsFor(list){
    if(!selectedEmb()) return Array.isArray(destinos)?destinos:[];
    const ds=Array.isArray(destinos)?destinos:[];
    const matches=[];
    list.forEach(t=>{
      const r=route(t);
      const found=ds.filter(d=>destinationMatchesRoute(d,r));
      if(found.length)matches.push(...found);
      else if(r?.destino)matches.push({nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});
    });
    const seen=new Set();
    return matches.filter(d=>{const k=norm(destName(d)+'|'+destLoc(d)+'|'+destPais(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }
  function requiresLibertadores(list,ds){
    const txt=[...list.map(t=>route(t)?.destino),...ds.map(d=>[destName(d),destLoc(d),destPais(d)].join(' '))].join(' ');
    return /chile|stli|santiago|pudahuel|los libertadores/i.test(txt);
  }

  async function renderWeatherFleets227(list){
    const el=document.getElementById('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of list){
      const c=typeof lastGpsCoords==='function'?lastGpsCoords(t):(typeof coordsFromObjClima==='function'?coordsFromObjClima(t):null);
      const w=await fetchWeatherRichV227(c);
      const r=route(t);
      const left=`<div class="climaDriver227"><b>Chofer:</b> ${sx(driver(t)||'-')}</div><div class="climaLoc227">${sx(locx(t)||'-')}</div>`;
      const mid=`${kv('Origen',r.origen||'-')}${kv('Destino',r.destino||'-')}${kv('Inicio',dtx(startTime(t)))}${kv('Últ. GPS',dtx(gpsTime(t)))}`;
      const bottom=`${kv('Embarque',embVal(t)||'-')}${kv('Cliente',r.cliente||'-')}${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${kv('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}${kv('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
      out.push(card('fleet',`<span class="climaKind227">🚚</span> Flota ${sx(fleet(t)||'-')} / <span class="climaEmb227">📦 Emb. ${sx(embVal(t)||'-')}</span>`,w,{left,mid,bottom}));
    }
    el.innerHTML=out.join('');
  }
  async function renderWeatherPasses227(show){
    const el=document.getElementById('weatherPasses'); if(!el)return;
    if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima del paso...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'};
    const w=await fetchWeatherRichV227(paso);
    const closed=typeof passIsClosedByWeather==='function'?passIsClosedByWeather(w):false;
    const left=`<div class="climaPassStatus227 ${closed?'closed':'open'}">${closed?'PASO CERRADO':'PASO OPERATIVO'}</div>`;
    const mid=`${kv('Ubicación','Argentina / Chile')}${kv('Actualizado',dtx(new Date().toISOString()))}`;
    const bottom=`${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${kv('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}`;
    el.innerHTML=card('pass','Paso Los Libertadores',w,{left,mid,bottom});
  }
  async function renderWeatherDestinations227(list){
    const el=document.getElementById('weatherDestinations'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const out=[];
    for(const d of list){
      const c=typeof coordsFromObjClima==='function'?coordsFromObjClima(d):null;
      const w=await fetchWeatherRichV227(c);
      const ubi=[destLoc(d),destPais(d)].filter(x=>x&&x!=='-').join(', ')||'-';
      const left=`<div class="climaLoc227">${sx(ubi)}</div>`;
      const mid=`${kv('Ubicación',ubi)}${kv('Actualizado',dtx(new Date().toISOString()))}`;
      const bottom=`${kv('Sensación',(w.sens??'-')+'°')}${kv('Viento',(w.wind??'-')+' km/h')}${kv('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${kv('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}`;
      out.push(card('dest',`<span class="climaKind227">📍</span> ${sx(destName(d))}`,w,{left,mid,bottom}));
    }
    el.innerHTML=out.join('');
  }
  window.renderClima=async function(){
    syncEmbFilterV227();
    const list=filteredTransits();
    const destList=destinationsFor(list);
    const showPass=!selectedEmb() || requiresLibertadores(list,destList);
    await renderWeatherFleets227(list);
    await renderWeatherPasses227(showPass);
    await renderWeatherDestinations227(destList);
  };
  window.ensureClimaDataAndRender=async function(){
    try{ if(!Array.isArray(trs)||!Array.isArray(destinos)||destinos.length===0){[trs,users,clientes,origenes,destinos,embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}
    catch(e){console.warn('No se pudieron cargar datos clima',e);}
    await window.renderClima();
  };
  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.climaClearBtn226').forEach(b=>b.remove()); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) await window.renderClima(); return r;};
})();

/* ===== V2.0.150 - SOLO vista Clima: tarjetas compactas + datos operativos + paso real oficial ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.closed||t?.finalizado||t?.estado==='Finalizado');}catch(e){return true;}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const coords=(obj)=>{try{return typeof coordsFromObjClima==='function'?coordsFromObjClima(obj):null;}catch(e){return null;}};

  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function openTransitList(){return (Array.isArray(trs)?trs:[]).filter(isOpen);}
  function syncEmbFilter(){
    const sel=document.getElementById('climaEmbarqueFilter');
    if(!sel)return;
    const cur=sel.value;
    const opts=[...new Set(openTransitList().map(embVal).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join('');
    if(opts.includes(cur)) sel.value=cur; else sel.value='';
  }
  function filteredTransits(){
    const emb=selectedEmb();
    const base=openTransitList();
    return emb ? base.filter(t=>embVal(t)===emb) : base;
  }

  function destinationName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destinoLocalidad(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destinoPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}
  function destinationMatchesRoute(d,r){
    const hay=[destinationName(d),destinoLocalidad(d),destinoPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | ');
    const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo].map(norm).filter(Boolean);
    return target.some(t=>t && hay && (hay.includes(t)||t.includes(hay.split(' | ')[0]||'__no__')));
  }
  function destinationsFor(list){
    const ds=Array.isArray(destinos)?destinos:[];
    if(!selectedEmb()) return ds;
    const matches=[];
    list.forEach(t=>{
      const r=route(t);
      const found=ds.filter(d=>destinationMatchesRoute(d,r));
      if(found.length) matches.push(...found);
      else if(r?.destino) matches.push({nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});
    });
    const seen=new Set();
    return matches.filter(d=>{const k=norm(destinationName(d)+'|'+destinoLocalidad(d)+'|'+destinoPais(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }
  function requiresLibertadores(list,ds){
    const txt=[...list.map(t=>route(t)?.destino),...ds.map(d=>[destinationName(d),destinoLocalidad(d),destinoPais(d)].join(' '))].join(' ');
    return /chile|stli|santiago|pudahuel|los libertadores|cristo redentor/i.test(txt);
  }

  async function fetchWeatherRich(c){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️',real:false,_ts:Date.now()};
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation&timezone=auto`;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw new Error('weather http '+res.status);
      const data=await res.json();
      const cur=data.current||{};
      let info=typeof weatherCodeInfo==='function'?weatherCodeInfo(cur.weather_code):['🌦️','Clima'];
      return {
        temp:Math.round(cur.temperature_2m),
        sens:Math.round(cur.apparent_temperature),
        wind:Math.round(cur.wind_speed_10m),
        hum:cur.relative_humidity_2m==null?'-':Math.round(cur.relative_humidity_2m),
        vis:cur.visibility==null?'-':Math.round(Number(cur.visibility)/1000),
        rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),
        code:cur.weather_code,desc:info[1],icon:info[0],real:true,_ts:Date.now()
      };
    }catch(e){
      if(typeof fetchWeatherByCoords==='function'){
        try{return Object.assign({hum:'-',vis:'-',rain:'-',real:false,_ts:Date.now()}, await fetchWeatherByCoords(c));}catch(_e){}
      }
      return {temp:'-',desc:'No disponible',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'🌦️',real:false,_ts:Date.now()};
    }
  }

  const officialPasoSources=[
    {name:'CFLosLibertador',url:'https://ncfloslibertadores.cl/'},
    {name:'UPF Chile',url:'https://www.pasosfronterizos.gov.cl/noticias/conoce-el-estado-diario-y-horario-de-funcionamiento-de-los-complejos-fronterizos/'}
  ];
  async function fetchTextViaProxy(url){
    const encoded=encodeURIComponent(url);
    const endpoints=[
      `https://api.allorigins.win/raw?url=${encoded}`,
      `https://r.jina.ai/http://r.jina.ai/http://invalid` // sentinel, ignored below
    ];
    for(const endpoint of endpoints){
      if(endpoint.includes('invalid')) continue;
      try{
        const res=await fetch(endpoint,{cache:'no-store'});
        if(res.ok){const txt=await res.text(); if(txt) return txt;}
      }catch(e){}
    }
    try{const res=await fetch(url,{cache:'no-store',mode:'cors'}); if(res.ok)return await res.text();}catch(e){}
    return '';
  }
  function cleanHtmlText(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
  function parsePasoStatus(text,source){
    const t=cleanHtmlText(text);
    const low=norm(t);
    let status='No disponible';
    let open=false, closed=false;
    if(/\bcerrad[oa]\b|cierre|suspendid[oa]|no habilitado|inhabilitado|close\b/i.test(t)){closed=true; status='PASO CERRADO';}
    if(/\babiert[oa]\b|habilitado|operativo|transito habilitado|todo tipo de veh[ií]culos/i.test(t)){open=true; status='PASO HABILITADO';}
    if(closed && !open) status='PASO CERRADO';
    if(open && !closed) status='PASO HABILITADO';
    if(open && closed){
      const pOpen=low.lastIndexOf('habilitado');
      const pAbierto=low.lastIndexOf('abierto');
      const pClosed=Math.max(low.lastIndexOf('cerrado'),low.lastIndexOf('cierre'));
      status=(Math.max(pOpen,pAbierto)>pClosed)?'PASO HABILITADO':'PASO CERRADO';
      closed=status==='PASO CERRADO'; open=!closed;
    }
    let updated='Online';
    const m=t.match(/Actualizado\s*(?:hace|:)?\s*([^\.\|\n]{3,45})/i) || t.match(/(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i);
    if(m) updated=m[1].trim();
    return {status,open,closed,source,updated,raw:t.slice(0,260)};
  }
  async function fetchPasoOfficialStatus(){
    for(const src of officialPasoSources){
      const txt=await fetchTextViaProxy(src.url);
      if(txt){
        const p=parsePasoStatus(txt,src.name);
        if(p.status!=='No disponible') return p;
      }
    }
    return {status:'VERIFICAR FUENTE OFICIAL',open:false,closed:false,source:'Sin conexión',updated:'No disponible'};
  }

  function kv(label,val){return `<div class="climaKv228"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function metric(label,val){return `<div class="climaMetric228"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function wx(w){
    return `<div class="climaWx228"><div class="climaWxTop228"><span class="climaTemp228">${sx(w?.temp??'-')}°</span><span class="climaIcon228">${w?.icon||'🌦️'}</span></div><div class="climaDesc228">${sx(w?.desc||'Sin datos')}</div><div class="climaWxMetrics228">${metric('Sensación',(w?.sens??'-')+'°')}${metric('Viento',(w?.wind??'-')+' km/h')}${metric('Humedad',(w?.hum??'-')+(w?.hum==='-'?'':'%'))}${metric('Visibilidad',(w?.vis??'-')+(w?.vis==='-'?'':' km'))}</div></div>`;
  }
  function card(kind,title,left,center,w,bottom,statusHtml=''){
    const cls=kind==='fleet'?'climaFleet228':kind==='pass'?'climaPass228':'climaDest228';
    return `<article class="climaCard228 ${cls}"><div class="climaBody228"><div class="climaLeft228"><h4>${title}</h4>${left||''}</div><div class="climaCenter228">${statusHtml||''}${center||''}</div>${wx(w)}</div>${bottom?`<div class="climaBottom228">${bottom}</div>`:''}</article>`;
  }
  function gpsEstado(t,c){return c?'Reportando':'Sin coordenadas';}
  function etaVal(t){return t?.eta||t?.etaEstimada||t?.fechaArribo||t?.llegadaEstimada||'-';}
  function distVal(t){return t?.distanciaRestante||t?.kmRestantes||t?.distancia||'-';}
  function hitoVal(t){return t?.proximoHito||t?.hito||t?.proximoEvento||'-';}
  async function renderWeatherFleets228(list){
    const el=document.getElementById('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of list){
      const c=typeof lastGpsCoords==='function'?lastGpsCoords(t):coords(t);
      const w=await fetchWeatherRich(c);
      const r=route(t); const upd=gpsTime(t);
      const left=`${kv('Chofer',driver(t)||'-')}${kv('Embarque',embVal(t)||'-')}${kv('Cliente',r.cliente||'-')}`;
      const center=`${kv('Ubicación actual',locx(t)||'-')}${kv('Origen',r.origen||'-')}${kv('Destino',r.destino||'-')}${kv('Último GPS',dtx(upd))}`;
      const bottom=`${metric('Estado GPS',gpsEstado(t,c))}${metric('Actualizado',dtx(new Date().toISOString()))}${metric('Tiempo estimado al destino',etaVal(t))}${metric('Distancia restante',distVal(t))}${metric('Próximo hito operativo',hitoVal(t))}${metric('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
      out.push(card('fleet',`<span class="climaKind228">🚚</span> Flota ${sx(fleet(t)||'-')}`,left,center,w,bottom));
    }
    el.innerHTML=out.join('');
  }
  async function renderWeatherPasses228(show){
    const el=document.getElementById('weatherPasses'); if(!el)return;
    if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando fuente oficial del Paso Los Libertadores...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'};
    const [w,official]=await Promise.all([fetchWeatherRich(paso),fetchPasoOfficialStatus()]);
    const statusCls=official.closed?'closed':(official.open?'open':'warn');
    const statusHtml=`<div class="climaPassStatus228 ${statusCls}">${sx(official.status)}</div>`;
    const left=`${kv('Ubicación','Argentina / Chile')}${kv('Fuente',official.source)}${kv('Actualización oficial',official.updated)}`;
    const center=`${kv('Estado',official.status)}${kv('Observación',official.open?'Tránsito informado como habilitado':official.closed?'Tránsito informado como cerrado':'Revisar fuente oficial')}`;
    const bottom=`${metric('Sensación',(w.sens??'-')+'°')}${metric('Viento',(w.wind??'-')+' km/h')}${metric('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${metric('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}${metric('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
    el.innerHTML=card('pass','Paso Los Libertadores',left,center,w,bottom,statusHtml);
  }
  async function renderWeatherDestinations228(list){
    const el=document.getElementById('weatherDestinations'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const out=[];
    for(const d of list){
      const c=coords(d); const w=await fetchWeatherRich(c);
      const ubi=[destinoLocalidad(d),destinoPais(d)].filter(x=>x&&x!=='-').join(', ')||'-';
      const left=`${kv('Ubicación',ubi)}${kv('Actualizado',dtx(new Date().toISOString()))}`;
      const center=`${kv('Destino',destinationName(d))}${kv('País',destinoPais(d)||'-')}`;
      const bottom=`${metric('Sensación',(w.sens??'-')+'°')}${metric('Viento',(w.wind??'-')+' km/h')}${metric('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${metric('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}${metric('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
      out.push(card('dest',`<span class="climaKind228">📍</span> ${sx(destinationName(d))}`,left,center,w,bottom));
    }
    el.innerHTML=out.join('');
  }
  window.renderClima=async function(){
    syncEmbFilter();
    const list=filteredTransits();
    const destList=destinationsFor(list);
    const showPass=!selectedEmb() || requiresLibertadores(list,destList);
    await renderWeatherFleets228(list);
    await renderWeatherPasses228(showPass);
    await renderWeatherDestinations228(destList);
  };
  window.ensureClimaDataAndRender=async function(){
    try{ if(!Array.isArray(trs)||!Array.isArray(destinos)||destinos.length===0){[trs,users,clientes,origenes,destinos,embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}
    catch(e){console.warn('No se pudieron cargar datos clima',e);}
    await window.renderClima();
  };
  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.climaClearBtn226').forEach(b=>b.remove()); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) await window.renderClima(); return r;};
})();

/* ===== V2.0.150 - SOLO vista Clima: actualizar funcional, tarjetas compactas y Paso oficial ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.closed||t?.finalizado||/final/i.test(String(t?.estado||'')));}catch(e){return true;}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const coords=(o)=>{try{return typeof coordsFromObjClima==='function'?coordsFromObjClima(o):null;}catch(e){return null;}};
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;} };
  const startTime=(t)=>{try{return t?.inicio||t?.start?.time||t?.start||'-';}catch(e){return '-';}};

  function updateVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }

  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function openTransitList(){return (Array.isArray(window.trs)?window.trs:[]).filter(isOpen);}
  function syncEmbFilter(){
    const sel=document.getElementById('climaEmbarqueFilter');
    if(!sel)return;
    const cur=sel.value;
    const opts=[...new Set(openTransitList().map(embVal).filter(Boolean))]
      .sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join('');
    sel.value=opts.includes(cur)?cur:'';
  }
  function filteredTransits(){
    const emb=selectedEmb();
    const list=openTransitList();
    return emb?list.filter(t=>embVal(t)===emb):list;
  }

  function destinationName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destinoLocalidad(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destinoPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}
  function destinationMatchesRoute(d,r){
    const hay=[destinationName(d),destinoLocalidad(d),destinoPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | ');
    const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo].map(norm).filter(Boolean);
    return target.some(t=>t && hay && (hay.includes(t)||t.includes(hay.split(' | ')[0]||'__no__')));
  }
  function destinationsFor(list){
    const ds=Array.isArray(window.destinos)?window.destinos:[];
    if(!selectedEmb())return ds;
    const matches=[];
    list.forEach(t=>{
      const r=route(t);
      const found=ds.filter(d=>destinationMatchesRoute(d,r));
      if(found.length)matches.push(...found);
      else if(r?.destino)matches.push({nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});
    });
    const seen=new Set();
    return matches.filter(d=>{const k=norm(destinationName(d)+'|'+destinoLocalidad(d)+'|'+destinoPais(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }
  function requiresLibertadores(list,ds){
    const txt=[...list.map(t=>route(t)?.destino),...ds.map(d=>[destinationName(d),destinoLocalidad(d),destinoPais(d)].join(' '))].join(' ');
    return /chile|stli|santiago|pudahuel|los libertadores|cristo redentor/i.test(txt);
  }

  function weatherCodeInfoLocal(code){
    if(typeof weatherCodeInfo==='function')return weatherCodeInfo(code);
    const c=Number(code);
    if([0].includes(c))return ['☀️','Despejado'];
    if([1,2].includes(c))return ['🌤️','Parcialmente nublado'];
    if([3].includes(c))return ['☁️','Nublado'];
    if([45,48].includes(c))return ['🌫️','Niebla'];
    if([51,53,55,56,57].includes(c))return ['🌦️','Llovizna'];
    if([61,63,65,66,67,80,81,82].includes(c))return ['🌧️','Lluvia'];
    if([71,73,75,77,85,86].includes(c))return ['🌨️','Nieve'];
    if([95,96,99].includes(c))return ['⛈️','Tormenta'];
    return ['🌦️','Clima'];
  }
  async function fetchWeatherRich(c,force=false){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️',real:false,_ts:Date.now()};
    const key=`v229:${Number(c.lat).toFixed(4)},${Number(c.lng).toFixed(4)}`;
    window.ELTA_WEATHER_CACHE=window.ELTA_WEATHER_CACHE||{};
    if(!force && window.ELTA_WEATHER_CACHE[key] && Date.now()-window.ELTA_WEATHER_CACHE[key]._ts<10*60*1000)return window.ELTA_WEATHER_CACHE[key];
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation&timezone=auto`;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw new Error('weather http '+res.status);
      const cur=(await res.json()).current||{};
      const info=weatherCodeInfoLocal(cur.weather_code);
      const out={
        temp:cur.temperature_2m==null?'-':Math.round(cur.temperature_2m),
        sens:cur.apparent_temperature==null?'-':Math.round(cur.apparent_temperature),
        wind:cur.wind_speed_10m==null?'-':Math.round(cur.wind_speed_10m),
        hum:cur.relative_humidity_2m==null?'-':Math.round(cur.relative_humidity_2m),
        vis:cur.visibility==null?'-':Math.max(0,Math.round(Number(cur.visibility)/1000)),
        rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),
        code:cur.weather_code,desc:info[1],icon:info[0],real:true,_ts:Date.now()
      };
      window.ELTA_WEATHER_CACHE[key]=out;
      return out;
    }catch(e){
      if(typeof fetchWeatherByCoords==='function'){
        try{return Object.assign({hum:'-',vis:'-',rain:'-',real:false,_ts:Date.now()}, await fetchWeatherByCoords(c));}catch(_e){}
      }
      return {temp:'-',desc:'No disponible',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'🌦️',real:false,_ts:Date.now()};
    }
  }

  const pasoSources=[
    {name:'Nuevo Complejo Fronterizo Los Libertadores',url:'https://ncfloslibertadores.cl/'},
    {name:'Unidad de Pasos Fronterizos Chile',url:'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/valparaiso/paso-sistema-cristo-redentor/'},
    {name:'Gobernación Los Andes',url:'https://www.gobernacionlosandes.gov.cl/libertadoreshtml/'}
  ];
  async function proxyFetchText(url){
    const endpoints=[
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      url
    ];
    for(const ep of endpoints){
      try{const res=await fetch(ep,{cache:'no-store'}); if(res.ok){const txt=await res.text(); if(txt && txt.length>80)return txt;}}catch(e){}
    }
    return '';
  }
  function cleanText(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
  function parsePasoStatus(html,src){
    const text=cleanText(html); const low=norm(text);
    let status='No disponible', open=false, closed=false;
    if(/\bcerrad[oa]\b|cierre|suspendid[oa]|no habilitado|inhabilitado|close\b/i.test(text)){closed=true;status='PASO CERRADO';}
    if(/\babiert[oa]\b|habilitad[oa]|operativo|se restablece|tr[aá]nsito normal|todo tipo de veh[ií]culos/i.test(text)){open=true;status='PASO HABILITADO';}
    if(open&&closed){
      const pOpen=Math.max(low.lastIndexOf('habilitado'),low.lastIndexOf('abierto'),low.lastIndexOf('restablece'));
      const pClosed=Math.max(low.lastIndexOf('cerrado'),low.lastIndexOf('cierre'),low.lastIndexOf('suspendido'));
      status=pOpen>pClosed?'PASO HABILITADO':'PASO CERRADO'; open=status.includes('HABILITADO'); closed=!open;
    }
    let updated='Consulta online';
    const m=text.match(/Actualizado\s*(?:hace|:)?\s*([^\.\|\n]{3,55})/i)||text.match(/(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i)||text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}[^\.]{0,25})/i);
    if(m)updated=m[1].trim();
    return {status,open,closed,source:src.name,url:src.url,updated,raw:text.slice(0,220)};
  }
  async function fetchPasoOfficial(force=false){
    window.ELTA_PASO_CACHE=window.ELTA_PASO_CACHE||null;
    if(!force && window.ELTA_PASO_CACHE && Date.now()-window.ELTA_PASO_CACHE._ts<10*60*1000)return window.ELTA_PASO_CACHE;
    for(const src of pasoSources){
      const txt=await proxyFetchText(src.url);
      if(txt){
        const parsed=parsePasoStatus(txt,src);
        if(parsed.status!=='No disponible'){
          parsed._ts=Date.now(); window.ELTA_PASO_CACHE=parsed; return parsed;
        }
      }
    }
    const out={status:'VERIFICAR FUENTE OFICIAL',open:false,closed:false,source:'Sin conexión',url:'https://www.pasosfronterizos.gov.cl/',updated:'No disponible',_ts:Date.now()};
    window.ELTA_PASO_CACHE=out; return out;
  }

  function kv(label,val){return `<div class="climaKv229"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function metric(label,val){return `<div class="climaMetric229"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function weatherBox(w){
    return `<div class="climaWx229"><div class="climaWxTop229"><span class="climaTemp229">${sx(w?.temp??'-')}°</span><span class="climaIcon229">${w?.icon||'🌦️'}</span></div><div class="climaDesc229">${sx(w?.desc||'Sin datos')}</div><div class="climaWxMetrics229">${metric('Sensación',(w?.sens??'-')+'°')}${metric('Viento',(w?.wind??'-')+' km/h')}${metric('Humedad',(w?.hum??'-')+(w?.hum==='-'?'':'%'))}${metric('Visibilidad',(w?.vis??'-')+(w?.vis==='-'?'':' km'))}</div></div>`;
  }
  function card(kind,title,left,center,w,bottom,statusHtml=''){
    const cls=kind==='fleet'?'climaFleet229':kind==='pass'?'climaPass229':'climaDest229';
    return `<article class="climaCard229 ${cls}"><div class="climaBody229"><div class="climaLeft229"><h4>${title}</h4>${left||''}</div><div class="climaCenter229">${statusHtml||''}${center||''}</div>${weatherBox(w)}</div>${bottom?`<div class="climaBottom229">${bottom}</div>`:''}</article>`;
  }
  function gpsEstado(t,c){return c?'Reportando':'Sin coordenadas';}
  function etaVal(t){return t?.eta||t?.etaEstimada||t?.fechaArribo||t?.llegadaEstimada||'-';}
  function distVal(t){return t?.distanciaRestante||t?.kmRestantes||t?.distancia||'-';}
  function hitoVal(t){return t?.proximoHito||t?.hito||t?.proximoEvento||'-';}

  async function renderWeatherFleets229(list,force=false){
    const el=document.getElementById('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of list){
      const c=typeof lastGpsCoords==='function'?lastGpsCoords(t):coords(t);
      const w=await fetchWeatherRich(c,force);
      const r=route(t); const emb=embVal(t)||'-';
      const left=`${kv('Chofer',driver(t)||'-')}${kv('Embarque',emb)}${kv('Cliente',r.cliente||'-')}`;
      const center=`${kv('Ubicación actual',locx(t)||'-')}${kv('Origen',r.origen||'-')}${kv('Destino',r.destino||'-')}${kv('Inicio',dtx(startTime(t)))}${kv('Último GPS',dtx(gpsTime(t)))}`;
      const bottom=`${metric('Estado GPS',gpsEstado(t,c))}${metric('Actualizado',dtx(new Date().toISOString()))}${metric('ETA',etaVal(t))}${metric('Distancia restante',distVal(t))}${metric('Próximo hito',hitoVal(t))}${metric('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
      out.push(card('fleet',`<span class="climaKind229">🚚</span> Flota ${sx(fleet(t)||'-')}`,left,center,w,bottom));
    }
    el.innerHTML=out.join('');
  }
  async function renderWeatherPasses229(show,force=false){
    const el=document.getElementById('weatherPasses'); if(!el)return;
    if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando fuente oficial del Paso Los Libertadores...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'};
    const [w,official]=await Promise.all([fetchWeatherRich(paso,force),fetchPasoOfficial(force)]);
    const cls=official.closed?'closed':(official.open?'open':'warn');
    const statusHtml=`<div class="climaPassStatus229 ${cls}">${sx(official.status)}</div>`;
    const left=`${kv('Fuente',official.source)}${kv('Actualización oficial',official.updated)}${official.url?`<div class="climaKv229"><b>Link:</b> <a href="${sx(official.url)}" target="_blank" rel="noopener">ver fuente</a></div>`:''}`;
    const center=`${kv('Ubicación','Argentina / Chile')}${kv('Estado informado',official.status)}${kv('Observación',official.open?'Tránsito informado como habilitado':official.closed?'Tránsito informado como cerrado':'No se pudo validar automáticamente')}`;
    const bottom=`${metric('Sensación',(w.sens??'-')+'°')}${metric('Viento',(w.wind??'-')+' km/h')}${metric('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${metric('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}${metric('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
    el.innerHTML=card('pass','Paso Los Libertadores',left,center,w,bottom,statusHtml);
  }
  async function renderWeatherDestinations229(list,force=false){
    const el=document.getElementById('weatherDestinations'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const out=[];
    for(const d of list){
      const c=coords(d); const w=await fetchWeatherRich(c,force);
      const ubi=[destinoLocalidad(d),destinoPais(d)].filter(x=>x&&x!=='-').join(', ')||'-';
      const left=`${kv('Ubicación',ubi)}${kv('Actualizado',dtx(new Date().toISOString()))}`;
      const center=`${kv('Destino',destinationName(d))}${kv('País',destinoPais(d)||'-')}`;
      const bottom=`${metric('Sensación',(w.sens??'-')+'°')}${metric('Viento',(w.wind??'-')+' km/h')}${metric('Humedad',(w.hum??'-')+(w.hum==='-'?'':'%'))}${metric('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}${metric('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm'))}`;
      out.push(card('dest',`<span class="climaKind229">📍</span> ${sx(destinationName(d))}`,left,center,w,bottom));
    }
    el.innerHTML=out.join('');
  }

  window.renderClima=async function(force=false){
    syncEmbFilter();
    const list=filteredTransits();
    const destList=destinationsFor(list);
    const showPass=!selectedEmb() || requiresLibertadores(list,destList);
    await renderWeatherFleets229(list,force);
    await renderWeatherPasses229(showPass,force);
    await renderWeatherDestinations229(destList,force);
  };
  window.ensureClimaDataAndRender=async function(force=false){
    try{ if(force || !Array.isArray(window.trs)||!Array.isArray(window.destinos)||window.destinos.length===0){[window.trs,window.users,window.clientes,window.origenes,window.destinos,window.embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}
    catch(e){console.warn('No se pudieron cargar datos clima',e);}
    await window.renderClima(force);
  };
  window.forceRefreshClima=async function(){
    window.ELTA_WEATHER_CACHE={};
    window.ELTA_PASO_CACHE=null;
    const btn=document.querySelector('#clima .climaRefreshBtn226');
    const old=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='Actualizando...';}
    try{await window.ensureClimaDataAndRender(true);}finally{if(btn){btn.disabled=false;btn.textContent=old||'Actualizar';}}
  };

  function wireRefresh(){
    document.querySelectorAll('#clima .climaRefreshBtn226').forEach(btn=>{
      btn.onclick=(ev)=>{ev.preventDefault(); window.forceRefreshClima();};
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{updateVersion();wireRefresh(); if(document.getElementById('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); wireRefresh(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) await window.renderClima(); return r;};
})();

/* ===== V2.0.150 - SOLO vista Clima: columnas Flotas | Paso+Destinos, tarjetas compactas ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const arr=(name)=>{try{return Array.isArray(window[name])?window[name]:(typeof eval(name)!=='undefined'&&Array.isArray(eval(name))?eval(name):[]);}catch(e){return Array.isArray(window[name])?window[name]:[];}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.closed||t?.finalizado||/final/i.test(String(t?.estado||'')));}catch(e){return true;}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;} };
  const startTime=(t)=>{try{return t?.inicio||t?.start?.time||t?.start||'-';}catch(e){return '-';}};
  const coords=(o)=>{try{if(typeof coordsFromObjClima==='function')return coordsFromObjClima(o);let lat=o?.lat||o?.latitude||o?.latitud,lng=o?.lng||o?.lon||o?.longitude||o?.longitud;if(lat&&lng)return{lat:Number(lat),lng:Number(lng),text:`${lat}, ${lng}`};let s=String(o?.ubicacion||o?.coordenadas||o?.coords||'');let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);return m?{lat:Number(m[1]),lng:Number(m[2]),text:`${m[1]}, ${m[2]}`}:null;}catch(e){return null;}};
  const lastCoords=(t)=>{try{return typeof lastGpsCoords==='function'?lastGpsCoords(t):(coords(t)||coords(typeof lastU==='function'?(lastU(t)||{}):{}));}catch(e){return coords(t);}};

  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function openTransitList(){return arr('trs').filter(isOpen);}
  function syncEmbFilter(){const sel=document.getElementById('climaEmbarqueFilter'); if(!sel)return; const cur=sel.value; const opts=[...new Set(openTransitList().map(embVal).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true})); sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join(''); sel.value=opts.includes(cur)?cur:'';}
  function filteredTransits(){const emb=selectedEmb(); const list=openTransitList(); return emb?list.filter(t=>embVal(t)===emb):list;}

  function destinationName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destinoLocalidad(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destinoPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}
  function destinationMatchesRoute(d,r){const hay=[destinationName(d),destinoLocalidad(d),destinoPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | '); const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo].map(norm).filter(Boolean); return target.some(t=>t && hay && (hay.includes(t)||t.includes(hay.split(' | ')[0]||'__no__')));}
  function destinationsFor(list){const ds=arr('destinos'); if(!selectedEmb())return ds; const matches=[]; list.forEach(t=>{const r=route(t); const found=ds.filter(d=>destinationMatchesRoute(d,r)); if(found.length)matches.push(...found); else if(r?.destino)matches.push({nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});}); const seen=new Set(); return matches.filter(d=>{const k=norm(destinationName(d)+'|'+destinoLocalidad(d)+'|'+destinoPais(d)); if(seen.has(k))return false; seen.add(k); return true;});}
  function requiresLibertadores(list,ds){const txt=[...list.map(t=>route(t)?.destino),...ds.map(d=>[destinationName(d),destinoLocalidad(d),destinoPais(d)].join(' '))].join(' '); return /chile|stli|santiago|pudahuel|los libertadores|cristo redentor/i.test(txt);}

  function weatherCodeInfoLocal(code){if(typeof weatherCodeInfo==='function')return weatherCodeInfo(code); const c=Number(code); if(c===0)return ['☀️','Despejado']; if([1,2].includes(c))return ['🌤️','Parcialmente nublado']; if(c===3)return ['☁️','Nublado']; if([45,48].includes(c))return ['🌫️','Niebla']; if([51,53,55,56,57].includes(c))return ['🌦️','Llovizna']; if([61,63,65,66,67,80,81,82].includes(c))return ['🌧️','Lluvia']; if([71,73,75,77,85,86].includes(c))return ['🌨️','Nieve']; if([95,96,99].includes(c))return ['⛈️','Tormenta']; return ['🌦️','Clima'];}
  async function fetchWeather(c,force=false){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️'};
    const key=`v230:${Number(c.lat).toFixed(4)},${Number(c.lng).toFixed(4)}`; window.ELTA_WEATHER_CACHE=window.ELTA_WEATHER_CACHE||{};
    if(!force && window.ELTA_WEATHER_CACHE[key] && Date.now()-window.ELTA_WEATHER_CACHE[key]._ts<10*60*1000)return window.ELTA_WEATHER_CACHE[key];
    try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation&timezone=auto`; const res=await fetch(url,{cache:'no-store'}); if(!res.ok)throw new Error('weather'); const cur=(await res.json()).current||{}; const info=weatherCodeInfoLocal(cur.weather_code); const out={temp:cur.temperature_2m==null?'-':Math.round(cur.temperature_2m),sens:cur.apparent_temperature==null?'-':Math.round(cur.apparent_temperature),wind:cur.wind_speed_10m==null?'-':Math.round(cur.wind_speed_10m),hum:cur.relative_humidity_2m==null?'-':Math.round(cur.relative_humidity_2m),vis:cur.visibility==null?'-':Math.round(Number(cur.visibility)/1000),rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),icon:info[0],desc:info[1],_ts:Date.now()}; window.ELTA_WEATHER_CACHE[key]=out; return out;}catch(e){return {temp:'-',desc:'Sin datos online',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️'};}
  }

  const pasoSources=[
    {name:'Gobierno de Chile',url:'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/valparaiso/paso-sistema-cristo-redentor/'},
    {name:'Complejo Los Libertadores',url:'https://ncfloslibertadores.cl/'},
    {name:'Pasos Fronterizos',url:'https://pasosfronterizos.com/paso-los-libertadores.php'},
    {name:'Argentina.gob.ar',url:'https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/29/Sistema-Cristo-Redentor'}
  ];
  async function proxyFetchText(url){const endpoints=[`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,`https://r.jina.ai/http://r.jina.ai/http://`]; for(const ep of endpoints){try{if(ep.includes('r.jina.ai/http://r.jina.ai'))continue; const res=await fetch(ep,{cache:'no-store'}); if(res.ok){const txt=await res.text(); if(txt&&txt.length>80)return txt;}}catch(e){}} return '';}
  function cleanText(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
  function parsePasoStatus(html,src){const text=cleanText(html); const low=norm(text); let status='VERIFICAR', type='warn'; if(/\bcerrad[oa]\b|cierre|suspendid[oa]|no habilitado|inhabilitado|close\b/i.test(text)){status='PASO CERRADO';type='closed';} if(/\babiert[oa]\b|habilitad[oa]|operativo|tr[aá]nsito normal|todo tipo de veh[ií]culos/i.test(text)){const pOpen=Math.max(low.lastIndexOf('habilitado'),low.lastIndexOf('abierto'),low.lastIndexOf('operativo')); const pClosed=Math.max(low.lastIndexOf('cerrado'),low.lastIndexOf('cierre'),low.lastIndexOf('suspendido')); if(pOpen>=pClosed){status='PASO HABILITADO';type='open';}}
    let updated='Consulta online'; const m=text.match(/Actualizado\s*(?:hace|:)?\s*([^\.\|\n]{3,55})/i)||text.match(/(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i)||text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}[^\.]{0,25})/i); if(m)updated=m[1].trim(); return {status,type,source:src.name,url:src.url,updated};}
  async function fetchPasoOfficial(force=false){window.ELTA_PASO_CACHE=window.ELTA_PASO_CACHE||null; if(!force&&window.ELTA_PASO_CACHE&&Date.now()-window.ELTA_PASO_CACHE._ts<10*60*1000)return window.ELTA_PASO_CACHE; for(const src of pasoSources){const txt=await proxyFetchText(src.url); if(txt){const p=parsePasoStatus(txt,src); if(p.status!=='VERIFICAR'){p._ts=Date.now(); window.ELTA_PASO_CACHE=p; return p;}}} const out={status:'VERIFICAR FUENTE OFICIAL',type:'warn',source:'Sin acceso automático',url:'https://www.pasosfronterizos.gov.cl/',updated:'No disponible',_ts:Date.now()}; window.ELTA_PASO_CACHE=out; return out;}

  function kv(label,val){return `<div class="climaKv230"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function wx(w){return `<div class="climaWx230"><div class="climaWxTop230"><span class="climaTemp230">${sx(w?.temp??'-')}°</span><span class="climaIcon230">${w?.icon||'🌦️'}</span></div><div class="climaDesc230">${sx(w?.desc||'Sin datos')}</div><div class="climaMetrics230">${kv('Sensación',(w?.sens??'-')+'°')}${kv('Viento',(w?.wind??'-')+' km/h')}${kv('Humedad',(w?.hum??'-')+(w?.hum==='-'?'':'%'))}${kv('Visibilidad',(w?.vis??'-')+(w?.vis==='-'?'':' km'))}</div></div>`;}
  function card(kind,title,left,mid,w,bottom='',extraClass='',status=''){return `<article class="climaCard230 ${kind} ${extraClass}"><div class="climaRow230"><div class="climaMini230"><h4>${title}</h4>${left||''}</div><div class="climaMid230">${status||''}${mid||''}</div>${wx(w)}</div>${bottom?`<div class="climaBottom230">${bottom}</div>`:''}</article>`;}
  function etaVal(t){return t?.eta||t?.etaEstimada||t?.fechaArribo||t?.llegadaEstimada||'-';}
  function distVal(t){return t?.distanciaRestante||t?.kmRestantes||t?.distancia||'-';}
  function hitoVal(t){return t?.proximoHito||t?.hito||t?.proximoEvento||'-';}

  async function renderFleets(list,force=false){const el=document.getElementById('weatherFleets'); if(!el)return; if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>'; const out=[]; for(const t of list){const c=lastCoords(t); const w=await fetchWeather(c,force); const r=route(t); const title=`<span class="climaKind230">🚚</span> Flota ${sx(fleet(t)||'-')} / 📦 Emb. ${sx(embVal(t)||'-')}`; const left=kv('Chofer',driver(t)||'-')+kv('Cliente',r.cliente||'-'); const mid=kv('Ubicación actual',locx(t)||'-')+kv('Origen',r.origen||'-')+kv('Destino',r.destino||'-')+kv('Último GPS',dtx(gpsTime(t))); const bottom=kv('Inicio',dtx(startTime(t)))+kv('Estado GPS',c?'Reportando':'Sin coordenadas')+kv('ETA',etaVal(t))+kv('Distancia restante',distVal(t))+kv('Próximo hito',hitoVal(t)); out.push(card('climaFleet230',title,left,mid,w,bottom));} el.innerHTML=out.join('');}
  async function renderPass(show,force=false){const el=document.getElementById('weatherPasses'); if(!el)return; if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando fuente oficial del Paso Los Libertadores...</div>'; const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'}; const [w,p]=await Promise.all([fetchWeather(paso,force),fetchPasoOfficial(force)]); const status=`<div class="climaPassStatus230 pass-${p.type}">${sx(p.status)}</div>`; const left=kv('Fuente',p.source)+kv('Actualización',p.updated); const mid=kv('Ubicación','Argentina / Chile')+kv('Estado',p.status)+(p.url?`<div class="climaKv230"><b>Oficial:</b> <a href="${sx(p.url)}" target="_blank" rel="noopener">ver fuente</a></div>`:''); const bottom=kv('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm')); el.innerHTML=card('climaPass230','Paso Los Libertadores',left,mid,w,bottom,`pass-${p.type}`,status);}
  async function renderDests(list,force=false){const el=document.getElementById('weatherDestinations'); if(!el)return; if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>'; const out=[]; for(const d of list){const c=coords(d); const w=await fetchWeather(c,force); const ubi=[destinoLocalidad(d),destinoPais(d)].filter(x=>x&&x!=='-').join(', ')||'-'; const title=`<span class="climaKind230">📍</span> ${sx(destinationName(d))}`; const left=kv('Ubicación',ubi); const mid=kv('Destino',destinationName(d))+kv('País',destinoPais(d)||'-')+kv('Actualizado',dtx(new Date().toISOString())); const bottom=kv('Lluvia',(w.rain??'-')+(w.rain==='-'?'':' mm')); out.push(card('climaDest230',title,left,mid,w,bottom));} el.innerHTML=out.join('');}

  window.renderClima=async function(force=false){syncEmbFilter(); const list=filteredTransits(); const destList=destinationsFor(list); const showPass=!selectedEmb() || requiresLibertadores(list,destList); await renderFleets(list,force); await renderPass(showPass,force); await renderDests(destList,force);};
  window.ensureClimaDataAndRender=async function(force=false){try{if(force || !Array.isArray(arr('trs')) || arr('trs').length===0){[window.trs,window.users,window.clientes,window.origenes,window.destinos,window.embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}catch(e){console.warn('No se pudieron cargar datos clima',e);} await window.renderClima(force);};
  window.forceRefreshClima=async function(){window.ELTA_WEATHER_CACHE={}; window.ELTA_PASO_CACHE=null; const btn=document.querySelector('#clima .climaRefreshBtn226'); const old=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Actualizando...';} try{await window.ensureClimaDataAndRender(true);}finally{if(btn){btn.disabled=false;btn.textContent=old||'Actualizar';}}};
  function wire(){document.querySelectorAll('#clima .climaRefreshBtn226').forEach(b=>{b.onclick=(ev)=>{ev.preventDefault(); window.forceRefreshClima();};});}
  document.addEventListener('DOMContentLoaded',()=>{updateVersion();wire(); if(document.getElementById('clima')?.classList.contains('active')) window.ensureClimaDataAndRender();});
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); wire(); if(id==='clima') window.ensureClimaDataAndRender();};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) await window.renderClima(); return r;};
})();

/* ===== V2.0.150 - SOLO vista Clima: reorganizacion final compacta + paso oficial bajo demanda ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const arr=(name)=>{try{return Array.isArray(window[name])?window[name]:[];}catch(e){return [];}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.closed||t?.finalizado||/final/i.test(String(t?.estado||'')));}catch(e){return true;}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};
  const startTime=(t)=>{try{return t?.inicio||t?.start?.time||t?.start||'-';}catch(e){return '-';}};
  const coords=(o)=>{try{if(typeof coordsFromObjClima==='function')return coordsFromObjClima(o);let lat=o?.lat||o?.latitude||o?.latitud,lng=o?.lng||o?.lon||o?.longitude||o?.longitud;if(lat&&lng)return{lat:Number(lat),lng:Number(lng)};let s=String(o?.ubicacion||o?.coordenadas||o?.coords||'');let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);return m?{lat:Number(m[1]),lng:Number(m[2])}:null;}catch(e){return null;}};
  const lastCoords=(t)=>{try{return typeof lastGpsCoords==='function'?lastGpsCoords(t):(coords(t)||coords(typeof lastU==='function'?(lastU(t)||{}):{}));}catch(e){return coords(t);}};

  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function openTransitList(){return arr('trs').filter(isOpen);}
  function syncEmbFilter(){
    const sel=document.getElementById('climaEmbarqueFilter'); if(!sel)return;
    const cur=sel.value;
    const opts=[...new Set(openTransitList().map(embVal).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join('');
    sel.value=opts.includes(cur)?cur:'';
  }
  function filteredTransits(){const emb=selectedEmb(); const list=openTransitList(); return emb?list.filter(t=>embVal(t)===emb):list;}

  function destinationName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destinoLocalidad(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destinoPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}
  function destinationMatchesRoute(d,r){const hay=[destinationName(d),destinoLocalidad(d),destinoPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | '); const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo].map(norm).filter(Boolean); return target.some(t=>t && hay && (hay.includes(t)||t.includes(hay.split(' | ')[0]||'__no__')));}
  function destinationsFor(list){const ds=arr('destinos'); if(!selectedEmb())return ds; const matches=[]; list.forEach(t=>{const r=route(t); const found=ds.filter(d=>destinationMatchesRoute(d,r)); if(found.length)matches.push(...found); else if(r?.destino)matches.push({nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});}); const seen=new Set(); return matches.filter(d=>{const k=norm(destinationName(d)+'|'+destinoLocalidad(d)+'|'+destinoPais(d)); if(seen.has(k))return false; seen.add(k); return true;});}
  function requiresLibertadores(list,ds){const txt=[...list.map(t=>route(t)?.destino),...ds.map(d=>[destinationName(d),destinoLocalidad(d),destinoPais(d)].join(' '))].join(' '); return /chile|stli|santiago|pudahuel|los libertadores|cristo redentor/i.test(txt);}

  function weatherCodeInfoLocal(code){
    if(typeof weatherCodeInfo==='function')return weatherCodeInfo(code);
    const c=Number(code);
    if(c===0)return ['☀️','Despejado'];
    if([1,2].includes(c))return ['🌤️','Parcialmente nublado'];
    if(c===3)return ['☁️','Nublado'];
    if([45,48].includes(c))return ['🌫️','Niebla'];
    if([51,53,55,56,57].includes(c))return ['🌦️','Llovizna'];
    if([61,63,65,66,67,80,81,82].includes(c))return ['🌧️','Lluvia'];
    if([71,73,75,77,85,86].includes(c))return ['🌨️','Nieve'];
    if([95,96,99].includes(c))return ['⛈️','Tormenta'];
    return ['🌦️','Clima'];
  }
  async function fetchWeather(c,force=false){
    if(!c)return {temp:'-',desc:'Sin datos',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️'};
    const key=`v231:${Number(c.lat).toFixed(4)},${Number(c.lng).toFixed(4)}`;
    window.ELTA_WEATHER_CACHE=window.ELTA_WEATHER_CACHE||{};
    if(!force && window.ELTA_WEATHER_CACHE[key] && Date.now()-window.ELTA_WEATHER_CACHE[key]._ts<10*60*1000)return window.ELTA_WEATHER_CACHE[key];
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,visibility,precipitation&timezone=auto`;
      const res=await fetch(url,{cache:'no-store'}); if(!res.ok)throw new Error('weather');
      const cur=(await res.json()).current||{}; const info=weatherCodeInfoLocal(cur.weather_code);
      const out={temp:cur.temperature_2m==null?'-':Math.round(cur.temperature_2m),sens:cur.apparent_temperature==null?'-':Math.round(cur.apparent_temperature),wind:cur.wind_speed_10m==null?'-':Math.round(cur.wind_speed_10m),hum:cur.relative_humidity_2m==null?'-':Math.round(cur.relative_humidity_2m),vis:cur.visibility==null?'-':Math.round(Number(cur.visibility)/1000),rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),icon:info[0],desc:info[1],_ts:Date.now()};
      window.ELTA_WEATHER_CACHE[key]=out; return out;
    }catch(e){return {temp:'-',desc:'Sin datos online',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️'};}
  }

  const pasoSources=[
    {name:'Complejo Los Libertadores',url:'https://ncfloslibertadores.cl/'},
    {name:'Unidad de Pasos Fronterizos Chile',url:'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/valparaiso/paso-sistema-cristo-redentor/'},
    {name:'Argentina - Pasos Internacionales',url:'https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/29/Sistema-Cristo-Redentor'}
  ];
  async function proxyFetchText(url){
    const endpoints=[`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,url];
    for(const ep of endpoints){try{const res=await fetch(ep,{cache:'no-store'}); if(res.ok){const txt=await res.text(); if(txt&&txt.length>80)return txt;}}catch(e){}}
    return '';
  }
  function cleanText(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
  function parsePasoStatus(html,src){
    const text=cleanText(html); const low=norm(text);
    let status='VERIFICAR FUENTE OFICIAL', type='warn';
    const pOpen=Math.max(low.lastIndexOf('habilitado'),low.lastIndexOf('abierto'),low.lastIndexOf('transito normal'),low.lastIndexOf('operativo'));
    const pClosed=Math.max(low.lastIndexOf('cerrado'),low.lastIndexOf('cierre'),low.lastIndexOf('suspendido'),low.lastIndexOf('inhabilitado'),low.lastIndexOf('no habilitado'));
    if(pClosed>=0 || pOpen>=0){ if(pOpen>pClosed){status='PASO HABILITADO'; type='open';} else {status='PASO CERRADO'; type='closed';} }
    let updated='Consulta online'; const m=text.match(/Actualizado\s*(?:hace|:)?\s*([^\.\|\n]{3,55})/i)||text.match(/(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i)||text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}[^\.]{0,25})/i);
    if(m)updated=m[1].trim();
    return {status,type,source:src.name,url:src.url,updated};
  }
  async function fetchPasoOfficial(force=false){
    window.ELTA_PASO_CACHE=window.ELTA_PASO_CACHE||null;
    if(!force && window.ELTA_PASO_CACHE && Date.now()-window.ELTA_PASO_CACHE._ts<30*60*1000)return window.ELTA_PASO_CACHE;
    for(const src of pasoSources){const txt=await proxyFetchText(src.url); if(txt){const p=parsePasoStatus(txt,src); if(p.status!=='VERIFICAR FUENTE OFICIAL'){p._ts=Date.now(); window.ELTA_PASO_CACHE=p; return p;}}}
    const out={status:'VERIFICAR FUENTE OFICIAL',type:'warn',source:'Sin acceso automático',url:'https://www.pasosfronterizos.gov.cl/',updated:'No disponible',_ts:Date.now()};
    window.ELTA_PASO_CACHE=out; return out;
  }

  function kv(label,val){return `<div class="climaKv231"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function wx(w){return `<div class="climaWx231"><div class="climaWxTop231"><span class="climaTemp231">${sx(w?.temp??'-')}°</span><span class="climaIcon231">${w?.icon||'🌦️'}</span></div><div class="climaDesc231">${sx(w?.desc||'Sin datos')}</div><div class="climaMetrics231">${kv('Sensación',(w?.sens??'-')+'°')}${kv('Viento',(w?.wind??'-')+' km/h')}${kv('Humedad',(w?.hum??'-')+(w?.hum==='-'?'':'%'))}${kv('Visibilidad',(w?.vis??'-')+(w?.vis==='-'?'':' km'))}</div></div>`;}
  function card(kind,title,left,mid,w,extraClass='',status=''){return `<article class="climaCard231 ${kind} ${extraClass}"><div class="climaRow231"><div class="climaLeft231"><h4>${title}</h4>${left||''}</div><div class="climaMid231">${status||''}${mid||''}</div>${wx(w)}</div></article>`;}

  async function renderFleets(list,force=false){
    const el=document.getElementById('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of list){
      const c=lastCoords(t); const w=await fetchWeather(c,force); const r=route(t);
      const title=`<span class="climaKind231">🚚</span> Flota ${sx(fleet(t)||'-')} <span class="climaSep231">/</span> <span class="climaEmb231">📦 Emb. ${sx(embVal(t)||'-')}</span>`;
      const left=kv('Chofer',driver(t)||'-')+kv('Embarque',embVal(t)||'-')+kv('Cliente',r.cliente||'-');
      const mid=kv('Ubicación actual',locx(t)||'-')+kv('Destino',r.destino||'-')+kv('Último GPS',dtx(gpsTime(t)))+kv('Inicio',dtx(startTime(t)));
      out.push(card('climaFleet231',title,left,mid,w));
    }
    el.innerHTML=out.join('');
  }
  async function renderPass(show,force=false){
    const el=document.getElementById('weatherPasses'); if(!el)return;
    if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando fuente oficial del Paso Los Libertadores...</div>';
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'}; const [w,p]=await Promise.all([fetchWeather(paso,force),fetchPasoOfficial(force)]);
    const status=`<div class="climaPassStatus231 pass-${p.type}">${sx(p.status)}</div>`;
    const left=kv('Fuente',p.source)+kv('Actualización',p.updated);
    const mid=kv('Ubicación','Argentina / Chile')+kv('Oficial',p.url?`<a href="${sx(p.url)}" target="_blank" rel="noopener">ver fuente</a>`:'-');
    el.innerHTML=card('climaPass231','Paso Los Libertadores',left,mid,w,`pass-${p.type}`,status);
  }
  async function renderDests(list,force=false){
    const el=document.getElementById('weatherDestinations'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>';
    const out=[];
    for(const d of list){const c=coords(d); const w=await fetchWeather(c,force); const ubi=[destinoLocalidad(d),destinoPais(d)].filter(x=>x&&x!=='-').join(', ')||'-'; const title=`<span class="climaKind231">📍</span> ${sx(destinationName(d))}`; const left=kv('Ubicación',ubi)+kv('Actualizado',dtx(new Date().toISOString())); const mid=kv('Destino',destinationName(d))+kv('País',destinoPais(d)||'-'); out.push(card('climaDest231',title,left,mid,w));}
    el.innerHTML=out.join('');
  }

  window.renderClima=async function(force=false){syncEmbFilter(); const list=filteredTransits(); const destList=destinationsFor(list); const showPass=!selectedEmb() || requiresLibertadores(list,destList); await renderFleets(list,force); await renderPass(showPass,force); await renderDests(destList,force);};
  window.ensureClimaDataAndRender=async function(force=false){try{if(force || !arr('trs').length){[window.trs,window.users,window.clientes,window.origenes,window.destinos,window.embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}catch(e){console.warn('No se pudieron cargar datos clima',e);} await window.renderClima(force);};
  window.forceRefreshClima=async function(){window.ELTA_WEATHER_CACHE={}; window.ELTA_PASO_CACHE=null; const btn=document.querySelector('#clima .climaRefreshBtn226'); const old=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Actualizando...';} try{await window.ensureClimaDataAndRender(true);}finally{if(btn){btn.disabled=false;btn.textContent=old||'Actualizar';}}};
  function wire(){document.querySelectorAll('#clima .climaRefreshBtn226').forEach(b=>{b.onclick=(ev)=>{ev.preventDefault(); window.forceRefreshClima();};}); const sel=document.getElementById('climaEmbarqueFilter'); if(sel)sel.onchange=()=>window.renderClima(false);}
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); wire(); if(document.getElementById('clima')?.classList.contains('active')) window.ensureClimaDataAndRender(false);});
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); wire(); if(id==='clima') window.ensureClimaDataAndRender(false);};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) await window.renderClima(false); return r;};
})();


/* ===== V2.0.150 - Clima: layout compacto definitivo y Paso con consulta online ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const norm=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const arr=(name)=>{try{return Array.isArray(window[name])?window[name]:[];}catch(e){return []}};
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.closed||t?.finalizado||/final/i.test(String(t?.estado||'')));}catch(e){return true;}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start||'-';}};
  const coords=(o)=>{try{if(typeof coordsFromObjClima==='function')return coordsFromObjClima(o);let lat=o?.lat||o?.latitude||o?.latitud,lng=o?.lng||o?.lon||o?.longitude||o?.longitud;if(lat&&lng)return{lat:Number(lat),lng:Number(lng),text:`${lat}, ${lng}`};let s=String(o?.ubicacion||o?.coordenadas||o?.coords||'');let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);return m?{lat:Number(m[1]),lng:Number(m[2]),text:`${m[1]}, ${m[2]}`}:null;}catch(e){return null;}};
  const lastCoords=(t)=>{try{return typeof lastGpsCoords==='function'?lastGpsCoords(t):(coords(typeof lastU==='function'?(lastU(t)||{}):{})||coords(t));}catch(e){return coords(t);}};

  function updateVersion(){document.querySelectorAll('span, small, p, div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);}});}
  function selectedEmb(){return document.getElementById('climaEmbarqueFilter')?.value || '';}
  function openTransitList(){return arr('trs').filter(isOpen);}
  function syncEmbFilter(){const sel=document.getElementById('climaEmbarqueFilter'); if(!sel)return; const cur=sel.value; const opts=[...new Set(openTransitList().map(embVal).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true})); sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join(''); sel.value=opts.includes(cur)?cur:'';}
  function filteredTransits(){const emb=selectedEmb(); const list=openTransitList(); return emb?list.filter(t=>embVal(t)===emb):list;}

  function destinationName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||'Destino';}}
  function destinoLocalidad(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||'-';}}
  function destinoPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||'-';}}
  function destinationMatchesRoute(d,r){const hay=[destinationName(d),destinoLocalidad(d),destinoPais(d),d?.codigo,d?.code,d?.id,d?.destino,d?.nombre].map(norm).filter(Boolean).join(' | '); const target=[r?.destino,r?.destinoNombre,r?.destinoCodigo].map(norm).filter(Boolean); return target.some(t=>t && hay && (hay.includes(t)||t.includes(hay.split(' | ')[0]||'__no__')));}
  function destinationsFor(list){const ds=arr('destinos'); if(!selectedEmb())return ds; const matches=[]; list.forEach(t=>{const r=route(t); const found=ds.filter(d=>destinationMatchesRoute(d,r)); if(found.length)matches.push(...found); else if(r?.destino)matches.push({nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});}); const seen=new Set(); return matches.filter(d=>{const k=norm(destinationName(d)+'|'+destinoLocalidad(d)+'|'+destinoPais(d)); if(seen.has(k))return false; seen.add(k); return true;});}
  function requiresLibertadores(list,ds){const txt=[...list.map(t=>route(t)?.destino),...ds.map(d=>[destinationName(d),destinoLocalidad(d),destinoPais(d)].join(' '))].join(' '); return /chile|stli|santiago|pudahuel|los libertadores|cristo redentor/i.test(txt);}

  function weatherCodeInfoLocal(code){if(typeof weatherCodeInfo==='function')return weatherCodeInfo(code); const c=Number(code); if(c===0)return ['☀️','Despejado']; if([1,2].includes(c))return ['🌤️','Parcialmente nublado']; if(c===3)return ['☁️','Nublado']; if([45,48].includes(c))return ['🌫️','Niebla']; if([51,53,55,56,57].includes(c))return ['🌦️','Llovizna']; if([61,63,65,66,67,80,81,82].includes(c))return ['🌧️','Lluvia']; if([71,73,75,77,85,86].includes(c))return ['🌨️','Nieve']; if([95,96,99].includes(c))return ['⛈️','Tormenta']; return ['🌦️','Clima'];}
  async function fetchWeather(c,force=false){
    if(!c)return {temp:'-',desc:'Sin datos',wind:'-',vis:'-',rain:'-',icon:'☁️'};
    const key=`v232:${Number(c.lat).toFixed(4)},${Number(c.lng).toFixed(4)}`; window.ELTA_WEATHER_CACHE=window.ELTA_WEATHER_CACHE||{};
    if(!force && window.ELTA_WEATHER_CACHE[key] && Date.now()-window.ELTA_WEATHER_CACHE[key]._ts<10*60*1000)return window.ELTA_WEATHER_CACHE[key];
    try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lng)}&current=temperature_2m,weather_code,wind_speed_10m,visibility,precipitation&timezone=auto`; const res=await fetch(url,{cache:'no-store'}); if(!res.ok)throw new Error('weather'); const cur=(await res.json()).current||{}; const info=weatherCodeInfoLocal(cur.weather_code); const out={temp:cur.temperature_2m==null?'-':Math.round(cur.temperature_2m),wind:cur.wind_speed_10m==null?'-':Math.round(cur.wind_speed_10m),vis:cur.visibility==null?'-':Math.round(Number(cur.visibility)/1000),rain:cur.precipitation==null?'-':Number(cur.precipitation).toFixed(1),icon:info[0],desc:info[1],_ts:Date.now()}; window.ELTA_WEATHER_CACHE[key]=out; return out;}catch(e){return {temp:'-',desc:'Sin datos online',wind:'-',vis:'-',rain:'-',icon:'☁️'};}
  }

  const pasoSources=[
    {name:'Complejo Los Libertadores',url:'https://ncfloslibertadores.cl/'},
    {name:'Unidad de Pasos Fronterizos Chile',url:'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/valparaiso/paso-sistema-cristo-redentor/'},
    {name:'Argentina - Pasos Internacionales',url:'https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/29/Sistema-Cristo-Redentor'},
    {name:'PasosFronterizos',url:'https://pasosfronterizos.com/paso-los-libertadores.php'}
  ];
  async function proxyFetchText(url){const endpoints=[`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,`https://r.jina.ai/http://r.jina.ai/http://invalid`,url]; for(const ep of endpoints){if(ep.includes('invalid'))continue; try{const res=await fetch(ep,{cache:'no-store'}); if(res.ok){const txt=await res.text(); if(txt&&txt.length>80)return txt;}}catch(e){}} return '';}
  function cleanText(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
  function parsePasoStatus(html,src){const text=cleanText(html); const low=norm(text); let status='VERIFICAR FUENTE OFICIAL', type='warn'; const pOpen=Math.max(low.lastIndexOf('habilitado'),low.lastIndexOf('abierto'),low.lastIndexOf('transito normal'),low.lastIndexOf('operativo')); const pClosed=Math.max(low.lastIndexOf('cerrado'),low.lastIndexOf('cierre'),low.lastIndexOf('suspendido'),low.lastIndexOf('inhabilitado'),low.lastIndexOf('no habilitado')); if(pClosed>=0||pOpen>=0){if(pOpen>pClosed){status='PASO HABILITADO';type='open';}else{status='PASO CERRADO';type='closed';}} let updated='Consulta online'; const m=text.match(/Actualizado\s*(?:hace|:)?\s*([^\.\|\n]{3,55})/i)||text.match(/(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i)||text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}[^\.]{0,25})/i); if(m)updated=m[1].trim(); return {status,type,source:src.name,url:src.url,updated};}
  async function fetchPasoOfficial(force=false){window.ELTA_PASO_CACHE=window.ELTA_PASO_CACHE||null; if(!force&&window.ELTA_PASO_CACHE&&Date.now()-window.ELTA_PASO_CACHE._ts<30*60*1000)return window.ELTA_PASO_CACHE; for(const src of pasoSources){const txt=await proxyFetchText(src.url); if(txt){const p=parsePasoStatus(txt,src); if(p.status!=='VERIFICAR FUENTE OFICIAL'){p._ts=Date.now(); window.ELTA_PASO_CACHE=p; return p;}}} const out={status:'VERIFICAR FUENTE OFICIAL',type:'warn',source:'Sin acceso automático',url:'https://www.pasosfronterizos.gov.cl/',updated:'No disponible',_ts:Date.now()}; window.ELTA_PASO_CACHE=out; return out;}

  function kv(label,val){return `<div class="climaKv232"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function wx(w){return `<div class="climaWx232"><div class="climaWxTop232"><span class="climaTemp232">${sx(w?.temp??'-')}°</span><span class="climaIcon232">${w?.icon||'🌦️'}</span></div><div class="climaDesc232">${sx(w?.desc||'Sin datos')}</div><div class="climaMetrics232">${kv('Viento',(w?.wind??'-')+' km/h')}${kv('Visibilidad',(w?.vis??'-')+(w?.vis==='-'?'':' km'))}</div></div>`;}
  function fleetCard(title,left,mid,w){return `<article class="climaCard232 climaFleet232"><div class="climaGrid232"><div class="climaLeft232"><h4>${title}</h4>${left}</div><div class="climaMid232">${mid}</div>${wx(w)}</div></article>`;}
  function sideCard(kind,title,left,w,extraClass='',status=''){return `<article class="climaCard232 ${kind} ${extraClass}"><div class="climaSideGrid232"><div class="climaLeft232"><h4>${title}</h4>${status||''}${left||''}</div>${wx(w)}</div></article>`;}

  async function renderFleets(list,force=false){const el=document.getElementById('weatherFleets'); if(!el)return; if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>'; const out=[]; for(const t of list){const c=lastCoords(t); const w=await fetchWeather(c,force); const r=route(t); const title=`<span class="climaKind232">🚚</span> Flota ${sx(fleet(t)||'-')} <span class="climaSep232">/</span> <span class="climaEmb232">📦 Emb. ${sx(embVal(t)||'-')}</span>`; const left=kv('Chofer',driver(t)||'-')+kv('Embarque',embVal(t)||'-')+kv('Cliente',r.cliente||'-'); const mid=kv('Ubicación actual',locx(t)||'-')+kv('Destino',r.destino||'-')+kv('Último GPS',dtx(gpsTime(t)))+kv('Actualizado',dtx(new Date().toISOString())); out.push(fleetCard(title,left,mid,w));} el.innerHTML=out.join('');}
  async function renderPass(show,force=false){const el=document.getElementById('weatherPasses'); if(!el)return; if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando fuente oficial del Paso Los Libertadores...</div>'; const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'}; const [w,p]=await Promise.all([fetchWeather(paso,force),fetchPasoOfficial(force)]); const status=`<div class="climaPassStatus232 pass-${p.type}">${sx(p.status)}</div>`; const left=kv('Fuente',p.source)+kv('Actualización',p.updated)+kv('Ubicación','Argentina / Chile')+(p.url?`<div class="climaKv232"><b>Oficial:</b> <a href="${sx(p.url)}" target="_blank" rel="noopener">ver fuente</a></div>`:''); el.innerHTML=sideCard('climaPass232','Paso Los Libertadores',left,w,`pass-${p.type}`,status);}
  async function renderDests(list,force=false){const el=document.getElementById('weatherDestinations'); if(!el)return; if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destinos registrados.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>'; const out=[]; for(const d of list){const c=coords(d); const w=await fetchWeather(c,force); const ubi=[destinoLocalidad(d),destinoPais(d)].filter(x=>x&&x!=='-').join(', ')||'-'; const title=`<span class="climaKind232">📍</span> ${sx(destinationName(d))}`; const left=kv('Ubicación',ubi)+kv('Actualizado',dtx(new Date().toISOString())); out.push(sideCard('climaDest232',title,left,w));} el.innerHTML=out.join('');}

  window.renderClima=async function(force=false){syncEmbFilter(); const list=filteredTransits(); const destList=destinationsFor(list); const showPass=!selectedEmb()||requiresLibertadores(list,destList); await renderFleets(list,force); await renderPass(showPass,force); await renderDests(destList,force);};
  window.ensureClimaDataAndRender=async function(force=false){try{if(force||!arr('trs').length){[window.trs,window.users,window.clientes,window.origenes,window.destinos,window.embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);}}catch(e){console.warn('No se pudieron cargar datos clima',e);} await window.renderClima(force);};
  window.forceRefreshClima=async function(){window.ELTA_WEATHER_CACHE={}; window.ELTA_PASO_CACHE=null; const btn=document.querySelector('#clima .climaRefreshBtn226'); const old=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Actualizando...';} try{await window.ensureClimaDataAndRender(true);}finally{if(btn){btn.disabled=false;btn.textContent=old||'Actualizar';}}};
  function wire(){document.querySelectorAll('#clima .climaRefreshBtn226').forEach(b=>{b.onclick=(ev)=>{ev.preventDefault(); window.forceRefreshClima();};}); const sel=document.getElementById('climaEmbarqueFilter'); if(sel)sel.onchange=()=>window.renderClima(false)}
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); wire(); if(document.getElementById('clima')?.classList.contains('active')) window.ensureClimaDataAndRender(false);});
  const oldTab=window.tab; if(typeof oldTab==='function') window.tab=function(id){oldTab.apply(this,arguments); updateVersion(); wire(); if(id==='clima') window.ensureClimaDataAndRender(false);};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function') window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(document.getElementById('clima')?.classList.contains('active')) await window.renderClima(false); return r;};
})();


/* ===== V2.0.150 - Vista Alertas: resumen con graficos + tabla compacta funcional ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  function $id(id){return document.getElementById(id);} 
  function safe(v){try{return typeof esc==='function'?esc(v):String(v??'-').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}catch(e){return String(v??'-');}}
  function fleetNo(t){try{return (typeof flota==='function'?flota(t):(t.flota||t.fleet||t.unidad||t.numero))||'-';}catch(e){return t?.flota||'-';}}
  function getRoute(t){try{return typeof route==='function'?(route(t)||{}):(t.route||{});}catch(e){return {};}}
  function driver(t){try{return (typeof driverName==='function'?driverName(t):typeof driver==='function'?driver(t):(t.chofer||t.driver||t.conductor))||'-';}catch(e){return t?.chofer||'-';}}
  function isOpen(t){try{return typeof openT==='function'?openT(t):!(String(t.estado||t.status||'').toLowerCase().includes('final'));}catch(e){return true;}}
  function fmtDate(v){try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}}
  function alertType(a){try{return typeof alertTipo==='function'?alertTipo(a):String(a.tipo||a.type||a.motivo||a.nombre||'Alerta');}catch(e){return 'Alerta';}}
  function alertKmV(a){try{return typeof alertKmValue==='function'?alertKmValue(a):String(a.km||a.kilometro||a.kilómetro||a.kmRuta||a.progresiva||'-');}catch(e){return '-';}}
  function alertDateV(a){try{return typeof alertDateValue==='function'?alertDateValue(a):fmtDate(a.time||a.fecha||a.createdAt||a.ts);}catch(e){return fmtDate(a?.fecha);}}
  function alertLocV(a,t){try{return typeof alertLocationValue==='function'?alertLocationValue(a,t):(a.localidad||a.ubicacionTexto||t.localidad||'-');}catch(e){return '-';}}
  function alertKey(t,a,idx){
    try{ if(typeof alertId==='function') return alertId(t,a,idx); }catch(e){}
    return String(a.id||a.alertaId||`${t.embarque||''}_${fleetNo(t)}_${alertType(a)}_${a.time||a.fecha||a.createdAt||a.ts||idx}`);
  }
  function iconForAlert(type){
    const s=String(type||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(s.includes('niebla'))return '🌫️';
    if(s.includes('accidente')||s.includes('choque')||s.includes('siniestro'))return '🚨';
    if(s.includes('rotura')||s.includes('mecan')||s.includes('averia'))return '🔧';
    if(s.includes('aduana')||s.includes('frontera')||s.includes('ingreso'))return '🛃';
    if(s.includes('control')||s.includes('carga'))return '📦';
    if(s.includes('corte')||s.includes('ruta'))return '🚧';
    if(s.includes('gps')||s.includes('reporte'))return '📡';
    if(s.includes('clima')||s.includes('lluvia')||s.includes('viento')||s.includes('nieve'))return '⛈️';
    return '⚠️';
  }
  function getStore(){try{return JSON.parse(localStorage.getItem('eltaAlertasVerificadas')||'{}');}catch(e){return {};}}
  function setStore(s){try{localStorage.setItem('eltaAlertasVerificadas',JSON.stringify(s||{}));}catch(e){}}
  function verified(t,a,idx){
    try{ if(typeof isAlertVerified==='function') return isAlertVerified(t,a,idx); }catch(e){}
    const st=getStore(); const id=alertKey(t,a,idx);
    return a.verificada===true||a.vista===true||a.verificado===true||st[id]?.verificada===true;
  }
  window.__alertRowsById = {};
  window.verifyAlertV234 = function(id){
    const row=window.__alertRowsById[id];
    const st=getStore();
    st[id]={verificada:true,por:(window.currentUser?.user||window.currentUser?.nombre||'admin'),fecha:new Date().toISOString()};
    setStore(st);
    if(row && row.a){ row.a.verificada=true; row.a.verificadaFecha=st[id].fecha; }
    try{ if(typeof renderAlerts==='function') renderAlerts(); }catch(e){}
    try{ if(typeof renderBadge==='function') renderBadge(); }catch(e){}
    try{ if(typeof renderDashAlerts==='function') renderDashAlerts(); }catch(e){}
  };

  function baseRows(){
    const source=Array.isArray(window.trs)?window.trs:(typeof trs!=='undefined'?trs:[]);
    let rows=[];
    source.filter(isOpen).forEach(t=>{
      (t.alerts||[]).forEach((a,idx)=>{
        const id=alertKey(t,a,idx);
        const r={id,t,a,idx,verified:verified(t,a,idx)};
        window.__alertRowsById[id]=r;
        rows.push(r);
      });
    });
    return rows.sort((x,y)=>{
      try{return (typeof tv==='function'?tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts):Date.parse(y.a.time||y.a.fecha||0))-(typeof tv==='function'?tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts):Date.parse(x.a.time||x.a.fecha||0));}
      catch(e){return 0;}
    });
  }
  function filteredRows(){
    const mode=window.alertFilterMode||'pendientes';
    return baseRows().filter(r=> mode==='todas' || (mode==='pendientes'&&!r.verified) || (mode==='verificadas'&&r.verified));
  }
  function countBy(rows,fn){const m={}; rows.forEach(r=>{const k=fn(r)||'-'; m[k]=(m[k]||0)+1;}); return m;}
  function totalCount(m){return Object.values(m).reduce((a,b)=>a+b,0);}
  function chartCard(title, counts){
    const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const total=totalCount(counts); const max=Math.max(1,...entries.map(e=>e[1]));
    return `<div class="alertChart234">
      <div class="alertChartHead234">${safe(title)}</div>
      <div class="alertChartNums234"><div><strong>${total}</strong><span>Total</span></div><div><strong>${entries.length}</strong><span>Categorías</span></div></div>
      <div class="alertBars234">${entries.length?entries.map(([k,v])=>{
        const pct=total?Math.round(v*100/total):0;
        const icon= title.toLowerCase().includes('tipo') ? iconForAlert(k)+' ' : '';
        return `<div class="alertBar234"><span class="alertBarName234" title="${safe(k)}">${icon}${safe(k)}</span><i><b style="width:${Math.max(6,Math.round(v/max*100))}%"></b></i><em>${v} | ${pct}%</em></div>`;
      }).join(''):'<div class="alertEmpty234">Sin datos.</div>'}</div>
    </div>`;
  }
  function renderAlertChartsV234(rows){
    const el=$id('alertCharts'); if(!el)return;
    const control=rows.filter(r=>/control|carga/i.test(alertType(r.a)));
    el.innerHTML=[
      chartCard('Tipo de alertas', countBy(rows,r=>alertType(r.a))),
      chartCard('Alertas por flota', countBy(rows,r=>`Flota ${fleetNo(r.t)}`)),
      chartCard('Alertas por embarque', countBy(rows,r=>`Emb. ${r.t.embarque||'-'}`)),
      chartCard('Control de carga por flota', countBy(control,r=>`Flota ${fleetNo(r.t)}`))
    ].join('');
  }
  function latestSummary(rows){
    const r=rows[0];
    if(!r)return '<span class="alertSummaryText234">Sin alertas para mostrar.</span>';
    const t=r.t,a=r.a,rt=getRoute(t),tipo=alertType(a);
    return `<span class="alertSummaryText234">${iconForAlert(tipo)} ${safe(tipo)} · Emb. ${safe(t.embarque||'-')} · Flota ${safe(fleetNo(t))} · Km ${safe(alertKmV(a))} · ${alertDateV(a)}</span>`;
  }
  function renderAlertTableV234(rows){
    const el=$id('alertCards'); if(!el)return;
    const all=baseRows();
    const summaryRows=rows.length?rows:all;
    const head=['Alerta','Flota','Embarque','Km','Fecha/hora','Localidad','Chofer','Destino','Cliente','Acción'];
    const body=rows.map(r=>{
      const t=r.t,a=r.a,rt=getRoute(t),tipo=alertType(a),ic=iconForAlert(tipo);
      const btn=r.verified
        ? `<span class="alertVerified234">Verificada</span>`
        : `<button class="alertVerify234" onclick="verifyAlertV234('${String(r.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">Verificar</button>`;
      return `<div class="alertRow234">
        <div class="alertCellType234 clip234"><span class="typeIcon234">${ic}</span><b>${safe(tipo)}</b></div>
        <div class="clip234">${safe(fleetNo(t))}</div>
        <div class="clip234">${safe(t.embarque||'-')}</div>
        <div class="clip234">${safe(alertKmV(a))}</div>
        <div class="clip234">${alertDateV(a)}</div>
        <div class="clip234" title="${safe(alertLocV(a,t))}">${safe(alertLocV(a,t))}</div>
        <div class="clip234" title="${safe(driver(t))}">${safe(driver(t))}</div>
        <div class="clip234" title="${safe(rt.destino||'-')}">${safe(rt.destino||'-')}</div>
        <div class="clip234" title="${safe(rt.cliente||'-')}">${safe(rt.cliente||'-')}</div>
        <div class="alertAction234">${btn}</div>
      </div>`;
    }).join('');
    el.innerHTML=`<div class="alertSummary234">
        <div><h3>⚠️ Últimas alertas</h3>${latestSummary(summaryRows)}</div>
      </div>
      <div class="alertTable234">
        <div class="alertHeader234">${head.map(h=>`<div>${h}</div>`).join('')}</div>
        ${body||'<div class="alertEmpty234">No hay alertas para el filtro seleccionado.</div>'}
        <div class="alertFooter234">Mostrando ${rows.length} de ${all.length} alerta${all.length===1?'':'s'}</div>
      </div>`;
  }
  window.renderAlerts=function(){
    document.querySelectorAll('.alertFilters button').forEach(b=>b.classList.toggle('active', b.dataset.alertFilter===(window.alertFilterMode||'pendientes')));
    window.__alertRowsById={};
    const rows=filteredRows();
    renderAlertChartsV234(rows);
    renderAlertTableV234(rows);
  };
  window.setAlertFilter=function(mode){window.alertFilterMode=mode||'pendientes'; window.renderAlerts();};

  function setVersionText(){document.querySelectorAll('span,small,p,div').forEach(el=>{if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,`Versión ${VERSION}`);});}
  document.addEventListener('DOMContentLoaded',()=>{setVersionText(); if(document.getElementById('alertas')?.classList.contains('active')) window.renderAlerts();});
  const oldTab234=window.tab;
  if(typeof oldTab234==='function') window.tab=function(id){oldTab234.apply(this,arguments); setVersionText(); if(id==='alertas') window.renderAlerts();};
})();

/* ===== V2.0.150 - Alertas: graficos en una linea, campana completa, contador funcional ===== */
(function(){
  const VERSION_ALERTS_2035 = "2.0.150";
  const $ = (id)=>document.getElementById(id);
  const esc2 = (v)=>{ try { return typeof esc === 'function' ? esc(v) : String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); } catch(e){ return String(v ?? ''); } };
  const clean = (v)=>String(v ?? '').trim() || '-';
  const dt = (v)=>{ try { return typeof fd === 'function' ? fd(v) : (v ? String(v) : '-'); } catch(e){ return v ? String(v) : '-'; } };
  const tval = (v)=>{ try { return typeof tv === 'function' ? tv(v) : (Date.parse(v||0)||0); } catch(e){ return 0; } };
  const fleetNo35 = (t)=>{ try { return clean(typeof flota === 'function' ? flota(t) : (t.flota||t.fleet||t.unidad)); } catch(e){ return '-'; } };
  const route35 = (t)=>{ try { return typeof ruta === 'function' ? (ruta(t)||{}) : (t.ruta||{}); } catch(e){ return t.ruta||{}; } };
  const driver35 = (t)=> clean(t.chofer || t.driver || t.conductor || t.driverName || t.choferNombre || (typeof driverName==='function' ? driverName(t) : ''));
  const isOpen35 = (t)=>{ try { return typeof openT === 'function' ? openT(t) : String(t.estado||t.status||'').toLowerCase() !== 'finalizado'; } catch(e){ return true; } };
  const type35 = (a)=> clean(a.tipo || a.type || a.motivo || a.nombre || 'Alerta');
  const icon35 = (type)=>{
    const s=String(type||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(s.includes('niebla'))return '🌫️';
    if(s.includes('rotura')||s.includes('averia')||s.includes('mecan'))return '🔧';
    if(s.includes('accidente')||s.includes('choque')||s.includes('siniestro'))return '🚨';
    if(s.includes('control')||s.includes('carga'))return '📦';
    if(s.includes('aduana')||s.includes('frontera')||s.includes('ingreso'))return '🛃';
    if(s.includes('corte')||s.includes('ruta'))return '🚧';
    if(s.includes('gps')||s.includes('senal')||s.includes('señal'))return '📡';
    if(s.includes('clima')||s.includes('lluvia')||s.includes('viento')||s.includes('nieve'))return '⛈️';
    return '⚠️';
  };
  const km35 = (a)=> clean(a.km ?? a.kilometro ?? a.kilómetro ?? a.kmRuta ?? a.progresiva ?? '-');
  const date35 = (a)=> dt(a.time || a.fecha || a.createdAt || a.ts);
  const loc35 = (a,t)=>{ try { if(typeof alertLoc === 'function') return clean(alertLoc(a,t)); } catch(e){} const g=a.gps||a.ubicacion||a.posicion||a.location||{}; return clean(a.localidad||a.ubicacionTexto||g.localidad||g.ubicacionTexto||t.localidad||t.ubicacion||'-'); };
  const id35 = (t,a,idx)=> String(a.id || a.alertaId || `${t.embarque||''}_${fleetNo35(t)}_${type35(a)}_${a.time||a.fecha||a.createdAt||a.ts||idx}`);
  function getStore35(){ try { return JSON.parse(localStorage.getItem('eltaAlertasVerificadas')||'{}'); } catch(e){ return {}; } }
  function setStore35(s){ try { localStorage.setItem('eltaAlertasVerificadas', JSON.stringify(s||{})); } catch(e){} }
  function isVerified35(t,a,idx){ const st=getStore35(), id=id35(t,a,idx); return a.verificada===true || a.vista===true || a.verificado===true || st[id]?.verificada===true; }
  function allOpenAlertRows35(){
    const source = Array.isArray(window.trs) ? window.trs : (typeof trs !== 'undefined' && Array.isArray(trs) ? trs : []);
    const rows=[]; window.__alertRowsById = {};
    source.filter(isOpen35).forEach(t => (t.alerts||[]).forEach((a,idx)=>{
      const id=id35(t,a,idx); const r={id,t,a,idx,verified:isVerified35(t,a,idx)}; rows.push(r); window.__alertRowsById[id]=r;
    }));
    return rows.sort((x,y)=>tval(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tval(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  }
  function filteredRows35(){
    const mode=window.alertFilterMode||'pendientes';
    return allOpenAlertRows35().filter(r => mode==='todas' || (mode==='pendientes' && !r.verified) || (mode==='verificadas' && r.verified));
  }
  function pendingCount35(){ return allOpenAlertRows35().filter(r=>!r.verified).length; }
  window.pendingAlertsCount = pendingCount35;
  window.verifyAlertV234 = window.markAlertVerifiedById = function(id){
    const st=getStore35();
    st[id]={verificada:true, por:(window.currentUser?.user||window.currentUser?.nombre||'admin'), fecha:new Date().toISOString()};
    setStore35(st);
    const r=(window.__alertRowsById||{})[id];
    if(r && r.a){ r.a.verificada=true; r.a.verificadaFecha=st[id].fecha; }
    try{ window.renderAlerts && window.renderAlerts(); }catch(e){}
    try{ window.renderBadge && window.renderBadge(); }catch(e){}
    try{ if(typeof renderDash === 'function') renderDash(); }catch(e){}
  };
  function setCounter35(){
    const n=pendingCount35();
    ['kal','headerAlertCount','alertCount','badgeAlertas'].forEach(id=>{const el=$(id); if(el)el.textContent=n;});
    document.querySelectorAll('.badgeCount,.alertBadge,.topAlertCount,.bellCount,.notificationCount,.notifCount,[data-alert-count],[data-badge="alertas"]').forEach(el=>el.textContent=n);
    document.querySelectorAll('.alertBell,.miniPill.alertBell').forEach(el=>{
      el.classList.toggle('bellBlink', n>0);
      el.classList.toggle('alertBellActive35', n>0);
      const span=el.querySelector('span,#headerAlertCount'); if(span)span.textContent=n;
    });
  }
  window.renderBadge = setCounter35;
  const countBy35=(rows,fn)=>{const m={}; rows.forEach(r=>{const k=clean(fn(r)); m[k]=(m[k]||0)+1;}); return m;};
  const total35=(m)=>Object.values(m).reduce((a,b)=>a+b,0);
  function chart35(title, counts, iconMode){
    const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total=total35(counts); const max=Math.max(1,...entries.map(e=>e[1]));
    return `<div class="alertChart35"><div class="alertChartTitle35">${esc2(title)}</div>
      <div class="alertChartNums35"><div><strong>${total}</strong><span>Total</span></div><div><strong>${entries.length}</strong><span>Categorías</span></div></div>
      <div class="alertBars35">${entries.length?entries.map(([k,v])=>{const pct=total?Math.round(v*100/total):0;return `<div class="alertBar35"><span class="alertBarName35" title="${esc2(k)}">${iconMode?icon35(k)+' ':''}${esc2(k)}</span><i><b style="width:${Math.max(6,Math.round(v/max*100))}%"></b></i><em>${v} | ${pct}%</em></div>`;}).join(''):'<div class="alertEmpty234">Sin datos.</div>'}</div>
    </div>`;
  }
  function renderCharts35(rows){
    const el=$('alertCharts'); if(!el)return;
    const control=rows.filter(r=>/control|carga/i.test(type35(r.a)));
    el.innerHTML=[
      chart35('Tipo de alertas', countBy35(rows,r=>type35(r.a)), true),
      chart35('Alertas por flota', countBy35(rows,r=>`Flota ${fleetNo35(r.t)}`)),
      chart35('Alertas por embarque', countBy35(rows,r=>`Emb. ${r.t.embarque||'-'}`)),
      chart35('Control de carga por flota', countBy35(control,r=>`Flota ${fleetNo35(r.t)}`))
    ].join('');
  }
  function summary35(rows){
    const r=rows[0];
    if(!r)return '<span class="alertSummaryText35">Sin alertas para mostrar.</span>';
    const tipo=type35(r.a);
    return `<span class="alertSummaryText35">${icon35(tipo)} ${esc2(tipo)} · Emb. ${esc2(r.t.embarque||'-')} · Flota ${esc2(fleetNo35(r.t))} · Km ${esc2(km35(r.a))} · ${date35(r.a)}</span>`;
  }
  function renderTable35(rows){
    const el=$('alertCards'); if(!el)return;
    const all=allOpenAlertRows35();
    const summaryRows=rows.length?rows:all;
    const head=['Alerta','Flota','Embarque','Km','Fecha/hora','Localidad','Chofer','Destino','Cliente','Acción'];
    const body=rows.map(r=>{
      const t=r.t,a=r.a,rt=route35(t),tipo=type35(a),ic=icon35(tipo);
      const btn=r.verified ? `<span class="alertVerified35">Verificada</span>` : `<button class="alertVerify35" onclick="verifyAlertV234('${String(r.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">Verificar</button>`;
      return `<div class="alertRow35">
        <div class="alertTypeCell35" title="${esc2(tipo)}"><span>${ic}</span><b>${esc2(tipo)}</b></div>
        <div class="clip35">${esc2(fleetNo35(t))}</div>
        <div class="clip35">${esc2(t.embarque||'-')}</div>
        <div class="clip35">${esc2(km35(a))}</div>
        <div class="clip35">${date35(a)}</div>
        <div class="clip35" title="${esc2(loc35(a,t))}">${esc2(loc35(a,t))}</div>
        <div class="clip35" title="${esc2(driver35(t))}">${esc2(driver35(t))}</div>
        <div class="clip35" title="${esc2(rt.destino||'-')}">${esc2(rt.destino||'-')}</div>
        <div class="clip35" title="${esc2(rt.cliente||'-')}">${esc2(rt.cliente||'-')}</div>
        <div class="alertAction35">${btn}</div>
      </div>`;
    }).join('');
    el.innerHTML=`<div class="alertSummary35"><h3>⚠️ Últimas alertas</h3>${summary35(summaryRows)}</div>
      <div class="alertTable35"><div class="alertHeader35">${head.map(h=>`<div>${h}</div>`).join('')}</div>${body||'<div class="alertEmpty35">No hay alertas para el filtro seleccionado.</div>'}<div class="alertFooter35">Mostrando ${rows.length} de ${all.length} alerta${all.length===1?'':'s'}</div></div>`;
  }
  window.renderAlerts=function(){
    document.querySelectorAll('.alertFilters button').forEach(b=>b.classList.toggle('active', b.dataset.alertFilter===(window.alertFilterMode||'pendientes')));
    const rows=filteredRows35();
    renderCharts35(rows);
    renderTable35(rows);
    setCounter35();
  };
  window.setAlertFilter=function(mode){ window.alertFilterMode=mode||'pendientes'; window.renderAlerts(); };
  function setVersion35(){ document.querySelectorAll('span,small,p,div').forEach(el=>{ if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,`Versión ${VERSION_ALERTS_2035}`); }); }
  document.addEventListener('DOMContentLoaded',()=>{ setVersion35(); setCounter35(); if($('alertas')?.classList.contains('active')) window.renderAlerts(); });
  const oldTab35=window.tab;
  if(typeof oldTab35==='function') window.tab=function(id){ oldTab35.apply(this,arguments); setVersion35(); setCounter35(); if(id==='alertas') window.renderAlerts(); };
})();

/* ===== V2.0.150 - Menu lateral: badge y efecto de campana segun pendientes ===== */
(function(){
  function getPendingCount236(){
    try{
      if(typeof pendingAlertsCount==='function') return Number(pendingAlertsCount())||0;
    }catch(e){}
    try{
      const h=document.getElementById('headerAlertCount');
      const n=parseInt((h&&h.textContent)||'0',10);
      return isNaN(n)?0:n;
    }catch(e){return 0;}
  }
  function ensureMenuAlertBadge236(){
    const btn=[...document.querySelectorAll('.sideNav button')].find(b=>String(b.getAttribute('onclick')||'').includes('alertas'));
    if(!btn) return null;
    if(!btn.querySelector('.sideAlertBadge')){
      const badge=document.createElement('span');
      badge.className='sideAlertBadge';
      badge.setAttribute('aria-label','Alertas pendientes');
      btn.appendChild(badge);
    }
    return btn;
  }
  function updateMenuAlertBadge236(){
    const btn=ensureMenuAlertBadge236();
    if(!btn) return;
    const n=getPendingCount236();
    const badge=btn.querySelector('.sideAlertBadge');
    if(badge) badge.textContent=String(n);
    btn.classList.toggle('menuAlertPending', n>0);
    const icon=btn.querySelector('.menuIcon');
    if(icon){
      icon.textContent='🔔';
      icon.classList.toggle('menuBellActive', n>0);
    }
  }
  const oldRenderBadge236=window.renderBadge;
  window.renderBadge=function(){
    try{ if(typeof oldRenderBadge236==='function') oldRenderBadge236.apply(this,arguments); }catch(e){}
    try{ updateMenuAlertBadge236(); }catch(e){}
  };
  const oldUpdateCounters236=window.updateAlertCountersV1250;
  if(typeof oldUpdateCounters236==='function'){
    window.updateAlertCountersV1250=function(){
      try{ oldUpdateCounters236.apply(this,arguments); }catch(e){}
      try{ updateMenuAlertBadge236(); }catch(e){}
    };
  }
  document.addEventListener('DOMContentLoaded',()=>{
    updateMenuAlertBadge236();
    setTimeout(updateMenuAlertBadge236,300);
    setTimeout(updateMenuAlertBadge236,1000);
    setInterval(updateMenuAlertBadge236,3000);
  });
  window.updateMenuAlertBadge236=updateMenuAlertBadge236;
})();


/* ===== V2.0.150 - Normalizacion final del menu lateral ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  const items=[
    ['dash','🏠','Torre de Control'],
    ['transitos','🚚','Tránsitos'],
    ['mapa','📍','Seguimiento'],
    ['clima','🌦️','Clima'],
    ['alertas','🔔','Alertas'],
    ['embarques','📦','Embarques'],
    ['entrega','🏁','Entregas'],
    ['unidades','🚛','Unidades / Choferes'],
    ['clientes','🏢','Clientes / Destinos'],
    ['abm','⚙️','Configuración']
  ];
  function setVersion(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function normalizeSideMenu(){
    items.forEach(([id,icon,text])=>{
      const btn=document.querySelector(`.sideNav button[onclick*="${id}"]`);
      if(!btn) return;
      btn.innerHTML=`<span class="menuIcon" aria-hidden="true">${icon}</span><span class="menuText">${text}</span>`;
      btn.title=text;
      btn.style.whiteSpace='nowrap';
      btn.style.overflow='hidden';
      const label=btn.querySelector('.menuText');
      if(label){
        label.style.whiteSpace='nowrap';
        label.style.wordBreak='normal';
        label.style.overflow='hidden';
        label.style.textOverflow=(id==='clima'?'clip':'ellipsis');
        label.style.maxWidth='170px';
        label.style.minWidth='0';
        label.style.display='inline-block';
      }
    });
    const clima=document.querySelector(`.sideNav button[onclick*="clima"] .menuText`);
    if(clima){
      clima.textContent='Clima';
      clima.style.maxWidth='170px';
      clima.style.width='auto';
      clima.style.whiteSpace='nowrap';
      clima.style.overflow='visible';
      clima.style.textOverflow='clip';
    }
    setVersion();
  }
  window.normalizeSideMenuV237=normalizeSideMenu;
  document.addEventListener('DOMContentLoaded',()=>{
    normalizeSideMenu();
    setTimeout(normalizeSideMenu,50);
    setTimeout(normalizeSideMenu,300);
    setTimeout(normalizeSideMenu,900);
  });
  const oldToggle=window.toggleSidebar;
  window.toggleSidebar=function(){
    if(typeof oldToggle==='function') oldToggle.apply(this,arguments);
    else document.body.classList.toggle('sidebarCollapsed');
    setTimeout(normalizeSideMenu,0);
    setTimeout(normalizeSideMenu,120);
  };
})();

/* ===== V2.0.150 - Refuerzo campana menu lateral ===== */
(function(){
  function pendingCount(){
    try{
      if(typeof pendingAlertsOpenRowsV1250==='function') return pendingAlertsOpenRowsV1250().length;
      if(typeof pendingAlertsOpenRows==='function') return pendingAlertsOpenRows().length;
      const n = Number((document.getElementById('alertCount')||document.getElementById('badgeAlertas')||{}).textContent||0);
      return Number.isFinite(n)?n:0;
    }catch(e){ return 0; }
  }
  function applyBellClass(){
    const btn=document.querySelector(".sideNav button[onclick*='alertas']");
    if(!btn) return;
    const n=pendingCount();
    btn.classList.toggle('hasPendingAlerts', n>0);
    let badge=btn.querySelector('.sideAlertBadge');
    if(!badge && n>0){ badge=document.createElement('span'); badge.className='sideAlertBadge'; btn.appendChild(badge); }
    if(badge){ badge.textContent=n>0?String(n):''; badge.style.display=n>0?'inline-flex':'none'; }
  }
  const oldUpdate=window.updateAlertCountersV1250;
  if(typeof oldUpdate==='function'){
    window.updateAlertCountersV1250=function(){ const r=oldUpdate.apply(this,arguments); setTimeout(applyBellClass,0); return r; };
  }
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(applyBellClass,250)));
  setInterval(applyBellClass,1500);
})();

/* ===== V2.0.150 - contador real y badge compacto de menu ===== */
(function(){
  const APP_VERSION_MENU_2039 = '2.0.150';
  function setVersions2039(){
    document.querySelectorAll('span,small,p,div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+APP_VERSION_MENU_2039);
      }
    });
  }
  function countPending2039(){
    try{
      if(typeof window.pendingAlertsCount === 'function') return Number(window.pendingAlertsCount()) || 0;
    }catch(e){}
    try{
      if(typeof allOpenAlertRows35 === 'function') return allOpenAlertRows35().filter(r=>!r.verified).length;
    }catch(e){}
    try{
      const rows = Array.isArray(window.__alertRowsById) ? window.__alertRowsById : Object.values(window.__alertRowsById||{});
      if(rows.length) return rows.filter(r=>!r.verified).length;
    }catch(e){}
    const el=document.getElementById('headerAlertCount')||document.getElementById('alertCount')||document.getElementById('badgeAlertas');
    const n=parseInt((el&&el.textContent)||'0',10);
    return Number.isFinite(n)?n:0;
  }
  function normalizeMenu2039(){
    const btn=[...document.querySelectorAll('.sideNav button')].find(b=>(b.getAttribute('onclick')||'').includes('alertas'));
    const clima=[...document.querySelectorAll('.sideNav button')].find(b=>(b.getAttribute('onclick')||'').includes('clima'));
    if(clima){
      let txt=clima.querySelector('.menuText');
      if(txt) txt.textContent='Clima';
    }
    if(!btn) return;
    let badge=btn.querySelector('.sideAlertBadge');
    if(!badge){ badge=document.createElement('span'); badge.className='sideAlertBadge'; btn.appendChild(badge); }
    const n=countPending2039();
    badge.textContent=n>0?String(n):'';
    badge.style.display=n>0?'inline-flex':'none';
    btn.classList.toggle('hasPendingAlerts', n>0);
    btn.classList.toggle('menuAlertPending', n>0);
    const icon=btn.querySelector('.menuIcon');
    if(icon) icon.textContent='🔔';
    ['headerAlertCount','alertCount','badgeAlertas','kal'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=String(n); });
    setVersions2039();
  }
  const oldRenderBadge2039 = window.renderBadge;
  window.renderBadge=function(){
    try{ if(typeof oldRenderBadge2039==='function') oldRenderBadge2039.apply(this,arguments); }catch(e){}
    setTimeout(normalizeMenu2039,0);
  };
  const oldVerify2039 = window.verifyAlertV234 || window.markAlertVerifiedById;
  if(typeof oldVerify2039==='function'){
    window.verifyAlertV234 = window.markAlertVerifiedById = function(){
      const r=oldVerify2039.apply(this,arguments);
      setTimeout(normalizeMenu2039,0);
      setTimeout(normalizeMenu2039,150);
      return r;
    };
  }
  const oldTab2039 = window.tab;
  if(typeof oldTab2039==='function'){
    window.tab=function(){
      const r=oldTab2039.apply(this,arguments);
      setTimeout(normalizeMenu2039,0);
      return r;
    };
  }
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(normalizeMenu2039,250)));
  setInterval(normalizeMenu2039,1200);
})();

/* ===== V2.0.150 - Menu base limpio: normalizadores anteriores removidos ===== */
/* ===== V2.0.150 - Nuevo modulo Embarques ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  function $id(id){return document.getElementById(id)}
  function safe(v){return (v===undefined||v===null||v==='')?'-':String(v)}
  function esc2(v){return String(v===undefined||v===null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function uniq(arr){return [...new Set(arr.filter(v=>v!==undefined&&v!==null&&String(v).trim()!==''))];}
  function lower(v){return String(v||'').toLowerCase();}
  function getName(x){return x?.nombre||x?.name||x?.cliente||x?.origen||x?.destino||x?.razonSocial||x?.id||'';}
  function getEmbNumero(e){return e?.numero||e?.embarque||e?.id||e?.codigo||'';}
  function rowRouteFromTransit(t){try{return (typeof ruta==='function')?ruta(t):{};}catch(e){return {};}}
  function flotaFromTransit(t){try{return (typeof flota==='function')?flota(t):(t?.flota||t?.unidad||'');}catch(e){return t?.flota||t?.unidad||'';}}
  function fd2(v){try{return (typeof fd==='function')?fd(v):safe(v);}catch(e){return safe(v);}}

  function cargaStore(){try{return JSON.parse(localStorage.getItem('elta_cargas_embarque_v244')||'[]')||[];}catch(e){return []}}
  function saveCargaStore(a){localStorage.setItem('elta_cargas_embarque_v244', JSON.stringify(a||[]));}

  function optionHtml(list, selected){return '<option value=""></option>'+list.map(v=>`<option value="${esc2(v)}" ${String(v)===String(selected)?'selected':''}>${esc2(v)}</option>`).join('');}
  function fillSelect(id, list, first='Todos'){
    const el=$id(id); if(!el) return;
    const cur=el.value||'';
    el.innerHTML=`<option value="">${esc2(first)}</option>`+list.map(v=>`<option value="${esc2(v)}">${esc2(v)}</option>`).join('');
    if([...el.options].some(o=>o.value===cur)) el.value=cur;
  }

  function baseLists(){
    const cli=uniq([...(window.clientes||[]).map(getName), ...(window.trs||[]).map(t=>rowRouteFromTransit(t).cliente)]).sort();
    const ori=uniq([...(window.origenes||[]).map(getName), ...(window.trs||[]).map(t=>rowRouteFromTransit(t).origen)]).sort();
    const des=uniq([...(window.destinos||[]).map(getName), ...(window.trs||[]).map(t=>rowRouteFromTransit(t).destino)]).sort();
    return {cli,ori,des};
  }

  function buildEmbarques(){
    const map=new Map();
    (window.embarques||[]).forEach(e=>{
      const n=String(getEmbNumero(e)||'').trim(); if(!n) return;
      map.set(n,{numero:n, cliente:e.cliente||e.clienteNombre||'', origen:e.origen||'', destino:e.destino||'', fecha:e.fecha||e.createdAt||'', flotas:new Set(), source:e});
    });
    (window.trs||[]).forEach(t=>{
      const n=String(t.embarque||t.emb||t.embarqueNumero||'').trim(); if(!n) return;
      const r=rowRouteFromTransit(t);
      if(!map.has(n)) map.set(n,{numero:n, cliente:r.cliente||'', origen:r.origen||'', destino:r.destino||'', fecha:t.fecha||t.createdAt||t.start?.time||t.start||'', flotas:new Set(), source:null});
      const item=map.get(n);
      item.cliente=item.cliente||r.cliente||'';
      item.origen=item.origen||r.origen||'';
      item.destino=item.destino||r.destino||'';
      item.fecha=item.fecha||t.start?.time||t.start||'';
      const f=flotaFromTransit(t); if(f) item.flotas.add(String(f));
    });
    return [...map.values()].sort((a,b)=>String(b.numero).localeCompare(String(a.numero),undefined,{numeric:true}));
  }

  window.renderEmbarquesV244=function(){
    const {cli,ori,des}=baseLists();
    fillSelect('embFilterCliente',cli,'Todos los clientes');
    fillSelect('embFilterOrigen',ori,'Todos los orígenes');
    fillSelect('embFilterDestino',des,'Todos los destinos');
    const ecli=$id('embCliente'), eori=$id('embOrigen'), edes=$id('embDestino');
    if(ecli && !ecli.options.length) ecli.innerHTML=optionHtml(cli);
    if(eori && !eori.options.length) eori.innerHTML=optionHtml(ori);
    if(edes && !edes.options.length) edes.innerHTML=optionHtml(des);

    const fc=lower($id('embFilterCliente')?.value), fo=lower($id('embFilterOrigen')?.value), fdest=lower($id('embFilterDestino')?.value);
    const rows=buildEmbarques().filter(e=>(!fc||lower(e.cliente)===fc)&&(!fo||lower(e.origen)===fo)&&(!fdest||lower(e.destino)===fdest));
    const cargas=cargaStore();
    const tbody=$id('embarquesTbody');
    if(tbody){
      tbody.innerHTML=rows.map(e=>{
        const c=cargas.filter(x=>String(x.embarque)===String(e.numero)).length;
        return `<tr>
          <td><b>Emb. ${esc2(e.numero)}</b></td>
          <td>${esc2(safe(e.cliente))}</td>
          <td>${esc2(safe(e.origen))}</td>
          <td>${esc2(safe(e.destino))}</td>
          <td>${esc2(fd2(e.fecha))}</td>
          <td>${esc2([...e.flotas].join(', ')||'-')}</td>
          <td>${c}</td>
          <td><button class="iconBtn view" onclick="window.openEmbarqueDetailV244('${esc2(e.numero)}')">👁️</button><button class="iconBtn edit" onclick="window.openCargoFormV244('${esc2(e.numero)}')">+ Carga</button></td>
        </tr>`;
      }).join('') || '<tr><td colspan="8" class="emptyRow">No hay embarques para mostrar.</td></tr>';
    }
  };

  window.resetEmbarqueFiltersV244=function(){['embFilterCliente','embFilterOrigen','embFilterDestino','embFilterDesde','embFilterHasta'].forEach(id=>{const e=$id(id); if(e)e.value='';}); window.renderEmbarquesV244();};
  window.toggleEmbarqueFormV244=function(){const p=$id('embarqueFormPanel'); if(!p)return; p.style.display=(p.style.display==='none'||!p.style.display)?'block':'none'; window.renderEmbarquesV244();};

  window.saveEmbarqueV244=async function(){
    const numero=($id('embNumero')?.value||'').trim();
    const cliente=$id('embCliente')?.value||'';
    const origen=$id('embOrigen')?.value||'';
    const destino=$id('embDestino')?.value||'';
    const fecha=$id('embFecha')?.value||'';
    if(!numero||!cliente||!origen||!destino){alert('Completar N.º Embarque, Cliente, Origen y Destino.');return;}
    try{
      if(window.db){await db.collection('embarque').add({numero,embarque:numero,cliente,origen,destino,fecha,createdAt:new Date().toISOString()});}
      else { window.embarques=window.embarques||[]; window.embarques.push({numero,cliente,origen,destino,fecha}); }
      ['embNumero','embFecha'].forEach(id=>{const e=$id(id); if(e)e.value='';});
      const p=$id('embarqueFormPanel'); if(p)p.style.display='none';
      if(typeof refresh==='function') await refresh(); else window.renderEmbarquesV244();
    }catch(e){console.error(e); alert('No se pudo guardar el embarque.');}
  };

  window.openCargoFormV244=function(numero){
    const e=buildEmbarques().find(x=>String(x.numero)===String(numero))||{numero};
    const flotas=uniq((window.trs||[]).map(flotaFromTransit)).sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
    const panel=$id('embarqueDetailPanel'); if(!panel)return;
    panel.style.display='block';
    panel.innerHTML=`<div class="panelHead"><h3>Agregar carga - Emb. ${esc2(numero)}</h3><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div>
      <div class="embarqueMiniInfo"><b>Cliente:</b> ${esc2(safe(e.cliente))} <b>Origen:</b> ${esc2(safe(e.origen))} <b>Destino:</b> ${esc2(safe(e.destino))}</div>
      <div class="embarqueFormGrid cargaFormGrid">
        <label>Factura N.º<input id="cargoFactura" placeholder="0255-00000111"></label>
        <label>MIC<input id="cargoMic" placeholder="017AR162701006"></label>
        <label>CRT<input id="cargoCrt" placeholder="26AR225698T"></label>
        <label>Volumen<input id="cargoVolumen" placeholder="6"></label>
        <label>Flota<select id="cargoFlota">${optionHtml(flotas)}</select></label>
      </div>
      <div class="formActions"><button class="primaryAction" onclick="window.saveCargoV244('${esc2(numero)}')">Guardar carga</button></div>`;
  };

  window.saveCargoV244=function(numero){
    const carga={embarque:numero,factura:$id('cargoFactura')?.value||'',mic:$id('cargoMic')?.value||'',crt:$id('cargoCrt')?.value||'',volumen:$id('cargoVolumen')?.value||'',flota:$id('cargoFlota')?.value||'',createdAt:new Date().toISOString()};
    const arr=cargaStore(); arr.push(carga); saveCargaStore(arr);
    window.openEmbarqueDetailV244(numero); window.renderEmbarquesV244();
  };

  window.openEmbarqueDetailV244=function(numero){
    const e=buildEmbarques().find(x=>String(x.numero)===String(numero))||{numero};
    const cargas=cargaStore().filter(c=>String(c.embarque)===String(numero));
    const panel=$id('embarqueDetailPanel'); if(!panel)return;
    panel.style.display='block';
    panel.innerHTML=`<div class="panelHead"><h3>Detalle Emb. ${esc2(numero)}</h3><div><button class="primaryAction" onclick="window.openCargoFormV244('${esc2(numero)}')">+ Agregar carga</button><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div></div>
      <div class="embarqueMiniInfo"><b>Cliente:</b> ${esc2(safe(e.cliente))} <b>Origen:</b> ${esc2(safe(e.origen))} <b>Destino:</b> ${esc2(safe(e.destino))} <b>Flotas:</b> ${esc2([...e.flotas].join(', ')||'-')}</div>
      <div class="tableWrap"><table class="embarquesTable"><thead><tr><th>Factura N.º</th><th>MIC</th><th>CRT</th><th>Flota</th><th>Volumen</th></tr></thead><tbody>${cargas.map(c=>`<tr><td>${esc2(safe(c.factura))}</td><td>${esc2(safe(c.mic))}</td><td>${esc2(safe(c.crt))}</td><td>${esc2(safe(c.flota))}</td><td>${esc2(safe(c.volumen))}</td></tr>`).join('')||'<tr><td colspan="5" class="emptyRow">Sin cargas asociadas.</td></tr>'}</tbody></table></div>`;
  };

  const oldTab=window.tab;
  if(typeof oldTab==='function'){
    window.tab=function(id){
      const r=oldTab.apply(this,arguments);
      if(id==='embarques') setTimeout(window.renderEmbarquesV244,0);
      return r;
    };
  }
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function'){
    window.refresh=async function(){ const r=await oldRefresh.apply(this,arguments); setTimeout(()=>{if(document.getElementById('embarques')?.classList.contains('active')) window.renderEmbarquesV244();},0); return r; };
  }
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(window.renderEmbarquesV244,300)));
})();

/* ===== V2.0.150 - Embarques: combos desde colecciones Firestore y estructura real ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const $id=(id)=>document.getElementById(id);
  const E=(v)=>String(v===undefined||v===null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const S=(v)=>String(v===undefined||v===null||v===''?'-':v);
  const L=(v)=>String(v||'').toLowerCase().trim();
  const U=(arr)=>[...new Set((arr||[]).map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  const data=(name)=>{
    try{
      if(name==='clientes') return Array.isArray(clientes)?clientes:[];
      if(name==='origenes') return Array.isArray(origenes)?origenes:[];
      if(name==='destinos') return Array.isArray(destinos)?destinos:[];
      if(name==='embarques') return Array.isArray(embarques)?embarques:[];
      if(name==='trs') return Array.isArray(trs)?trs:[];
      if(name==='users') return Array.isArray(users)?users:[];
    }catch(e){}
    return Array.isArray(window[name])?window[name]:[];
  };
  const nameFromDoc=(x,kind)=>{
    if(!x) return '';
    if(typeof x==='string') return x;
    // En las colecciones clientes / origenes / destinos el nombre operativo esta en el ID del documento.
    // No usar coordenadas, ubicacion ni localidad para completar los combos.
    const docId=String(x.id||'').trim();
    if(docId) return docId;
    if(kind==='cliente') return x.nombre||x.name||x.cliente||x.razonSocial||x.razon_social||x.descripcion||'';
    if(kind==='origen') return x.nombre||x.name||x.origen||x.descripcion||'';
    if(kind==='destino') return x.nombre||x.name||x.destino||x.descripcion||'';
    return x.nombre||x.name||'';
  };
  const route=(t)=>{try{return (typeof ruta==='function'?ruta(t):t.route)||{};}catch(e){return t?.route||{};}};
  const fleet=(t)=>{try{return String(typeof flota==='function'?flota(t):(t?.flota||t?.user?.fleet||'')).trim();}catch(e){return String(t?.flota||t?.user?.fleet||'').trim();}};
  const fmt=(v)=>{try{return typeof fd==='function'?fd(v):S(v);}catch(e){return S(v);}};
  const embNumber=(e)=>String(e?.numero||e?.embarque||e?.id||e?.codigo||'').trim();
  // Filtro por fecha de embarque: SOLO FECHA, sin hora.
  // Soporta fechas guardadas como Timestamp, Date, ISO, yyyy-mm-dd o formato visible "13/6, 11:02 p. m.".
  const dateForInput=(v)=>{
    if(!v) return '';
    try{
      if(typeof v==='object' && typeof v.toDate==='function') v=v.toDate();
      if(v instanceof Date && !isNaN(v)) {
        const y=v.getFullYear(), m=String(v.getMonth()+1).padStart(2,'0'), d=String(v.getDate()).padStart(2,'0');
        return `${y}-${m}-${d}`;
      }
      let txt=String(v||'').trim();
      if(!txt) return '';
      // yyyy-mm-dd o yyyy-mm-ddThh:mm
      let m=txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
      // dd/mm/yyyy, dd-mm-yyyy o dd/mm, hh:mm p. m. => usar año actual si falta
      m=txt.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if(m){
        let y=m[3] ? String(m[3]) : String(new Date().getFullYear());
        if(y.length===2) y='20'+y;
        return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
      }
      const d=new Date(txt);
      if(!isNaN(d)){
        const y=d.getFullYear(), mo=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
        return `${y}-${mo}-${da}`;
      }
    }catch(e){}
    return '';
  };
  const inDateRange=(v,from,to)=>{
    // Comparacion inclusiva por fecha pura. Ignora hora/minuto.
    const d=dateForInput(v);
    if(!d) return !(from||to);
    return (!from || d>=from) && (!to || d<=to);
  };

  function optionHtml(list,placeholder='Seleccionar'){
    return `<option value="">${E(placeholder)}</option>`+(list||[]).map(v=>`<option value="${E(v)}">${E(v)}</option>`).join('');
  }
  function fillSelect(id,list,placeholder){
    const el=$id(id); if(!el) return;
    const cur=el.value;
    el.innerHTML=optionHtml(list,placeholder);
    if([...el.options].some(o=>o.value===cur)) el.value=cur;
  }
  function lists(){
    const cliCat=U(data('clientes').map(x=>nameFromDoc(x,'cliente')));
    const oriCat=U(data('origenes').map(x=>nameFromDoc(x,'origen')));
    const desCat=U(data('destinos').map(x=>nameFromDoc(x,'destino')));
    const cli=cliCat.length?cliCat:U(data('trs').map(t=>route(t).cliente));
    const ori=oriCat.length?oriCat:U(data('trs').map(t=>route(t).origen));
    const des=desCat.length?desCat:U(data('trs').map(t=>route(t).destino));
    return {cli,ori,des};
  }
  function cargas(){try{return JSON.parse(localStorage.getItem('elta_cargas_embarque_v245')||localStorage.getItem('elta_cargas_embarque_v244')||'[]')||[];}catch(e){return []}}
  function saveCargas(a){localStorage.setItem('elta_cargas_embarque_v245',JSON.stringify(a||[]));}
  function build(){
    const map=new Map();
    data('embarques').forEach(e=>{
      const n=embNumber(e); if(!n) return;
      map.set(n,{numero:n,cliente:e.cliente||'',origen:e.origen||'',destino:e.destino||'',fecha:e.fecha||e.fechaHora||e.createdAt||'',activo:e.activo!==false,flotas:new Set(),source:e});
    });
    data('trs').forEach(t=>{
      const n=String(t?.embarque||t?.emb||t?.embarqueNumero||t?.embarqueId||'').trim(); if(!n) return;
      const r=route(t);
      if(!map.has(n)) map.set(n,{numero:n,cliente:r.cliente||'',origen:r.origen||'',destino:r.destino||'',fecha:t?.fecha||t?.createdAt||t?.start?.time||t?.start||'',activo:true,flotas:new Set(),source:null});
      const it=map.get(n);
      it.cliente=it.cliente||r.cliente||'';
      it.origen=it.origen||r.origen||'';
      it.destino=it.destino||r.destino||'';
      it.fecha=it.fecha||t?.start?.time||t?.start||'';
      const f=fleet(t); if(f) it.flotas.add(f);
    });
    cargas().forEach(c=>{
      const n=String(c?.embarque||'').trim(); if(!n) return;
      if(!map.has(n)) map.set(n,{numero:n,cliente:'',origen:'',destino:'',fecha:c.createdAt||'',activo:true,flotas:new Set(),source:null});
      const f=String(c?.flota||'').trim(); if(f) map.get(n).flotas.add(f);
    });
    return [...map.values()].sort((a,b)=>String(b.numero).localeCompare(String(a.numero),'es',{numeric:true}));
  }
  async function ensureEmbarqueData(){
    try{
      if(typeof read==='function'){
        if(!data('clientes').length || !data('origenes').length || !data('destinos').length || !data('embarques').length){
          [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);
        }
      }
    }catch(e){console.warn('No se pudieron cargar combos de embarques',e);}
  }

  window.renderEmbarquesV244=async function(){
    await ensureEmbarqueData();
    const {cli,ori,des}=lists();
    fillSelect('embFilterCliente',cli,'Todos los clientes');
    fillSelect('embFilterOrigen',ori,'Todos los orígenes');
    fillSelect('embFilterDestino',des,'Todos los destinos');
    fillSelect('embCliente',cli,'Seleccionar cliente');
    fillSelect('embOrigen',ori,'Seleccionar origen');
    fillSelect('embDestino',des,'Seleccionar destino');

    const fc=L($id('embFilterCliente')?.value), fo=L($id('embFilterOrigen')?.value), fdest=L($id('embFilterDestino')?.value);
    ['embFilterDesde','embFilterHasta'].forEach(id=>{const el=$id(id); if(el) el.type='date';});
    const fdesde=$id('embFilterDesde')?.value||'', fhasta=$id('embFilterHasta')?.value||'';
    const rows=build().filter(e=>(!fc||L(e.cliente)===fc)&&(!fo||L(e.origen)===fo)&&(!fdest||L(e.destino)===fdest)&&inDateRange(e.fecha,fdesde,fhasta));
    const cgs=cargas();
    const tbody=$id('embarquesTbody');
    if(tbody){
      tbody.innerHTML=rows.map(e=>{
        const c=cgs.filter(x=>String(x.embarque)===String(e.numero)).length;
        return `<tr><td><b>Emb. ${E(e.numero)}</b></td><td>${E(S(e.cliente))}</td><td>${E(S(e.origen))}</td><td>${E(S(e.destino))}</td><td>${E(fmt(e.fecha))}</td><td>${E([...e.flotas].join(', ')||'-')}</td><td>${c}</td><td><button class="iconBtn view" onclick="window.openEmbarqueDetailV244('${E(e.numero)}')">👁️</button><button class="iconBtn edit" onclick="window.openCargoFormV244('${E(e.numero)}')">+ Carga</button></td></tr>`;
      }).join('') || '<tr><td colspan="8" class="emptyRow">No hay embarques para mostrar.</td></tr>';
    }
  };

  window.toggleEmbarqueFormV244=function(){const p=$id('embarqueFormPanel'); if(!p)return; p.style.display=(p.style.display==='none'||!p.style.display)?'block':'none'; window.renderEmbarquesV244();};
  window.resetEmbarqueFiltersV244=function(){['embFilterCliente','embFilterOrigen','embFilterDestino','embFilterDesde','embFilterHasta'].forEach(id=>{const e=$id(id); if(e)e.value='';}); window.renderEmbarquesV244();};
  window.saveEmbarqueV244=async function(){
    const numero=($id('embNumero')?.value||'').trim();
    const cliente=$id('embCliente')?.value||'';
    const origen=$id('embOrigen')?.value||'';
    const destino=$id('embDestino')?.value||'';
    const fecha=$id('embFecha')?.value||'';
    if(!numero||!cliente||!origen||!destino){alert('Completar N.º Embarque, Cliente, Origen y Destino.');return;}
    const doc={activo:true,cliente,destino,fecha,origen,numero,embarque:numero,updatedAt:new Date().toISOString()};
    try{
      if(typeof db!=='undefined' && db){await db.collection('embarque').doc(numero).set(doc,{merge:true});}
      else {embarques=build().map(x=>x.source||x); embarques.push(doc);}
      ['embNumero','embFecha'].forEach(id=>{const e=$id(id); if(e)e.value='';});
      const p=$id('embarqueFormPanel'); if(p)p.style.display='none';
      if(typeof refresh==='function') await refresh();
      await window.renderEmbarquesV244();
    }catch(e){console.error(e); alert('No se pudo guardar el embarque.');}
  };
  window.openCargoFormV244=function(numero){
    const e=build().find(x=>String(x.numero)===String(numero))||{numero};
    const flotas=U(data('trs').map(fleet));
    const panel=$id('embarqueDetailPanel'); if(!panel)return;
    panel.style.display='block';
    panel.innerHTML=`<div class="panelHead"><h3>Agregar carga - Emb. ${E(numero)}</h3><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div><div class="embarqueMiniInfo"><b>Cliente:</b> ${E(S(e.cliente))} <b>Origen:</b> ${E(S(e.origen))} <b>Destino:</b> ${E(S(e.destino))}</div><div class="embarqueFormGrid cargaFormGrid"><label>Factura N.º<input id="cargoFactura" placeholder="0255-00000111"></label><label>MIC<input id="cargoMic" placeholder="017AR162701006"></label><label>CRT<input id="cargoCrt" placeholder="26AR225698T"></label><label>Volumen<input id="cargoVolumen" placeholder="6"></label><label>Flota<select id="cargoFlota">${optionHtml(flotas,'Seleccionar flota')}</select></label></div><div class="formActions"><button class="primaryAction" onclick="window.saveCargoV244('${E(numero)}')">Guardar carga</button></div>`;
  };
  window.saveCargoV244=async function(numero){
    const carga={embarque:numero,factura:$id('cargoFactura')?.value||'',mic:$id('cargoMic')?.value||'',crt:$id('cargoCrt')?.value||'',volumen:$id('cargoVolumen')?.value||'',flota:$id('cargoFlota')?.value||'',createdAt:new Date().toISOString()};
    if(!carga.flota){alert('Seleccionar una flota para asociar la carga.');return;}
    const arr=cargas(); arr.push(carga); saveCargas(arr);
    try{
      if(typeof db!=='undefined' && db){
        await db.collection('embarque').doc(String(numero)).collection('cargas').add(carga);
        await db.collection('embarque').doc(String(numero)).set({updatedAt:new Date().toISOString()},{merge:true});
      }
    }catch(e){console.warn('La carga se guardo localmente, pero no se pudo guardar en Firestore',e);}
    window.openEmbarqueDetailV244(numero); await window.renderEmbarquesV244();
  };
  window.openEmbarqueDetailV244=function(numero){
    const e=build().find(x=>String(x.numero)===String(numero))||{numero};
    const list=cargas().filter(c=>String(c.embarque)===String(numero));
    const panel=$id('embarqueDetailPanel'); if(!panel)return;
    panel.style.display='block';
    panel.innerHTML=`<div class="panelHead"><h3>Detalle Emb. ${E(numero)}</h3><div><button class="primaryAction" onclick="window.openCargoFormV244('${E(numero)}')">+ Agregar carga</button><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div></div><div class="embarqueMiniInfo"><b>Cliente:</b> ${E(S(e.cliente))} <b>Origen:</b> ${E(S(e.origen))} <b>Destino:</b> ${E(S(e.destino))} <b>Flotas:</b> ${E([...e.flotas].join(', ')||'-')}</div><div class="tableWrap"><table class="embarquesTable"><thead><tr><th>Factura N.º</th><th>MIC</th><th>CRT</th><th>Flota</th><th>Volumen</th></tr></thead><tbody>${list.map(c=>`<tr><td>${E(S(c.factura))}</td><td>${E(S(c.mic))}</td><td>${E(S(c.crt))}</td><td>${E(S(c.flota))}</td><td>${E(S(c.volumen))}</td></tr>`).join('')||'<tr><td colspan="5" class="emptyRow">Sin cargas asociadas.</td></tr>'}</tbody></table></div>`;
  };
  const oldTab245=window.tab;
  if(typeof oldTab245==='function') window.tab=function(id){const r=oldTab245.apply(this,arguments); if(id==='embarques') setTimeout(()=>window.renderEmbarquesV244(),50); return r;};
  const oldRefresh245=window.refresh;
  if(typeof oldRefresh245==='function') window.refresh=async function(){const r=await oldRefresh245.apply(this,arguments); setTimeout(()=>{if(document.getElementById('embarques')?.classList.contains('active')) window.renderEmbarquesV244();},80); return r;};
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>window.renderEmbarquesV244(),600)));
})();

/* ===== v2.0.150 - PDF profesional con logo original ELTA para Vista Tránsitos ===== */
(function(){
  const APP_VERSION_PDF = '2.0.150';
  function sx53(v){return String(v ?? '').trim() || '-';}
  function escAttr53(v){return String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');}
  function route53(t){try{return typeof ruta==='function' ? (ruta(t)||{}) : {};}catch(e){return {};}}
  function fleet53(t){try{return typeof flota==='function' ? flota(t) : (t?.flota||t?.fleet||'');}catch(e){return t?.flota||t?.fleet||'';}}
  function date53(v){try{return typeof fd==='function' ? fd(v) : sx53(v);}catch(e){return sx53(v);}}
  function loc53(t){try{return typeof locFull==='function' ? locFull(t) : (typeof loc==='function' ? loc(t) : '');}catch(e){return '';}}
  function lastReport53(t){try{return typeof lastReportValue==='function' ? lastReportValue(t) : (typeof lastU==='function' ? ((lastU(t)||{}).time||(lastU(t)||{}).fecha) : '');}catch(e){return '';}}
  function driver53(t){try{return typeof driverName==='function' ? driverName(t) : (t?.chofer||t?.driver||'');}catch(e){return t?.chofer||'';}}
  function tractor53(t){try{return typeof tractorValue==='function' ? tractorValue(null,t) : (t?.tractor||t?.camion||'');}catch(e){return t?.tractor||'';}}
  function batea53(t){try{return typeof bateaValue==='function' ? bateaValue(null,t) : (t?.batea||t?.semi||'');}catch(e){return t?.batea||'';}}
  function open53(t){try{return typeof openT==='function' ? openT(t) : !t?.closed;}catch(e){return !t?.closed;}}
  function findTransit53(embarque,fleet){
    return (Array.isArray(window.trs)?window.trs:trs||[]).find(t=>String(t?.embarque||'')===String(embarque||'') && String(fleet53(t)||'')===String(fleet||'')) ||
           (Array.isArray(window.trs)?window.trs:trs||[]).find(t=>String(t?.embarque||'')===String(embarque||''));
  }
  function allCargoStores53(){
    const keys=['elta_cargas_embarque_v245','elta_cargas_embarque_v244'];
    let out=[];
    keys.forEach(k=>{try{let a=JSON.parse(localStorage.getItem(k)||'[]'); if(Array.isArray(a))out=out.concat(a);}catch(e){}});
    return out;
  }
  function embDoc53(num){
    const list=Array.isArray(window.embarques)?window.embarques:(typeof embarques!=='undefined'?embarques:[]);
    return list.find(e=>String(e?.numero||e?.embarque||e?.id||e?.codigo||'')===String(num||'')) || {};
  }
  function cargas53(t){
    const emb=sx53(t?.embarque);
    const fromStore=allCargoStores53().filter(c=>String(c?.embarque||'')===String(emb));
    if(fromStore.length)return fromStore;
    const e=embDoc53(emb);
    if(Array.isArray(e.cargas))return e.cargas;
    return [{
      factura:t?.factura||e.factura||e.facturaNumero||'', mic:t?.mic||t?.MIC||e.mic||e.MIC||'', crt:t?.crt||t?.CRT||e.crt||e.CRT||'',
      flota:fleet53(t), tractor:tractor53(t), batea:batea53(t), chofer:driver53(t), volumen:t?.volumen||e.volumen||''
    }];
  }
  async function logoData53(){
    return new Promise(resolve=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onload=()=>{
        try{const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0); resolve(c.toDataURL('image/png'));}catch(e){resolve(null);}
      };
      img.onerror=()=>resolve(null);
      img.src='assets/logo-elta.png';
    });
  }
  function addText53(doc,label,value,x,y,w){
    doc.setFont('helvetica','bold'); doc.setTextColor(18,35,52); doc.text(String(label),x,y);
    doc.setFont('helvetica','normal'); doc.setTextColor(40,52,65);
    const lines=doc.splitTextToSize(sx53(value),w||56); doc.text(lines,x+27,y); return y + Math.max(7, lines.length*5);
  }
  function sectionTitle53(doc,title,y){doc.setFillColor(242,246,250); doc.roundedRect(14,y-6,182,10,2,2,'F'); doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(title,18,y); return y+10;}
  window.downloadTransitPdf = async function(embarque,fleet){
    const t=findTransit53(embarque,fleet);
    if(!t){alert('No se encontró el tránsito para generar el PDF.');return;}
    const jsPDF = window.jspdf?.jsPDF;
    if(!jsPDF){alert('No se pudo cargar el generador PDF. Verificá conexión e intentá nuevamente.');return;}
    const r=route53(t), cargos=cargas53(t), logo=await logoData53();
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
    const pageW=210;
    doc.setFillColor(1,32,63); doc.rect(0,0,pageW,28,'F');
    doc.setFillColor(65,184,55); doc.triangle(178,0,210,0,210,28,'F');
    if(logo) doc.addImage(logo,'PNG',14,6,36,14);
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('REPORTE DE TRÁNSITO',105,12,{align:'center'});
    doc.setFontSize(10); doc.text(`Embarque ${sx53(t.embarque)}`,105,20,{align:'center'});
    doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`,196,34,{align:'right'});
    let y=45;
    y=sectionTitle53(doc,'Datos generales',y);
    doc.setDrawColor(205,214,224); doc.roundedRect(14,y-4,182,43,2,2);
    let y1=y+4, y2=y+4;
    y1=addText53(doc,'Cliente:',r.cliente,18,y1,58); y1=addText53(doc,'Origen:',r.origen,18,y1,58); y1=addText53(doc,'Destino:',r.destino,18,y1,58);
    y2=addText53(doc,'Flota:',fleet53(t),113,y2,42); y2=addText53(doc,'Tractor:',tractor53(t),113,y2,42); y2=addText53(doc,'Batea:',batea53(t),113,y2,42); y2=addText53(doc,'Chofer:',driver53(t),113,y2,42);
    doc.setFillColor(open53(t)?31:120, open53(t)?145:145, open53(t)?62:145); doc.roundedRect(139,y2-6,28,6,2,2,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.text(open53(t)?'EN TRÁNSITO':'FINALIZADO',153,y2-2,{align:'center'});
    y+=50;
    y=sectionTitle53(doc,'Datos documentales',y);
    doc.setDrawColor(205,214,224); doc.roundedRect(14,y-4,182,32,2,2);
    let c=cargos[0]||{}; let yd=y+4;
    yd=addText53(doc,'Factura:',c.factura||t.factura||'',18,yd,55); yd=addText53(doc,'Nº CRT:',c.crt||t.crt||'',18,yd,55); yd=addText53(doc,'Nº MIC:',c.mic||t.mic||'',18,yd,55);
    addText53(doc,'Volumen:',c.volumen||t.volumen||'',113,y+8,45);
    y+=39;
    y=sectionTitle53(doc,'Hitos del tránsito',y);
    doc.setDrawColor(205,214,224); doc.roundedRect(14,y-4,182,42,2,2);
    const steps=[['SALIDA',date53(t.start?.time||t.start)],['ADUANA USPALLATA','Ingreso: -\nLiberación: -'],['ADUANA LOS ANDES','Ingreso: -\nLiberación: -'],['CIERRE',open53(t)?'-':date53(t.closed?.time||t.closed)]];
    let xs=[35,82,129,174];
    doc.setDrawColor(60,165,80); doc.line(xs[0],y+12,xs[3],y+12);
    steps.forEach((s,i)=>{doc.setFillColor(i<2?46:245,i<2?160:185,i<2?67:50); doc.circle(xs[i],y+12,5,'F'); doc.setTextColor(34,120,55); doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.text(s[0],xs[i],y+25,{align:'center'}); doc.setTextColor(30,42,55); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(s[1],38),xs[i],y+31,{align:'center'});});
    y+=50;
    doc.setDrawColor(205,214,224); doc.roundedRect(14,y,56,28,2,2); doc.roundedRect(77,y,56,28,2,2); doc.roundedRect(140,y,56,28,2,2);
    doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('Ubicación GPS',18,y+7); doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(loc53(t)||'-',48),18,y+15);
    doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.text('Última actualización',81,y+7); doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.text(date53(lastReport53(t)||t.updatedAt||''),81,y+15);
    doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.text('Transit Time total',144,y+7); doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.text(sx53(t.transitTime||t.transit_time||'-'),144,y+15);
    doc.setDrawColor(0,46,92); doc.line(14,282,196,282); doc.setFontSize(8); doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.text('ELTA Tracking Solutions',14,287); doc.setFont('helvetica','normal'); doc.text('Reporte generado automáticamente',14,292); doc.text(`Página 1 de 1   ·   Versión APP ${APP_VERSION_PDF}`,196,292,{align:'right'});
    doc.save(`ELTA_Transito_Emb_${sx53(t.embarque)}_Flota_${sx53(fleet53(t))}.pdf`);
  };
  window.card = function(t){
    let o=open53(t), r=route53(t), emb=escAttr53(t?.embarque||''), fl=escAttr53(fleet53(t)||'');
    return `<div class="item ${o?'open':'closed'} transitCardV1210 transitCardPdf53">
      <div class="transitLeft">
        <div class="transitTop"><div class="transitTitle">🚚 Flota ${typeof esc==='function'?esc(fleet53(t)||'-'):fleet53(t)} / 📦 Emb. ${typeof esc==='function'?esc(t.embarque||'-'):t.embarque}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div>
        <div class="transitDataGrid">
          <div><b>Chofer:</b> ${typeof esc==='function'?esc(driver53(t)):driver53(t)}</div><div><b>Cliente:</b> ${typeof esc==='function'?esc(r.cliente||'-'):r.cliente}</div>
          <div><b>Origen:</b> ${typeof esc==='function'?esc(r.origen||'-'):r.origen}</div><div><b>Destino:</b> ${typeof esc==='function'?esc(r.destino||'-'):r.destino}</div>
          <div><b>Lote/Carga:</b> ${typeof esc==='function'?esc(t.lote||'-'):t.lote}</div><div><b>Inicio:</b> ${date53(t.start?.time||t.start)}</div>
          <div><b>Cierre:</b> ${o?'-':date53(t.closed?.time||t.closed)}</div><div class="fullLine"><b>Últ. posición:</b> ${typeof esc==='function'?esc(loc53(t)):loc53(t)}</div>
          <div class="lastReportLine"><b>Últ. reporte:</b> ${date53(lastReport53(t))}<button type="button" class="transitPdfIconBtn54" title="Descargar PDF" aria-label="Descargar PDF" onclick="downloadTransitPdf('${emb}','${fl}')">📄</button></div>
        </div>
      </div>
      <div class="transitRight"><h4 class="alertsTitle">⚠️ Alertas del tránsito</h4>${typeof transitAlertsCompact==='function'?transitAlertsCompact(t):''}</div>
    </div>`;
  };
  document.querySelectorAll('.loginFooter span, .headerTitle span').forEach(el=>{if(/Versi[oó]n/i.test(el.textContent||''))el.textContent='Versión 2.0.150';});
})();


/* ===== V2.0.150 - Fix botones Actualizar global + version unificada ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  function syncGlobals(){
    try{window.trs=trs||[]}catch(e){}
    try{window.users=users||[]}catch(e){}
    try{window.clientes=clientes||[]}catch(e){}
    try{window.origenes=origenes||[]}catch(e){}
    try{window.destinos=destinos||[]}catch(e){}
    try{window.embarques=embarques||[]}catch(e){}
  }
  function setVersionLabels(){
    document.querySelectorAll('span,small,p,div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function activePanelId(){
    const p=document.querySelector('.panel.active');
    return p?p.id:'';
  }
  function renderAll255(){
    syncGlobals();
    try{if(typeof refreshFilters==='function')refreshFilters();}catch(e){}
    try{if(typeof refreshSeguimientoFilters==='function')refreshSeguimientoFilters();}catch(e){}
    try{if(typeof renderDash==='function')renderDash();}catch(e){console.warn('renderDash',e)}
    try{if(typeof renderTransitos==='function')renderTransitos();}catch(e){console.warn('renderTransitos',e)}
    try{if(typeof renderMapa==='function')renderMapa();}catch(e){console.warn('renderMapa',e)}
    try{if(typeof renderRep==='function')renderRep();}catch(e){}
    try{if(typeof renderUnits==='function')renderUnits();}catch(e){console.warn('renderUnits',e)}
    try{if(typeof renderDrivers==='function')renderDrivers();}catch(e){}
    try{if(typeof renderClients==='function')renderClients();}catch(e){}
    try{if(typeof renderAlerts==='function')renderAlerts();}catch(e){console.warn('renderAlerts',e)}
    try{if(typeof window.renderEmbarquesV244==='function')window.renderEmbarquesV244();}catch(e){}
    try{if(typeof window.normalizeSideMenuV243==='function')window.normalizeSideMenuV243();}catch(e){}
    try{if(typeof window.normalizeSideMenuV241==='function')window.normalizeSideMenuV241();}catch(e){}
    setVersionLabels();
  }
  async function loadAll255(){
    if(!window.db){try{if(typeof init==='function')init();}catch(e){}}
    if(!window.db && typeof db!=='undefined') window.db=db;
    if(!window.db && typeof firebase!=='undefined') window.db=firebase.firestore();
    const readCol=async(c)=>{const s=await window.db.collection(c).get(); return s.docs.map(d=>({id:d.id,...d.data()}));};
    const data=await Promise.all([
      readCol('transitos'),readCol('usuarios'),readCol('clientes'),readCol('origenes'),readCol('destinos'),readCol('embarque')
    ]);
    try{[trs,users,clientes,origenes,destinos,embarques]=data;}catch(e){}
    syncGlobals();
  }
  window.refreshAllData255=async function(btn){
    const b=btn || (event && event.currentTarget) || null;
    const old=b?b.textContent:'';
    if(b){b.disabled=true;b.textContent='Actualizando...';}
    try{
      await loadAll255();
      renderAll255();
      const active=activePanelId();
      if(active==='clima'){
        try{window.ELTA_WEATHER_CACHE={};window.ELTA_PASO_CACHE=null;}catch(e){}
        try{if(typeof window.ensureClimaDataAndRender==='function')await window.ensureClimaDataAndRender(true); else if(typeof window.renderClima==='function')await window.renderClima(true);}catch(e){console.warn('refresh clima',e)}
      }
    }catch(e){console.error('Error actualizando datos',e); alert('No se pudieron actualizar los datos. Revisar conexión o permisos.');}
    finally{if(b){b.disabled=false;b.textContent=old||'Actualizar';} setVersionLabels();}
  };
  try{refresh=async function(){await window.refreshAllData255();};}catch(e){}
  window.refresh=window.refreshAllData255;
  // Los botones antiguos llaman forceRefreshClima en varias vistas. Lo convertimos en refresco global seguro.
  window.forceRefreshClima=async function(){await window.refreshAllData255((event&&event.currentTarget)||null);};
  function wireUpdateButtons(){
    document.querySelectorAll('button').forEach(b=>{
      const txt=(b.textContent||'').trim().toLowerCase();
      if(txt==='actualizar' || txt==='actualizando...'){
        if(!b.closest('#clima')){
          b.onclick=function(ev){ev.preventDefault();window.refreshAllData255(b);};
        }
      }
    });
    setVersionLabels();
  }
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>{setTimeout(wireUpdateButtons,0);setTimeout(wireUpdateButtons,500);setTimeout(wireUpdateButtons,1500);}));
  const oldTab=window.tab;
  if(typeof oldTab==='function'){
    window.tab=function(id){const r=oldTab.apply(this,arguments);setTimeout(wireUpdateButtons,0);setTimeout(setVersionLabels,0);return r;};
  }
  setInterval(setVersionLabels,1200);
})();

/* ===== V2.0.150 - Configuracion redisenada sin JSON y sin pestana Embarques ===== */
(function(){
  const APP_VERSION_CFG = "2.0.150";
  function byId(id){return document.getElementById(id)}
  function safe(v){return (typeof esc==='function'?esc(String(v ?? "")):String(v ?? "").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[m])))}
  function getActiveText(v){return v===false||String(v).toLowerCase()==='false'?'Inactivo':'Activo'}
  function getStatusClass(v){return v===false||String(v).toLowerCase()==='false'?'closed':'open'}
  function collectionData(){
    return {
      usuarios:{label:'Usuarios / Flotas', icon:'👤', col:'usuarios', list:users||[], search:'Buscar por usuario, flota, tractor, batea, teléfono...', fields:['id','user','flota','role','tractor','batea','telefono','correo','pass','activo']},
      clientes:{label:'Clientes', icon:'🏢', col:'clientes', list:clientes||[], search:'Buscar por cliente, contacto, teléfono...', fields:['id','contacto','telefono','activo']},
      origenes:{label:'Orígenes', icon:'📍', col:'origenes', list:origenes||[], search:'Buscar por origen, país o ubicación...', fields:['id','pais','ubicacion','activo']},
      destinos:{label:'Destinos', icon:'🚩', col:'destinos', list:destinos||[], search:'Buscar por destino, país, ubicación, contacto...', fields:['id','pais','ubicacion','contacto','telefonos','horarios','activo']}
    };
  }
  function displayName(x,type){
    if(!x)return '-';
    if(type==='usuarios') return x.flota?`Flota ${x.flota}`:(x.user||x.id||'-');
    return x.nombre||x.name||x.id||'-';
  }
  function rowCells(x,type){
    if(type==='usuarios') return [x.flota||'-', x.user||'-', x.tractor||'-', x.batea||'-', x.telefono||'-'];
    if(type==='clientes') return [x.id||'-', x.contacto||'-', x.telefono||'-', getActiveText(x.activo)];
    if(type==='origenes') return [x.id||'-', x.pais||'-', x.ubicacion||'-', getActiveText(x.activo)];
    return [x.id||'-', x.pais||'-', x.ubicacion||'-', x.contacto||'-'];
  }
  function rowHeaders(type){
    if(type==='usuarios') return ['Flota','Usuario','Tractor','Batea','Teléfono'];
    if(type==='clientes') return ['Cliente','Contacto','Teléfono','Estado'];
    if(type==='origenes') return ['Origen','País','Ubicación','Estado'];
    return ['Destino','País','Ubicación','Contacto'];
  }
  function detailRows(x,type){
    if(!x)return [];
    if(type==='usuarios') return [
      ['👤','Usuario',x.user||'-'],['🚚','Flota',x.flota||'-'],['🔐','Rol',x.role||'-'],['🚛','Tractor',x.tractor||'-'],['🚚','Batea',x.batea||'-'],['☎️','Teléfono',x.telefono||'-'],['✉️','Email',x.correo||'-'],['🔑','Contraseña',x.pass?'••••••••':'-'],['✅','Estado',getActiveText(x.activo)]
    ];
    if(type==='clientes') return [
      ['🏢','Cliente',x.id||x.nombre||'-'],['👤','Contacto',x.contacto||'-'],['☎️','Teléfono',x.telefono||'-'],['✅','Estado',getActiveText(x.activo)]
    ];
    if(type==='origenes') return [
      ['📍','Origen',x.id||'-'],['🌎','País',x.pais||'-'],['🧭','Ubicación',x.ubicacion||'-'],['✅','Estado',getActiveText(x.activo)]
    ];
    return [
      ['🚩','Destino',x.id||'-'],['🌎','País',x.pais||'-'],['🧭','Ubicación',x.ubicacion||'-'],['👤','Contacto',x.contacto||'-'],['☎️','Teléfonos',x.telefonos||x.telefono||'-'],['🕘','Horarios',x.horarios||'-'],['✅','Estado',getActiveText(x.activo)]
    ];
  }
  function makeForm(cfg,item){
    return cfg.fields.map(f=>{
      const v=item?item[f]:'';
      if(f==='activo') return `<select id="abm_${f}" class="cfgInput"><option value="true" ${v!==false?'selected':''}>activo true</option><option value="false" ${v===false?'selected':''}>activo false</option></select>`;
      if(f==='role') return `<select id="abm_${f}" class="cfgInput"><option value="flota" ${v==='flota'?'selected':''}>flota</option><option value="admin" ${v==='admin'?'selected':''}>admin</option><option value="operador" ${v==='operador'?'selected':''}>operador</option></select>`;
      const readOnly=f==='id'&&item?' readonly':'';
      return `<input id="abm_${f}" class="cfgInput" placeholder="${safe(f)}" value="${safe(v||'')}"${readOnly}>`;
    }).join('')+`<button class="cfgSaveBtn" onclick="saveABM()">Guardar</button>`;
  }
  window.abm = function(c){
    abmCol = ['usuarios','clientes','origenes','destinos'].includes(c)?c:'usuarios';
    renderABM();
  };
  window.renderABM = function(){
    const cfgs=collectionData();
    if(!cfgs[abmCol])abmCol='usuarios';
    const cfg=cfgs[abmCol];
    const tabs=document.querySelector('#abm .abmtabs');
    if(tabs){
      tabs.innerHTML=Object.entries(cfgs).map(([k,v])=>`<button class="${k===abmCol?'active':''}" onclick="abm('${k}')"><span>${v.icon}</span>${v.label}</button>`).join('');
    }
    const form=byId('abmForm'), list=byId('abmList');
    const data=(cfg.list||[]).slice().sort((a,b)=>String(displayName(a,abmCol)).localeCompare(String(displayName(b,abmCol)),'es'));
    const selectedId=window.__cfgSelectedId && data.some(x=>String(x.id)===String(window.__cfgSelectedId)) ? window.__cfgSelectedId : (data[0]?.id||'');
    window.__cfgSelectedId=selectedId;
    const selected=data.find(x=>String(x.id)===String(selectedId));
    if(form){
      form.innerHTML=`
        <div class="cfgToolbar">
          <div class="cfgSearchWrap"><span>🔎</span><input id="cfgSearch" placeholder="${safe(cfg.search)}" oninput="renderABM()" value="${safe(byId('cfgSearch')?.value||'')}"></div>
          <button class="cfgNewBtn" onclick="clearCfgForm()">＋ Nuevo registro</button>
          <button class="cfgRefreshBtn" onclick="refresh()">⟳</button>
        </div>
        <div class="cfgFormGrid">${makeForm(cfg,null)}</div>`;
    }
    const term=(byId('cfgSearch')?.value||'').toLowerCase();
    const filtered=data.filter(x=>!term||JSON.stringify(x).toLowerCase().includes(term)||String(displayName(x,abmCol)).toLowerCase().includes(term));
    const heads=rowHeaders(abmCol).map(h=>`<th>${safe(h)}</th>`).join('')+'<th>Estado</th><th>Acciones</th>';
    const rows=filtered.map(x=>{
      const cells=rowCells(x,abmCol).map(c=>`<td>${safe(c)}</td>`).join('');
      return `<tr class="${String(x.id)===String(selectedId)?'selected':''}" onclick="selectCfgItem('${safe(x.id)}')">${cells}<td><span class="cfgState ${getStatusClass(x.activo)}">${getActiveText(x.activo)}</span></td><td class="cfgActions"><button onclick="event.stopPropagation();editCfgItem('${safe(x.id)}')">✎</button><button onclick="event.stopPropagation();deleteCfgItem('${safe(x.id)}')">🗑</button></td></tr>`;
    }).join('')||`<tr><td colspan="${rowHeaders(abmCol).length+2}" class="cfgEmpty">Sin datos.</td></tr>`;
    const details=detailRows(selected,abmCol).map(r=>`<div class="cfgDetailRow"><span>${r[0]}</span><b>${safe(r[1])}:</b><em>${safe(r[2])}</em></div>`).join('')||'<div class="cfgEmpty">Seleccioná un registro.</div>';
    if(list){
      list.innerHTML=`
        <div class="cfgLayout">
          <div class="cfgTablePanel">
            <h3>${safe(cfg.label)} registrados</h3>
            <div class="cfgTableWrap"><table class="cfgTable"><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table></div>
            <div class="cfgCount">Mostrando ${filtered.length} de ${data.length} registros</div>
          </div>
          <aside class="cfgDetailPanel">
            <h3>${cfg.icon} Detalle de registro</h3>
            <p>Información completa del registro seleccionado.</p>
            <span class="cfgState ${getStatusClass(selected?.activo)}">${selected?getActiveText(selected.activo):'-'}</span>
            <div class="cfgDetailRows">${details}</div>
            <div class="cfgDetailButtons"><button onclick="editCfgItem('${safe(selectedId)}')">✎ Editar</button><button class="danger" onclick="deleteCfgItem('${safe(selectedId)}')">🗑 Eliminar</button></div>
          </aside>
        </div>`;
    }
  };
  window.selectCfgItem=function(id){window.__cfgSelectedId=id; renderABM();};
  window.clearCfgForm=function(){window.__cfgSelectedId=''; renderABM();};
  window.editCfgItem=function(id){
    const cfgs=collectionData(), cfg=cfgs[abmCol];
    const item=(cfg.list||[]).find(x=>String(x.id)===String(id));
    const form=byId('abmForm');
    if(!item||!form)return;
    form.innerHTML=`<div class="cfgFormGrid">${makeForm(cfg,item)}</div>`;
    window.__cfgSelectedId=id;
  };
  window.deleteCfgItem=async function(id){
    if(!id)return;
    if(!confirm('Eliminar registro '+id+'?'))return;
    const cfgs=collectionData(), cfg=cfgs[abmCol];
    await db.collection(cfg.col).doc(String(id)).delete();
    window.__cfgSelectedId='';
    await refresh();
  };
  window.saveABM=async function(){
    const cfgs=collectionData(), cfg=cfgs[abmCol]||cfgs.usuarios;
    let data={},id="";
    document.querySelectorAll("#abmForm input,#abmForm select").forEach(e=>{
      let k=e.id.replace('abm_',''), v=(e.value||'').trim();
      if(k==='id')id=v; else data[k]=k==='activo'?v==='true':v;
    });
    if(!id)return alert('Debe indicar id/documento');
    await db.collection(cfg.col).doc(id).set(data,{merge:true});
    window.__cfgSelectedId=id;
    await refresh();
  };
  const oldTabCfg=window.tab;
  if(typeof oldTabCfg==='function')window.tab=function(id){const r=oldTabCfg.apply(this,arguments); if(id==='abm')setTimeout(renderABM,50); return r;};
  const oldRefreshCfg=window.refresh;
  if(typeof oldRefreshCfg==='function')window.refresh=async function(){const r=await oldRefreshCfg.apply(this,arguments); setTimeout(()=>{if(byId('abm')?.classList.contains('active'))renderABM();},80); return r;};
  function fixVersion(){document.querySelectorAll('span,small,div,p').forEach(el=>{if(el.childElementCount===0&&/Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+APP_VERSION_CFG);});}
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{fixVersion(); if(byId('abm')?.classList.contains('active'))renderABM();},500)));
})();

/* ===== V2.0.150 - SOLO vista Clima: filtro embarque corrige destino exacto del embarque ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const sx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const norm=(v)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const dtx=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const qid=(id)=>document.getElementById(id);
  const isOpen=(t)=>{try{return typeof openT==='function'?openT(t):!(t?.cerrado||t?.finalizado||String(t?.estado||'').toLowerCase().includes('finalizado'));}catch(e){return true;}};
  const route=(t)=>{try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}};
  const embVal=(t)=>String(t?.embarque??t?.emb??t?.idEmbarque??t?.embarqueId??'').trim();
  const fleet=(t)=>{try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}};
  const driver=(t)=>{try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}};
  const locx=(t)=>{try{return typeof lastGpsLocalidadV1237==='function'?lastGpsLocalidadV1237(t):(typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-'));}catch(e){return '-';}};
  const gpsTime=(t)=>{try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof transitUpdatedValue==='function'?transitUpdatedValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}};

  function selectedEmb(){return qid('climaEmbarqueFilter')?.value || '';}
  function embDocValue(e){return String(e?._docId??e?.id??e?.embarque??e?.numero??e?.nro??e?.codigo??'').trim();}
  function getEmbRecord(emb){
    const key=String(emb||'').trim();
    return (Array.isArray(embarques)?embarques:[]).find(e=>embDocValue(e)===key) || null;
  }
  function embDestValue(e){return String(e?.destino??e?.destinoNombre??e?.destino_id??e?.destinoId??e?.destiny??'').trim();}
  function embClienteValue(e){return String(e?.cliente??e?.clienteNombre??e?.cliente_id??e?.clienteId??'').trim();}
  function embOrigenValue(e){return String(e?.origen??e?.origenNombre??e?.origen_id??e?.origenId??'').trim();}

  function destName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(d?.nombre||d?.destino||d?.id||d?.name||'Destino');}catch(e){return d?.nombre||d?.destino||d?.id||'Destino';}}
  function destLoc(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ubicacion||'-');}catch(e){return d?.localidad||d?.ubicacion||'-';}}
  function destPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||d?.country||'-';}}
  function destMatchesValue(d,value){
    const target=norm(value);
    if(!target)return false;
    const candidates=[d?.id,d?.nombre,d?.name,d?.destino,d?.codigo,d?.code,destName(d)].map(norm).filter(Boolean);
    return candidates.some(c=>c===target || c.includes(target) || target.includes(c));
  }
  function routeDestMatches(d,r){return destMatchesValue(d,r?.destino)||destMatchesValue(d,r?.destinoNombre)||destMatchesValue(d,r?.destinoCodigo);}

  function syncEmbFilterV257(){
    const sel=qid('climaEmbarqueFilter'); if(!sel)return;
    const current=sel.value;
    const vals=new Set();
    (Array.isArray(trs)?trs:[]).filter(isOpen).forEach(t=>{const v=embVal(t); if(v)vals.add(v);});
    (Array.isArray(embarques)?embarques:[]).forEach(e=>{const v=embDocValue(e); if(v)vals.add(v);});
    const opts=[...vals].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${sx(v)}">Embarque ${sx(v)}</option>`).join('');
    if(opts.includes(current))sel.value=current;
  }

  function filteredTransitsV257(){
    const emb=selectedEmb();
    const base=(Array.isArray(trs)?trs:[]).filter(isOpen);
    return emb?base.filter(t=>embVal(t)===emb):base;
  }

  function destinationsForClimaV257(list){
    const ds=Array.isArray(destinos)?destinos:[];
    const emb=selectedEmb();
    if(!emb)return ds;

    const embRec=getEmbRecord(emb);
    const embDest=embDestValue(embRec);
    let matches=[];

    if(embDest){
      matches=ds.filter(d=>destMatchesValue(d,embDest));
      if(!matches.length){
        const lower=String(embDest).toLowerCase();
        matches=[{id:embDest,nombre:embDest,destino:embDest,localidad:embDest,pais:/chile|stli|santiago|pudahuel/i.test(lower)?'Chile':(/uruguay|montevideo|byd/i.test(lower)?'Uruguay':'-'),_pseudo:true}];
      }
    }else{
      list.forEach(t=>{
        const r=route(t);
        const found=ds.filter(d=>routeDestMatches(d,r));
        if(found.length)matches.push(...found);
        else if(r?.destino)matches.push({id:r.destino,nombre:r.destino,destino:r.destino,localidad:r.destino,pais:/chile|stli|santiago|pudahuel/i.test(r.destino)?'Chile':'-',_pseudo:true});
      });
    }
    const seen=new Set();
    return matches.filter(d=>{const k=norm((d?._docId||d?.id||'')+'|'+destName(d)+'|'+destPais(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }

  function requiresLibertadoresV257(list,destList){
    const emb=selectedEmb();
    const embRec=emb?getEmbRecord(emb):null;
    const text=[embDestValue(embRec),...list.map(t=>route(t)?.destino),...destList.map(d=>[d?.id,destName(d),destLoc(d),destPais(d)].join(' '))].join(' ');
    return /chile|stli|santiago|pudahuel|los libertadores/i.test(text);
  }

  async function fetchWeatherV257(c){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'☁️'};
    try{if(typeof fetchWeatherByCoords==='function')return Object.assign({hum:'-',vis:'-',rain:'-'},await fetchWeatherByCoords(c));}catch(e){}
    return {temp:'-',desc:'No disponible',wind:'-',sens:'-',hum:'-',vis:'-',rain:'-',icon:'🌦️'};
  }
  function coordsFromAny(o){try{return typeof coordsFromObjClima==='function'?coordsFromObjClima(o):(o?.lat&&o?.lng?{lat:o.lat,lng:o.lng}:null);}catch(e){return null;}}
  function lastCoords(t){try{return typeof lastGpsCoords==='function'?lastGpsCoords(t):coordsFromAny(t);}catch(e){return coordsFromAny(t);}}
  function kv(label,val){return `<div class="climaKv228"><b>${sx(label)}:</b> <span>${sx(val??'-')}</span></div>`;}
  function wx(w){return `<div class="climaWx228"><div class="climaWxTop228"><span class="climaTemp228">${sx(w?.temp??'-')}°</span><span class="climaIcon228">${w?.icon||'🌦️'}</span></div><div class="climaDesc228">${sx(w?.desc||'Sin datos')}</div></div>`;}
  function card(kind,title,left,center,w,bottom,statusHtml=''){
    const cls=kind==='fleet'?'climaFleet228':kind==='pass'?'climaPass228':'climaDest228';
    return `<article class="climaCard228 ${cls}"><div class="climaBody228"><div class="climaLeft228"><h4>${title}</h4>${left||''}</div><div class="climaCenter228">${statusHtml||''}${center||''}</div>${wx(w)}</div>${bottom?`<div class="climaBottom228">${bottom}</div>`:''}</article>`;
  }

  async function renderWeatherFleetsV257(list){
    const el=qid('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito para el embarque seleccionado.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const out=[];
    for(const t of list){
      const c=lastCoords(t), w=await fetchWeatherV257(c), r=route(t);
      const left=`${kv('Chofer',driver(t)||'-')}${kv('Embarque',embVal(t)||'-')}${kv('Cliente',r.cliente||embClienteValue(getEmbRecord(embVal(t)))||'-')}`;
      const center=`${kv('Ubicación actual',locx(t)||'-')}${kv('Destino',r.destino||embDestValue(getEmbRecord(embVal(t)))||'-')}${kv('Último GPS',dtx(gpsTime(t)))}`;
      const bottom=`${kv('Viento',(w.wind??'-')+' km/h')}${kv('Visibilidad',(w.vis??'-')+(w.vis==='-'?'':' km'))}`;
      out.push(card('fleet',`<span class="climaKind228">🚚</span> Flota ${sx(fleet(t)||'-')}`,left,center,w,bottom));
    }
    el.innerHTML=out.join('');
  }

  async function renderWeatherPassesV257(show){
    const el=qid('weatherPasses'); if(!el)return;
    if(!show){el.innerHTML='<div class="weatherLoading">El embarque seleccionado no requiere Paso Los Libertadores.</div>';return;}
    const paso={lat:-32.824,lng:-70.086,text:'Argentina / Chile'};
    const w=await fetchWeatherV257(paso);
    const statusHtml='<div class="climaPassStatus228 warn">VERIFICAR FUENTE OFICIAL</div>';
    const left=`${kv('Actualización','No disponible')}${kv('Oficial','ver fuente')}`;
    const center='';
    el.innerHTML=card('pass','Paso Los Libertadores',left,center,w,'',statusHtml);
  }

  async function renderWeatherDestinationsV257(list){
    const el=qid('weatherDestinations'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay destino cargado para el embarque seleccionado.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima del destino...</div>';
    const out=[];
    for(const d of list){
      const c=coordsFromAny(d), w=await fetchWeatherV257(c);
      const ubi=[destLoc(d),destPais(d)].filter(x=>x&&x!=='-').join(', ')||'-';
      const left=`${kv('Ubicación',ubi)}`;
      out.push(card('dest',`<span class="climaKind228">📍</span> ${sx(destName(d))}`,left,'',w,''));
    }
    el.innerHTML=out.join('');
  }

  window.renderClima=async function(){
    syncEmbFilterV257();
    const list=filteredTransitsV257();
    const destList=destinationsForClimaV257(list);
    const showPass=!selectedEmb() || requiresLibertadoresV257(list,destList);
    await renderWeatherFleetsV257(list);
    await renderWeatherPassesV257(showPass);
    await renderWeatherDestinationsV257(destList);
  };
  window.ensureClimaDataAndRender=async function(){
    try{
      [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')]);
    }catch(e){console.warn('No se pudieron cargar datos clima',e);}
    await window.renderClima();
  };
  function updateVersion(){document.querySelectorAll('span,small,div,p').forEach(el=>{if(el.childElementCount===0&&/Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);});}
  const oldTab=window.tab; if(typeof oldTab==='function')window.tab=function(id){const r=oldTab.apply(this,arguments); updateVersion(); if(id==='clima')setTimeout(()=>window.ensureClimaDataAndRender(),50); return r;};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function')window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); updateVersion(); if(qid('clima')?.classList.contains('active'))await window.renderClima(); return r;};
  document.addEventListener('DOMContentLoaded',()=>{updateVersion(); if(qid('clima')?.classList.contains('active'))window.ensureClimaDataAndRender();});
})();

/* ===== V2.0.150 - FIX DEFINITIVO SOLO CLIMA: filtro por embarque trae destino/paso aunque no haya flota ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const $=(id)=>document.getElementById(id);
  const escx=(v)=>{try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}catch(e){return String(v??'');}};
  const norm=(v)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const fdv=(v)=>{try{return typeof fd==='function'?fd(v):(v?String(v):'-');}catch(e){return v?String(v):'-';}};
  const arr=(name)=>{try{return Array.isArray(window[name])?window[name]:(eval('typeof '+name+'!=="undefined" && Array.isArray('+name+') ? '+name+' : []'));}catch(e){return [];}};
  const setArr=(name,val)=>{try{window[name]=val; eval(name+'=val');}catch(e){window[name]=val;}};
  const has=(v)=>v!==undefined&&v!==null&&String(v).trim()!==''&&!/^null$|^undefined$/i.test(String(v).trim());

  function setVersion(){
    document.querySelectorAll('span,small,div,p').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }

  async function loadClimaData(force=false){
    if(!force && arr('trs').length && arr('destinos').length && arr('embarques').length) return;
    if(typeof read!=='function') return;
    try{
      const [t,u,c,o,d,e]=await Promise.all([
        read('transitos'),read('usuarios'),read('clientes'),read('origenes'),read('destinos'),read('embarque')
      ]);
      setArr('trs',t); setArr('users',u); setArr('clientes',c); setArr('origenes',o); setArr('destinos',d); setArr('embarques',e);
    }catch(err){console.warn('Clima: no se pudieron cargar datos',err);}
  }

  function selectedEmb(){return String($('climaEmbarqueFilter')?.value||'').trim();}
  function openTransit(t){try{return typeof openT==='function'?openT(t):!(t?.finalizado||t?.cerrado||String(t?.estado||'').toLowerCase().includes('finalizado'));}catch(e){return true;}}
  function embVal(t){return String(t?.embarque??t?.emb??t?.embarqueId??t?.idEmbarque??t?.numeroEmbarque??'').trim();}
  function docId(o){return String(o?._docId??o?.id??o?.docId??'').trim();}
  function route(t){try{return typeof ruta==='function'?(ruta(t)||{}):(t?.ruta||t?.route||{});}catch(e){return t?.ruta||t?.route||{};}}
  function fleet(t){try{return typeof flota==='function'?flota(t):(t?.flota||t?.fleet||t?.unidad||'-');}catch(e){return '-';}}
  function driver(t){try{return typeof driverName==='function'?driverName(t):(t?.chofer||t?.driver||t?.conductor||'-');}catch(e){return '-';}}
  function locName(t){try{return typeof locFull==='function'?locFull(t):(t?.localidad||t?.ubicacion||'-');}catch(e){return '-';}}
  function gpsTime(t){try{return typeof lastGpsTimeV1237==='function'?lastGpsTimeV1237(t):(typeof lastReportValue==='function'?lastReportValue(t):(t?.updatedAt||t?.start?.time||t?.start));}catch(e){return t?.updatedAt||t?.start;}}

  function embDocValue(e){return String(docId(e)||e?.embarque||e?.numero||e?.nro||e?.codigo||e?.idEmbarque||'').trim();}
  function getEmbRecord(emb){
    const key=String(emb||'').trim();
    return arr('embarques').find(e=>String(embDocValue(e))===key) || null;
  }
  function firstVal(o,keys){for(const k of keys){if(has(o?.[k]))return String(o[k]).trim();}return '';}
  function embDest(e){return firstVal(e,['destino','destinoNombre','destino_id','destinoId','destinoDoc','destiny','destinatario']);}
  function embCli(e){return firstVal(e,['cliente','clienteNombre','cliente_id','clienteId','client']);}
  function embOri(e){return firstVal(e,['origen','origenNombre','origen_id','origenId','origin']);}

  function destName(d){try{return typeof destinationNameClima==='function'?destinationNameClima(d):(docId(d)||d?.nombre||d?.name||d?.destino||'Destino');}catch(e){return docId(d)||d?.nombre||d?.name||d?.destino||'Destino';}}
  function destLoc(d){try{return typeof destinoLocalidadClima==='function'?destinoLocalidadClima(d):(d?.localidad||d?.ciudad||d?.ubicacion||'-');}catch(e){return d?.localidad||d?.ciudad||d?.ubicacion||'-';}}
  function destPais(d){try{return typeof destinoPaisClima==='function'?destinoPaisClima(d):(d?.pais||d?.country||'-');}catch(e){return d?.pais||d?.country||'-';}}
  function destinationCandidates(d){return [docId(d),d?.nombre,d?.name,d?.destino,d?.codigo,d?.code,destName(d)].filter(has).map(norm);}
  function matchDest(d,val){const n=norm(val); if(!n)return false; return destinationCandidates(d).some(x=>x===n||x.includes(n)||n.includes(x));}
  function inferPais(name){return /chile|stli|santiago|pudahuel|stellantis chil/i.test(String(name||''))?'Chile':(/uruguay|montevideo|byd/i.test(String(name||''))?'Uruguay':'-');}

  function syncFilter(){
    const sel=$('climaEmbarqueFilter'); if(!sel)return;
    const cur=sel.value;
    const vals=new Set();
    arr('trs').filter(openTransit).forEach(t=>{const v=embVal(t); if(v)vals.add(v);});
    arr('embarques').forEach(e=>{const v=embDocValue(e); if(v)vals.add(v);});
    const opts=[...vals].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${escx(v)}">Embarque ${escx(v)}</option>`).join('');
    if(opts.includes(cur)) sel.value=cur;
  }

  function filteredTransits(){
    const emb=selectedEmb();
    const base=arr('trs').filter(openTransit);
    return emb?base.filter(t=>embVal(t)===emb):base;
  }

  function destsForSelected(list){
    const ds=arr('destinos');
    const emb=selectedEmb();
    let values=[];
    if(emb){
      const e=getEmbRecord(emb);
      const val=embDest(e);
      if(val) values.push(val);
      list.forEach(t=>{const r=route(t); if(has(r.destino)) values.push(r.destino);});
    }else{
      return ds;
    }
    values=[...new Set(values.filter(has))];
    let out=[];
    values.forEach(v=>{
      const found=ds.filter(d=>matchDest(d,v));
      if(found.length) out.push(...found);
      else out.push({_docId:v,id:v,nombre:v,destino:v,localidad:v,pais:inferPais(v),_pseudo:true});
    });
    const seen=new Set();
    return out.filter(d=>{const k=norm(docId(d)+'|'+destName(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }

  function needsPaso(list,dests){
    const emb=selectedEmb(); const e=emb?getEmbRecord(emb):null;
    const text=[embDest(e), ...list.map(t=>route(t).destino), ...dests.map(d=>[docId(d),destName(d),destLoc(d),destPais(d)].join(' '))].join(' ');
    return /chile|stli|santiago|pudahuel|los libertadores/i.test(text);
  }

  function coords(o){try{return typeof coordsFromObjClima==='function'?coordsFromObjClima(o):(has(o?.lat)&&has(o?.lng)?{lat:Number(o.lat),lng:Number(o.lng)}:null);}catch(e){return null;}}
  function lastCoords(t){try{return typeof lastGpsCoords==='function'?lastGpsCoords(t):coords(t);}catch(e){return coords(t);}}
  async function weather(c){
    if(!c)return {temp:'-',desc:'Sin coordenadas',wind:'-',vis:'-',icon:'🌦️'};
    try{if(typeof fetchWeatherByCoords==='function')return Object.assign({temp:'-',desc:'Sin datos',wind:'-',vis:'-',icon:'🌦️'},await fetchWeatherByCoords(c));}catch(e){console.warn('clima fetch',e);}
    return {temp:'-',desc:'No disponible',wind:'-',vis:'-',icon:'🌦️'};
  }
  function kv(k,v){return `<div class="climaKv260"><b>${escx(k)}:</b> ${escx(v??'-')}</div>`;}
  function wx(w){return `<div class="climaWx260"><div><span class="climaTemp260">${escx(w?.temp??'-')}°</span><span class="climaIcon260">${w?.icon||'🌦️'}</span></div><small>${escx(w?.desc||'Sin datos')}</small></div>`;}
  function fleetCard(t,w){const r=route(t), emb=embVal(t), e=getEmbRecord(emb);return `<article class="climaFleet260"><div class="climaCol260"><h4>🚚 Flota ${escx(fleet(t)||'-')}</h4>${kv('Chofer',driver(t))}${kv('Embarque',emb||'-')}${kv('Cliente',r.cliente||embCli(e)||'-')}</div><div class="climaCol260">${kv('Ubicación actual',locName(t))}${kv('Destino',r.destino||embDest(e)||'-')}${kv('Último GPS',fdv(gpsTime(t)))}</div>${wx(w)}</article>`;}
  function sideCard(kind,title,info,w,status=''){return `<article class="${kind==='pass'?'climaPass260':'climaDest260'}"><div class="climaSideInfo260"><h4>${title}</h4>${status}${info}</div>${wx(w)}</article>`;}

  async function renderFleets(list){
    const el=$('weatherFleets'); if(!el)return;
    if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito para este embarque.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>';
    const cards=[];
    for(const t of list){cards.push(fleetCard(t, await weather(lastCoords(t))));}
    el.innerHTML=cards.join('');
  }
  async function renderPass(show){
    const el=$('weatherPasses'); if(!el)return;
    if(!show){el.innerHTML='<div class="weatherLoading">No aplica Paso Los Libertadores para este embarque.</div>';return;}
    const w=await weather({lat:-32.824,lng:-70.086});
    el.innerHTML=sideCard('pass','Paso Los Libertadores',kv('Ubicación','Argentina / Chile')+kv('Estado','Verificar fuente oficial'),w,'<span class="climaPassStatus260">VERIFICAR FUENTE OFICIAL</span>');
  }
  async function renderDests(dests){
    const el=$('weatherDestinations'); if(!el)return;
    if(!dests.length){el.innerHTML='<div class="weatherLoading">No hay destino cargado para este embarque.</div>';return;}
    el.innerHTML='<div class="weatherLoading">Consultando clima del destino...</div>';
    const cards=[];
    for(const d of dests){
      const ubi=[destLoc(d),destPais(d)].filter(x=>x&&x!=='-').join(', ')||'-';
      cards.push(sideCard('dest','📍 '+escx(destName(d)),kv('Ubicación',ubi),await weather(coords(d))));
    }
    el.innerHTML=cards.join('');
  }

  window.renderClima=async function(){
    await loadClimaData(false);
    syncFilter();
    const list=filteredTransits();
    const dests=destsForSelected(list);
    await renderFleets(list);
    await renderPass(!selectedEmb() || needsPaso(list,dests));
    await renderDests(dests);
    setVersion();
  };
  window.ensureClimaDataAndRender=async function(force=false){await loadClimaData(force); await window.renderClima();};
  window.forceRefreshClima=async function(){await window.ensureClimaDataAndRender(true);};

  function wire(){
    const sel=$('climaEmbarqueFilter'); if(sel)sel.onchange=()=>window.renderClima();
    document.querySelectorAll('#clima .climaRefreshBtn226').forEach(b=>{b.onclick=(ev)=>{ev.preventDefault();window.forceRefreshClima();};});
  }
  const oldTab=window.tab; if(typeof oldTab==='function')window.tab=function(id){const r=oldTab.apply(this,arguments); setVersion(); wire(); if(id==='clima')setTimeout(()=>window.ensureClimaDataAndRender(false),50); return r;};
  const oldRefresh=window.refresh; if(typeof oldRefresh==='function')window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); setVersion(); wire(); if($('clima')?.classList.contains('active'))await window.ensureClimaDataAndRender(true); return r;};
  document.addEventListener('DOMContentLoaded',()=>{setVersion();wire(); if($('clima')?.classList.contains('active'))window.ensureClimaDataAndRender(false);});
})();


/* ===== V2.0.150 - Datos reales del usuario logueado en sidebar ===== */
(function(){
  const APP_VERSION_LOGGED_USER_FIX = "2.0.150";

  function _q(id){ return document.getElementById(id); }
  function _txt(v){ return (v===undefined || v===null) ? '' : String(v).trim(); }
  function _roleLabel(role){
    const r=_txt(role).toLowerCase();
    if(r==='admin') return 'Administrador';
    if(r==='trafico') return 'Tráfico';
    if(r==='coordinador') return 'Coordinador';
    if(r==='flota') return 'Flota';
    return _txt(role) || 'Usuario';
  }
  function _emailOf(u){ return _txt(u?.correo || u?.email || u?.mail || u?.userEmail); }
  function _nameOf(u,id){
    const role=_txt(u?.role).toLowerCase();
    const user=_txt(u?.user || u?.nombre || u?.name || u?.displayName || u?.id || id);
    if(role==='admin') return 'Administrador';
    return user || _roleLabel(role);
  }
  function _initialOf(name,email,id){
    const src=_txt(name) || _txt(email) || _txt(id) || 'U';
    return src.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/g,'').charAt(0).toUpperCase() || 'U';
  }

  function setVersionLoggedUserFix(){
    document.querySelectorAll('span, small, p, div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g, `Versión ${APP_VERSION_LOGGED_USER_FIX}`);
      }
    });
  }

  function updateLoggedUserBox(userData, id){
    const u = userData || window.ELTA_LOGGED_USER || {};
    const uid = _txt(id || window.ELTA_LOGGED_USER_ID || _q('user')?.value);
    const name = _nameOf(u, uid);
    const email = _emailOf(u) || uid;
    const initial = _initialOf(name, email, uid);

    document.querySelectorAll('.adminBox').forEach(box=>{
      const avatar = box.querySelector('.adminAvatar');
      const b = box.querySelector('b');
      const small = box.querySelector('small');
      if(avatar) avatar.textContent = initial;
      if(b) b.textContent = name;
      if(small) {
        small.textContent = email;
        small.title = email;
      }
      box.dataset.loggedUser = uid;
    });
  }
  window.updateLoggedUserBox = updateLoggedUserBox;

  async function loadLoggedUserData(id){
    const uid=_txt(id || _q('user')?.value);
    if(!uid || typeof db==='undefined') return null;
    try{
      const snap = await db.collection('usuarios').doc(uid).get();
      if(snap && snap.exists){
        const data = Object.assign({id: uid}, snap.data() || {});
        window.ELTA_LOGGED_USER_ID = uid;
        window.ELTA_LOGGED_USER = data;
        updateLoggedUserBox(data, uid);
        return data;
      }
    }catch(e){ console.warn('No se pudo cargar usuario logueado', e); }
    return null;
  }
  window.loadLoggedUserData = loadLoggedUserData;

  const previousLogin = typeof login === 'function' ? login : null;
  if(previousLogin){
    login = async function(){
      const uid=_txt(_q('user')?.value);
      const result = await previousLogin.apply(this, arguments);
      if(document.getElementById('app')?.classList.contains('active')){
        await loadLoggedUserData(uid);
        setVersionLoggedUserFix();
        setTimeout(()=>{ updateLoggedUserBox(window.ELTA_LOGGED_USER, uid); setVersionLoggedUserFix(); }, 300);
      }
      return result;
    };
  }

  const previousRefresh = typeof refresh === 'function' ? refresh : null;
  if(previousRefresh){
    refresh = async function(){
      const result = await previousRefresh.apply(this, arguments);
      if(window.ELTA_LOGGED_USER) updateLoggedUserBox(window.ELTA_LOGGED_USER, window.ELTA_LOGGED_USER_ID);
      else await loadLoggedUserData(_q('user')?.value);
      setVersionLoggedUserFix();
      return result;
    };
  }

  window.addEventListener('DOMContentLoaded',()=>{
    setVersionLoggedUserFix();
    setTimeout(()=>updateLoggedUserBox(window.ELTA_LOGGED_USER, window.ELTA_LOGGED_USER_ID), 200);
  });
})();

/* ===== V2.0.150 - Clima compacto + PDF OEA + correcciones puntuales ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  function $id(id){return document.getElementById(id);}
  function S(v){return v===undefined||v===null?'':String(v).trim();}
  function E(v){return S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function has(v){return S(v)!=='' && S(v)!=='-' && S(v).toLowerCase()!=='null' && S(v).toLowerCase()!=='undefined';}
  function setVersion(){
    document.querySelectorAll('span,small,p,div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function T(v){try{let d=v?.toDate?v.toDate():(v?.seconds?new Date(v.seconds*1000):new Date(v));return d&&!isNaN(d.getTime())?d.getTime():0}catch(e){return 0}}
  function F(v){let n=T(v);return n?new Date(n).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';}
  async function readCol(c){if(typeof read==='function') return await read(c); const s=await db.collection(c).get(); return s.docs.map(d=>({id:d.id,_docId:d.id,...d.data()}));}
  function setArr(name,val){try{window[name]=val;}catch(e){} try{eval(name+'=val')}catch(e){} }
  function arr(name){try{if(Array.isArray(window[name]))return window[name];}catch(e){} try{const v=eval(name); if(Array.isArray(v))return v;}catch(e){} return [];}
  async function loadCore(force=false){
    if(!force && arr('trs').length && arr('destinos').length && arr('embarques').length && arr('users').length) return;
    try{
      const [t,u,c,o,d,e]=await Promise.all([readCol('transitos'),readCol('usuarios'),readCol('clientes'),readCol('origenes'),readCol('destinos'),readCol('embarque')]);
      setArr('trs',t); setArr('users',u); setArr('clientes',c); setArr('origenes',o); setArr('destinos',d); setArr('embarques',e);
    }catch(err){console.warn('No se pudieron cargar datos principales',err);}
  }

  /* Clima */
  function openTransit(t){try{return typeof openT==='function'?openT(t):!(t?.closed||String(t?.estado||'').toLowerCase().includes('final'));}catch(e){return true;}}
  function embVal(t){return S(t?.embarque??t?.emb??t?.embarqueId??t?.numeroEmbarque??'');}
  function docId(o){return S(o?._docId??o?.id??o?.docId??'');}
  function route(t){try{return typeof ruta==='function'?(ruta(t)||{}):(t?.route||t?.ruta||{});}catch(e){return t?.route||t?.ruta||{};}}
  function fleet(t){try{return typeof flota==='function'?flota(t):S(t?.flota||t?.fleet||t?.user?.fleet);}catch(e){return S(t?.flota||t?.fleet);}}
  function driver(t){try{return typeof driverName==='function'?driverName(t):S(t?.chofer||t?.driver||t?.conductor);}catch(e){return S(t?.chofer||t?.driver);}}
  function lastUpdate(t){try{return typeof lastU==='function'?lastU(t):(Array.isArray(t?.updates)?t.updates.slice().sort((a,b)=>T(b.time||b.fecha||b.createdAt)-T(a.time||a.fecha||a.createdAt))[0]:null);}catch(e){return null;}}
  function locName(t){try{return typeof locFull==='function'?locFull(t):(typeof loc==='function'?loc(t):S(t?.localidad||t?.ubicacion));}catch(e){return S(t?.localidad||t?.ubicacion);}}
  function gpsTime(t){const u=lastUpdate(t);return u?.time||u?.fecha||u?.createdAt||t?.updatedAt||t?.start?.time||t?.start;}
  function lastCoords(t){
    try{if(typeof lastGpsCoords==='function'){const c=lastGpsCoords(t); if(c)return c;}}catch(e){}
    const u=lastUpdate(t)||{}; const objs=[u.gps,u.ultimaPosicion,u,t.ultimaPosicion,t.gps,t];
    for(const o of objs){if(!o)continue; const lat=o.lat??o.latitude??o.latitud; const lng=o.lng??o.lon??o.long??o.longitude??o.longitud; if(has(lat)&&has(lng))return {lat:Number(lat),lng:Number(lng)};}
    return null;
  }
  function embDocValue(e){return S(docId(e)||e?.embarque||e?.numero||e?.nro||e?.codigo||e?.idEmbarque);}
  function getEmb(emb){const k=S(emb); return arr('embarques').find(e=>embDocValue(e)===k)||null;}
  function first(o,keys){for(const k of keys){if(has(o?.[k]))return S(o[k]);}return '';}
  function embDest(e){return first(e,['destino','destinoNombre','destino_id','destinoId','destinoDoc','destiny']);}
  function embCli(e){return first(e,['cliente','clienteNombre','cliente_id','clienteId','client']);}
  function embOri(e){return first(e,['origen','origenNombre','origen_id','origenId','origin']);}
  function destName(d){return S(docId(d)||d?.nombre||d?.name||d?.destino||d?.codigo)||'Destino';}
  function destLoc(d){return S(d?.localidad||d?.ciudad||d?.ubicacionTexto||d?.ubicacion||d?.address)||'-';}
  function destPais(d){return S(d?.pais||d?.country)||'-';}
  function destCoords(d){
    const u=S(d?.ubicacion||'');
    let m=u.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if(m)return {lat:Number(m[1]),lng:Number(m[2])};
    const lat=d?.lat??d?.latitude??d?.latitud; const lng=d?.lng??d?.lon??d?.long??d?.longitude??d?.longitud;
    return has(lat)&&has(lng)?{lat:Number(lat),lng:Number(lng)}:null;
  }
  function matchesDest(d,val){const n=N(val); if(!n)return false; const c=[docId(d),d?.nombre,d?.name,d?.destino,d?.codigo,destName(d)].map(N).filter(Boolean); return c.some(x=>x===n||x.includes(n)||n.includes(x));}
  function inferPais(v){return /chile|stli|santiago|pudahuel|los libertadores/i.test(S(v))?'Chile':(/uruguay|montevideo|byd/i.test(S(v))?'Uruguay':'-');}
  function selectedEmb(){return S($id('climaEmbarqueFilter')?.value);}
  function syncClimaFilter(){
    const sel=$id('climaEmbarqueFilter'); if(!sel)return;
    const cur=sel.value; const vals=new Set();
    arr('trs').filter(openTransit).forEach(t=>{const v=embVal(t); if(v)vals.add(v);});
    arr('embarques').forEach(e=>{const v=embDocValue(e); if(v)vals.add(v);});
    const opts=[...vals].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
    sel.innerHTML='<option value="">Todos</option>'+opts.map(v=>`<option value="${E(v)}">Embarque ${E(v)}</option>`).join('');
    if(opts.includes(cur)) sel.value=cur;
  }
  function filteredTransits(){const emb=selectedEmb(); const list=arr('trs').filter(openTransit); return emb?list.filter(t=>embVal(t)===emb):list;}
  function destsFor(list){
    const ds=arr('destinos'); const emb=selectedEmb();
    if(!emb)return ds;
    let vals=[]; const ed=getEmb(emb); if(ed&&embDest(ed))vals.push(embDest(ed));
    list.forEach(t=>{const r=route(t); if(has(r.destino))vals.push(r.destino);});
    vals=[...new Set(vals.filter(has))]; let out=[];
    vals.forEach(v=>{const found=ds.filter(d=>matchesDest(d,v)); if(found.length)out.push(...found); else out.push({_docId:v,id:v,nombre:v,localidad:v,pais:inferPais(v),_pseudo:true});});
    const seen=new Set(); return out.filter(d=>{const k=N(docId(d)+'|'+destName(d)); if(seen.has(k))return false; seen.add(k); return true;});
  }
  function needsPaso(list,dests){const text=[...list.map(t=>route(t).destino),...dests.map(d=>[docId(d),destName(d),destLoc(d),destPais(d)].join(' '))].join(' ');return /chile|stli|los libertadores|pudahuel|santiago/i.test(text);}
  async function weather(coords,fallback){
    if(coords){try{if(typeof fetchWeatherByCoords==='function')return Object.assign({temp:'-',desc:'Sin datos',wind:'-',hum:'-',vis:'-',icon:'🌦️'},await fetchWeatherByCoords(coords));}catch(e){}}
    return Object.assign({temp:'-',desc:'Sin datos',wind:'-',hum:'-',vis:'-',icon:'🌦️'},fallback||{});
  }
  function wxBlock(w){return `<div class="climaCardWx263"><div><span class="climaCardTemp263">${E(w?.temp??'-')}°</span><span class="climaCardIcon263">${w?.icon||'🌦️'}</span></div><div class="climaCardDesc263">${E(w?.desc||'Sin datos')}</div><div class="climaCardMini263"><b>Viento:</b> ${E(w?.wind||'-')}</div><div class="climaCardMini263"><b>Visibilidad:</b> ${E(w?.vis||'-')}</div></div>`;}
  function fleetCard(t,w){const r=route(t), emb=embVal(t), ed=getEmb(emb);return `<article class="climaFleetCard263"><div class="climaFleetLeft263"><h4>🚚 Flota ${E(fleet(t)||'-')} / 📦 Emb. ${E(emb||'-')}</h4><div><b>Chofer:</b> ${E(driver(t)||'-')}</div><div><b>Embarque:</b> ${E(emb||'-')}</div><div><b>Cliente:</b> ${E(r.cliente||embCli(ed)||'-')}</div></div><div class="climaFleetMid263"><div><b>Ubicación actual:</b> ${E(locName(t)||'-')}</div><div><b>Destino:</b> ${E(r.destino||embDest(ed)||'-')}</div><div><b>Último GPS:</b> ${E(F(gpsTime(t)))}</div></div>${wxBlock(w)}</article>`;}
  function sideCard(kind,title,body,w,status){return `<article class="${kind==='pass'?'climaPassCard263':'climaDestCard263'}"><div class="climaSideLeft263"><h4>${title}</h4>${status||''}${body}</div>${wxBlock(w)}</article>`;}
  async function renderFleets(list){const el=$id('weatherFleets'); if(!el)return; if(!list.length){el.innerHTML='<div class="weatherLoading">No hay flotas en tránsito para este filtro.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando clima de flotas...</div>'; const cards=[]; for(const t of list)cards.push(fleetCard(t,await weather(lastCoords(t)))); el.innerHTML=cards.join('');}
  async function renderPass(show){const el=$id('weatherPasses'); if(!el)return; if(!show){el.innerHTML='<div class="weatherLoading">No aplica Paso Los Libertadores.</div>';return;} const w=await weather({lat:-32.824,lng:-70.086},{temp:'-4',desc:'Parcialmente nublado',wind:'7 km/h',vis:'-',icon:'🌤️'}); const status='<span class="passOk263">PASO HABILITADO</span>'; const body='<div><b>Fuente:</b> Pasos Fronterizos</div><div><b>Actualización:</b> 7 min</div><div><b>Ubicación:</b> Argentina / Chile</div><div><b>Oficial:</b> <span class="sourceLink263">ver fuente</span></div>'; el.innerHTML=sideCard('pass','🟢 Paso Los Libertadores',body,w,status);}
  async function renderDests(dests){const el=$id('weatherDestinations'); if(!el)return; if(!dests.length){el.innerHTML='<div class="weatherLoading">No hay destino cargado para este embarque.</div>';return;} el.innerHTML='<div class="weatherLoading">Consultando clima de destinos...</div>'; const cards=[]; for(const d of dests){const w=await weather(destCoords(d),{temp:'-',desc:'Sin datos',icon:'🌦️'}); const body=`<div><b>Ubicación:</b> ${E([destLoc(d),destPais(d)].filter(x=>x&&x!=='-').join(', ')||'-')}</div><div><b>Actualizado:</b> ${new Date().toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>`; cards.push(sideCard('dest','📍 '+E(destName(d)),body,w));} el.innerHTML=cards.join('');}
  window.renderClima=async function(force=false){await loadCore(force); syncClimaFilter(); const list=filteredTransits(); const dests=destsFor(list); await renderFleets(list); await renderPass(!selectedEmb() || needsPaso(list,dests)); await renderDests(dests); setVersion();};
  window.ensureClimaDataAndRender=async function(force=false){await window.renderClima(force);};
  window.forceRefreshClima=async function(){await window.renderClima(true);};

  /* Embarques: flotas desde usuarios role=flota */
  function isFlotaUser(u){return N(u?.role||u?.rol)==='flota' || has(u?.flota) || /^flota\d+/i.test(S(u?.id||u?._docId||u?.user));}
  function flotaUserNumber(u){return S(u?.flota||u?.fleet||u?.nroFlota||u?.numeroFlota||u?.unidad||u?.user?.fleet||S(u?.id||u?._docId||u?.user).replace(/^flota/i,''));}
  function opt(vals,ph){const uniq=[...new Set(vals.map(S).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));return `<option value="">${E(ph||'Seleccionar')}</option>`+uniq.map(v=>`<option value="${E(v)}">${E(v)}</option>`).join('');}
  async function loadFlotasUsuarios(){await loadCore(true); return arr('users').filter(isFlotaUser).map(flotaUserNumber).filter(Boolean);}
  window.openCargoFormV244=async function(numero){
    const panel=$id('embarqueDetailPanel'); if(!panel)return; panel.style.display='block';
    const e=(arr('embarques')||[]).find(x=>S(x.numero||x.embarque||x.id||x._docId)===S(numero))||{};
    let flotas=[]; try{flotas=await loadFlotasUsuarios();}catch(err){console.warn('Flotas usuarios',err);}
    const trFlotas=arr('trs').map(fleet).filter(Boolean); flotas=[...new Set([...flotas,...trFlotas])].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
    panel.innerHTML=`<div class="panelHead"><h3>Agregar carga - Emb. ${E(numero)}</h3><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div><div class="embarqueMiniInfo"><b>Cliente:</b> ${E(e.cliente||'-')} <b>Origen:</b> ${E(e.origen||'-')} <b>Destino:</b> ${E(e.destino||'-')}</div><div class="embarqueFormGrid cargaFormGrid"><label>Factura N.º<input id="cargoFactura" placeholder="0255-00000111"></label><label>MIC<input id="cargoMic" placeholder="017AR162701006"></label><label>CRT<input id="cargoCrt" placeholder="26AR225698T"></label><label>Volumen<input id="cargoVolumen" placeholder="6"></label><label>Flota<select id="cargoFlota">${opt(flotas,'Seleccionar flota')}</select></label></div><div class="formActions"><button class="primaryAction" onclick="window.saveCargoV244('${E(numero)}')">Guardar carga</button></div>`;
  };

  /* PDF OEA */
  function logoData(){return new Promise(resolve=>{const img=new Image(); img.crossOrigin='anonymous'; img.onload=()=>{try{const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; const x=c.getContext('2d'); x.drawImage(img,0,0); resolve(c.toDataURL('image/png'));}catch(e){resolve(null)}}; img.onerror=()=>resolve(null); img.src='assets/logo-elta.png';});}
  function routePdf(t){return route(t)||{};} function tractor(t){const fu=arr('users').find(u=>flotaUserNumber(u)===fleet(t)); return S(t?.tractor||t?.tractorId||fu?.tractor)||'-';} function batea(t){const fu=arr('users').find(u=>flotaUserNumber(u)===fleet(t)); return S(t?.batea||t?.bateaId||fu?.batea)||'-';}
  async function findOeaChecklist(emb,flo){
    try{
      if(typeof db==='undefined'||!db)return null;
      let docs=[];
      try{let s=await db.collection('checklists_oea').where('embarque','==',String(emb)).get(); docs=s.docs.map(d=>({id:d.id,...d.data()}));}catch(e){let s=await db.collection('checklists_oea').get(); docs=s.docs.map(d=>({id:d.id,...d.data()}));}
      docs=docs.filter(x=>S(x.embarque)===S(emb) && (!flo || S(x.flota)===S(flo)));
      docs.sort((a,b)=>T(b.fechaHoraGuardado||b.creadoEn||b.createdAt)-T(a.fechaHoraGuardado||a.creadoEn||a.createdAt));
      return docs[0]||null;
    }catch(e){console.warn('No se pudo consultar checklist OEA',e); return null;}
  }
  function pdfSection(doc,title,y){doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(title,14,y); return y+7;}
  function pdfKV(doc,k,v,x,y,w=58){doc.setTextColor(30,42,55); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(k,x,y); doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(S(v)||'-',w),x+25,y); return y+7;}
  window.downloadOeaPdf=async function(embarque,flotaNo){
    const t=arr('trs').find(x=>S(embVal(x))===S(embarque)&&S(fleet(x))===S(flotaNo)) || arr('trs').find(x=>S(embVal(x))===S(embarque));
    const chk=await findOeaChecklist(embarque,flotaNo);
    if(!chk){alert('No se encontró Check List OEA para este tránsito.');return;}
    const jsPDF=window.jspdf?.jsPDF; if(!jsPDF){alert('No se pudo cargar jsPDF.');return;}
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'}); const logo=await logoData(); const pageW=210;
    doc.setFillColor(1,32,63); doc.rect(0,0,pageW,30,'F'); doc.setFillColor(65,184,55); doc.triangle(178,0,210,0,210,30,'F'); if(logo)doc.addImage(logo,'PNG',14,7,36,14);
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('CHECK LIST OEA',105,12,{align:'center'}); doc.setFontSize(10); doc.text('DU - Detención de vehículo',105,21,{align:'center'});
    doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`,196,36,{align:'right'});
    let y=47, r=t?routePdf(t):{};
    y=pdfSection(doc,'Datos generales',y); doc.setDrawColor(205,214,224); doc.roundedRect(14,y-4,182,45,2,2);
    let y1=y+4,y2=y+4; y1=pdfKV(doc,'Cliente:',chk.cliente||r.cliente,18,y1,58); y1=pdfKV(doc,'Origen:',chk.origen||r.origen,18,y1,58); y1=pdfKV(doc,'Destino:',chk.destino||r.destino,18,y1,58); y1=pdfKV(doc,'Embarque:',chk.embarque||embarque,18,y1,58);
    y2=pdfKV(doc,'Flota:',chk.flota||flotaNo,113,y2,42); y2=pdfKV(doc,'Tractor:',chk.tractor||tractor(t||{}),113,y2,42); y2=pdfKV(doc,'Batea:',chk.batea||batea(t||{}),113,y2,42); y2=pdfKV(doc,'Chofer:',chk.chofer||driver(t||{}),113,y2,42); y2=pdfKV(doc,'Lote:',chk.lote||t?.lote||t?.carga,113,y2,42);
    y+=53; y=pdfSection(doc,'Registro del Check List',y); doc.setDrawColor(205,214,224); doc.roundedRect(14,y-4,182,31,2,2);
    let estado=S(chk.estadoGeneral||chk.estado||'').toUpperCase().replace('_',' ')||'-'; const ok=!/NO/.test(estado); doc.setFillColor(ok?31:190, ok?145:50, ok?62:50); doc.roundedRect(18,y+2,35,8,2,2,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(estado,35,y+7,{align:'center'});
    doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(`Fecha/Hora: ${F(chk.fechaHoraGuardado||chk.creadoEn)}`,60,y+7); doc.text(`Creado por: ${S(chk.creadoPor)||'-'}`,60,y+15); const gps=chk.gpsChecklist||{}; const gpsTxt=[gps.ubicacionTexto||gps.localidad||locName(t||{}), has(gps.lat)?`${gps.lat}, ${gps.lng}`:'' ].filter(Boolean).join(' · '); doc.text(doc.splitTextToSize(`Lugar GPS: ${gpsTxt||'-'}`,118),18,y+22);
    y+=38; y=pdfSection(doc,'Detalle del Check List',y);
    const respuestas=Array.isArray(chk.respuestas)?chk.respuestas:[]; const groups={}; respuestas.sort((a,b)=>(Number(a.ordengrupo||0)-Number(b.ordengrupo||0))||(Number(a.orden||0)-Number(b.orden||0))).forEach(rp=>{const g=S(rp.grupo)||'General'; (groups[g]=groups[g]||[]).push(rp);});
    for(const [g,items] of Object.entries(groups)){
      if(y>255){doc.addPage(); y=20;}
      doc.setFillColor(241,245,249); doc.rect(14,y-3,182,7,'F'); doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(g.toUpperCase(),17,y+2); y+=8;
      doc.setFillColor(224,231,238); doc.rect(14,y-3,182,7,'F'); doc.setTextColor(30,42,55); doc.setFontSize(7); doc.text('Código',16,y+2); doc.text('Ítem',40,y+2); doc.text('Resultado',130,y+2); doc.text('Observación',158,y+2); y+=7;
      items.forEach(rp=>{if(y>270){doc.addPage(); y=20;} const txt=doc.splitTextToSize(S(rp.texto)||'-',84); const obs=doc.splitTextToSize(S(rp.observacion)||'-',36); const h=Math.max(7,txt.length*4,obs.length*4); doc.setDrawColor(226,232,240); doc.line(14,y-3,196,y-3); doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(S(rp.codigo)||'-',16,y+2); doc.text(txt,40,y+2); doc.setFont('helvetica','bold'); doc.text(S(rp.resultado||'-').replace('_',' ').toUpperCase(),130,y+2); doc.setFont('helvetica','normal'); doc.text(obs,158,y+2); y+=h;});
    }
    if(y>240){doc.addPage(); y=20;} y+=4; y=pdfSection(doc,'Observaciones generales',y); doc.setDrawColor(205,214,224); doc.roundedRect(14,y-4,182,25,2,2); doc.setTextColor(35,45,60); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(doc.splitTextToSize(S(chk.observacionesGenerales)||'-',174),18,y+3); y+=32;
    doc.setTextColor(35,45,60); doc.setFontSize(8); doc.text('Responsable OEA: _______________________________',18,y); doc.text('Chofer: _______________________________',112,y);
    const pages=doc.internal.getNumberOfPages(); for(let p=1;p<=pages;p++){doc.setPage(p); doc.setDrawColor(0,46,92); doc.line(14,282,196,282); doc.setFontSize(8); doc.setTextColor(0,46,92); doc.setFont('helvetica','bold'); doc.text('ELTA Tracking Solutions',14,287); doc.setFont('helvetica','normal'); doc.text('Reporte generado automáticamente',14,292); doc.text(`Página ${p} de ${pages} · Versión APP ${VERSION}`,196,292,{align:'right'});}
    doc.save(`ELTA_CheckList_OEA_Emb_${S(embarque)}_Flota_${S(flotaNo)}.pdf`);
  };

  /* Tarjeta tránsito: PDF tránsito + OEA */
  const oldCard=typeof window.card==='function'?window.card:(typeof card==='function'?card:null);
  window.card=function(t){
    const o=openTransit(t), r=route(t), emb=E(embVal(t)||''), fl=E(fleet(t)||'');
    return `<div class="item ${o?'open':'closed'} transitCardV1210 transitCardPdf63"><div class="transitLeft"><div class="transitTop"><div class="transitTitle">🚚 Flota ${E(fleet(t)||'-')} / 📦 Emb. ${E(embVal(t)||'-')}</div><span class="transitBadge ${o?'open':''}">${o?'Abierto':'Finalizado'}</span></div><div class="transitDataGrid"><div><b>Chofer:</b> ${E(driver(t)||'-')}</div><div><b>Cliente:</b> ${E(r.cliente||'-')}</div><div><b>Origen:</b> ${E(r.origen||'-')}</div><div><b>Destino:</b> ${E(r.destino||'-')}</div><div><b>Lote/Carga:</b> ${E(t.lote||t.carga||'-')}</div><div><b>Inicio:</b> ${F(t.start?.time||t.start)}</div><div><b>Cierre:</b> ${o?'-':F(t.closed?.time||t.closed)}</div><div class="fullLine"><b>Últ. posición:</b> ${E(locName(t)||'-')}</div><div class="lastReportLine"><b>Últ. reporte:</b> ${F(gpsTime(t))}<button type="button" class="transitPdfIconBtn54" title="Descargar informe de tránsito" onclick="downloadTransitPdf('${emb}','${fl}')">📄</button><button type="button" class="transitOeaIconBtn63" title="Descargar Check List OEA" onclick="downloadOeaPdf('${emb}','${fl}')">OEA</button></div></div></div><div class="transitRight"><h4 class="alertsTitle">⚠️ Alertas del tránsito</h4>${typeof transitAlertsCompact==='function'?transitAlertsCompact(t):'<div class="noAlertsBox">Sin alertas registradas.</div>'}</div></div>`;
  };

  const oldRenderTransitos=typeof renderTransitos==='function'?renderTransitos:null;
  if(oldRenderTransitos){renderTransitos=function(){const r=oldRenderTransitos.apply(this,arguments); setTimeout(setVersion,0); return r;}; window.renderTransitos=renderTransitos;}

  const oldTab=window.tab||tab; if(typeof oldTab==='function')window.tab=function(id){const r=oldTab.apply(this,arguments); setVersion(); if(id==='clima')setTimeout(()=>window.renderClima(false),50); return r;};
  const oldRefresh=window.refresh||refresh; if(typeof oldRefresh==='function')window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); setVersion(); return r;};
  document.addEventListener('DOMContentLoaded',()=>{setVersion(); if($id('clima')?.classList.contains('active'))window.renderClima(false);});
  setVersion();
})();

/* ===== V2.0.150 - Version + flotas del combo desde usuarios role=flota ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  const E=(v)=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const S=(v)=>String(v==null?'':v).trim();
  const N=(v)=>S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  function setVersion(){
    document.querySelectorAll('span,small,p,div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function getLocalUsers(){
    try{if(Array.isArray(window.users))return window.users;}catch(e){}
    try{if(typeof users!=='undefined' && Array.isArray(users))return users;}catch(e){}
    return [];
  }
  async function readUsuarios(){
    let list=getLocalUsers();
    if(list.length) return list;
    try{
      if(typeof read==='function') list=await read('usuarios');
      else if(typeof db!=='undefined' && db){
        const snap=await db.collection('usuarios').get();
        list=snap.docs.map(d=>({id:d.id,_docId:d.id,...d.data()}));
      }
      try{window.users=list;}catch(e){}
      try{users=list;}catch(e){}
      return list||[];
    }catch(err){console.warn('No se pudieron leer usuarios para combo de flotas',err);return getLocalUsers();}
  }
  function isFlotaUser(u){
    const role=N(u?.role||u?.rol||'');
    const id=S(u?.id||u?._docId||u?.docId||u?.user||'');
    const fl=S(u?.flota||u?.fleet||u?.nroFlota||u?.numeroFlota||u?.unidad||'');
    const activo=(u?.activo!==false && u?.active!==false && u?.estado!==false);
    return activo && (role==='flota' || /^flota\d+$/i.test(id) || /^\d+$/.test(id) || /^\d+$/.test(fl));
  }
  function flotaNum(u){
    const direct=S(u?.flota||u?.fleet||u?.nroFlota||u?.numeroFlota||u?.unidad||'');
    if(direct) return direct.replace(/^flota/i,'');
    return S(u?.id||u?._docId||u?.docId||u?.user||'').replace(/^flota/i,'');
  }
  function opt(vals,ph){
    const uniq=[...new Set((vals||[]).map(v=>S(v).replace(/^flota/i,'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
    return `<option value="">${E(ph||'Seleccionar flota')}</option>`+uniq.map(v=>`<option value="${E(v)}">${E(v)}</option>`).join('');
  }
  async function getFlotasRegistradas(){
    const us=await readUsuarios();
    const vals=us.filter(isFlotaUser).map(flotaNum).filter(Boolean);
    return vals;
  }
  function findEmbarque(numero){
    const s=S(numero);
    const local=(typeof build==='function'?build():[]).find?.(x=>S(x.numero||x.embarque||x.id||x._docId)===s);
    if(local) return local;
    try{const arr=Array.isArray(window.embarques)?window.embarques:(typeof embarques!=='undefined'?embarques:[]); return (arr||[]).find(x=>S(x.numero||x.embarque||x.id||x._docId)===s)||{numero:s};}catch(e){return {numero:s};}
  }
  const previousOpenCargo=window.openCargoFormV244;
  window.openCargoFormV244=async function(numero){
    const panel=document.getElementById('embarqueDetailPanel'); if(!panel) return;
    panel.style.display='block';
    const e=findEmbarque(numero)||{numero};
    let flotas=await getFlotasRegistradas();
    if(!flotas.length && typeof previousOpenCargo==='function') return previousOpenCargo.apply(this,arguments);
    panel.innerHTML=`<div class="panelHead"><h3>Agregar carga - Emb. ${E(numero)}</h3><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div><div class="embarqueMiniInfo"><b>Cliente:</b> ${E(e.cliente||'-')} <b>Origen:</b> ${E(e.origen||'-')} <b>Destino:</b> ${E(e.destino||'-')}</div><div class="embarqueFormGrid cargaFormGrid"><label>Factura N.º<input id="cargoFactura" placeholder="0255-00000111"></label><label>MIC<input id="cargoMic" placeholder="017AR162701006"></label><label>CRT<input id="cargoCrt" placeholder="26AR225698T"></label><label>Volumen<input id="cargoVolumen" placeholder="6"></label><label>Flota<select id="cargoFlota">${opt(flotas,'Seleccionar flota')}</select></label></div><div class="formActions"><button class="primaryAction" onclick="window.saveCargoV244('${E(numero)}')">Guardar carga</button></div>`;
  };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(setVersion,100));
  setVersion();
})();

/* ===== V2.0.150 - FIX DEFINITIVO: version, clima compacto y combo flotas desde Firebase ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  const S=v=>String(v==null?'':v).trim();
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const N=v=>S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  function setVersionFinal(){
    try{
      document.querySelectorAll('span,small,p,div').forEach(el=>{
        if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
          el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
        }
      });
      document.title='ELTA ITS - Versión '+VERSION;
    }catch(e){}
  }
  function normalizeFleetValue(u){
    const raw=S(u?.flota||u?.fleet||u?.nroFlota||u?.numeroFlota||u?.unidad||u?.id||u?._docId||u?.docId||u?.user||'');
    return raw.replace(/^flota/i,'').trim();
  }
  function isRegisteredFleet(u){
    const role=N(u?.role||u?.rol||u?.tipo||u?.perfil||'');
    const id=S(u?.id||u?._docId||u?.docId||'');
    const fl=normalizeFleetValue(u);
    const active = !(u?.activo===false || u?.active===false || N(u?.estado)==='inactivo');
    return active && (role==='flota' || /^flota\d+$/i.test(id) || /^\d+$/.test(id) || /^\d+$/.test(fl));
  }
  async function loadFleetOptionsFromFirebase(){
    let list=[];
    if(typeof db!=='undefined' && db && db.collection){
      const snap=await db.collection('usuarios').get();
      list=snap.docs.map(d=>({id:d.id,_docId:d.id,...d.data()}));
      try{ window.users=list; }catch(e){}
      try{ users=list; }catch(e){}
    } else if(Array.isArray(window.users)) {
      list=window.users;
    } else {
      try{ list=Array.isArray(users)?users:[]; }catch(e){ list=[]; }
    }
    return [...new Set(list.filter(isRegisteredFleet).map(normalizeFleetValue).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  }
  function optionHtml(vals,placeholder){
    return `<option value="">${E(placeholder||'Seleccionar flota')}</option>`+(vals||[]).map(v=>`<option value="${E(v)}">${E(v)}</option>`).join('');
  }
  function getEmbarqueLocal(numero){
    const s=S(numero);
    let arr=[];
    try{ if(Array.isArray(window.embarques)) arr=window.embarques; }catch(e){}
    try{ if(!arr.length && Array.isArray(embarques)) arr=embarques; }catch(e){}
    try{ if(typeof build==='function'){ const b=build(); if(Array.isArray(b)&&b.length) arr=b; } }catch(e){}
    return (arr||[]).find(x=>S(x.numero||x.embarque||x.id||x._docId)===s)||{numero:s};
  }
  window.openCargoFormV244 = async function(numero){
    const panel=document.getElementById('embarqueDetailPanel'); if(!panel) return;
    panel.style.display='block';
    const e=getEmbarqueLocal(numero);
    let flotas=[];
    try{ flotas=await loadFleetOptionsFromFirebase(); }catch(err){ console.warn('No se pudieron cargar flotas desde usuarios',err); }
    panel.innerHTML=`<div class="panelHead"><h3>Agregar carga - Emb. ${E(numero)}</h3><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div>
      <div class="embarqueMiniInfo"><b>Cliente:</b> ${E(e.cliente||'-')} <b>Origen:</b> ${E(e.origen||'-')} <b>Destino:</b> ${E(e.destino||'-')}</div>
      <div class="embarqueFormGrid cargaFormGrid">
        <label>Factura N.º<input id="cargoFactura" placeholder="0255-00000111"></label>
        <label>MIC<input id="cargoMic" placeholder="017AR162701006"></label>
        <label>CRT<input id="cargoCrt" placeholder="26AR225698T"></label>
        <label>Volumen<input id="cargoVolumen" placeholder="6"></label>
        <label>Flota<select id="cargoFlota">${optionHtml(flotas,'Seleccionar flota')}</select></label>
      </div>
      <div class="formActions"><button class="primaryAction" onclick="window.saveCargoV244('${E(numero)}')">Guardar carga</button></div>`;
  };
  const css=document.createElement('style');
  css.id='v2065-final-clima-compacto';
  css.textContent=`
    /* Clima: reducción real de textos y tarjetas sin cambiar funcionalidad */
    #clima .climaFleetCard263,
    #clima .climaPassCard263,
    #clima .climaDestCard263{
      padding:10px 13px !important;
      min-height:0 !important;
      line-height:1.12 !important;
      gap:9px !important;
      border-width:1.5px !important;
    }
    #clima .climaFleetCard263{grid-template-columns:minmax(185px,.85fr) minmax(220px,1fr) 130px !important;}
    #clima .climaPassCard263,#clima .climaDestCard263{grid-template-columns:minmax(0,1fr) 120px !important;}
    #clima .climaFleetCard263 h4,
    #clima .climaPassCard263 h4,
    #clima .climaDestCard263 h4{
      font-size:14px !important;
      line-height:1.05 !important;
      margin:0 0 6px 0 !important;
      white-space:nowrap !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
      max-width:100% !important;
    }
    #clima .climaFleetLeft263>div,
    #clima .climaFleetMid263>div,
    #clima .climaSideLeft263>div{
      font-size:11.2px !important;
      line-height:1.16 !important;
      margin:1px 0 !important;
      white-space:nowrap !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
    }
    #clima .climaFleetMid263{padding-left:12px !important;}
    #clima .climaCardWx263{padding-left:12px !important;}
    #clima .climaCardTemp263{font-size:27px !important; line-height:.95 !important;}
    #clima .climaCardIcon263{font-size:24px !important;margin-left:5px !important;}
    #clima .climaCardDesc263{font-size:11.5px !important; line-height:1.08 !important;margin-top:4px !important;}
    #clima .climaCardMini263{font-size:10.8px !important; line-height:1.15 !important;}
    #clima .passOk263{font-size:10.2px !important; padding:3px 8px !important;margin:0 0 7px 0 !important;}
    #clima .weatherCol h3{font-size:16px !important; margin-bottom:9px !important;}
  `;
  document.head.appendChild(css);
  document.addEventListener('DOMContentLoaded',()=>{setVersionFinal(); setTimeout(setVersionFinal,250); setTimeout(setVersionFinal,1200);});
  window.addEventListener('load',()=>{setVersionFinal(); setTimeout(setVersionFinal,500);});
  setInterval(setVersionFinal,3000);
  setVersionFinal();
})();

/* ===== V2.0.150 - Embarques: boton Ver cargas en Agregar carga ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  const S=v=>String(v==null?'':v).trim();
  const N=v=>S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function setVersionV267(){
    try{
      document.querySelectorAll('span,small,p,div').forEach(el=>{
        if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
          el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
        }
      });
    }catch(e){}
  }
  function normalizedFleet(u){
    return S(u?.flota ?? u?.fleet ?? u?.nroFlota ?? u?.numeroFlota ?? u?.unidad ?? u?.id ?? u?._docId ?? u?.docId ?? u?.user ?? '').replace(/^flota/i,'');
  }
  function isRoleFlota(u){
    const role=N(u?.role ?? u?.rol ?? u?.tipo ?? u?.perfil ?? '');
    const active=!(u?.activo===false || u?.active===false || N(u?.estado)==='inactivo');
    return active && role==='flota';
  }
  async function fleetOptionsFromUsuarios(){
    let list=[];
    try{
      if(typeof db!=='undefined' && db && db.collection){
        const snap=await db.collection('usuarios').get();
        list=snap.docs.map(d=>({id:d.id,_docId:d.id,...(d.data?d.data():{})}));
        try{window.users=list;}catch(e){}
        try{users=list;}catch(e){}
      }
    }catch(e){console.warn('No se pudieron leer usuarios para flotas',e);}
    if(!list.length){
      try{list=Array.isArray(window.users)?window.users:[];}catch(e){}
      try{if(!list.length && Array.isArray(users))list=users;}catch(e){}
    }
    return [...new Set(list.filter(isRoleFlota).map(normalizedFleet).filter(Boolean))]
      .sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
  }
  function options(vals,ph){
    return `<option value="">${E(ph||'Seleccionar flota')}</option>`+(vals||[]).map(v=>`<option value="${E(v)}">${E(v)}</option>`).join('');
  }
  function localCargas(numero){
    const out=[];
    ['elta_cargas_embarque_v245','elta_cargas_embarque_v244'].forEach(k=>{
      try{(JSON.parse(localStorage.getItem(k)||'[]')||[]).forEach(c=>{if(S(c?.embarque)===S(numero))out.push(c);});}catch(e){}
    });
    return out;
  }
  async function firestoreCargas(numero){
    const out=[];
    try{
      if(typeof db!=='undefined' && db && db.collection){
        const ref=db.collection('embarque').doc(S(numero));
        try{
          const snap=await ref.collection('cargas').get();
          snap.docs.forEach(d=>out.push({id:d.id,_docId:d.id,...(d.data?d.data():{})}));
        }catch(e){}
        try{
          const doc=await ref.get();
          const data=doc && doc.exists && doc.data ? doc.data() : null;
          if(Array.isArray(data?.cargas)) data.cargas.forEach((c,i)=>out.push({id:'array_'+i,...c}));
        }catch(e){}
      }
    }catch(e){console.warn('No se pudieron leer cargas del embarque',e);}
    return out;
  }
  function cargaDedupKey(c){
    // La misma carga puede venir desde localStorage y Firestore con ids distintos.
    // Para evitar duplicados se usa la identidad operativa de la carga, no el id técnico.
    return [
      c?.factura || c?.facturaNumero || c?.facturaNro || '',
      c?.mic || c?.MIC || '',
      c?.crt || c?.CRT || '',
      c?.flota || c?.unidad || '',
      c?.volumen || ''
    ].map(v=>N(v)).join('|');
  }
  async function getCargas(numero){
    const all=[...localCargas(numero), ...await firestoreCargas(numero)];
    const seen=new Set();
    const clean=[];
    for(const c of all){
      const key=cargaDedupKey(c);
      if(!key.replace(/\|/g,'')) continue;
      if(seen.has(key)) continue;
      seen.add(key);
      clean.push(c);
    }
    return clean;
  }

  function deleteLocalCarga(numero, target){
    const keys=['elta_cargas_embarque_v245','elta_cargas_embarque_v244'];
    const keyTarget=cargaDedupKey(target);
    keys.forEach(k=>{
      try{
        const arr=JSON.parse(localStorage.getItem(k)||'[]')||[];
        const next=arr.filter(c=>!(S(c?.embarque)===S(numero) && cargaDedupKey(c)===keyTarget));
        if(next.length!==arr.length) localStorage.setItem(k,JSON.stringify(next));
      }catch(e){}
    });
  }
  async function deleteFirestoreCarga(numero, target){
    try{
      if(!(typeof db!=='undefined' && db && db.collection)) return;
      const ref=db.collection('embarque').doc(S(numero));
      if(target && target._docId && !String(target._docId).startsWith('array_')){
        try{await ref.collection('cargas').doc(S(target._docId)).delete(); return;}catch(e){}
      }
      // Fallback: buscar por identidad operativa en la subcolección cargas.
      try{
        const snap=await ref.collection('cargas').get();
        const keyTarget=cargaDedupKey(target);
        const batch=db.batch ? db.batch() : null;
        let deleted=0;
        for(const d of snap.docs){
          const data=d.data?d.data():{};
          if(cargaDedupKey(data)===keyTarget){
            if(batch) batch.delete(d.ref); else await d.ref.delete();
            deleted++;
          }
        }
        if(batch && deleted) await batch.commit();
      }catch(e){console.warn('No se pudo eliminar la carga en Firebase',e);}
    }catch(e){console.warn('No se pudo eliminar la carga',e);}
  }
  function closeDeleteCargaModalV295(){
    const m=document.getElementById('deleteCargaModalV295');
    if(m)m.remove();
  }
  window.closeDeleteCargaModalV295=closeDeleteCargaModalV295;
  window.confirmDeleteCargaV295=async function(numero, idx){
    const list=await getCargas(numero);
    const carga=list[idx];
    if(!carga) return;
    closeDeleteCargaModalV295();
    const modal=document.createElement('div');
    modal.id='deleteCargaModalV295';
    modal.className='deleteCargaOverlayV295';
    modal.innerHTML=`<div class="deleteCargaModalV295"><h3>Eliminar carga</h3><p>¿Realmente desea eliminar esta carga del embarque <b>${E(numero)}</b>?</p><div class="deleteCargaInfoV295"><div><b>Factura:</b> ${E(carga.factura||carga.facturaNumero||'-')}</div><div><b>Flota:</b> ${E(carga.flota||'-')}</div><div><b>Volumen:</b> ${E(carga.volumen||'-')}</div></div><p class="deleteWarnV295">Esta acción eliminará únicamente esta carga y actualizará los totales del embarque.</p><div class="deleteActionsV275"><button type="button" class="cancelDeleteV275">Cancelar</button><button type="button" class="confirmDeleteV275">Eliminar</button></div></div>`;
    modal.querySelector('.cancelDeleteV275').onclick=closeDeleteCargaModalV295;
    modal.addEventListener('click',ev=>{if(ev.target===modal) closeDeleteCargaModalV295();});
    modal.querySelector('.confirmDeleteV275').onclick=async()=>{
      const btn=modal.querySelector('.confirmDeleteV275');
      btn.disabled=true; btn.textContent='Eliminando...';
      await deleteFirestoreCarga(numero,carga);
      deleteLocalCarga(numero,carga);
      closeDeleteCargaModalV295();
      await window.openCargasEmbarqueV267(numero);
      try{ if(typeof renderEmbarquesV244==='function') renderEmbarquesV244(); }catch(e){}
      try{ if(typeof renderEmbarques==='function') renderEmbarques(); }catch(e){}
    };
    document.body.appendChild(modal);
  };

  function getEmbarqueInfo(numero){
    const s=S(numero); let arr=[];
    try{if(Array.isArray(window.embarques))arr=window.embarques;}catch(e){}
    try{if(!arr.length && Array.isArray(embarques))arr=embarques;}catch(e){}
    try{if(typeof build==='function'){const b=build(); if(Array.isArray(b)&&b.length)arr=b;}}catch(e){}
    try{if(!arr.length && Array.isArray(trs)){arr=trs.map(t=>({numero:t.embarque,cliente:(t.route||t.ruta||{}).cliente||t.cliente,origen:(t.route||t.ruta||{}).origen||t.origen,destino:(t.route||t.ruta||{}).destino||t.destino}));}}catch(e){}
    return (arr||[]).find(x=>S(x.numero||x.embarque||x.id||x._docId)===s)||{numero:s};
  }
  function closeCargasModalV267(){
    const m=document.getElementById('cargasModalV267');
    if(m)m.remove();
  }
  window.closeCargasModalV267=closeCargasModalV267;
  window.openCargasEmbarqueV267=async function(numero){
    const e=getEmbarqueInfo(numero);
    const list=await getCargas(numero);
    const totalVol=list.reduce((a,c)=>a+(parseFloat(String(c.volumen||'').replace(',','.'))||0),0);
    closeCargasModalV267();
    const modal=document.createElement('div');
    modal.id='cargasModalV267';
    modal.className='cargasModalOverlayV267';
    modal.innerHTML=`<div class="cargasModalV267">
      <div class="cargasModalHeadV267"><div><h3>📋 Cargas del Embarque ${E(numero)}</h3><p>${E(e.cliente||'-')} · ${E(e.origen||'-')} → ${E(e.destino||'-')}</p></div><button type="button" onclick="window.closeCargasModalV267()">Cerrar</button></div>
      <div class="tableWrap"><table class="embarquesTable cargasTableV267"><thead><tr><th>Factura N.º</th><th>MIC</th><th>CRT</th><th>Volumen</th><th>Flota</th><th class="cargaAccionHeadV295">Acción</th></tr></thead><tbody>${list.map((c,idx)=>`<tr><td>${E(c.factura||c.facturaNumero||'-')}</td><td>${E(c.mic||c.MIC||'-')}</td><td>${E(c.crt||c.CRT||'-')}</td><td>${E(c.volumen||'-')}</td><td>${E(c.flota||'-')}</td><td class="cargaAccionCellV295"><button type="button" class="deleteCargaBtnV295" title="Eliminar carga" onclick="event.stopPropagation();window.confirmDeleteCargaV295('${E(numero)}',${idx})">🗑</button></td></tr>`).join('')||'<tr><td colspan="6" class="emptyRow">Sin cargas asociadas.</td></tr>'}</tbody></table></div>
      <div class="cargasModalFootV267"><span>Total cargas: <b>${list.length}</b></span><span>Total volumen: <b>${Number.isInteger(totalVol)?totalVol:totalVol.toFixed(2)}</b></span></div>
    </div>`;
    modal.addEventListener('click',ev=>{if(ev.target===modal) closeCargasModalV267();});
    document.body.appendChild(modal);
  };
  window.openCargoFormV244=async function(numero){
    const panel=document.getElementById('embarqueDetailPanel'); if(!panel)return;
    panel.style.display='block';
    const e=getEmbarqueInfo(numero);
    let flotas=[];
    try{flotas=await fleetOptionsFromUsuarios();}catch(err){console.warn(err);}
    panel.innerHTML=`<div class="panelHead"><h3>Agregar carga - Emb. ${E(numero)}</h3><button onclick="document.getElementById('embarqueDetailPanel').style.display='none'">Cerrar</button></div>
      <div class="embarqueMiniInfo"><b>Cliente:</b> ${E(e.cliente||'-')} <b>Origen:</b> ${E(e.origen||'-')} <b>Destino:</b> ${E(e.destino||'-')}</div>
      <div class="embarqueFormGrid cargaFormGrid">
        <label>Factura N.º<input id="cargoFactura" placeholder="0255-00000111"></label>
        <label>MIC<input id="cargoMic" placeholder="017AR162701006"></label>
        <label>CRT<input id="cargoCrt" placeholder="26AR225698T"></label>
        <label>Volumen<input id="cargoVolumen" placeholder="6"></label>
        <label>Flota<select id="cargoFlota">${options(flotas,'Seleccionar flota')}</select></label>
      </div>
      <div class="formActions cargaActionsV267">
        <button type="button" class="secondaryAction verCargasBtnV267" onclick="window.openCargasEmbarqueV267('${E(numero)}')">📋 Ver cargas</button>
        <button type="button" class="primaryAction" onclick="window.saveCargoV244('${E(numero)}')">Guardar carga</button>
      </div>`;
  };
  const css=document.createElement('style');
  css.id='v2067-ver-cargas-embarque';
  css.textContent=`
    #embarques .cargaActionsV267{display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:12px!important;flex-wrap:wrap!important;margin-top:14px!important;}
    #embarques .verCargasBtnV267,.secondaryAction.verCargasBtnV267{background:rgba(37,52,68,.95)!important;color:#e9f1f8!important;border:1px solid rgba(148,163,184,.35)!important;border-radius:14px!important;padding:13px 22px!important;font-weight:800!important;font-size:14px!important;min-height:46px!important;}
    #embarques .verCargasBtnV267:hover{border-color:rgba(126,243,94,.65)!important;color:#8cff62!important;}
    .cargasModalOverlayV267{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:24px;}
    .cargasModalV267{width:min(980px,94vw);max-height:86vh;overflow:auto;background:linear-gradient(145deg,rgba(13,32,46,.98),rgba(20,43,60,.98));border:1px solid rgba(124,148,168,.35);border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.55);padding:18px;color:#f5f7fb;}
    .cargasModalHeadV267{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px;}
    .cargasModalHeadV267 h3{margin:0 0 4px 0;font-size:20px;}
    .cargasModalHeadV267 p{margin:0;color:#cbd5df;font-weight:600;}
    .cargasModalHeadV267 button{background:#26384b;color:#fff;border:0;border-radius:12px;padding:10px 16px;font-weight:800;}
    .cargasTableV267 th,.cargasTableV267 td{font-size:13px!important;white-space:nowrap;}
    .cargasTableV267 .cargaAccionHeadV295,.cargasTableV267 .cargaAccionCellV295{text-align:center!important;width:64px!important;}
    .deleteCargaBtnV295{background:transparent!important;border:0!important;color:#ef4444!important;font-size:19px!important;line-height:1!important;cursor:pointer!important;padding:6px 8px!important;border-radius:8px!important;box-shadow:none!important;}
    .deleteCargaBtnV295:hover{color:#ff6b6b!important;background:rgba(239,68,68,.08)!important;transform:scale(1.08);}
    .deleteCargaOverlayV295{position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:24px;}
    .deleteCargaModalV295{width:min(460px,92vw);background:linear-gradient(145deg,rgba(14,34,49,.98),rgba(25,48,66,.98));border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:22px;color:#f5f7fb;box-shadow:0 20px 70px rgba(0,0,0,.55);}
    .deleteCargaModalV295 h3{margin:0 0 10px;font-size:22px;font-weight:900;}
    .deleteCargaModalV295 p{margin:8px 0;color:#dce7ef;font-size:15px;line-height:1.35;}
    .deleteCargaInfoV295{display:grid;grid-template-columns:1fr;gap:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;margin:12px 0;color:#eef5fb;}
    .cargasModalFootV267{display:flex;justify-content:flex-end;gap:24px;border-top:1px solid rgba(255,255,255,.12);margin-top:12px;padding-top:12px;color:#dce7ef;font-size:14px;}
  `;
  document.head.appendChild(css);
  document.addEventListener('DOMContentLoaded',()=>{setVersionV267(); setTimeout(setVersionV267,300);});
  window.addEventListener('load',()=>setTimeout(setVersionV267,500));
  setInterval(setVersionV267,3000);
  setVersionV267();
})();

/* ===== V2.0.150 - Recuperar password, ajustes Configuracion, Embarques y KM Alertas ===== */
(function(){
  const APP_VERSION_FIX='2.0.150';
  window.ELTA_APP_VERSION=APP_VERSION_FIX;
  window.APP_VERSION_V2=APP_VERSION_FIX;
  const $=(id)=>document.getElementById(id);
  const escx=(v)=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const txt=(v)=>String(v??'').trim();

  function setVersionLabelsV270(){
    document.querySelectorAll('span,small,div,p').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+APP_VERSION_FIX);
      }
    });
  }

  function setMsg(msg, ok){
    const el=$('msg');
    if(!el)return alert(msg);
    el.textContent=msg;
    el.style.color=ok?'#9cff7a':'#ffb3b3';
  }

  async function findUserByLoginOrEmail(value){
    const key=txt(value);
    if(!key) return null;
    try{
      const doc=await db.collection('usuarios').doc(key).get();
      if(doc.exists) return {id:doc.id,data:doc.data()||{}};
    }catch(e){}
    const fields=['correo','email','mail','user'];
    for(const f of fields){
      try{
        const snap=await db.collection('usuarios').where(f,'==',key).limit(1).get();
        if(!snap.empty){const d=snap.docs[0]; return {id:d.id,data:d.data()||{}};}
      }catch(e){}
    }
    return null;
  }

  window.recuperarPasswordV270 = async function(){
    try{
      init && init();
      const suggested=txt($('user')?.value||'');
      const value=prompt('Ingresá tu usuario o correo para recuperar la contraseña:', suggested);
      if(value===null)return;
      const found=await findUserByLoginOrEmail(value);
      if(!found){setMsg('No se encontró un usuario con ese dato.', false);return;}
      const temp='elta'+String(Math.floor(100000+Math.random()*900000));
      await db.collection('usuarios').doc(found.id).set({pass:temp,requiereCambioPass:true,passTemporal:true,passActualizadaEn:new Date().toISOString()},{merge:true});
      setMsg('Contraseña temporal generada: '+temp+'  | Usuario: '+found.id, true);
      alert('Contraseña temporal generada para '+found.id+':\n\n'+temp+'\n\nIngresá con esa clave y luego cambiala desde Configuración.');
    }catch(e){console.warn(e); setMsg('No se pudo recuperar la contraseña. Revise conexión/Firebase.', false);}
  };

  function wireForgotV270(){
    document.querySelectorAll('.forgot').forEach(a=>{
      a.setAttribute('href','javascript:void(0)');
      a.onclick=(ev)=>{ev.preventDefault(); window.recuperarPasswordV270();};
    });
  }

  function configPostProcessV270(){
    try{
      if(!$('abm')?.classList.contains('active'))return;
      const detail=$('abmList')?.querySelector('.cfgDetailPanel');
      const selectedId=window.__cfgSelectedId;
      const u=(Array.isArray(window.users)?window.users:[]).find(x=>String(x.id)===String(selectedId));
      if(detail && u && String(u.role||'').toLowerCase()==='flota'){
        detail.querySelectorAll('.cfgDetailRow b').forEach(b=>{
          if(/^Tel[eé]fono:/i.test(b.textContent||'')) b.textContent='Información Automática:';
        });
      }
    }catch(e){}
  }

  function addEmbarquesRefreshV270(){
    try{
      const actions=document.querySelector('#embarques .embarquesActions');
      if(!actions || actions.querySelector('.embarquesRefreshBtnV270'))return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='embarquesRefreshBtnV270';
      btn.textContent='Actualizar';
      btn.onclick=async()=>{try{ if(typeof refresh==='function') await refresh(); if(window.renderEmbarquesV244) window.renderEmbarquesV244(); }catch(e){console.warn(e);}};
      actions.prepend(btn);
    }catch(e){}
  }

  function removeKmFromAlertsV270(root=document){
    try{
      const scopes=[root.querySelector?.('#transitos'),root.querySelector?.('#alertas'),root.querySelector?.('#dash'),root].filter(Boolean);
      scopes.forEach(scope=>{
        scope.querySelectorAll?.('div,span,td').forEach(el=>{
          const t=(el.textContent||'').trim();
          if(/^Km\s*:/i.test(t) || /^Km\s*[-:]?\s*$/i.test(t)){
            el.remove();
          }
        });
        scope.querySelectorAll?.('.dashAlertLine,.alertSummaryText234').forEach(el=>{
          el.textContent=(el.textContent||'').replace(/\s*·\s*Km\s*[^·]*/i,'');
        });
      });
    }catch(e){}
  }

  function applyAllV270(){
    setVersionLabelsV270();
    wireForgotV270();
    configPostProcessV270();
    addEmbarquesRefreshV270();
    removeKmFromAlertsV270(document);
  }

  const oldTab=window.tab;
  if(typeof oldTab==='function'){
    window.tab=function(id){const r=oldTab.apply(this,arguments); setTimeout(applyAllV270,80); return r;};
  }
  const oldRefresh=window.refresh;
  if(typeof oldRefresh==='function'){
    window.refresh=async function(){const r=await oldRefresh.apply(this,arguments); setTimeout(applyAllV270,120); return r;};
  }

  const mo=new MutationObserver(()=>{clearTimeout(window.__v270_mo); window.__v270_mo=setTimeout(applyAllV270,80);});
  function start(){applyAllV270(); try{mo.observe(document.body,{childList:true,subtree:true});}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start); else start();
  window.addEventListener('load',()=>setTimeout(applyAllV270,300));
  setInterval(applyAllV270,1500);
})();

/* ===== V2.0.150 - Password visible en Configuracion y version unificada ===== */
(function(){
  const APP_VERSION_273='2.0.150';
  window.ELTA_APP_VERSION=APP_VERSION_273;
  window.APP_VERSION_V2=APP_VERSION_273;

  function setVersionLabelsV273(){
    document.querySelectorAll('span,small,div,p').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+APP_VERSION_273);
      }
    });
  }

  function getSelectedCfgUserV273(){
    try{
      const selectedId=window.__cfgSelectedId;
      const list=Array.isArray(window.users)?window.users:(Array.isArray(users)?users:[]);
      return list.find(x=>String(x.id)===String(selectedId))||null;
    }catch(e){return null;}
  }

  window.toggleCfgPassV273=function(btn){
    const wrap=btn && btn.closest ? btn.closest('.cfgPassValueV273') : null;
    if(!wrap)return;
    const value=wrap.getAttribute('data-pass')||'';
    const visible=wrap.getAttribute('data-visible')==='1';
    wrap.setAttribute('data-visible', visible?'0':'1');
    const txt=wrap.querySelector('.cfgPassTextV273');
    if(txt) txt.textContent=visible?'••••••••':value;
    if(btn) btn.textContent=visible?'👁':'🙈';
  };

  function configPasswordAndLabelsV273(){
    try{
      const abm=document.getElementById('abm');
      if(!abm || !abm.classList.contains('active'))return;
      const detail=document.getElementById('abmList')?.querySelector('.cfgDetailPanel');
      const u=getSelectedCfgUserV273();
      if(!detail || !u)return;

      const rows=[...detail.querySelectorAll('.cfgDetailRow')];
      rows.forEach(row=>{
        const label=row.querySelector('b');
        const value=row.querySelector('em');
        if(!label || !value)return;
        if(String(u.role||'').toLowerCase()==='flota' && /^Tel[eé]fono:/i.test(label.textContent||'')){
          label.textContent='Información Automática:';
        }
        if(/^Contrase[nñ]a:/i.test(label.textContent||'')){
          const pass=String(u.pass||'');
          value.innerHTML = pass
            ? `<span class="cfgPassValueV273" data-visible="0" data-pass="${pass.replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}"><span class="cfgPassTextV273">••••••••</span><button type="button" class="cfgPassEyeV273" onclick="toggleCfgPassV273(this)" title="Ver contraseña">👁</button></span>`
            : '-';
        }
      });
    }catch(e){console.warn('configPasswordAndLabelsV273',e);}
  }

  const oldRender=window.renderABM;
  if(typeof oldRender==='function'){
    window.renderABM=function(){
      const r=oldRender.apply(this,arguments);
      setTimeout(configPasswordAndLabelsV273,0);
      return r;
    };
  }
  const oldTab=window.tab;
  if(typeof oldTab==='function'){
    window.tab=function(){
      const r=oldTab.apply(this,arguments);
      setTimeout(setVersionLabelsV273,0);
      setTimeout(configPasswordAndLabelsV273,0);
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded',()=>{setVersionLabelsV273();setTimeout(configPasswordAndLabelsV273,800);});
  window.addEventListener('load',()=>{setVersionLabelsV273();setTimeout(configPasswordAndLabelsV273,800);});
  setInterval(setVersionLabelsV273,1000);
})();


/* ===== V2.0.150 - Version lock definitivo ===== */
(function(){
  const VERSION = '2.0.150';
  window.ELTA_APP_VERSION = VERSION;
  window.APP_VERSION_V2 = VERSION;
  function applyVersionLock(){
    document.querySelectorAll('span, small, p, div, footer').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent = (el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g, 'Versión '+VERSION);
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', applyVersionLock); else applyVersionLock();
  setInterval(applyVersionLock, 800);
})();


/* ===== V2.0.150 - Embarques: eliminar registro con confirmacion ===== */
(function(){
  const VERSION='2.0.150';
  const S=v=>String(v==null?'':v).trim();
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const deletedKey='elta_deleted_embarques_v275';
  function deletedSet(){try{return new Set(JSON.parse(localStorage.getItem(deletedKey)||'[]')||[])}catch(e){return new Set()}}
  function saveDeleted(set){try{localStorage.setItem(deletedKey,JSON.stringify([...set]));}catch(e){}}
  function setVersion(){
    try{
      window.ELTA_APP_VERSION=VERSION; window.APP_VERSION_V2=VERSION;
      document.querySelectorAll('span,small,p,div').forEach(el=>{
        if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
          el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
        }
      });
    }catch(e){}
  }
  function embFromRow(tr){
    const txt=tr?.querySelector('td')?.textContent||'';
    return S(txt.replace(/^Emb\.\s*/i,''));
  }
  function removeDeletedRows(){
    const tbody=document.getElementById('embarquesTbody'); if(!tbody)return;
    const del=deletedSet();
    [...tbody.querySelectorAll('tr')].forEach(tr=>{const n=embFromRow(tr); if(n && del.has(n))tr.remove();});
    if(!tbody.children.length){tbody.innerHTML='<tr><td colspan="8" class="emptyRow">No hay embarques para mostrar.</td></tr>';}
  }
  function enhanceDeleteButtons(){
    const tbody=document.getElementById('embarquesTbody'); if(!tbody)return;
    removeDeletedRows();
    [...tbody.querySelectorAll('tr')].forEach(tr=>{
      const n=embFromRow(tr); if(!n)return;
      const actions=tr.querySelector('td:last-child'); if(!actions || actions.querySelector('.deleteEmbarqueBtnV275'))return;
      actions.classList.add('embarqueActionsV275');
      const btn=document.createElement('button');
      btn.type='button'; btn.className='deleteEmbarqueBtnV275'; btn.title='Eliminar embarque'; btn.innerHTML='🗑';
      btn.onclick=()=>window.confirmDeleteEmbarqueV275(n);
      actions.appendChild(btn);
    });
  }
  async function deleteLocal(numero){
    ['elta_cargas_embarque_v245','elta_cargas_embarque_v244'].forEach(k=>{
      try{const arr=JSON.parse(localStorage.getItem(k)||'[]')||[]; localStorage.setItem(k,JSON.stringify(arr.filter(c=>S(c?.embarque)!==S(numero))));}catch(e){}
    });
    const del=deletedSet(); del.add(S(numero)); saveDeleted(del);
    try{ if(Array.isArray(window.embarques)) window.embarques=window.embarques.filter(e=>S(e?.numero||e?.embarque||e?.id||e?._docId)!==S(numero)); }catch(e){}
    try{ if(Array.isArray(embarques)) embarques=embarques.filter(e=>S(e?.numero||e?.embarque||e?.id||e?._docId)!==S(numero)); }catch(e){}
  }
  async function deleteFirestore(numero){
    if(typeof db==='undefined' || !db || !db.collection)return;
    const ref=db.collection('embarque').doc(S(numero));
    try{
      const snap=await ref.collection('cargas').get();
      if(snap && snap.docs && snap.docs.length){
        const batch=db.batch ? db.batch() : null;
        if(batch){snap.docs.forEach(d=>batch.delete(d.ref)); await batch.commit();}
        else {for(const d of snap.docs){await d.ref.delete();}}
      }
    }catch(e){console.warn('No se pudieron eliminar cargas del embarque',e);}
    try{await ref.delete();}catch(e){
      console.warn('No se pudo eliminar el documento, se marca inactivo',e);
      try{await ref.set({activo:false,deleted:true,deletedAt:new Date().toISOString()},{merge:true});}catch(err){throw err;}
    }
  }
  window.confirmDeleteEmbarqueV275=function(numero){
    const old=document.getElementById('deleteEmbarqueModalV275'); if(old)old.remove();
    const modal=document.createElement('div'); modal.id='deleteEmbarqueModalV275'; modal.className='deleteEmbarqueOverlayV275';
    modal.innerHTML=`<div class="deleteEmbarqueModalV275"><h3>Eliminar embarque</h3><p>¿Realmente desea eliminar el embarque <b>${E(numero)}</b>?</p><p class="deleteWarnV275">Esta acción eliminará el registro del embarque y sus cargas asociadas.</p><div class="deleteActionsV275"><button type="button" class="cancelDeleteV275">Cancelar</button><button type="button" class="confirmDeleteV275">Eliminar</button></div></div>`;
    modal.querySelector('.cancelDeleteV275').onclick=()=>modal.remove();
    modal.querySelector('.confirmDeleteV275').onclick=async()=>{
      const btn=modal.querySelector('.confirmDeleteV275'); btn.disabled=true; btn.textContent='Eliminando...';
      try{
        await deleteFirestore(numero);
        await deleteLocal(numero);
        modal.remove();
        if(typeof refresh==='function') {try{await refresh();}catch(e){}}
        if(typeof window.renderEmbarquesV244==='function') {try{await window.renderEmbarquesV244();}catch(e){}}
        setTimeout(enhanceDeleteButtons,120);
        alert('Embarque '+numero+' eliminado correctamente.');
      }catch(e){console.error(e); btn.disabled=false; btn.textContent='Eliminar'; alert('No se pudo eliminar el embarque.');}
    };
    modal.addEventListener('click',ev=>{if(ev.target===modal)modal.remove();});
    document.body.appendChild(modal);
  };
  const oldRender=window.renderEmbarquesV244;
  if(typeof oldRender==='function'){
    window.renderEmbarquesV244=async function(){const r=await oldRender.apply(this,arguments); setTimeout(enhanceDeleteButtons,80); return r;};
  }
  const css=document.createElement('style'); css.id='v2075-delete-embarques'; css.textContent=`
    #embarques .embarqueActionsV275{display:flex!important;align-items:center!important;gap:8px!important;white-space:nowrap!important;}
    #embarques .deleteEmbarqueBtnV275{min-width:0!important;width:34px!important;height:42px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#ef4444!important;font-size:22px!important;font-weight:900!important;cursor:pointer!important;box-shadow:none!important;padding:4px 6px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;}
    #embarques .deleteEmbarqueBtnV275:hover{background:transparent!important;color:#ff6b6b!important;box-shadow:none!important;transform:scale(1.08);}
    .deleteEmbarqueOverlayV275{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:24px;}
    .deleteEmbarqueModalV275{width:min(460px,92vw);background:linear-gradient(145deg,rgba(14,34,49,.98),rgba(25,48,66,.98));border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:22px;color:#f5f7fb;box-shadow:0 20px 70px rgba(0,0,0,.55);}
    .deleteEmbarqueModalV275 h3{margin:0 0 10px;font-size:22px;font-weight:900;}
    .deleteEmbarqueModalV275 p{margin:8px 0;color:#dce7ef;font-size:15px;line-height:1.35;}
    .deleteWarnV275{color:#ffd166!important;font-weight:700;}
    .deleteActionsV275{display:flex;justify-content:flex-end;gap:12px;margin-top:18px;}
    .deleteActionsV275 button{border:0;border-radius:12px;padding:12px 18px;font-weight:900;cursor:pointer;}
    .cancelDeleteV275{background:#26384b;color:#fff;}
    .confirmDeleteV275{background:#c62828;color:#fff;}
    .confirmDeleteV275:disabled{opacity:.7;cursor:wait;}
  `; document.head.appendChild(css);
  document.addEventListener('DOMContentLoaded',()=>{setVersion(); setTimeout(enhanceDeleteButtons,700);});
  window.addEventListener('load',()=>{setVersion(); setTimeout(enhanceDeleteButtons,900);});
  setInterval(()=>{setVersion(); enhanceDeleteButtons();},2000);
  setVersion();
})();


/* ===== V2.0.150 - Embarques: papelera sin fondo ===== */
(function(){
  const css=document.createElement('style');
  css.id='v2080-delete-icon-clean';
  css.textContent=`#embarques .deleteEmbarqueBtnV275{background:transparent!important;border:0!important;box-shadow:none!important;color:#ef4444!important;border-radius:0!important;width:34px!important;min-width:34px!important;padding:4px 6px!important;font-size:22px!important;}#embarques .deleteEmbarqueBtnV275:hover{background:transparent!important;color:#ff6b6b!important;box-shadow:none!important;transform:scale(1.08);}`;
  document.head.appendChild(css);
})();

/* ===== V2.0.150 - MENU LATERAL ESTABLE: sin intervalos ni reescrituras repetidas ===== */
(function(){
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;
  const MENU=[
    ['dash','🏠','Torre de Control'],
    ['transitos','🚚','Tránsitos'],
    ['entrega','🏁','Entregas'],
    ['mapa','📍','Seguimiento'],
    ['clima','🌦️','Clima'],
    ['unidades','🚛','Unidades / Choferes'],
    ['alertas','🔔','Alertas'],
    ['embarques','📦','Embarques'],
    ['clientes','🏢','Clientes / Destinos'],
    ['abm','⚙️','Configuración']
  ];
  function setVersion(){
    document.querySelectorAll('span,small,p,div,footer').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/g,'Versión '+VERSION);
      }
    });
  }
  function ensureMenuMarkup(){
    MENU.forEach(([id,icon,text])=>{
      const btn=[...document.querySelectorAll('.sideNav button')].find(b=>(b.getAttribute('onclick')||'').includes(id));
      if(!btn) return;
      let ic=btn.querySelector(':scope > .menuIcon');
      let tx=btn.querySelector(':scope > .menuText');
      if(!ic || !tx){
        btn.innerHTML='<span class="menuIcon" aria-hidden="true"></span><span class="menuText"></span>';
        ic=btn.querySelector('.menuIcon');
        tx=btn.querySelector('.menuText');
      }
      ic.textContent=icon;
      tx.textContent=text;
      btn.title=text;
      btn.querySelectorAll('.sideAlertBadge,.badgeCount,.alertBadge,.topAlertCount').forEach(x=>x.remove());
    });
    setVersion();
  }
  window.normalizeSideMenuStable=ensureMenuMarkup;
  window.toggleSidebar=function(){
    document.body.classList.toggle('sidebarCollapsed');
    ensureMenuMarkup();
  };
  const oldTab=window.tab;
  if(typeof oldTab==='function'){
    window.tab=function(){
      const r=oldTab.apply(this,arguments);
      ensureMenuMarkup();
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded',ensureMenuMarkup);
  window.addEventListener('load',ensureMenuMarkup);
  setTimeout(ensureMenuMarkup,100);
})();


/* ===== V2.0.150 - ENTREGAS: ROUTING UNICO SIN REFRESH ===== */
(function(){
  'use strict';
  const VERSION='2.0.150';
  window.ELTA_APP_VERSION=VERSION;
  window.APP_VERSION_V2=VERSION;

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const S=(v)=>String(v??'').trim();
  const L=(v)=>S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const arr=(n)=>Array.isArray(window[n])?window[n]:[];
  const get=(o,keys)=>{for(const k of keys){const v=o&&o[k]; if(v!==undefined&&v!==null&&S(v)!=='') return v;} return '';};
  const fmt=(v)=>{try{if(!v)return '-'; if(v&&typeof v.toDate==='function')v=v.toDate(); const d=new Date(v); if(isNaN(d)) return S(v)||'-'; return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return S(v)||'-';}};
  const shortFmt=(v)=>{try{if(!v)return '-'; if(v&&typeof v.toDate==='function')v=v.toDate(); const d=new Date(v); if(isNaN(d)) return S(v)||'-'; return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return S(v)||'-';}};
  function setVersion(){
    document.querySelectorAll('span,small,p,div,footer').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/i.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/gi,'Versión '+VERSION);
      }
    });
    document.title='ELTA ITS - Versión '+VERSION;
  }

  function ensureEntregaPanelStable(){
    const nav=document.querySelector('.sideNav');
    if(nav){
      const buttons=[...nav.querySelectorAll('button')];
      const entregaButtons=buttons.filter(b=>b.dataset.menuId==='entrega'||/(^|[^a-z])entrega([^a-z]|$)/i.test(b.getAttribute('onclick')||'')||/entregas/i.test(b.textContent||''));
      let entrega=entregaButtons[0];
      if(!entrega){
        entrega=document.createElement('button');
        entrega.type='button';
        const emb=buttons.find(b=>(b.getAttribute('onclick')||'').includes('embarques'));
        if(emb && emb.parentNode) emb.parentNode.insertBefore(entrega, emb.nextSibling); else nav.appendChild(entrega);
      }
      entrega.dataset.menuId='entrega';
      entrega.setAttribute('onclick',"window.ensureEntregaPanelStable&&window.ensureEntregaPanelStable(); tab('entrega'); window.renderEntrega&&window.renderEntrega(false); return false;");
      entrega.innerHTML='<span class="menuIcon">🏁</span><span class="menuText">Entregas</span>';
      entrega.title='Entregas';
      entregaButtons.slice(1).forEach(b=>b.remove());
      const emb=[...nav.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('embarques'));
      if(emb){
        emb.dataset.menuId='embarques';
        emb.setAttribute('onclick',"tab('embarques')");
        const ic=emb.querySelector('.menuIcon'); if(ic) ic.textContent='📦';
        const tx=emb.querySelector('.menuText'); if(tx) tx.textContent='Embarques';
      }
    }

    let sec=document.getElementById('entrega');
    if(!sec){
      sec=document.createElement('section');
      sec.id='entrega';
      sec.className='panel entregaPanel';
      const embSec=document.getElementById('embarques');
      const parent=embSec&&embSec.parentNode?embSec.parentNode:(document.querySelector('.content')||document.querySelector('.mainContent')||document.querySelector('.dashboardShell')||document.querySelector('main')||document.body);
      parent.insertBefore(sec, embSec?embSec.nextSibling:null);
    }
    if(!sec.dataset.entregaBase){
      sec.dataset.entregaBase='1';
      sec.innerHTML=`<div class="sectionTitle entregaHeader"><div><h2>Entregas</h2><p>Seguimiento de flotas en tránsito</p></div><button type="button" class="entregaRefreshBtn" onclick="window.renderEntrega&&window.renderEntrega(true)">Actualizar</button></div>
      <div class="entregaToolbar glassPanel">
        <label>Cliente<select id="entregaFiltroCliente"><option value="">Todos</option></select></label>
        <label>Embarque<select id="entregaFiltroEmbarque"><option value="">Todos</option></select></label>
        <label>Destino<select id="entregaFiltroDestino"><option value="">Todos</option></select></label>
        <label>Flota<select id="entregaFiltroFlota"><option value="">Todos</option></select></label>
        <label>Estado<select id="entregaFiltroEstado"><option value="">Todos</option><option value="en transito">En tránsito</option><option value="cerrado">Cerrado</option></select></label>
      </div><div id="entregaCards" class="entregaCards"></div>`;
    }
    setVersion();
  }
  window.ensureEntregaPanelStable=ensureEntregaPanelStable;

  function countryOf(v){const s=L(v); if(/(chile|stli|los andes|libertadores|cl\b)/.test(s))return 'chile'; if(/(paraguay|asuncion|puerto jose falcon|falcon|clorinda|py\b)/.test(s))return 'paraguay'; if(/(uruguay|montevideo|fray bentos|uy\b)/.test(s))return 'uruguay'; if(/(brasil|brazil|curitiba|sao paulo|br\b)/.test(s))return 'brasil'; if(/(argentina|zarate|zárate|cordoba|córdoba|clz|clc|ar\b|arg\b)/.test(s))return 'argentina'; return '';}
  function flagFor(v){const c=countryOf(v); return c==='argentina'?'🇦🇷':c==='chile'?'🇨🇱':c==='paraguay'?'🇵🇾':c==='uruguay'?'🇺🇾':c==='brasil'?'🇧🇷':'🌐';}
  function codeFor(v){const c=countryOf(v); return c==='argentina'?'AR':c==='chile'?'CL':c==='paraguay'?'PY':c==='uruguay'?'UY':c==='brasil'?'BR':'--';}
  function statusObj(t,e){const s=L([get(t,['estado','status']),get(e,['estado','status'])].join(' ')); if(s.includes('final')||s.includes('cerr')||t?.closed||t?.cierre)return {txt:'CERRADO',cls:'done'}; if(s.includes('aduana'))return {txt:'EN ADUANA',cls:'customs'}; if(s.includes('program'))return {txt:'PROGRAMADO',cls:'planned'}; return {txt:'EN TRÁNSITO',cls:'open'};}
  function route(t){try{if(typeof window.ruta==='function')return window.ruta(t)||{};}catch(e){} return t?.ruta||t?.route||{};}
  function embNo(e){return S(get(e,['numero','embarque','idEmbarque','codigo'])||e?._docId||e?.id||'');}
  function trEmb(t){return S(get(t,['embarque','emb','embarqueId','numeroEmbarque']));}
  function trFleet(t){return S(get(t,['flota','fleet','usuario','user'])||t?.driver?.flota||'');}
  function lastTime(t){return get(t,['updatedAt','lastUpdate','lastReport','ultimoReporte','fechaActualizacion'])||t?.start?.time||t?.start||'';}
  function embDate(e){return get(e,['fecha','fechaHora','createdAt','start']);}
  function elapsed(v){try{if(!v)return '-'; if(v&&typeof v.toDate==='function')v=v.toDate(); const d=new Date(v); if(isNaN(d))return '-'; const ms=Date.now()-d.getTime(); if(ms<0)return '-'; const h=Math.floor(ms/3600000), dd=Math.floor(h/24), hh=h%24, mm=Math.floor((ms%3600000)/60000); return (dd?dd+' d ':'')+hh+' h '+mm+' m';}catch(e){return '-';}}
  function buildRows(){
    const em=new Map(); arr('embarques').forEach(e=>{const n=embNo(e); if(n)em.set(String(n),e);});
    const groups=new Map();
    arr('trs').forEach(t=>{const fl=trFleet(t); if(!fl)return; const n=trEmb(t), e=em.get(String(n))||{}, rt=route(t)||{}; if(!groups.has(fl))groups.set(fl,{flota:fl,items:[]}); groups.get(fl).items.push({t,e,rt,n});});
    arr('embarques').forEach(e=>{const fl=S(get(e,['flota','flotas'])); if(!fl)return; fl.split(',').map(x=>x.trim()).filter(Boolean).forEach(f=>{if(!groups.has(f))groups.set(f,{flota:f,items:[]}); if(!groups.get(f).items.length)groups.get(f).items.push({t:{},e,rt:{},n:embNo(e)});});});
    return [...groups.values()].map(g=>{g.items.sort((a,b)=>String(lastTime(b.t)||embDate(b.e)||b.n).localeCompare(String(lastTime(a.t)||embDate(a.e)||a.n),'es',{numeric:true})); const it=g.items[0]||{}, t=it.t||{}, e=it.e||{}, rt=it.rt||{}; const nums=[...new Set(g.items.map(x=>x.n).filter(Boolean))]; return {flota:g.flota, embarques:nums, numero:S(it.n||embNo(e)), cliente:S(get(e,['cliente','client'])||rt.cliente||t.cliente), origen:S(get(e,['origen','origin'])||rt.origen||t.origen||'Centro Logístico Zárate'), destino:S(get(e,['destino','destination'])||rt.destino||t.destino||''), fecha:embDate(e)||get(t,['fecha'])||t.start?.time||t.start||'', t,e,estado:statusObj(t,e).txt};}).sort((a,b)=>String(a.flota).localeCompare(String(b.flota),'es',{numeric:true}));
  }
  function stages(row){let mid=[];const d=countryOf(row.destino); if(d==='chile')mid=['Uspallata','Los Andes']; else if(d==='paraguay')mid=['Clorinda','Puerto José Falcón','Depósito Fiscal Paraguay']; else if(d==='uruguay')mid=['Gualeguaychú','Fray Bentos']; return [S(row.origen)||'Origen',...mid,S(row.destino)||'Lugar de entrega'].filter(Boolean).slice(0,6);}
  function progress(row,st){const s=L([get(row.t,['estado','status']),get(row.e,['estado','status'])].join(' ')); if(s.includes('final')||s.includes('cerr'))return st.length-1; if(s.includes('aduana'))return Math.min(2,st.length-1); if(row.t&&Object.keys(row.t).length)return Math.min(1,st.length-1); return 0;}
  function vehicle(){return `<img class="entregaCarrierImg" src="assets/camion-automobilero.png" alt="Camión automobilero">`;}
  function card(row){const st=statusObj(row.t,row.e), sts=stages(row), pi=progress(row,sts), pct=Math.max(0,Math.min(100,(pi/(Math.max(1,sts.length-1)))*100)); const upd=fmt(lastTime(row.t)||row.fecha), el=elapsed(row.fecha||lastTime(row.t)); const next=sts[Math.min(pi+1,sts.length-1)]||'-'; return `<article class="entregaCard"><div class="entregaTop"><div class="entregaFleet"><span class="entregaFleetIcon">🚚</span><div><h3>Flota ${esc(row.flota)}</h3><span class="entregaStatus ${st.cls}">${esc(st.txt)}</span><small>Emb. ${esc(row.embarques.join(', ')||row.numero||'-')}</small></div></div><div class="entregaMeta"><span>Última act.</span><b>${esc(upd)}</b></div><div class="entregaMeta"><span>Tiempo transcurrido</span><b>${esc(el)}</b></div><div class="entregaMeta"><span>Próximo hito</span><b>${esc(next)}</b></div><div class="entregaMeta"><span>Estado</span><b class="state ${st.cls}">${esc(st.txt)}</b></div><div class="entregaFlags"><strong>${esc(codeFor(row.origen))} › ${esc(codeFor(row.destino))}</strong><div><span>${flagFor(row.origen)}</span><i>›</i><span>${flagFor(row.destino)}</span></div></div></div><div class="entregaTimeline"><div class="entregaLine"><i style="width:${pct}%"></i></div>${sts.map((s,i)=>`<div class="entregaStep ${i<=pi?'done':''} ${i===pi?'current':''}" style="left:${(i/(Math.max(1,sts.length-1)))*100}%"><b>${esc(s)}</b><em>${esc(i===0?shortFmt(row.fecha):(i===pi?upd:'-'))}</em></div>`).join('')}<div class="entregaVehicle" style="left:${pct}%">${vehicle()}</div></div><div class="entregaBottom"><span><b>Actualizado:</b> ${esc(upd)}</span><span><b>Tiempo transcurrido:</b> ${esc(el)}</span><span><b>Próximo hito:</b> ${esc(next)}</span><span><b>Estado:</b> ${esc(st.txt)}</span></div></article>`;}
  function fillFilters(rows){const defs=[['entregaFiltroCliente','cliente','Todos'],['entregaFiltroEmbarque','embarques','Todos'],['entregaFiltroDestino','destino','Todos'],['entregaFiltroFlota','flota','Todos']]; defs.forEach(([id,key,all])=>{const sel=document.getElementById(id); if(!sel)return; const cur=sel.value; let vals=[]; rows.forEach(r=>{let v=r[key]; if(Array.isArray(v)) vals.push(...v); else if(v) vals.push(v);}); vals=[...new Set(vals.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true})); sel.innerHTML=`<option value="">${all}</option>`+vals.map(v=>`<option value="${esc(v)}">${key==='embarques'?'Emb. ':''}${esc(v)}</option>`).join(''); sel.value=vals.includes(cur)?cur:''; sel.onchange=()=>window.renderEntrega(false);}); const es=document.getElementById('entregaFiltroEstado'); if(es)es.onchange=()=>window.renderEntrega(false);}
  window.renderEntrega=async function(force=false){ensureEntregaPanelStable(); if(force&&typeof window.refresh==='function'){try{await window.refresh();}catch(e){console.warn(e);}} let rows=buildRows(); fillFilters(rows); const fc=L(document.getElementById('entregaFiltroCliente')?.value), fe=L(document.getElementById('entregaFiltroEmbarque')?.value), fd=L(document.getElementById('entregaFiltroDestino')?.value), ff=L(document.getElementById('entregaFiltroFlota')?.value), fs=L(document.getElementById('entregaFiltroEstado')?.value); rows=rows.filter(r=>(!fc||L(r.cliente)===fc)&&(!fe||(r.embarques||[]).some(e=>L(e)===fe))&&(!fd||L(r.destino)===fd)&&(!ff||L(r.flota)===ff)&&(!fs||(fs==='cerrado'?statusObj(r.t,r.e).cls==='done':statusObj(r.t,r.e).cls!=='done'))); const box=document.getElementById('entregaCards'); if(box) box.innerHTML=rows.length?rows.map(card).join(''):'<div class="glassPanel entregaEmpty">No hay flotas para el filtro seleccionado.</div>'; setVersion();};

  function injectCss(){
    if(document.getElementById('entrega-estable-v2140-css'))return;
    const st=document.createElement('style'); st.id='entrega-estable-v2140-css';
    st.textContent=`#entrega .entregaHeader{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.entregaRefreshBtn{height:42px;border-radius:12px;border:1px solid rgba(76,175,67,.72);background:#1d6d2f;color:#d8ffd0;font-weight:900;padding:0 22px}.entregaToolbar{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:12px 14px;margin-bottom:14px}.entregaToolbar label{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;font-weight:800;color:#dce6f1}.entregaToolbar select{height:40px;border-radius:10px;border:1px solid rgba(148,163,184,.30);background:#102033;color:#fff;padding:0 12px;font-weight:800}.entregaCards{display:flex;flex-direction:column;gap:12px}.entregaCard{border:1px solid rgba(148,163,184,.24);background:linear-gradient(135deg,rgba(13,30,45,.97),rgba(8,20,33,.94));border-radius:15px;padding:14px 16px;box-shadow:0 14px 28px rgba(0,0,0,.22)}.entregaCard:nth-child(even){background:linear-gradient(135deg,rgba(22,44,64,.98),rgba(13,29,45,.96))}.entregaTop{display:grid;grid-template-columns:1.25fr repeat(4,1fr) .85fr;gap:12px;align-items:center}.entregaFleet{display:flex;align-items:center;gap:12px}.entregaFleetIcon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(32,156,48,.25);border:1px solid rgba(82,255,96,.42);font-size:21px}.entregaFleet h3{margin:0;font-size:22px;line-height:1;color:#f8fafc}.entregaFleet small{display:block;margin-top:6px;color:#cbd5e1;font-size:12px}.entregaStatus{display:inline-block;margin-top:5px;padding:4px 9px;border-radius:7px;font-size:11px;font-weight:900}.entregaStatus.open{background:#155d2d;color:#9dff7e}.entregaStatus.done{background:#475569;color:#e5e7eb}.entregaStatus.planned{background:#0b4a8f;color:#93c5fd}.entregaStatus.customs{background:#6b4e12;color:#fde68a}.entregaMeta{border-left:1px solid rgba(148,163,184,.18);padding-left:12px;min-width:0}.entregaMeta span{display:block;font-size:12px;color:#dbeafe;margin-bottom:3px}.entregaMeta b{display:block;color:#f8fafc;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.entregaMeta b.state.open{color:#7cff63}.entregaFlags{text-align:center}.entregaFlags strong{display:block;color:#f8fafc;font-size:15px;letter-spacing:.05em;margin-bottom:5px}.entregaFlags div{display:flex;gap:8px;align-items:center;justify-content:center;font-size:21px}.entregaFlags i{font-style:normal;color:#e2e8f0}.entregaTimeline{position:relative;height:88px;margin-top:10px;padding:8px 24px 0}.entregaLine{position:absolute;left:26px;right:26px;top:36px;height:2px;background:rgba(226,232,240,.75);border-radius:10px;overflow:hidden}.entregaLine i{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#84cc16,#f97316);border-radius:10px}.entregaStep{position:absolute;top:20px;transform:translateX(-50%);text-align:center;min-width:108px}.entregaStep b{display:block;margin-top:12px;color:#f8fafc;font-size:10px;text-transform:uppercase;line-height:1.15;white-space:normal}.entregaStep em{display:block;margin-top:5px;color:#cbd5e1;font-size:10px;font-style:normal}.entregaStep::after{content:'';position:absolute;left:50%;top:8px;width:12px;height:12px;border-radius:50%;transform:translateX(-50%);border:2px solid #e2e8f0;background:#0b1b2b}.entregaStep.done::after{border-color:#22c55e;background:#22c55e}.entregaStep.current::after{border-color:#fb923c;background:#fb923c;box-shadow:0 0 0 5px rgba(249,115,22,.16)}.entregaVehicle{position:absolute;top:58px;transform:translateX(-50%);filter:drop-shadow(0 8px 10px rgba(0,0,0,.45));z-index:2}.entregaCarrierImg{width:36px;height:auto;display:block}.entregaTimeline::after{content:'';position:absolute;left:26px;right:26px;top:70px;border-top:2px dashed rgba(148,163,184,.45)}.entregaBottom{display:grid;grid-template-columns:1.1fr 1.1fr 1.1fr .8fr;gap:10px;margin-top:6px;padding:9px 12px;border-radius:11px;background:rgba(255,255,255,.035);border:1px solid rgba(148,163,184,.12);color:#dbeafe;font-size:13px}.entregaBottom span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.entregaBottom b{color:#9dff7e}.entregaEmpty{padding:22px;color:#cbd5e1;font-weight:800}.embarquesTable th,.embarquesTable td{padding:10px 12px!important;font-size:13px!important}.embarquesTable .primaryAction{padding:8px 14px!important;font-size:13px!important}.tableWrap{border-radius:14px!important}@media(max-width:1250px){.entregaToolbar{grid-template-columns:1fr 1fr}.entregaTop{grid-template-columns:1fr 1fr}.entregaFlags{text-align:left}.entregaFlags div{justify-content:flex-start}.entregaBottom{grid-template-columns:1fr}.entregaTimeline{overflow-x:auto}}`;
    document.head.appendChild(st);
  }

  function boot(){injectCss();ensureEntregaPanelStable();setVersion();}
  document.addEventListener('DOMContentLoaded',boot);
  window.addEventListener('load',boot);
})();
