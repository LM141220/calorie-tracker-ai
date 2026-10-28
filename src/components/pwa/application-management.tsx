"use client";

import { Download, RefreshCw, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type UpdateStatus =
  | "idle"
  | "checking"
  | "current"
  | "installing"
  | "ready"
  | "unavailable"
  | "error";

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function getUpdateMessage(status: UpdateStatus) {
  switch (status) {
    case "checking":
      return "Recherche des mises à jour…";
    case "current":
      return "L’application est à jour.";
    case "installing":
      return "Nouvelle version en cours d’installation…";
    case "ready":
      return "Nouvelle version installée. Recharge l’application pour l’utiliser.";
    case "unavailable":
      return "La vérification des mises à jour n’est pas disponible dans ce navigateur.";
    case "error":
      return "La vérification a échoué. Vérifie ta connexion puis réessaie.";
    case "idle":
      return "";
  }
}

export function ApplicationManagement() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [showInstructions, setShowInstructions] = useState(false);
  const checkingForUpdate = useRef(false);
  const updateStatusRef = useRef(updateStatus);

  function updateStatusTo(status: UpdateStatus) {
    updateStatusRef.current = status;
    setUpdateStatus(status);
  }

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const standaloneNavigator = navigator as Navigator & {
      standalone?: boolean;
    };
    setIsInstalled(
      standaloneQuery.matches || standaloneNavigator.standalone === true,
    );
    setIsIOS(isIOSDevice());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    function handleControllerChange() {
      if (checkingForUpdate.current) {
        updateStatusTo("ready");
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    let registration: ServiceWorkerRegistration | undefined;
    const handleUpdateFound = () => {
      const installingWorker = registration?.installing;
      if (!installingWorker) {
        return;
      }
      updateStatusTo("installing");
      installingWorker.addEventListener("statechange", () => {
        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          updateStatusTo("ready");
        }
      });
    };

    void navigator.serviceWorker
      ?.getRegistration("/")
      .then((serviceWorkerRegistration) => {
        registration = serviceWorkerRegistration;
        if (!registration) {
          return;
        }
        if (registration.waiting) {
          updateStatusTo("ready");
        }
        registration.addEventListener("updatefound", handleUpdateFound);
      })
      .catch((error: unknown) => {
        console.error(
          "Could not inspect the service worker registration.",
          error,
        );
        updateStatusTo("error");
      });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      registration?.removeEventListener("updatefound", handleUpdateFound);
    };
  }, []);

  async function checkForUpdates() {
    if (!("serviceWorker" in navigator)) {
      updateStatusTo("unavailable");
      return;
    }

    updateStatusTo("checking");
    checkingForUpdate.current = true;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        checkingForUpdate.current = false;
        updateStatusTo("unavailable");
        return;
      }

      await registration.update();
      if (registration.waiting) {
        updateStatusTo("ready");
      } else if (registration.installing) {
        updateStatusTo("installing");
      } else if (updateStatusRef.current !== "ready") {
        updateStatusTo("current");
      }
    } catch (error: unknown) {
      console.error("Service worker update check failed.", error);
      updateStatusTo("error");
    } finally {
      checkingForUpdate.current = false;
    }
  }

  async function installApplication() {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  }

  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(process.env.NEXT_PUBLIC_BUILD_DATE))
    : "Indisponible";

  return (
    <section
      aria-labelledby="application-management-title"
      className="border-t border-border/70 px-5 py-5 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Smartphone aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold" id="application-management-title">
            Application
          </h2>
          <p className="text-sm text-muted-foreground">
            Version {version} · Mise à jour du {buildDate}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={updateStatus === "checking"}
          onClick={checkForUpdates}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw
            aria-hidden="true"
            className={`mr-2 size-4 ${updateStatus === "checking" ? "animate-spin" : ""}`}
          />
          Vérifier les mises à jour
        </Button>
        {isInstalled ? (
          <Button
            onClick={() => setShowInstructions((visible) => !visible)}
            size="sm"
            type="button"
            variant="outline"
          >
            Réinstaller l’application
          </Button>
        ) : (
          <Button
            onClick={installApplication}
            size="sm"
            type="button"
            variant="outline"
          >
            <Download aria-hidden="true" className="mr-2 size-4" />
            Installer l’application
          </Button>
        )}
      </div>

      {updateStatus !== "idle" ? (
        <div className="mt-3 space-y-2" role="status">
          <p className="text-sm text-muted-foreground">
            {getUpdateMessage(updateStatus)}
          </p>
          {updateStatus === "ready" ? (
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              type="button"
            >
              Recharger maintenant
            </Button>
          ) : null}
        </div>
      ) : null}

      {showInstructions ? (
        <div className="mt-4 rounded-2xl bg-accent/60 p-4 text-sm">
          <h3 className="font-semibold">
            Réinstaller Lumo sur {isIOS ? "iPhone ou iPad" : "Android"}
          </h3>
          {isIOS ? (
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-muted-foreground">
              <li>Supprime l’ancienne icône de l’écran d’accueil.</li>
              <li>
                Ouvre l’adresse de Lumo dans Safari, pas dans un navigateur
                intégré.
              </li>
              <li>
                Touche Partager, puis « Sur l’écran d’accueil » et « Ajouter ».
              </li>
            </ol>
          ) : (
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-muted-foreground">
              <li>
                Désinstalle l’ancienne application depuis l’écran d’accueil.
              </li>
              <li>
                Ouvre Lumo dans Chrome et vérifie que tu es sur la dernière
                version.
              </li>
              <li>
                Choisis « Installer l’application » dans le menu du navigateur.
              </li>
            </ol>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            La suppression de l’icône ne supprime pas ton compte ni tes repas
            enregistrés.
          </p>
          <Button
            className="mt-3"
            onClick={() => setShowInstructions(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Fermer
          </Button>
        </div>
      ) : null}
    </section>
  );
}
