import { ReactNode } from "react";
import { Link } from "wouter";
import { Hammer } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <Hammer className="w-5 h-5" />
          <span className="font-mono font-bold tracking-tight">VoiceCAD</span>
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-mono">v1.0.0</span>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}