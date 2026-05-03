import { useListDesigns, useGetDesignStats, getListDesignsQueryKey } from "@workspace/api-client-react";
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
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-mono tracking-tight font-bold text-primary">PROJECTS</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">Design Repository & Analytics</p>
          </div>
          <Link href="/new">
            <Button size="lg" className="font-mono uppercase tracking-wider rounded-none" data-testid="button-new-design">
              <Plus className="mr-2 h-4 w-4" /> New Design
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-[#0f0f0f] border-border rounded-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
                <Cpu className="mr-2 h-4 w-4" /> Total Designs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-4xl font-mono text-primary" data-testid="stat-total">{stats?.total || 0}</div>}
            </CardContent>
          </Card>
          <Card className="bg-[#0f0f0f] border-border rounded-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
                <Activity className="mr-2 h-4 w-4" /> Ready for Build
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-4xl font-mono text-primary" data-testid="stat-ready">{stats?.readyCount || 0}</div>}
            </CardContent>
          </Card>
          <Card className="bg-[#0f0f0f] border-border rounded-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
                <Clock className="mr-2 h-4 w-4" /> Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-4xl font-mono text-primary" data-testid="stat-pending">{stats?.pendingCount || 0}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-mono text-muted-foreground uppercase border-b border-border pb-2 mb-4">Repository Index</h2>
          
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-none" />)
          ) : !designs || designs.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border bg-[#0f0f0f] flex flex-col items-center justify-center">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-mono text-xl mb-2 text-foreground">Empty Repository</h3>
              <p className="text-muted-foreground mb-6 font-mono text-sm">No designs have been generated yet.</p>
              <Link href="/new">
                <Button variant="outline" className="font-mono uppercase rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  Initialize Design
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {designs.map((design) => (
                <Link key={design.id} href={`/design/${design.id}`}>
                  <div className="block border border-border bg-[#0f0f0f] p-4 hover:border-primary transition-colors cursor-pointer" data-testid={`card-design-${design.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-mono font-bold text-lg text-primary">{design.name}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-1 mt-1">{design.rawDescription}</p>
                        {design.summary && <p className="text-foreground text-sm mt-2">{design.summary}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={design.status === 'ready' ? 'default' : design.status === 'error' ? 'destructive' : 'secondary'} className="rounded-none font-mono uppercase">
                          {design.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(design.updatedAt), 'MMM dd, yyyy HH:mm')}
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