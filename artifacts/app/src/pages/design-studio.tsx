import { useParams, useLocation } from "wouter";
import { useState } from "react";
import {
  useGetDesign,
  useUpdateDesign,
  useInterpretDesign,
  useDeleteDesign,
  getGetDesignQueryKey,
} from "@workspace/api-client-react";
import type { Component3D } from "@workspace/api-client-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ArrowRight,
  Play,
  Trash2,
  PenTool,
  Clock,
  Weight,
  Wrench,
  Layers,
  Box,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type MobilePanel = "spec" | "model" | "details";

export default function DesignStudio() {
  const { id } = useParams<{ id: string }>();
  const designId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [refinement, setRefinement] = useState("");
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("model");
  const [specExpanded, setSpecExpanded] = useState(false);

  const { data: design, isLoading, error } = useGetDesign(designId, {
    query: {
      enabled: !!designId,
      queryKey: getGetDesignQueryKey(designId),
      refetchInterval: (query) => {
        return query.state.data?.status === "interpreting" ? 2000 : false;
      },
    },
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
          rawDescription:
            design?.rawDescription + "\n\nFollow-up: " + refinement,
        },
      },
      {
        onSuccess: () => {
          setRefinement("");
          setSelectedVariantIndex(0);
          queryClient.invalidateQueries({
            queryKey: getGetDesignQueryKey(designId),
          });
        },
      }
    );
  };

  const handleReinterpret = () => {
    interpretDesign.mutate(
      { id: designId },
      {
        onSuccess: () => {
          setSelectedVariantIndex(0);
          queryClient.invalidateQueries({
            queryKey: getGetDesignQueryKey(designId),
          });
        },
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
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full p-4 gap-4 animate-pulse">
          <Skeleton className="hidden lg:block w-[300px] h-full rounded-none" />
          <Skeleton className="flex-1 h-full rounded-none" />
          <Skeleton className="hidden lg:block w-[400px] h-full rounded-none" />
        </div>
      </Layout>
    );
  }

  if (error || !design) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-xl font-mono text-destructive mb-2">
            Error Loading Design
          </h2>
          <p className="text-muted-foreground font-mono">
            Could not find design specs.
          </p>
          <Button
            className="mt-4 rounded-none font-mono"
            onClick={() => setLocation("/")}
          >
            Return to Hub
          </Button>
        </div>
      </Layout>
    );
  }

  const isInterpreting = design.status === "interpreting";
  const sd = design.structuredData;

  const variants = sd?.designVariants ?? [];
  const activeComponents: Component3D[] = (() => {
    if (!sd?.components) return [];
    if (variants.length > 0 && selectedVariantIndex > 0) {
      const v = variants[selectedVariantIndex - 1];
      return v?.components ?? sd.components;
    }
    return sd.components;
  })();

  const hasVariants = variants.length > 0;

  // ── Shared sub-components ─────────────────────────────────────────────────

  const VariantStrip = () =>
    hasVariants && sd ? (
      <div className="flex gap-1 p-2 bg-black/70 backdrop-blur border-b border-border/40 overflow-x-auto">
        <button
          onClick={() => setSelectedVariantIndex(0)}
          className={`flex-shrink-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide border transition-colors ${
            selectedVariantIndex === 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {variants[0]?.name ?? "Primary"}
        </button>
        {variants.slice(1).map((v, i) => (
          <button
            key={i + 1}
            onClick={() => setSelectedVariantIndex(i + 1)}
            className={`flex-shrink-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide border transition-colors ${
              selectedVariantIndex === i + 1
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>
    ) : null;

  const StatsGrid = () => (
    <div className="space-y-2">
      {sd?.estimatedCost && (
        <div className="bg-black/40 border border-border/40 p-2">
          <span className="font-mono text-[10px] text-muted-foreground uppercase block mb-0.5">
            Est. Material Cost
          </span>
          <span className="font-mono text-sm text-foreground">
            {sd.estimatedCost}
          </span>
        </div>
      )}
      {sd?.printTimeEstimate && (
        <div className="bg-black/40 border border-primary/20 p-2">
          <span className="font-mono text-[10px] text-primary/70 uppercase flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3" /> Print Time
          </span>
          <span className="font-mono text-sm text-foreground">
            {sd.printTimeEstimate}
          </span>
        </div>
      )}
      {sd?.weightCapacity && (
        <div className="bg-black/40 border border-amber-500/20 p-2">
          <span className="font-mono text-[10px] text-amber-500/70 uppercase flex items-center gap-1 mb-0.5">
            <Weight className="w-3 h-3" /> Load Capacity
          </span>
          <span className="font-mono text-sm text-foreground">
            {sd.weightCapacity}
          </span>
        </div>
      )}
    </div>
  );

  const CutListContent = () => (
    <>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase">Part</TableHead>
                <TableHead className="font-mono text-xs uppercase">Material</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right">
                  Dims ({sd?.unit || "in"})
                </TableHead>
                <TableHead className="font-mono text-xs uppercase text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeComponents.map((c, i) => (
                <TableRow key={i} className="border-border/50 hover:bg-black/50">
                  <TableCell className="font-mono text-sm py-3 text-foreground">
                    {c.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.material}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-right whitespace-nowrap">
                    {c.width} × {c.height} × {c.depth}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-right font-bold text-primary">
                    {c.quantity}
                  </TableCell>
                </TableRow>
              ))}
              {!activeComponents.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center font-mono text-muted-foreground py-8"
                  >
                    No cut list generated.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
      {activeComponents.length > 0 && (
        <div className="p-4 border-t border-border bg-[#050505] flex justify-between items-center">
          <span className="font-mono text-xs uppercase text-muted-foreground">
            Total Parts
          </span>
          <span className="font-mono font-bold text-primary text-lg">
            {activeComponents.reduce((acc, c) => acc + c.quantity, 0)}
          </span>
        </div>
      )}
    </>
  );

  const InstructionsContent = () => (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        {sd?.installationNotes && (
          <div className="border border-amber-500/30 bg-amber-500/5 p-4">
            <h4 className="font-mono text-xs text-amber-400 uppercase flex items-center gap-2 mb-3">
              <Wrench className="w-3.5 h-3.5" /> Installation
            </h4>
            <p className="font-mono text-sm text-foreground/90 leading-relaxed">
              {sd.installationNotes}
            </p>
          </div>
        )}
        {sd?.buildInstructions && sd.buildInstructions.length > 0 && (
          <div>
            <h4 className="font-mono text-xs text-muted-foreground uppercase mb-4">
              Build Steps
            </h4>
            <div className="space-y-4">
              {sd.buildInstructions.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#111] border border-primary/30 flex items-center justify-center font-mono text-primary font-bold">
                    {i + 1}
                  </div>
                  <div className="font-mono text-sm text-foreground leading-relaxed pt-1">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!sd?.buildInstructions?.length && (
          <div className="text-center font-mono text-muted-foreground py-8">
            No build instructions generated.
          </div>
        )}
      </div>
    </ScrollArea>
  );

  const VariantsContent = () => (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        <p className="font-mono text-xs text-muted-foreground uppercase mb-4">
          Select a shape variant to preview in the 3D viewer
        </p>
        {variants[0] && (
          <button
            onClick={() => setSelectedVariantIndex(0)}
            className={`w-full text-left p-4 border transition-colors ${
              selectedVariantIndex === 0
                ? "border-primary bg-primary/5"
                : "border-border/40 hover:border-primary/30 hover:bg-black/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-sm font-bold text-foreground block">
                  {variants[0].name}
                </span>
                <span className="font-mono text-xs text-muted-foreground mt-1 block leading-relaxed">
                  {variants[0].description}
                </span>
              </div>
              <div className="flex-shrink-0">
                {selectedVariantIndex === 0 ? (
                  <Badge className="rounded-none font-mono text-[10px] uppercase">Active</Badge>
                ) : (
                  <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase text-muted-foreground">
                    Select
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-2 font-mono text-[10px] text-muted-foreground/60">
              {variants[0].components?.length ?? 0} parts
            </div>
          </button>
        )}
        {variants.slice(1).map((v, i) => {
          const idx = i + 1;
          return (
            <button
              key={idx}
              onClick={() => setSelectedVariantIndex(idx)}
              className={`w-full text-left p-4 border transition-colors ${
                selectedVariantIndex === idx
                  ? "border-primary bg-primary/5"
                  : "border-border/40 hover:border-primary/30 hover:bg-black/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-sm font-bold text-foreground block">
                    {v.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground mt-1 block leading-relaxed">
                    {v.description}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  {selectedVariantIndex === idx ? (
                    <Badge className="rounded-none font-mono text-[10px] uppercase">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase text-muted-foreground">
                      Select
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground/60">
                {v.components?.length ?? 0} parts
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );

  const DeleteButton = () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-none font-mono text-xs text-destructive hover:bg-destructive hover:text-white border-destructive/30"
          data-testid="button-delete"
        >
          <Trash2 className="w-3 h-3 mr-2" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none bg-[#0a0a0a] border-border mx-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-primary">
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className="font-mono text-muted-foreground">
            Are you sure you want to delete {design.name}? This action cannot be
            reversed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none font-mono">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="rounded-none font-mono bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ── MOBILE LAYOUT (<lg) ───────────────────────────────────────────────────
  const MobileLayout = () => (
    <div className="flex flex-col h-full bg-[#050505]">

      {/* Design identity strip */}
      <div className="border-b border-border bg-[#0a0a0a] px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="font-mono text-base font-bold text-primary uppercase tracking-tight truncate">
            {design.name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant={
                design.status === "ready"
                  ? "default"
                  : design.status === "error"
                  ? "destructive"
                  : "secondary"
              }
              className="rounded-none uppercase font-mono text-[10px]"
            >
              {design.status}
            </Badge>
            {sd?.designType && (
              <span className="font-mono text-[10px] text-muted-foreground uppercase">
                {sd.designType}
              </span>
            )}
          </div>
        </div>
        {design.status === "error" && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-none font-mono text-xs flex-shrink-0"
            onClick={handleReinterpret}
            disabled={interpretDesign.isPending}
          >
            <Play className="w-3 h-3 mr-1" /> Retry
          </Button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {isInterpreting && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="font-mono text-primary uppercase tracking-widest text-sm animate-pulse">
              Compiling Geometry...
            </p>
          </div>
        )}

        {/* SPEC panel */}
        {mobilePanel === "spec" && (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <StatsGrid />

              <div>
                <button
                  onClick={() => setSpecExpanded(!specExpanded)}
                  className="w-full flex items-center justify-between font-mono text-xs text-muted-foreground uppercase mb-2"
                >
                  <span className="flex items-center gap-2">
                    <PenTool className="w-3 h-3" /> Original Spec
                  </span>
                  {specExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {specExpanded && (
                  <div className="font-mono text-sm bg-black/50 p-3 border border-border/50 text-foreground whitespace-pre-wrap">
                    {design.rawDescription}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-mono text-xs text-muted-foreground uppercase mb-2">
                  Refine Specs
                </h3>
                <Textarea
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  placeholder="e.g. Make it 2 inches taller..."
                  className="font-mono text-sm bg-black border-border rounded-none min-h-[100px] resize-none focus-visible:ring-primary mb-2"
                  disabled={isInterpreting}
                  data-testid="input-refinement"
                />
                <Button
                  className="w-full rounded-none font-mono uppercase tracking-wider mb-3"
                  onClick={handleRefine}
                  disabled={
                    isInterpreting || !refinement.trim() || updateDesign.isPending
                  }
                  data-testid="button-submit-refinement"
                >
                  {isInterpreting || updateDesign.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" /> Apply
                    </>
                  )}
                </Button>
                <DeleteButton />
              </div>
            </div>
          </ScrollArea>
        )}

        {/* MODEL panel */}
        {mobilePanel === "model" && (
          <div className="h-full flex flex-col">
            <VariantStrip />
            <div className="relative flex-1 min-h-0">
              <div className="absolute inset-0 bg-black">
                <div className="absolute top-3 left-3 z-10">
                  <Badge
                    variant="outline"
                    className="bg-black/80 backdrop-blur text-primary border-primary rounded-none font-mono uppercase text-[10px]"
                  >
                    3D · Drag to rotate
                  </Badge>
                </div>
                {activeComponents.length > 0 ? (
                  <ThreeViewer components={activeComponents} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
                    No geometry data.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DETAILS panel */}
        {mobilePanel === "details" && (
          <Tabs defaultValue="cutlist" className="flex flex-col h-full rounded-none">
            <TabsList className="w-full rounded-none border-b border-border bg-[#050505] p-0 h-10 justify-start px-2 overflow-x-auto">
              <TabsTrigger
                value="cutlist"
                className="rounded-none font-mono text-[10px] uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-3 flex-shrink-0"
                data-testid="tab-materials"
              >
                Cut List
              </TabsTrigger>
              <TabsTrigger
                value="blueprint"
                className="rounded-none font-mono text-[10px] uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-3 flex-shrink-0"
                data-testid="tab-blueprint"
              >
                Blueprint
              </TabsTrigger>
              <TabsTrigger
                value="build"
                className="rounded-none font-mono text-[10px] uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-3 flex-shrink-0"
                data-testid="tab-build"
              >
                Instructions
              </TabsTrigger>
              {hasVariants && (
                <TabsTrigger
                  value="variants"
                  className="rounded-none font-mono text-[10px] uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-3 flex-shrink-0"
                  data-testid="tab-variants"
                >
                  <Layers className="w-3 h-3 mr-1" />Variants
                </TabsTrigger>
              )}
            </TabsList>
            <div className="flex-1 overflow-hidden relative">
              {isInterpreting && (
                <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                  <p className="font-mono text-primary text-xs uppercase animate-pulse">
                    Processing...
                  </p>
                </div>
              )}
              <TabsContent value="cutlist" className="m-0 h-full p-0 data-[state=active]:flex flex-col">
                <CutListContent />
              </TabsContent>
              <TabsContent value="blueprint" className="m-0 h-full data-[state=active]:flex flex-col">
                {activeComponents.length > 0 && sd ? (
                  <BlueprintViewer
                    components={activeComponents}
                    overallWidth={sd.overallWidth}
                    overallHeight={sd.overallHeight}
                    overallDepth={sd.overallDepth}
                    unit={sd.unit}
                  />
                ) : (
                  <div className="p-4 font-mono text-muted-foreground">No blueprints available.</div>
                )}
              </TabsContent>
              <TabsContent value="build" className="m-0 h-full data-[state=active]:flex flex-col">
                <InstructionsContent />
              </TabsContent>
              {hasVariants && (
                <TabsContent value="variants" className="m-0 h-full data-[state=active]:flex flex-col">
                  <VariantsContent />
                </TabsContent>
              )}
            </div>
          </Tabs>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="border-t border-border bg-[#0a0a0a] flex h-14 flex-shrink-0">
        {(
          [
            { id: "spec", icon: FileText, label: "Spec" },
            { id: "model", icon: Box, label: "Model" },
            { id: "details", icon: Layers, label: "Details" },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setMobilePanel(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors font-mono text-[10px] uppercase tracking-wide ${
              mobilePanel === id
                ? "text-primary border-t-2 border-primary -mt-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  // ── DESKTOP LAYOUT (lg+) ──────────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="flex h-full w-full overflow-hidden bg-[#050505]">

      {/* LEFT PANEL */}
      <div className="w-[320px] flex-shrink-0 border-r border-border bg-[#0a0a0a] flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-mono text-lg font-bold text-primary mb-1 uppercase tracking-tight line-clamp-1">
            {design.name}
          </h2>
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant={
                design.status === "ready"
                  ? "default"
                  : design.status === "error"
                  ? "destructive"
                  : "secondary"
              }
              className="rounded-none uppercase font-mono text-[10px]"
            >
              {design.status}
            </Badge>
            {sd?.designType && (
              <span className="font-mono text-xs text-muted-foreground uppercase">
                {sd.designType}
              </span>
            )}
          </div>
          <div className="mt-3">
            <StatsGrid />
          </div>
          <div className="mt-3 flex gap-2">
            {design.status === "error" && (
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-none font-mono text-xs"
                onClick={handleReinterpret}
                disabled={interpretDesign.isPending}
              >
                <Play className="w-3 h-3 mr-2" /> Retry
              </Button>
            )}
            <DeleteButton />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <div>
              <h3 className="font-mono text-xs text-muted-foreground uppercase mb-2 flex items-center">
                <PenTool className="w-3 h-3 mr-2" /> Original Spec
              </h3>
              <div className="font-mono text-sm bg-black/50 p-3 border border-border/50 text-foreground whitespace-pre-wrap">
                {design.rawDescription}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-[#0a0a0a]">
          <h3 className="font-mono text-xs text-muted-foreground uppercase mb-2">
            Refine Specs
          </h3>
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
            disabled={
              isInterpreting || !refinement.trim() || updateDesign.isPending
            }
            data-testid="button-submit-refinement"
          >
            {isInterpreting || updateDesign.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" /> Apply
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CENTER PANEL - 3D Viewer */}
      <div className="flex-1 relative border-r border-border flex flex-col bg-black">
        {hasVariants && sd && (
          <div className="border-b border-border/40">
            <VariantStrip />
          </div>
        )}
        <div className={`absolute z-10 ${hasVariants ? "top-14" : "top-4"} left-4`}>
          <Badge
            variant="outline"
            className="bg-black/80 backdrop-blur text-primary border-primary rounded-none font-mono uppercase"
          >
            3D Render · Drag to rotate
          </Badge>
        </div>
        {isInterpreting && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="font-mono text-primary uppercase tracking-widest animate-pulse">
              Compiling Geometry...
            </p>
          </div>
        )}
        {activeComponents.length > 0 ? (
          <ThreeViewer components={activeComponents} />
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
            <TabsTrigger
              value="materials"
              className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4"
              data-testid="tab-materials"
            >
              Cut List
            </TabsTrigger>
            <TabsTrigger
              value="blueprint"
              className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4"
              data-testid="tab-blueprint"
            >
              Blueprint
            </TabsTrigger>
            <TabsTrigger
              value="build"
              className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4"
              data-testid="tab-build"
            >
              Instructions
            </TabsTrigger>
            {hasVariants && (
              <TabsTrigger
                value="variants"
                className="rounded-none font-mono uppercase data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-primary h-full px-4"
                data-testid="tab-variants"
              >
                <Layers className="w-3 h-3 mr-1.5" />Variants
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex-1 overflow-hidden relative">
            {isInterpreting && (
              <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                <p className="font-mono text-primary text-sm uppercase animate-pulse">
                  Processing Data...
                </p>
              </div>
            )}
            <TabsContent value="materials" className="m-0 h-full p-0 data-[state=active]:flex flex-col">
              <CutListContent />
            </TabsContent>
            <TabsContent value="blueprint" className="m-0 h-full data-[state=active]:flex flex-col">
              {activeComponents.length > 0 && sd ? (
                <BlueprintViewer
                  components={activeComponents}
                  overallWidth={sd.overallWidth}
                  overallHeight={sd.overallHeight}
                  overallDepth={sd.overallDepth}
                  unit={sd.unit}
                />
              ) : (
                <div className="p-4 font-mono text-muted-foreground">
                  No blueprints available.
                </div>
              )}
            </TabsContent>
            <TabsContent value="build" className="m-0 h-full data-[state=active]:flex flex-col">
              <InstructionsContent />
            </TabsContent>
            {hasVariants && (
              <TabsContent value="variants" className="m-0 h-full data-[state=active]:flex flex-col">
                <VariantsContent />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="lg:hidden flex-1 overflow-hidden flex flex-col">
          <MobileLayout />
        </div>
        <div className="hidden lg:flex flex-1 overflow-hidden">
          <DesktopLayout />
        </div>
      </div>
    </Layout>
  );
}
