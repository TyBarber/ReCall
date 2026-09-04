import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LightLines } from "@/components/ui/light-lines";

function stubMotionPreference(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LightLines", () => {
  it("renders the installed line field with the configured ReCall palette", () => {
    stubMotionPreference(true);
    const { container } = render(
      <LightLines
        gradientFrom="#071713"
        gradientTo="#0D241D"
        lightColor="#D8FF3E"
        lineColor="#D8FF3E"
        linesOpacity={0.1}
        lightsOpacity={0.52}
        speedMultiplier={0.68}
      />,
    );

    const background = container.firstElementChild;
    expect(background).toHaveAttribute("aria-hidden", "true");
    expect(background).toHaveStyle({
      background: "linear-gradient(180deg, #071713 0%, #0D241D 100%)",
    });
    expect(container.querySelector(".lines")).toHaveStyle({ opacity: "0.1" });
    expect(container.querySelector(".lights")).toHaveStyle({ opacity: "0.52" });
    expect(container.querySelectorAll(".light")).toHaveLength(17);
  });

  it("does not start animation when reduced motion is requested", () => {
    stubMotionPreference(true);
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(1);

    render(<LightLines />);

    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("keeps colored light paths moving when motion is allowed", () => {
    stubMotionPreference(false);
    let nextFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });
    vi.spyOn(window.performance, "now").mockReturnValue(0);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { container } = render(
      <LightLines lightColor="#D8FF3E" lineColor="#BFEF32" />,
    );
    const movingPath = container.querySelector<SVGPathElement>(".light1");

    act(() => nextFrame?.(0));
    const initialTransform = movingPath?.style.transform;
    act(() => nextFrame?.(250));

    expect(initialTransform).toMatch(/^translateY\(/);
    expect(movingPath?.style.transform).not.toBe(initialTransform);
  });

  it("restarts its frame loop after the development Strict Mode cleanup", () => {
    stubMotionPreference(false);
    vi.spyOn(window.Element.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 500,
      left: 0,
      right: 1000,
      top: 0,
      width: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(7);

    render(
      <StrictMode>
        <LightLines lightColor="#D8FF3E" lineColor="#BFEF32" />
      </StrictMode>,
    );

    expect(requestFrame).toHaveBeenCalledTimes(2);
  });
});
