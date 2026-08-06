"use strict";

const shows = {
  "Resenha": {
    emoji: "🥃",
    formation: "Voz e Violão",
    duration: "2 horas",
    description: "Um show intimista, perfeito para bares, pubs, confraternizações e eventos menores, com voz e violão.",
    notes: "Esta proposta refere-se à contratação do formato Resenha, conforme data, horário e local informados. A apresentação terá duração de até 2 (duas) horas."
  },
  "Acústico Prime": {
    emoji: "🎸",
    formation: "Voz e 2 Violões",
    duration: "2 horas e 30 minutos",
    description: "Dois violões em perfeita harmonia, proporcionando um repertório rico, elegante e envolvente para eventos que buscam uma apresentação acústica sofisticada.",
    notes: "Esta proposta refere-se à contratação do formato Acústico Prime, com voz e dois violões. A apresentação terá duração de até 2 (duas) horas e 30 (trinta) minutos."
  },
  "Duo Premium": {
    emoji: "⭐",
    formation: "Voz, Violão e Percussão",
    duration: "2 horas e 30 minutos",
    description: "Formação com voz, violão e percussão, oferecendo um show mais dinâmico, envolvente e com maior presença rítmica.",
    notes: "Esta proposta refere-se à contratação do formato Duo Premium, com voz, violão e percussão. A apresentação terá duração de até 2 (duas) horas e 30 (trinta) minutos."
  },
  "Projeto Milonga": {
    emoji: "🪗",
    formation: "Voz, Violão e Sanfona",
    duration: "2 horas e 30 minutos",
    description: "Uma experiência musical autêntica, unindo voz, violão e sanfona em um repertório que valoriza o sertanejo de raiz, o modão e ritmos tradicionais, criando um ambiente acolhedor, dançante e cheio de emoção.",
    notes: "Esta proposta refere-se à contratação do Projeto Milonga, com voz, violão e sanfona. A apresentação terá duração de até 2 (duas) horas e 30 (trinta) minutos."
  },
  "Live Experience": {
    emoji: "🎤",
    formation: "Banda Reduzida",
    duration: "3 horas",
    description: "Uma experiência musical vibrante, com banda em formação reduzida, repertório versátil e performance marcante para eventos que exigem qualidade, energia e sofisticação.",
    notes: "Esta proposta refere-se à contratação do formato Live Experience, com banda em formação reduzida. A apresentação terá duração de até 3 (três) horas."
  },
  "Show Premium": {
    emoji: "👑",
    formation: "Banda Completa",
    duration: "3 horas",
    description: "A experiência completa de Ailton Souza, com banda completa, repertório personalizado e uma apresentação de alto nível para grandes eventos.",
    notes: "Esta proposta refere-se à contratação do Show Premium Ailton Souza, com banda completa e duração de até 3 (três) horas de apresentação, conforme o cronograma do evento."
  }
};

const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
const form = $("#budgetForm");

