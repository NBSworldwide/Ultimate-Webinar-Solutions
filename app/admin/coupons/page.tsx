import type { Metadata } from "next";
import { getCoupons } from "@/lib/catalog";
import { CouponManager } from "@/components/coupon-manager";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coupons", robots: { index: false, follow: false } };
export default async function CouponsPage() { return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Commerce management</span><h1 className="page-title">Coupons.</h1><p className="page-subtitle">Create scheduled percentage, fixed-amount, or free-shipping promotions with usage limits.</p></div></div><CouponManager coupons={await getCoupons()} /></div>; }
