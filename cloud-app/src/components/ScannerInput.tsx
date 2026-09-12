"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// A text field tuned for handheld USB/Bluetooth "keyboard wedge" barcode
// scanners: they just type the scanned code followed by Enter, exactly
// like a fast human typist would. So this is really a plain input — the
// only special behavior is (1) firing onScan on Enter instead of a submit
// button, so the counter never needs a mouse, and (2) stealing focus back
// after a scan/click so the *next* scan always lands here without the
// operator having to click into the field again.
//
// Forwards a ref (typed as HTMLInputElement, so `ref.current?.focus()`
// works) for the rare case a parent needs to move focus here itself —
// e.g. chaining two scan fields where the second one isn't mounted fresh.
const ScannerInput = forwardRef<
  HTMLInputElement,
  {
    onScan: (code: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    disabled?: boolean;
  }
>(function ScannerInput({ onScan, placeholder = "Scan or type a barcode, then press Enter", autoFocus = true, disabled = false }, forwardedRef) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function refocus() {
    if (!autoFocus) return;
    // Only steal focus back if it fell through to nothing in particular
    // (e.g. after Enter, or a click on empty space) — never yank it away
    // from a quantity field, button, or other input the operator is
    // actually using.
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        inputRef.current?.focus();
      }
    }, 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = value.trim();
      setValue("");
      if (code) onScan(code);
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={refocus}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 disabled:opacity-60"
    />
  );
});

export default ScannerInput;
