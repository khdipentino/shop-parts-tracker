"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type Item = { id: string; quantity: number; description: string; partNumber: string };

export default function PrintReceipt({
  invoiceNumber,
  employeeName,
  workOrderNumber,
  dateLabel,
  items,
}: {
  invoiceNumber: number;
  employeeName: string;
  workOrderNumber: string | null;
  dateLabel: string;
  items: Item[];
}) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Print
        </button>
        <Link href="/checkout" className="text-sm text-slate-500 dark:text-slate-400 underline">
          Start next checkout
        </Link>
      </div>

      <div className="max-w-md border border-slate-300 dark:border-slate-700 rounded-md p-6 bg-white text-black">
        <h1 className="text-lg font-semibold">Parts Receipt</h1>
        <p className="text-sm text-slate-600">#{invoiceNumber}</p>
        <div className="mt-4 text-sm space-y-1">
          <p>
            <span className="text-slate-500">Employee: </span>
            {employeeName}
          </p>
          {workOrderNumber && (
            <p>
              <span className="text-slate-500">Work order / vehicle: </span>
              {workOrderNumber}
            </p>
          )}
          <p>
            <span className="text-slate-500">Date: </span>
            {dateLabel}
          </p>
        </div>

        <table className="w-full text-sm mt-4 border-t border-slate-300 pt-2">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">Part</th>
              <th className="py-1 font-medium text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-200">
                <td className="py-1">
                  {i.description}
                  <span className="text-slate-500"> ({i.partNumber})</span>
                </td>
                <td className="py-1 text-right">{i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-slate-500 mt-6">Attach this receipt to the work order to charge the vehicle.</p>
      </div>
    </div>
  );
}
