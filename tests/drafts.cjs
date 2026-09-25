// Run with Node, Playwright, pdf-lib and an installed Chrome. Firebase is simulated.
const {chromium} = require('playwright');
const {PDFDocument} = require('pdf-lib');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const records = new Map();
let reads = 0, writes = 0;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
const authModule = `
 const auth={currentUser:null};let observer;
 export const browserLocalPersistence='local';export const getAuth=()=>auth;
 export async function setPersistence(a,p){if(p!=='local')throw Error('persistence');}
 export function onAuthStateChanged(a,fn){observer=fn;auth.currentUser=localStorage.testSession?{uid:localStorage.testSession}:null;fn(auth.currentUser);}
 export async function signInWithEmailAndPassword(a,email,password){if(password!=='test-password')throw {code:'auth/invalid-credential'};localStorage.testSession=email;auth.currentUser={uid:email};observer(auth.currentUser);}
 export async function signOut(){localStorage.removeItem('testSession');auth.currentUser=null;observer(null);}
`;
const firestoreModule = `
 export const getFirestore=()=>({});
 export const doc=(db,col,id)=>({id});export const collection=(db,name)=>({name});
 export const serverTimestamp=()=>({__timestamp:true});
 export const orderBy=(field,dir)=>({order:field,dir});export const limit=count=>({count});export const startAfter=s=>({after:s.id});
 export const query=(col,...constraints)=>({col,constraints});
 const snap=(id,data)=>({id,exists:()=>!!data,data:()=>data?{...data,updatedAt:{toDate:()=>new Date(data.updatedAt)}}:undefined});
 async function rpc(payload){if(window.testCloudError)throw {code:window.testCloudError};return window.testCloud(payload);}
 export async function getDocFromServer(ref){return snap(ref.id,await rpc({op:'get',id:ref.id}));}
 export async function getDocsFromServer(q){const count=q.constraints.find(c=>c.count)?.count;const after=q.constraints.find(c=>c.after)?.after;const rows=await rpc({op:'list',count,after});return {docs:rows.map(([id,data])=>snap(id,data))};}
 export async function runTransaction(db,fn){
  let pending,base;
  const result=await fn({get:async ref=>{const d=await rpc({op:'get',id:ref.id});base=d?.revision||0;return snap(ref.id,d);},set:(ref,data)=>{pending={id:ref.id,data};}});
  if(pending){const committed=await rpc({op:'commit',...pending,base});if(!committed)throw {code:'conflict'};}
  return result;
 }
`;

