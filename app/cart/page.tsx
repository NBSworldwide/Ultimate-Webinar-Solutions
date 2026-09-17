import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { CartClient } from "@/components/cart-client";
export const metadata: Metadata = { title: "Cart" };
export default function CartPage() { return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content"><div className="public-hero"><span className="eyebrow">Shop</span><h1>Your cart.</h1><p>Review physical products before checkout.</p></div><CartClient /></main><PublicFooter /></div>; }
