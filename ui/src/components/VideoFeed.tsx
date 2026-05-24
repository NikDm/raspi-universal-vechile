interface VideoFeedProps {
  src: string;
}

export function VideoFeed({ src }: VideoFeedProps) {
  return (
    <div
      style={{
        flex: 1,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 0,
      }}
    >
      <img
        src={src}
        alt="Vehicle camera feed"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
