"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const standaloneNavigator = navigator as Navigator & {
      standalone?: boolean;
    };
    setIsInstalled(
      standaloneQuery.matches || standaloneNavigator.standalone === true,
    );

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  if (installPrompt) {
    return (
      <Button
        className="whitespace-nowrap"
        onClick={async () => {
          await installPrompt.prompt();
          const choice = await installPrompt.userChoice;
          if (choice.outcome === "accepted") {
            setInstallPrompt(null);
            setIsInstalled(true);
          }
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        Installer l’application
      </Button>
    );
  }

  if (isIOSDevice()) {
    return (
      <div className="relative">
        <Button
          onClick={() => setShowIOSInstructions((visible) => !visible)}
          size="sm"
          type="button"
          variant="outline"
          aria-expanded={showIOSInstructions}
        >
          Installer l’application
        </Button>
        {showIOSInstructions ? (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg"
            role="status"
          >
            <p className="font-medium">Sur iPhone ou iPad</p>
            <p className="mt-2 leading-6 text-muted-foreground">
              Dans Safari, touchez <strong>Partager</strong>, puis{" "}
              <strong>Sur l’écran d’accueil</strong> et enfin{" "}
              <strong>Ajouter</strong>.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
