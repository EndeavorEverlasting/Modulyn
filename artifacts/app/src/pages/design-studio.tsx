import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { 
  useGetDesign, 
  useUpdateDesign, 
  useInterpretDesign,
  useDeleteDesign,
  getGetDesignQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { ThreeViewer } from "@/components/3d-viewer";
import { BlueprintViewer } from "@/components/blueprint-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowRight, Play, Trash2, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function DesignStudio() {
  const { id } = useParams<{ id: string }>();
  const designId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [refinement, setRefinement] = useState("");

  const { data: design, isLoading, error } = useGetDesign(designId, {
    query: {
      enabled: !!designId,
      queryKey: getGetDesignQueryKey(designId),
      refetchInterval: (query) => {
        return query.state.data?.status === 'interpreting' ? 2000 : false;
      }
    }
  });

  const updateDesign = useUpdateDesign();
  const interpretDesign = useInterpretDesign();
  const deleteDesign = useDeleteDesign();

  const handleRefine = () => {
    if (!refinement.trim()) return;

    updateDesign.mutate(
      {
        id: designId,
        data: {
          rawDescription: design?.rawDescription + "\n\nFollow-up: " + refinement,
        },
      },
      {
        onSuccess: () => {
          setRefinement("");
          queryClient.invalidateQueries({ queryKey: getGetDesignQueryKey(designId) });
        },
      }
    );
  };

  const handleReinterpret = () => {
    interpretDesign.mutate(
      { id: designId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDesignQueryKey(designId) });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteDesign.mutate(
      { id: designId },
      {
        onSuccess: () => {
          toast({ title: "Design deleted" });
          setLocation("/");
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full p-4 gap-4 animate-pulse">
          <Skeleton className="w-[300px] h-full rounded-none" />
          <Skeleton className="flex-1 h-full rounded-none" />
          <Skeleton className="w-[400px] h-full rounded-none" />
        </div>
      </Layout>
    );
  }

  if (error || !design) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-xl font-mono text-destructive mb-2">Error Loading Design</h2>
          <p className="text-muted-foreground font-mono">Could not find design specs.</p>
          <Button className="mt-4 rounded-none font-mono" onClick={() => setLocation("/")}>Return to Hub</Button>
        </div>
      </Layout>
    );
  }

  const isInterpreting = design.status === "interpreting";
  const sd = design.structuredData;

  return (
    <Layout>
      <div className="flex h-full w-full overflow-hidden bg-[#050505]">
        
        {/* LEFT PANEL - Input & Metadata */}
        <div className="w-[320px] flex-shrink-0 border-r border-border bg-[#0a0a0a] flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-mono text-lg font-bold text-primary mb-1 uppercase tracking-tight line-clamp-1">{design.name}</h2>
            <div className="flex items-center justify-between mb-2">
              <Badge variant={design.status === 'ready' ? 'default' : design.status === 'error' ? 'destructive' : 'secondary'} className="rounded-none uppercase font-mono text-[10px]">
                {design.status}
              </Badge>
              {sd?.designType && <span className="font-mono text-xs text-muted-foreground uppercase">{sd.designType}</span>}
            </div>
            {sd?.estimatedCost && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <span className="font-mono text-xs text-muted-foreground uppercase block mb-1">Est. Material Cost</span>
                <span className="font-mono text-lg text-foreground">{sd.estimatedCost}</span>
              </div>
            )}
            
            <div className="mt-4 flex gap-2">
              {design.status === "error" && (
                <Button size="sm" variant="outline" className="w-full rounded-none font-mono text-xs" onClick={handleReinterpret} disabled={interpretDesign.isPending}>
                  <Play className="w-3 h-3 mr-2" /> Retry
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full rounded-none font-mono text-xs text-destructive hover:bg-destructive hover:text-white border-destructive/30" data-testid="button-delete">
                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-none bg-[#0a0a0a] border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono text-primary">Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription className="font-mono text-muted-foreground">
                      Are you sure you want to delete {design.name}? This action cannot be reversed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none font-mono">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="rounded-none font-mono bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="font-mono text-xs text-muted-foreground uppercase mb-2 flex items-center"><PenTool className="w-3 h-3 mr-2"/> Original Spec</h3>
                <div className="font-mono text-sm bg-black/50 p-3 border border-border/50 text-foreground whitespace-pre-wrap">
                  {design.rawDescription}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-border bg-[#0a0a0a]">
            <h3 className="font-mono text-xs text-muted-foreground uppercase mb-2">Refine Specs</h3>
            <Textarea 
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="e.g. Make it 2 inches taller..."
              className="font-mono text-sm bg-black border-border rounded-none min-h-[80px] resize-none focus-visible:ring-primary mb-2"
              disabled={isInterpreting}
              data-testid="input-refinement"
            />
            <Button 
              className="w-full rounded-none font-mono uppercase tracking-wider" 
              onClick={handleRefine}
              disabled={isInterpreting || !refinement.trim() || updateDesign.isPending}
              data-testid="button-submit-refinement"
            >
              {isInterpreting || updateDesign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4 mr-2" /> Apply</>}
            </Button>
          </div>
        </div>

        {/* CENTER PANEL - 3D Viewer */}
        <div className="flex-1 relative border-r border-border flex flex-col bg-black">
          <div className="absolute top-4 left-4 z-10">
            <Badge variant="outline" className="bg-black/80 backdrop-blur text-primary border-primary rounded-none font-mono uppercase">
              3D Render
            </Badge>
          </div>
          
          {isInterpreting && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="font-mono text-primary uppercase tracking-widest animate-pulse">Compiling Geometry...</p>
            </div>
          )}

          {sd?.components ? (
             <ThreeViewer components={sd.components} />
          ) : !isInterpreting ? (
            <div className="flex items-center justify-center h-full text-muted-foreground font-mono">
              No geometry data available.
            </div>
          ) : null}
        </div>

        {/* RIGHT PANEL - Tabs */}
        <div className="w-[450px] flex-shrink-0 bg-[#0a0a0a] flex flex-col">
          <Tabs defaultValue="materials" className="flex flex-col h-full rounded-none">
            <TabsList className="w-full rounded-none border-b border-border bg-[#050505] p-0 h-12 justify-start px-2">
              <TabsTrigger value="materials" className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4" data-testid="tab-materials">Cut List</TabsTrigger>
              <TabsTrigger value="blueprint" className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4" data-testid="tab-blueprint">Blueprint</TabsTrigger>
              <TabsTrigger value="build" className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4" data-testid="tab-build">Instructions</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden relative">
              {isInterpreting && (
                <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                  <p className="font-mono text-primary text-sm uppercase animate-pulse">Processing Data...</p>
                </div>
              )}
              
              <TabsContent value="materials" className="m-0 h-full p-0 data-[state=active]:flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="font-mono text-xs uppercase">Part</TableHead>
                          <TableHead className="font-mono text-xs uppercase">Material</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">Dims ({sd?.unit || 'in'})</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sd?.components.map((c, i) => (
                          <TableRow key={i} className="border-border/50 hover:bg-black/50">
                            <TableCell className="font-mono text-sm py-3 text-foreground">{c.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{c.material}</TableCell>
                            <TableCell className="font-mono text-xs text-right whitespace-nowrap">{c.width} × {c.height} × {c.depth}</TableCell>
                            <TableCell className="font-mono text-sm text-right font-bold text-primary">{c.quantity}</TableCell>
                          </TableRow>
                        ))}
                        {!sd?.components?.length && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center font-mono text-muted-foreground py-8">No cut list generated.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
                {sd?.components && (
                  <div className="p-4 border-t border-border bg-[#050505] flex justify-between items-center">
                    <span className="font-mono text-xs uppercase text-muted-foreground">Total Parts</span>
                    <span className="font-mono font-bold text-primary text-lg">
                      {sd.components.reduce((acc, c) => acc + c.quantity, 0)}
                    </span>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="blueprint" className="m-0 h-full data-[state=active]:flex flex-col">
                {sd?.components ? <BlueprintViewer components={sd.components} /> : <div className="p-4 font-mono text-muted-foreground">No blueprints available.</div>}
              </TabsContent>
              
              <TabsContent value="build" className="m-0 h-full data-[state=active]:flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {sd?.buildInstructions?.map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#111] border border-primary/30 flex items-center justify-center font-mono text-primary font-bold">
                          {i + 1}
                        </div>
                        <div className="font-mono text-sm text-foreground leading-relaxed pt-1">
                          {step}
                        </div>
                      </div>
                    ))}
                    {!sd?.buildInstructions?.length && (
                      <div className="text-center font-mono text-muted-foreground py-8">No build instructions generated.</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}