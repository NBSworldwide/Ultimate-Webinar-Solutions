import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
export const metadata: Metadata = { title: "Checkout" };
export default function CheckoutPage() { return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content"><div className="public-hero"><span className="eyebrow">Secure checkout</span><h1>Checkout.</h1><p>The storefront checkout shell is ready. A payment provider can be connected at this boundary without changing product, inventory, or fulfillment records.</p></div><section className="notice-banner"><span><strong>Demo mode.</strong> Use the product detail checkout to record a synthetic order while no payment gateway is selected.</span></section><Link href="/products" className="button">Return to products</Link></main><PublicFooter /></div>; }
