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
        border: "2px solid #FFB020",
        background: "#15140F",
        color: "#FFB020",
        fontFamily: "monospace",
        fontSize: 19,
        fontWeight: 600,
      }}
    >
      R
    </div>,
    size,
  );
}
