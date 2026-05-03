import { useListDesigns, useGetDesignStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, Cpu, Activity, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: designs, isLoading } = useListDesigns();
  const { data: stats, isLoading: isStatsLoading } = useGetDesignStats();

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-mono tracking-tight font-bold text-primary">
              PROJECTS
            </h1>
            <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1">
              Design Repository &amp; Analytics
            </p>
          </div>
          <Link href="/new">
            <Button
              size="default"
              className="font-mono uppercase tracking-wider rounded-none whitespace-nowrap"
              data-testid="button-new-design"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Design</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-10">
          <Card className="bg-[#0f0f0f] border-border rounded-none">
            <CardHeader className="pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-sm font-mono text-muted-foreground uppercase flex items-center gap-1 sm:gap-2">
                <Cpu className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Total Designs</span>
                <span className="sm:hidden">Total</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {isStatsLoading ? (
                <Skeleton className="h-8 sm:h-10 w-12 sm:w-20" />
              ) : (
                <div
                  className="text-3xl sm:text-4xl font-mono text-primary"
                  data-testid="stat-total"
                >
                  {stats?.total || 0}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0f0f0f] border-border rounded-none">
            <CardHeader className="pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-sm font-mono text-muted-foreground uppercase flex items-center gap-1 sm:gap-2">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Ready for Build</span>
                <span className="sm:hidden">Ready</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {isStatsLoading ? (
                <Skeleton className="h-8 sm:h-10 w-12 sm:w-20" />
              ) : (
                <div
                  className="text-3xl sm:text-4xl font-mono text-primary"
                  data-testid="stat-ready"
                >
                  {stats?.readyCount || 0}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0f0f0f] border-border rounded-none">
            <CardHeader className="pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-sm font-mono text-muted-foreground uppercase flex items-center gap-1 sm:gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Processing</span>
                <span className="sm:hidden">Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {isStatsLoading ? (
                <Skeleton className="h-8 sm:h-10 w-12 sm:w-20" />
              ) : (
                <div
                  className="text-3xl sm:text-4xl font-mono text-primary"
                  data-testid="stat-pending"
                >
                  {stats?.pendingCount || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm sm:text-lg font-mono text-muted-foreground uppercase border-b border-border pb-2 mb-4">
            Repository Index
          </h2>

          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-20 sm:h-24 w-full rounded-none" />
              ))
          ) : !designs || designs.length === 0 ? (
            <div className="text-center p-8 sm:p-12 border border-dashed border-border bg-[#0f0f0f] flex flex-col items-center justify-center">
              <Cpu className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="font-mono text-lg sm:text-xl mb-2 text-foreground">
                Empty Repository
              </h3>
              <p className="text-muted-foreground mb-5 sm:mb-6 font-mono text-xs sm:text-sm">
                No designs have been generated yet.
              </p>
              <Link href="/new">
                <Button
                  variant="outline"
                  className="font-mono uppercase rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Initialize Design
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {designs.map((design) => (
                <Link key={design.id} href={`/design/${design.id}`}>
                  <div
                    className="block border border-border bg-[#0f0f0f] p-3 sm:p-4 hover:border-primary transition-colors cursor-pointer active:bg-black/40"
                    data-testid={`card-design-${design.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-mono font-bold text-base sm:text-lg text-primary truncate">
                          {design.name}
                        </h3>
                        <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1 mt-1">
                          {design.rawDescription}
                        </p>
                        {design.summary && (
                          <p className="text-foreground text-xs sm:text-sm mt-1.5 line-clamp-2">
                            {design.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge
                          variant={
                            design.status === "ready"
                              ? "default"
                              : design.status === "error"
                              ? "destructive"
                              : "secondary"
                          }
                          className="rounded-none font-mono uppercase text-[10px]"
                        >
                          {design.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                          {format(new Date(design.updatedAt), "MMM dd, yyyy HH:mm")}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono sm:hidden">
                          {format(new Date(design.updatedAt), "MMM dd")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
