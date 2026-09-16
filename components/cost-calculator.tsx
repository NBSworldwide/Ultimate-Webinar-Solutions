"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/format";

export function CostCalculator() {
  const [price, setPrice] = useState(89);
  const [seats, setSeats] = useState(24);
  const [facilitator, setFacilitator] = useState(650);
  const [platform, setPlatform] = useState(120);
  const [support, setSupport] = useState(80);
  const [paymentFee, setPaymentFee] = useState(3.2);
  const results = useMemo(() => {
    const revenue = price * seats;
    const processing = revenue * (paymentFee / 100);
    const costs = facilitator + platform + support + processing;
    const profit = revenue - costs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const breakEvenSeats = price > 0 ? Math.ceil((facilitator + platform + support) / (price * (1 - paymentFee / 100))) : 0;
    return { revenue, costs, profit, margin, breakEvenSeats };
  }, [facilitator, paymentFee, platform, price, seats, support]);
  return <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Profitability calculator</h2><span className="row-meta">A planning tool for new session templates</span></div><Calculator size={17} color="#0f776e" /></div><div className="calculator-body"><div className="calculator-inputs"><div className="field"><label htmlFor="calc-price">Price per seat (USD)</label><input id="calc-price" type="number" min="0" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></div><div className="field"><label htmlFor="calc-seats">Expected seats</label><input id="calc-seats" type="number" min="1" value={seats} onChange={(event) => setSeats(Number(event.target.value))} /></div><div className="field"><label htmlFor="calc-facilitator">Facilitation cost</label><input id="calc-facilitator" type="number" min="0" value={facilitator} onChange={(event) => setFacilitator(Number(event.target.value))} /></div><div className="field"><label htmlFor="calc-platform">Platform cost</label><input id="calc-platform" type="number" min="0" value={platform} onChange={(event) => setPlatform(Number(event.target.value))} /></div><div className="field"><label htmlFor="calc-support">Support & production</label><input id="calc-support" type="number" min="0" value={support} onChange={(event) => setSupport(Number(event.target.value))} /></div><div className="field"><label htmlFor="calc-fee">Payment fee (%)</label><input id="calc-fee" type="number" min="0" max="20" step="0.1" value={paymentFee} onChange={(event) => setPaymentFee(Number(event.target.value))} /></div></div><div className="calculator-results"><div className="result-highlight"><span className="eyebrow">Projected profit</span><strong>{formatMoney(Math.round(results.profit * 100))}</strong><span className={results.margin >= 0 ? "stat-trend" : "form-error"}>{results.margin.toFixed(1)}% margin</span></div><div className="summary-metric"><span>Gross revenue</span><strong>{formatMoney(Math.round(results.revenue * 100))}</strong></div><div className="summary-metric"><span>Estimated costs</span><strong>{formatMoney(Math.round(results.costs * 100))}</strong></div><div className="summary-metric"><span>Break-even point</span><strong>{results.breakEvenSeats} seats</strong></div><div className="notice-banner" style={{ margin: "16px 0 0", background: "#f7f4e9", borderColor: "#ead9ae", color: "#805c1e" }}><TrendingUp size={15} /><span>Planning estimate only. Payment and provider fees will be confirmed when production adapters are configured.</span></div></div></div></section>;
}
