import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "3px solid #111111",
        borderRadius: 9,
        background: "#C6F432",
        color: "#111111",
        fontFamily: "Arial, sans-serif",
        fontSize: 19,
        fontWeight: 900,
      }}
    >
      R
    </div>,
    size,
  );
}
