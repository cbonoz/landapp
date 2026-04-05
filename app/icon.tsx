import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgb(4, 120, 87) 0%, rgb(5, 150, 105) 60%, rgb(16, 185, 129) 100%)",
          color: "white",
          fontSize: 22,
          fontWeight: 800,
          fontFamily: "sans-serif",
          borderRadius: 8,
        }}
      >
        K
      </div>
    ),
    size
  );
}