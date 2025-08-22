// src/components/Layout.tsx
import { ReactNode } from "react";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8">{children}</main>
    </div>
  );
}
