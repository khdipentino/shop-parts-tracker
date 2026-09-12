import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shop Parts Tracker",
  description: "Receive, issue, and return shop parts with barcode scanning",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
