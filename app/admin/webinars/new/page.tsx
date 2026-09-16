import type { Metadata } from "next";
import { WebinarForm } from "@/components/webinar-form";

export const metadata: Metadata = { title: "New webinar" };

export default function NewWebinarPage() {
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Program management</span><h1 className="page-title">Create a webinar.</h1><p className="page-subtitle">Start with the session details and a primary seat tier. Add more tiers in the next release.</p></div></div><WebinarForm /></div>;
}
