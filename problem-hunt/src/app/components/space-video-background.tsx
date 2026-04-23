import { useEffect, useRef, useState } from "react";

interface VideoSource {
  src: string;
  type: string;
}

const DEFAULT_SOURCES: VideoSource[] = [
  {
    src: "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
    type: "video/mp4",
  },
];

const FALLBACK_SOURCES: VideoSource[] = [
  {
    src: "https://videos.pexels.com/video-files/3141207/3141207-uhd_2560_1440_25fps.mp4",
    type: "video/mp4",
  },
];

interface SpaceVideoBackgroundProps {
  sources?: VideoSource[];
  fallbackSources?: VideoSource[];
  poster?: string;
}

export function SpaceVideoBackground({
  sources = DEFAULT_SOURCES,
  fallbackSources = FALLBACK_SOURCES,
  poster,
}: SpaceVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setLoaded(true);
    const handleError = () => {
      if (!useFallback && fallbackSources.length > 0) {
        setUseFallback(true);
        video.load();
      } else {
        setError(true);
        setLoaded(true);
      }
    };

    video.addEventListener("canplaythrough", handleCanPlay);
    video.addEventListener("error", handleError);

    // Force load
    video.load();

    return () => {
      video.removeEventListener("canplaythrough", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [useFallback, fallbackSources]);

  const activeSources = useFallback ? fallbackSources : sources;

  return (
    <div
      ref={containerRef}
      className="space-video-bg"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        background: "#070a0f",
      }}
    >
      {/* Starfield CSS fallback - always visible behind/around video */}
      <div className="space-starfield" aria-hidden="true" />

      {/* Video element */}
      {!error && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          className="space-video-bg__video"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 1.8s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: "contrast(1.15) saturate(0.85)",
          }}
        >
          {activeSources.map((s, i) => (
            <source key={i} src={s.src} type={s.type} />
          ))}
        </video>
      )}

      {/* Metal overlay gradient for text readability */}
      <div
        className="space-video-bg__overlay"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `
            radial-gradient(ellipse at 50% 120%, rgba(7,10,15,0.92) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 0%, rgba(7,10,15,0.55) 0%, transparent 45%),
            linear-gradient(180deg, rgba(7,10,15,0.35) 0%, rgba(7,10,15,0.1) 40%, rgba(7,10,15,0.55) 100%)
          `,
          mixBlendMode: "normal",
        }}
      />

      {/* Scanline texture */}
      <div
        className="space-video-bg__scanlines"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          pointerEvents: "none",
        }}
      />

      {/* HUD corner brackets */}
      <div className="space-hud-corners" aria-hidden="true">
        <div className="space-hud-corner space-hud-corner--tl" />
        <div className="space-hud-corner space-hud-corner--tr" />
        <div className="space-hud-corner space-hud-corner--bl" />
        <div className="space-hud-corner space-hud-corner--br" />
      </div>

      {/* Loading indicator */}
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <div className="space-loader" />
        </div>
      )}
    </div>
  );
}
