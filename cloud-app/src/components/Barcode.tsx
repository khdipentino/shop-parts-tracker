"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

// Renders a CODE128 barcode as inline SVG — used for both printable part
// labels and employee badges. CODE128 handles any mix of letters/digits,
// so it works whether a code was auto-generated (e.g. "P-000123") or
// copied over from an old physical badge/label.
export default function Barcode({
  value,
  height = 60,
  className,
}: {
  value: string;
  height?: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        displayValue: true,
        fontSize: 14,
        margin: 8,
      });
    } catch {
      // Invalid/empty code for the chosen symbology — leave the SVG blank
      // rather than crashing the page.
    }
  }, [value, height]);

  return <svg ref={ref} className={className} />;
}
