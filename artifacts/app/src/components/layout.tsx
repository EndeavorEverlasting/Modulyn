import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Hammer, ChevronLeft } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isInnerPage = location !== "/";

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <header className="h-14 border-b border-border bg-card flex items-center px-4 sm:px-6 shrink-0">
        {/* Mobile: show back arrow on inner pages */}
        {isInnerPage && (
          <Link
            href="/"
            className="lg:hidden flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-3 -ml-1 p-1"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        )}

        <Link
          href="/"
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <Hammer className="w-5 h-5" />
          <span className="font-mono font-bold tracking-tight">VoiceCAD</span>
        </Link>

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-mono text-xs sm:text-sm">v1.0.0</span>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
