"use client";

import { useEffect, useRef, useState } from "react";

import { usePerformanceMount } from "@/lib/performance/client";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = {
  detect: (video: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorInstance;

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  const browserWindow = window as Window & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  };
  return browserWindow.BarcodeDetector ?? null;
}

export default function BarcodeScanner({
  onDetected,
}: {
  onDetected: (barcode: string) => void;
}) {
  usePerformanceMount("BarcodeScanner");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let animationFrame = 0;
    let mediaStream: MediaStream | null = null;
    const video = videoRef.current;

    async function startScanner() {
      const Detector = getBarcodeDetector();
      if (!Detector || !video || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "Le scan par caméra n’est pas pris en charge par ce navigateur. Saisissez le code-barres ou utilisez un lecteur connecté.",
        );
        return;
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = mediaStream;
        await video.play();
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
        });

        const scanFrame = async () => {
          if (!active) {
            return;
          }
          try {
            const [barcode] = await detector.detect(video);
            if (barcode) {
              const normalizedBarcode = barcode.rawValue.replace(/\D/g, "");
              if (/^\d{8,14}$/.test(normalizedBarcode)) {
                onDetected(normalizedBarcode);
                return;
              }
            }
          } catch (scanError: unknown) {
            console.error("Barcode scanning failed.", scanError);
            setError(
              "Impossible de lire ce code. Réessayez ou saisissez-le manuellement.",
            );
            return;
          }
          animationFrame = window.requestAnimationFrame(() => {
            void scanFrame();
          });
        };
        void scanFrame();
      } catch (cameraError: unknown) {
        console.error("Barcode camera could not be started.", cameraError);
        setError(
          "Impossible d’accéder à la caméra. Vérifiez son autorisation ou saisissez le code-barres.",
        );
      }
    }

    void startScanner();
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      mediaStream?.getTracks().forEach((track) => track.stop());
      if (video) {
        video.srcObject = null;
      }
    };
  }, [onDetected]);

  return (
    <div className="space-y-2">
      <video
        aria-label="Aperçu de la caméra pour scanner le code-barres"
        autoPlay
        className="max-h-64 w-full rounded-lg bg-black object-contain"
        muted
        playsInline
        ref={videoRef}
      />
      {error ? (
        <p className="text-sm text-muted-foreground" role="status">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          Placez le code-barres dans le champ de la caméra.
        </p>
      )}
    </div>
  );
}
