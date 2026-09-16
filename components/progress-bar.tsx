export function ProgressBar({ value, max, tone = "teal" }: { value: number; max: number; tone?: "teal" | "coral" | "gold" }) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className={`progress-track progress-${tone}`} aria-label={`${percentage}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div>;
}
