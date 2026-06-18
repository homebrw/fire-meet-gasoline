import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const heartSvg = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 28.5C16 28.5 4 20.5 4 13c0-4.5 3-7 6-7 2 0 4 1 6 3 2-2 4-3 6-3 3 0 6 2.5 6 7 0 7.5-12 15.5-12 15.5z" fill="#f97316"/></svg>`;
const heartDataUri = `data:image/svg+xml;base64,${Buffer.from(heartSvg).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <img src={heartDataUri} width={120} height={120} alt="" />
      </div>
    ),
    { ...size }
  );
}