(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER || 'chrome'});
  const errors=[];
  try {
    async function device(email) {
      const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
      await context.exposeBinding('testCloud',(_,payload)=>{
        if(payload.op==='get'){reads++;return records.get(payload.id)||null;}
        if(payload.op==='list'){
          reads+=payload.count;
          const sorted=[...records.entries()].sort((a,b)=>b[1].updatedAt.localeCompare(a[1].updatedAt));
          const offset=payload.after?sorted.findIndex(r=>r[0]===payload.after)+1:0;
          return sorted.slice(offset,offset+payload.count);
        }
        if(payload.op==='commit'){
          if((records.get(payload.id)?.revision||0)!==payload.base)return false;
          const data=structuredClone(payload.data);data.updatedAt=new Date().toISOString();
          if(data.createdAt?.__timestamp)data.createdAt=data.updatedAt;
          records.set(payload.id,data);writes++;return true;
        }
      });
      await context.route('**/firebase-app.js',r=>r.fulfill({contentType:'text/javascript',body:'export const initializeApp=c=>c;'}));
      await context.route('**/firebase-auth.js',r=>r.fulfill({contentType:'text/javascript',body:authModule}));
      await context.route('**/firebase-firestore.js',r=>r.fulfill({contentType:'text/javascript',body:firestoreModule}));
      await context.route('**/pdf-lib.min.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(require.resolve('pdf-lib/dist/pdf-lib.min.js'))}));
      await context.route('https://fonts.googleapis.com/**',r=>r.abort());
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
      await page.goto(url);await page.locator('#loginForm').waitFor({state:'visible'});
      assert.equal(await page.locator('#managerApp').isVisible(),false);
      await page.locator('#loginEmail').fill(email);await page.locator('#loginPassword').fill('test-password');await page.locator('#loginButton').click();
      await page.locator('#managerApp').waitFor({state:'visible'});
      return {context,page};
    }
    const a=await device('ailton@example.test');const p=a.page;
    assert.equal(reads,0);assert.equal(writes,0);
    await p.locator('#clientName').fill('Cliente <b>Teste</b>');await p.locator('#eventType').selectOption('Casamento');await p.locator('#eventDate').fill('2026-12-20');
    await p.locator('#totalValue').fill('2.800,00');await p.locator('#totalValue').blur();assert.equal(await p.locator('#depositValue').inputValue(),'840,00');
    await p.locator('.internal-note summary').click();await p.locator('#internalNotes').fill('Anotação privada de teste');
    await p.locator('#saveButton').click();await p.waitForFunction(()=>document.querySelector('#saveStatus').textContent.startsWith('Salvo na nuvem'));
    assert.equal(records.size,1);const id=[...records.keys()][0];const number=await p.locator('#budgetNumber').inputValue();
    await p.reload();await p.locator('#managerApp').waitFor({state:'visible'});assert.equal(await p.locator('#budgetNumber').inputValue(),number);assert.equal(await p.locator('#clientName').inputValue(),'Cliente <b>Teste</b>');
    const b=await device('iolanda@example.test');const q=b.page;
    await q.locator('[data-view="rascunho"]').click();await q.locator('.draft-row').waitFor();assert.equal(await q.locator('.draft-row h3').textContent(),'Cliente <b>Teste</b>');assert.equal(await q.locator('.draft-row b').count(),0);
    assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await q.locator('.draft-row button').click();await q.locator('#orcamento').waitFor({state:'visible'});assert.equal(await q.locator('#budgetNumber').inputValue(),number);assert.equal(await q.locator('#internalNotes').inputValue(),'Anotação privada de teste');
    await q.locator('#clientCity').fill('Brasília');await q.locator('#saveButton').click();await q.waitForFunction(()=>document.querySelector('#saveStatus').textContent.startsWith('Salvo na nuvem'));assert.equal(records.size,1);assert.equal(records.get(id).revision,2);
    await p.locator('#clientCity').fill('Luziânia');await p.locator('#saveButton').click();await p.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('outro aparelho'));assert.equal(records.get(id).data.clientCity,'Brasília');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.ailtonManagerDraft).clientCity),'Luziânia');
    await q.evaluate(()=>window.testCloudError='permission-denied');await q.locator('#saveButton').click();await q.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('negado'));assert.equal(records.get(id).revision,2);await q.evaluate(()=>window.testCloudError=null);
    await b.context.setOffline(true);await q.locator('#clientCity').fill('Goiânia');await q.locator('#saveButton').click();await q.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('conexão'));assert.equal(records.get(id).data.clientCity,'Brasília');await b.context.setOffline(false);
    await q.locator('#saveButton').click();await q.waitForFunction(()=>document.querySelector('#saveStatus').textContent.startsWith('Salvo na nuvem'));assert.equal(records.size,1);assert.equal(records.get(id).data.clientCity,'Goiânia');
    const download=q.waitForEvent('download');await q.locator('#downloadButton').click();const pdf=await PDFDocument.load(fs.readFileSync(await (await download).path()));assert.ok(pdf.getPageCount()>0);
    await q.locator('#clearButton').click();await q.locator('#clientName').fill('Segundo orçamento');await q.locator('#saveButton').click();await q.waitForFunction(()=>document.querySelector('#saveStatus').textContent.startsWith('Salvo na nuvem'));assert.equal(records.size,2);assert.equal(records.get(id).data.clientCity,'Goiânia');
    for(let i=0;i<22;i++)records.set('pagination-'+i,{schemaVersion:1,revision:1,data:{clientName:'Paginação '+i},updatedAt:new Date(Date.now()+i*1000).toISOString()});
    await q.locator('[data-view="rascunho"]').click();await q.waitForFunction(()=>document.querySelectorAll('.draft-row').length===20);await q.locator('#moreDrafts').click();await q.waitForFunction(()=>document.querySelectorAll('.draft-row').length===24);assert.equal(await q.locator('#moreDrafts').isVisible(),false);
    await q.locator('#logoutButton').click();await q.locator('#loginForm').waitFor({state:'visible'});await q.emulateMedia({media:'print'});assert.equal(await q.locator('#managerApp').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: authenticated two-device saves and edits, no reads on login, local restore, preserved numbers, 30% deposit, conflict protection, permission/network failure, retry without duplication, real PDF generation, new draft isolation, pagination, mobile layout, escaped text, logout and print lock. Firebase simulated.');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
