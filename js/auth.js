"use strict";

(() => {
  const app = document.getElementById("managerApp");
  const screen = document.getElementById("authScreen");
  const form = document.getElementById("loginForm");
  const status = document.getElementById("authStatus");
  const error = document.getElementById("loginError");
  const submit = document.getElementById("loginButton");
  const logout = document.getElementById("logoutButton");
  const retry = document.getElementById("authRetry");
  let auth, sdk, initialized = false;

  function lock() {
    app.hidden = true;
    app.inert = true;
    screen.hidden = false;
    document.getElementById("toast").classList.remove("show");
  }

  function message(code) {
    if (code === "auth/network-request-failed") return "Sem conexão. Verifique sua internet e tente novamente.";
    if (code === "auth/too-many-requests") return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    if (code === "auth/web-storage-unsupported") return "Permita o armazenamento neste navegador para manter sua sessão.";
    if (["auth/invalid-credential", "auth/invalid-login-credentials", "auth/user-not-found", "auth/wrong-password", "auth/invalid-email", "auth/user-disabled"].includes(code)) return "Não foi possível entrar. Confira seu e-mail e senha.";
    return "Não foi possível acessar o sistema. Tente novamente em instantes.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth || submit.disabled) return;
    error.textContent = "";
    submit.disabled = true;
    submit.textContent = "Entrando…";
    try {
      await sdk.signInWithEmailAndPassword(auth, document.getElementById("loginEmail").value.trim(), document.getElementById("loginPassword").value);
    } catch (failure) {
      error.textContent = message(failure.code);
    } finally {
      document.getElementById("loginPassword").value = "";
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      await sdk.signOut(auth);
    } catch (failure) {
      window.alert("Não foi possível sair. Verifique sua conexão e tente novamente.");
    } finally {
      logout.disabled = false;
    }
  });
  retry.addEventListener("click", () => window.location.reload());

  async function start() {
    try {
      const [firebase, authentication] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
      ]);
      sdk = authentication;
      const firebaseApp = firebase.initializeApp({
        apiKey: "AIzaSyD0Yj9-3zLp0RsNqnYjF2B3SzcNmD9cgaw",
        authDomain: "ailton-manager.firebaseapp.com",
        projectId: "ailton-manager",
        storageBucket: "ailton-manager.firebasestorage.app",
        messagingSenderId: "886627577865",
        appId: "1:886627577865:web:a621a23b41c5b82b7f48d8"
      });
      auth = sdk.getAuth(firebaseApp);
      await sdk.setPersistence(auth, sdk.browserLocalPersistence);
      sdk.onAuthStateChanged(auth, (user) => {
        if (user) {
          if (!initialized) {
            document.dispatchEvent(new CustomEvent("ailton:authenticated", {detail: {firebaseApp, auth}}));
            initialized = true;
          }
          form.reset();
          error.textContent = "";
          screen.hidden = true;
          app.hidden = false;
          app.inert = false;
        } else {
          // Remove the previous user's unsaved form from memory after sign-out.
          // Existing local draft and numbering remain untouched.
          lock();
          if (initialized) { window.location.reload(); return; }
          status.textContent = "Entre com seu e-mail e senha.";
          form.hidden = false;
        }
      }, () => unavailable());
    } catch (_) {
      unavailable();
    }
  }

  function unavailable() {
    lock();
    form.hidden = true;
    status.textContent = "Não foi possível conectar ao serviço de acesso. Verifique sua internet e tente novamente.";
    retry.hidden = false;
  }
  start();
})();
