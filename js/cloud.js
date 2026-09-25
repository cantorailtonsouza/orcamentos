"use strict";

// Explicit saves and paginated reads only: no polling, uploads or paid services.
(() => {
  let connection, sdkPromise, active = null, cursor = null, listing = false, busy = false;
  const status = document.getElementById("saveStatus");
  const listStatus = document.getElementById("draftsStatus");
  const list = document.getElementById("draftsList");
  const more = document.getElementById("moreDrafts");
  const refresh = document.getElementById("refreshDrafts");
  document.addEventListener("ailton:authenticated", event => { connection = event.detail; });

  async function database() {
    if (!connection?.auth.currentUser) throw {code: "unauthenticated"};
    if (!navigator.onLine) throw {code: "unavailable"};
    if (!sdkPromise) sdkPromise = import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js")
      .catch(error => { sdkPromise = null; throw error; });
    const sdk = await sdkPromise;
    return {sdk, db: sdk.getFirestore(connection.firebaseApp)};
  }

  function failureMessage(error) {
    if (error.code === "conflict") return "Este rascunho foi alterado em outro aparelho. Abra a versão atual na lista antes de editar novamente.";
    if (error.code === "permission-denied") return "Acesso à nuvem negado. Confira as regras do Firestore.";
    if (error.code === "resource-exhausted") return "O limite de uso da nuvem foi atingido. Tente novamente mais tarde.";
    if (error.code === "unauthenticated") return "Entre novamente para acessar os rascunhos.";
    return "Não foi possível acessar a nuvem. Confira sua conexão e tente novamente.";
  }

  function localCopy(data) {
    try { localStorage.setItem("ailtonManagerDraft", JSON.stringify({...data, __cloud: active})); return true; }
    catch (_) { return false; }
  }

  function restoreMetadata(data) {
    const meta = data?.__cloud;
    active = meta && typeof meta.id === "string" && /^[A-Za-z0-9_-]+$/.test(meta.id) && Number.isInteger(meta.revision) && meta.revision >= 0
      ? {id: meta.id, revision: meta.revision} : null;
    if (active) status.textContent = "Cópia local de um rascunho. Salve para enviar suas alterações à nuvem.";
    return Boolean(active);
  }

  function lockControls(locked) {
    busy = locked;
    document.getElementById("budgetForm").inert = locked;
    ["saveButton", "clearButton", "logoutButton", "returnButton"].forEach(id => { document.getElementById(id).disabled = locked; });
    document.querySelectorAll(".nav-button").forEach(button => { button.disabled = locked; });
  }

  async function saveDraft(data) {
    if (busy) return;
    lockControls(true);
    const button = document.getElementById("saveButton");
    button.textContent = "Salvando…";
    status.textContent = "Salvando rascunho na nuvem…";
    // A stable ID prevents duplicate documents on retries, including after a reload.
    if (!active) active = {id: crypto.randomUUID(), revision: 0};
    const locallySaved = localCopy(data);
    const target = {...active};
    try {
      const {sdk, db} = await database();
      const ref = sdk.doc(db, "budgetDrafts", target.id);
      const revision = await sdk.runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const previous = snapshot.exists() ? snapshot.data() : null;
        // A lost acknowledgement can be retried without overwriting another edit.
        if (previous && previous.revision === target.revision + 1 && previous.data && Object.keys(previous.data).length === Object.keys(data).length && Object.entries(data).every(([key,value]) => JSON.stringify(previous.data[key]) === JSON.stringify(value))) return previous.revision;
        if ((previous?.revision || 0) !== target.revision) throw {code: "conflict"};
        const next = target.revision + 1;
        transaction.set(ref, {
          schemaVersion: 1, data, revision: next,
          updatedAt: sdk.serverTimestamp(),
          updatedBy: connection.auth.currentUser.uid,
          createdAt: previous?.createdAt || sdk.serverTimestamp()
        });
        return next;
      });
      active = {id: target.id, revision};
      const stored = localCopy(data);
      status.textContent = stored ? "Salvo na nuvem. Disponível nos outros aparelhos ao atualizar a lista." : "Salvo na nuvem. O navegador não permitiu guardar uma cópia local.";
      toast("Rascunho salvo na nuvem", "Vocês já podem abri-lo em outro aparelho.");
    } catch (error) {
      status.textContent = failureMessage(error) + (locallySaved ? " Os dados ficaram salvos neste navegador." : " A cópia local também falhou. Mantenha esta página aberta.");
      toast("Não foi salvo na nuvem", status.textContent);
    } finally {
      lockControls(false);
      button.textContent = "Salvar rascunho";
    }
  }

  async function openDraft(id, button) {
    if (busy || !confirm("Abrir este rascunho? Os dados atuais do formulário serão substituídos. Salve antes se quiser guardá-los.")) return;
    lockControls(true); button.disabled = true;
    listStatus.textContent = "Abrindo rascunho…";
    try {
      const {sdk, db} = await database();
      const snapshot = await sdk.getDocFromServer(sdk.doc(db, "budgetDrafts", id));
      if (!snapshot.exists()) throw new Error("missing");
      const draft = snapshot.data();
      if (!draft.data || draft.schemaVersion !== 1 || !Number.isInteger(draft.revision)) throw new Error("invalid draft");
      applyDraft(draft.data);
      active = {id, revision: draft.revision};
      const copied = localCopy(draft.data);
      nav("orcamento"); update();
      status.textContent = "Rascunho aberto da nuvem. Salve depois de editar." + (copied ? "" : " Cópia local indisponível neste navegador.");
      listStatus.textContent = "Rascunho aberto.";
    } catch (error) { listStatus.textContent = failureMessage(error); }
    finally { lockControls(false); button.disabled = false; }
  }

  function renderDraft(snapshot) {
    const draft = snapshot.data(), data = draft.data || {};
    const row = document.createElement("article"); row.className = "draft-row";
    const text = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = data.clientName || "Cliente ainda não informado";
    const summary = document.createElement("p");
    summary.textContent = [data.budgetNumber, data.eventType, data.eventDate || "Data a definir"].filter(Boolean).join(" • ");
    const updated = document.createElement("p");
    updated.textContent = draft.updatedAt?.toDate ? "Salvo em " + draft.updatedAt.toDate().toLocaleString("pt-BR") : "Rascunho salvo";
    const open = document.createElement("button"); open.type = "button"; open.className = "button secondary"; open.textContent = "Abrir rascunho";
    open.addEventListener("click", () => openDraft(snapshot.id, open));
    text.append(title, summary, updated); row.append(text, open); list.append(row);
  }

  async function loadDrafts(append = false) {
    if (listing || busy) return;
    listing = true; refresh.disabled = true; more.disabled = true;
    listStatus.textContent = "Buscando rascunhos…";
    try {
      const {sdk, db} = await database();
      const constraints = [sdk.orderBy("updatedAt", "desc"), sdk.limit(20)];
      if (append && cursor) constraints.push(sdk.startAfter(cursor));
      const result = await sdk.getDocsFromServer(sdk.query(sdk.collection(db, "budgetDrafts"), ...constraints));
      if (!append) list.replaceChildren();
      result.docs.forEach(renderDraft);
      cursor = result.docs.at(-1) || null;
      more.hidden = result.docs.length < 20;
      listStatus.textContent = list.children.length ? "Lista atualizada. Use Atualizar lista para ver novas alterações." : "Nenhum rascunho na nuvem ainda. Abra o orçamento e clique em Salvar rascunho.";
    } catch (error) { listStatus.textContent = failureMessage(error); }
    finally { listing = false; refresh.disabled = false; more.disabled = false; }
  }
  refresh.addEventListener("click", () => loadDrafts());
  more.addEventListener("click", () => loadDrafts(true));
  document.getElementById("budgetForm").addEventListener("input", () => {
    if (!busy) status.textContent = "Alterações ainda não enviadas. Clique em Salvar rascunho.";
  });
  document.getElementById("budgetForm").addEventListener("change", () => {
    if (!busy) status.textContent = "Alterações ainda não enviadas. Clique em Salvar rascunho.";
  });
  window.AiltonCloud = {
    save: saveDraft, list: loadDrafts, restoreMetadata,
    hasActive: () => Boolean(active),
    reset() { active = null; status.textContent = "Clique em Salvar rascunho para guardar na nuvem."; }
  };
})();
