"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type ScannerControls = { stop: () => void };

type ScanState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "error"; message: string };

function subscribeNoop() {
  return () => {};
}

function cameraSupported(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function barcodeSearchHref(code: string): string {
  return `/recalls?search=${encodeURIComponent(code)}&page=1`;
}

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 8v8M10 8v8M13 8v8M16 8v8" />
    </svg>
  );
}

/** Opens the camera, reads a UPC/EAN barcode, and searches for it. */
export function BarcodeScanner({ className = "" }: { className?: string }) {
  const router = useRouter();
  const supported = useSyncExternalStore(subscribeNoop, cameraSupported, () => false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const [state, setState] = useState<ScanState>({ kind: "idle" });

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }

  useEffect(() => stopCamera, []);

  function close() {
    stopCamera();
    dialogRef.current?.close();
    setState({ kind: "idle" });
  }

  async function open() {
    dialogRef.current?.showModal();
    setState({ kind: "starting" });

    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const hints = new Map([
        [
          DecodeHintType.POSSIBLE_FORMATS,
          [
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
          ],
        ],
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      if (!videoRef.current) {
        return;
      }

      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result, _error, controls) => {
          if (!result) {
            return;
          }
          controls.stop();
          controlsRef.current = null;
          dialogRef.current?.close();
          setState({ kind: "idle" });
          router.push(barcodeSearchHref(result.getText()));
        },
      );
      setState({ kind: "scanning" });
    } catch (error) {
      stopCamera();
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      setState({
        kind: "error",
        message: denied
          ? "Camera access was blocked. You can type the numbers under the barcode instead."
          : "The camera could not start. You can type the numbers under the barcode instead.",
      });
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <>
      <button
        className={`scan-button ${className}`.trim()}
        onClick={open}
        type="button"
      >
        <CameraIcon />
        Scan a barcode
      </button>
      <dialog
        aria-labelledby="scanner-title"
        className="scanner-dialog"
        onCancel={close}
        ref={dialogRef}
      >
        <div className="scanner-header">
          <h2 id="scanner-title">Scan a barcode</h2>
          <button className="r-btn r-btn-ghost" onClick={close} type="button">
            Close
          </button>
        </div>
        <p>Point your camera at the barcode on the package.</p>
        <div className="scanner-viewport">
          <video muted playsInline ref={videoRef} />
          <span className="scanner-guide" aria-hidden="true" />
        </div>
        <p className="scanner-status" role="status">
          {state.kind === "starting"
            ? "Starting the camera…"
            : state.kind === "scanning"
              ? "Looking for a barcode…"
              : state.kind === "error"
                ? state.message
                : ""}
        </p>
      </dialog>
    </>
  );
}
