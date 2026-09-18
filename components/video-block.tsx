"use client";

import { Play, X } from "lucide-react";
import { useState } from "react";

type VideoBlockClientProps = {
  embedSrc: string;
  embedPlaySrc: string;
  file: string;
  poster: string;
  alt: string;
  showOverlay: boolean;
  showPlayIcon: boolean;
  lightbox: boolean;
  autoplay: boolean;
  mute: boolean;
  loop: boolean;
  controls: boolean;
  lazy: boolean;
  captions: boolean;
  captionsUrl: string;
};

function VideoSurface({
  embedSrc,
  embedPlaySrc,
  file,
  poster,
  alt,
  autoplay,
  mute,
  loop,
  controls,
  lazy,
  captions,
  captionsUrl,
  playing,
}: Omit<VideoBlockClientProps, "showOverlay" | "showPlayIcon" | "lightbox"> & { playing: boolean }) {
  if (embedSrc) {
    return <iframe title={alt || "Video"} src={playing ? embedPlaySrc : embedSrc} loading={lazy ? "lazy" : undefined} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  if (file) {
    return <video controls={controls} autoPlay={playing || autoplay} muted={mute} loop={loop} poster={poster || undefined} preload={lazy ? "none" : "metadata"}><source src={file} type="video/mp4" />{captions && captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="English" default /> : null}</video>;
  }
  return poster ? <img src={poster} alt={alt || "Video preview"} /> : <div className="content-video-placeholder"><Play size={26} /><span>Add a YouTube, Vimeo, or hosted video URL in the editor.</span></div>;
}

export function VideoBlockClient({ embedSrc, embedPlaySrc, file, poster, alt, showOverlay, showPlayIcon, lightbox, autoplay, mute, loop, controls, lazy, captions, captionsUrl }: VideoBlockClientProps) {
  const [playing, setPlaying] = useState(!showOverlay || autoplay);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasVideo = Boolean(embedSrc || file);
  const start = () => {
    setPlaying(true);
    if (lightbox) setLightboxOpen(true);
  };
  const overlay = showOverlay && !playing && hasVideo ? <button type="button" className="content-video-overlay" onClick={start} aria-label={`Play ${alt || "video"}`}><span className="content-video-overlay-image">{poster ? <img src={poster} alt={alt || "Video preview"} /> : <span className="content-video-overlay-placeholder"><Play size={30} /></span>}</span>{showPlayIcon ? <span className="content-video-play-icon"><Play size={22} fill="currentColor" /></span> : null}</button> : null;
  return <>{overlay ?? <VideoSurface embedSrc={embedSrc} embedPlaySrc={embedPlaySrc} file={file} poster={poster} alt={alt} autoplay={autoplay} mute={mute} loop={loop} controls={controls} lazy={lazy} captions={captions} captionsUrl={captionsUrl} playing={playing} />}{lightboxOpen ? <div className="content-video-lightbox" role="dialog" aria-modal="true" aria-label={alt || "Video"}><button type="button" className="content-video-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close video"><X size={18} /></button><div className="content-video-lightbox-surface"><VideoSurface embedSrc={embedSrc} embedPlaySrc={embedPlaySrc} file={file} poster={poster} alt={alt} autoplay={true} mute={mute} loop={loop} controls={controls} lazy={false} captions={captions} captionsUrl={captionsUrl} playing /></div></div> : null}</>;
}
