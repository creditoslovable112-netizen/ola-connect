import { useEffect, useRef, useState } from "react";
import { useDashboardMotion } from "../hooks/use-dashboard-motion";

const formatAmount = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Visual interpolation only; assistive technology always receives the real total. */
export function AnimatedAmount({ value }: { value: number }) {
  const animate = useDashboardMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(0);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }
    const from = previous.current;
    previous.current = value;
    let frame = 0;
    let start: number | undefined;
    const step = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / 620);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [animate, value]);

  return <span className="animated-amount"><span aria-hidden="true">{formatAmount(animate ? display : value)}</span><span className="sr-only">{formatAmount(value)}</span></span>;
}