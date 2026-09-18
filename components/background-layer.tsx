"use client";

import { useEffect, useState } from "react";

type BackgroundLayerProps = {
  mode: "video" | "slideshow";
  videoUrl?: string;
  videoEmbed?: string;
  fallbackImage?: string;
  images?: string[];
  infinite?: boolean;
  duration?: number;
  transition?: "fade" | "slide";
  transitionDuration?: number;
  lazyLoad?: boolean;
  kenBurns?: boolean;
};

export function BackgroundLayer({ mode, videoUrl = "", videoEmbed = "", fallbackImage = "", images = [], infinite = true, duration = 6_000, transition = "fade", transitionDuration = 500, lazyLoad = true, kenBurns = false }: BackgroundLayerProps) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (mode !== "slideshow" || images.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => infinite ? (current + 1) % images.length : Math.min(current + 1, images.length - 1)), duration);
    return () => window.clearInterval(timer);
  }, [duration, images.length, infinite, mode]);

  if (mode === "video") {
    return <div className="content-block-background-layer content-block-background-video" aria-hidden="true">{videoEmbed ? <iframe title="" src={`${videoEmbed}${videoEmbed.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1`} loading={lazyLoad ? "lazy" : undefined} tabIndex={-1} allow="autoplay; fullscreen" /> : videoUrl ? <video src={videoUrl} autoPlay muted loop playsInline preload={lazyLoad ? "none" : "metadata"} /> : null}{fallbackImage ? <img className="content-block-background-fallback" src={fallbackImage} alt="" /> : null}<span className="content-block-background-overlay" /></div>;
  }

  if (images.length === 0) return null;
  return <div className={`content-block-background-layer content-block-background-slideshow is-${transition}${kenBurns ? " has-ken-burns" : ""}`} style={{ "--background-transition-duration": `${transitionDuration}ms` } as React.CSSProperties} aria-hidden="true">{images.map((image, imageIndex) => <img key={`${image}-${imageIndex}`} className={imageIndex === index ? "is-active" : ""} src={image} alt="" loading={lazyLoad && imageIndex > 0 ? "lazy" : "eager"} />)}<span className="content-block-background-overlay" /></div>;
}
