(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("PWA indisponível:", error)));
  }

  // O convite de instalação pertence somente à tela de login.
  if (!document.body.classList.contains("login-page")) return;

  const installStyles = document.createElement("link");
  installStyles.rel = "stylesheet";
  installStyles.href = new URL("pwa.css?v=20260831.3", document.baseURI).href;
  document.head.appendChild(installStyles);

  let installPrompt;
  const installButton = document.createElement("button");
  installButton.type = "button";
  installButton.className = "pwa-install-button hidden";
  installButton.innerHTML = '<span class="pwa-install-symbol" aria-hidden="true"></span><span class="pwa-install-copy"><small>Aplicativo Ogritech</small><strong>Instalar neste dispositivo</strong></span><span class="pwa-install-arrow" aria-hidden="true"></span>';
  installButton.setAttribute("aria-label", "Instalar Ogritech neste dispositivo");
  document.body.appendChild(installButton);

  const isInstalled = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (!isInstalled) installButton.classList.remove("hidden");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }

    const small = installButton.querySelector("small");
    const strong = installButton.querySelector("strong");
    small.textContent = "Menu do navegador";
    strong.textContent = "Escolha “Adicionar à tela inicial”";
    installButton.classList.add("showing-help");
    window.setTimeout(() => {
      small.textContent = "Aplicativo Ogritech";
      strong.textContent = "Instalar neste dispositivo";
      installButton.classList.remove("showing-help");
    }, 4500);
  });

  window.addEventListener("appinstalled", () => installButton.classList.add("hidden"));
})();
