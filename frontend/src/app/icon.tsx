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
        borderRadius: 9,
        background: "#14150F",
        color: "#D6F24B",
        fontFamily: "sans-serif",
        fontSize: 21,
        fontWeight: 700,
      }}
    >
      R
    </div>,
    size,
  );
}