function moneyNumber(v){
  const clean=String(v||"").replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",",".");
  const n=Number(clean); return Number.isFinite(n)?n:0;
}
function money(v){return moneyNumber(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function fieldMoney(v){return moneyNumber(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function dateBR(v){
  if(!v)return"A definir";
  const d=new Date(v+"T12:00:00");
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"long",year:"numeric"}).format(d);
}
function selectedShow(){return $('input[name="showType"]:checked')?.value || "Resenha";}
function contact(){
  return [$("#clientPhone").value.trim(),$("#clientEmail").value.trim()].filter(Boolean).join(" • ")||"Telefone e e-mail";
}
function place(){
  return [$("#eventVenue").value.trim(),$("#eventCity").value.trim()].filter(Boolean).join(" — ")||"A definir";
}
function includedText(){
  const a=$$('input[name="included"]:checked').map(x=>x.value);
  if(!a.length)return"";
  if(a.length===1)return` Está incluso nesta proposta: ${a[0]}.`;
  return` Estão inclusos nesta proposta: ${a.slice(0,-1).join(", ")} e ${a.at(-1)}.`;
}
function buildShowCards(){
  $("#showGrid").innerHTML=Object.entries(shows).map(([name,s],i)=>`
    <label class="show-card">
      <input type="radio" name="showType" value="${name}" ${i===0?"checked":""}>
      <span><strong>${s.emoji} ${name}</strong><small>${s.formation}</small></span>
    </label>`).join("");
  $$('input[name="showType"]').forEach(r=>r.addEventListener("change",()=>applyShow(r.value)));
}
function applyShow(name){
  const s=shows[name];
  $("#showDuration").value=s.duration;
  $("#clientNotes").value=s.notes;
  update();
}
function update(){
  const name=selectedShow(), s=shows[name];
  const total=moneyNumber($("#totalValue").value), deposit=moneyNumber($("#depositValue").value);
  $("#pNumber").textContent=`Nº ${$("#budgetNumber").value||"—"}`;
  $("#pShow").textContent=name;
  $("#pFormation").textContent=`${s.formation} • Duração: ${$("#showDuration").value}`;
  $("#pClient").textContent=$("#clientName").value.trim()||"Nome do cliente";
  $("#pContact").textContent=contact();
  $("#pEvent").textContent=$("#eventType").value||"A definir";
  $("#pDate").textContent=dateBR($("#eventDate").value);
  $("#pTime").textContent=$("#eventTime").value||"A definir";
  $("#pPlace").textContent=place();
  $("#pDescription").textContent=s.description;
  $("#pTotal").textContent=money(total);
  $("#pMethod").textContent=`Forma de pagamento: ${$("#paymentMethod").value}`;
  $("#pDeposit").textContent=money(deposit);
  $("#pBalance").textContent=money(Math.max(total-deposit,0));
  $("#pNotes").textContent=($("#clientNotes").value.trim()||s.notes)+includedText()+` Validade da proposta: ${$("#budgetValidity").value}. Saldo: ${$("#balanceDue").value}.`;
}
function toast(title,text){
  $("#toastTitle").textContent=title;$("#toastText").textContent=text;$("#toast").classList.add("show");
  clearTimeout(toast.t);toast.t=setTimeout(()=>$("#toast").classList.remove("show"),3000);
}
function save(){
  const data=Object.fromEntries(new FormData(form).entries());
  data.included=$$('input[name="included"]:checked').map(x=>x.value);
  data.showType=selectedShow();
  localStorage.setItem("ailtonManagerDraft",JSON.stringify(data));
  toast("Rascunho salvo","Os dados ficaram salvos somente neste navegador.");
}
function restore(){
  const raw=localStorage.getItem("ailtonManagerDraft"); if(!raw)return false;
  try{
    const data=JSON.parse(raw);
    Object.entries(data).forEach(([k,v])=>{
      if(["included","showType"].includes(k))return;
      const el=form.elements.namedItem(k); if(el&&typeof v==="string")el.value=v;
    });
    $$('input[name="included"]').forEach(x=>x.checked=(data.included||[]).includes(x.value));
    const r=$(`input[name="showType"][value="${CSS.escape(data.showType||"Resenha")}"]`);if(r)r.checked=true;
    return true;
  }catch(e){console.error(e);return false;}
}
function validate(){
  let ok=true;
  $$("[required]",form).forEach(el=>{
    const bad=!String(el.value||"").trim();
    el.classList.toggle("invalid",bad);if(bad)ok=false;
  });
  if(!ok)toast("Preencha os campos obrigatórios","Confira cliente, evento, data e valor.");
  return ok;
}
function printPdf(){if(!validate())return;update();window.print();},500);}
function clearAll(){
  if(!confirm("Deseja limpar todos os dados deste orçamento?"))return;
  form.reset();localStorage.removeItem("ailtonManagerDraft");advanceToNextBudgetNumber();
  $('input[name="showType"][value="Resenha"]').checked=true;applyShow("Resenha");update();
}
function nav(view){
  $("#orcamento").hidden=view!=="orcamento";$("#rascunho").hidden=view!=="rascunho";
  $$(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}

function annualCounterKey(year){return `ailtonManagerCounter_${year}`;}
function reservedKey(){return "ailtonManagerReservedBudget";}

function formatBudgetNumber(number,year){
  return `${String(number).padStart(3,"0")}/${year}`;
}

function reserveBudgetNumber(){
  const year = new Date().getFullYear();
  const saved = JSON.parse(localStorage.getItem(reservedKey()) || "null");

  if(saved && saved.year === year && saved.number){
    return saved;
  }

  const lastUsed = Number(localStorage.getItem(annualCounterKey(year))) || 0;
  const reserved = {year, number:lastUsed + 1};
  localStorage.setItem(reservedKey(), JSON.stringify(reserved));
  return reserved;
}

function showAutomaticNumber(){
  const reserved = reserveBudgetNumber();
  const formatted = formatBudgetNumber(reserved.number, reserved.year);
  $("#budgetNumber").value = formatted;
  $("#automaticNumber").textContent = formatted;
}

function advanceToNextBudgetNumber(){
  const reserved = reserveBudgetNumber();
  localStorage.setItem(annualCounterKey(reserved.year), String(reserved.number));
  localStorage.removeItem(reservedKey());
  showAutomaticNumber();
}

function init(){
  buildShowCards();
  showAutomaticNumber();
  form.addEventListener("input",update);form.addEventListener("change",update);
  $("#clientPhone").addEventListener("input",e=>{
    let n=e.target.value.replace(/\D/g,"").slice(0,11);
    if(n.length>10)e.target.value=`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
    else if(n.length>6)e.target.value=`(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
    else if(n.length>2)e.target.value=`(${n.slice(0,2)}) ${n.slice(2)}`;
    else e.target.value=n;
  });
  [$("#totalValue"),$("#depositValue")].forEach(el=>el.addEventListener("blur",()=>{el.value=fieldMoney(el.value);update();}));
  $("#saveButton").addEventListener("click",save);$("#printButton").addEventListener("click",printPdf);$("#pdfButton").addEventListener("click",printPdf);
  $("#clearButton").addEventListener("click",clearAll);$("#returnButton").addEventListener("click",()=>nav("orcamento"));
  $$(".nav-button").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.view)));
  const restored=restore();showAutomaticNumber();if(!restored)applyShow("Resenha");update();
}
document.addEventListener("DOMContentLoaded",init);
