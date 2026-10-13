import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BarcodeScanner, barcodeSearchHref } from "@/components/barcode-scanner";

const push = vi.fn();
const { decodeFromConstraints } = vi.hoisted(() => ({
  decodeFromConstraints: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromConstraints = decodeFromConstraints;
  },
}));

vi.mock("@zxing/library", () => ({
  BarcodeFormat: { UPC_A: 1, UPC_E: 2, EAN_13: 3, EAN_8: 4 },
  DecodeHintType: { POSSIBLE_FORMATS: 0 },
}));

describe("BarcodeScanner", () => {
  beforeEach(() => {
    push.mockReset();
    decodeFromConstraints.mockReset();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
  });

  it("builds a recall search for the scanned code", () => {
    expect(barcodeSearchHref("012345678905")).toBe(
      "/recalls?search=012345678905&page=1",
    );
  });

  it("hides the button when the browser has no camera access", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    render(<BarcodeScanner />);

    expect(
      screen.queryByRole("button", { name: "Scan a barcode" }),
    ).not.toBeInTheDocument();
  });

  it("searches for the first barcode the camera reads", async () => {
    const stop = vi.fn();
    decodeFromConstraints.mockImplementation(async (_constraints, _video, callback) => {
      callback({ getText: () => "012345678905" }, undefined, { stop });
      return { stop };
    });
    render(<BarcodeScanner />);

    fireEvent.click(screen.getByRole("button", { name: "Scan a barcode" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/recalls?search=012345678905&page=1"),
    );
    expect(stop).toHaveBeenCalled();
    expect(decodeFromConstraints.mock.calls[0][0]).toEqual({
      video: { facingMode: { ideal: "environment" } },
    });
  });

  it("explains how to continue when camera access is blocked", async () => {
    decodeFromConstraints.mockRejectedValue(
      new DOMException("Permission denied", "NotAllowedError"),
    );
    render(<BarcodeScanner />);

    fireEvent.click(screen.getByRole("button", { name: "Scan a barcode" }));

    expect(
      await screen.findByText(/Camera access was blocked/),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
