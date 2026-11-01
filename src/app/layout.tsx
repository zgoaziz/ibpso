import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Improved BPSO • 0/1 Knapsack Visualizer",
  description:
    "Interactive walkthrough of the Improved Binary Particle Swarm Optimization for the 0/1 Knapsack problem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
