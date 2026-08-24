(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("PWA indisponível:", error)));
  }

  let installPrompt;
  const installButton = document.createElement("button");
  installButton.type = "button";
  installButton.className = "pwa-install-button hidden";
  installButton.textContent = "Instalar Ogritech";
  installButton.setAttribute("aria-label", "Instalar Ogritech neste dispositivo");
  document.body.appendChild(installButton);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.classList.add("hidden");
  });

  window.addEventListener("appinstalled", () => installButton.classList.add("hidden"));
})();
