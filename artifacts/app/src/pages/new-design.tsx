import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateDesign } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Mic, Square, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewDesign() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { isRecording, isSupported, toggleRecording, transcript, setTranscript } =
    useSpeechRecognition();

  const createDesign = useCreateDesign();

  useEffect(() => {
    if (isRecording && transcript) {
      setDescription(transcript);
    }
  }, [isRecording, transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and description are required.",
        variant: "destructive",
      });
      return;
    }

    createDesign.mutate(
      {
        data: {
          name,
          rawDescription: description,
          autoInterpret: true,
        },
      },
      {
        onSuccess: (design) => {
          setLocation(`/design/${design.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create design. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-mono tracking-tight font-bold text-primary mb-2">
          INITIALIZE DESIGN
        </h1>
        <p className="text-muted-foreground font-mono text-xs sm:text-sm mb-6 sm:mb-8 border-b border-border pb-4 uppercase tracking-wider">
          Input specifications for CAD generation
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="font-mono text-primary uppercase tracking-wider text-xs sm:text-sm"
            >
              Project Designation
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Minimalist Coffee Table"
              className="font-mono bg-[#0f0f0f] border-border rounded-none focus-visible:ring-primary h-12"
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="description"
                className="font-mono text-primary uppercase tracking-wider text-xs sm:text-sm"
              >
                Design Specifications
              </Label>
              {isSupported && (
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  className="font-mono uppercase tracking-wider rounded-none h-8 px-3 text-xs"
                  data-testid="button-record"
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3 h-3 mr-1.5" /> Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 mr-1.5" /> Voice
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (isRecording) setTranscript(e.target.value);
              }}
              placeholder="Describe what you want to build. Dimensions, materials, shape, load requirements..."
              className="font-mono bg-[#0f0f0f] border-border rounded-none focus-visible:ring-primary min-h-[160px] sm:min-h-[200px] resize-none text-sm"
              data-testid="input-description"
            />
            {isRecording && (
              <div className="flex items-center gap-2 text-destructive text-xs sm:text-sm font-mono mt-2 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Recording active...
              </div>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={
              createDesign.isPending || !name.trim() || !description.trim()
            }
            className="w-full font-mono uppercase tracking-widest rounded-none h-12 sm:h-14 text-sm"
            data-testid="button-submit"
          >
            {createDesign.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />{" "}
                Compiling Specs...
              </>
            ) : (
              <>
                Generate CAD Model{" "}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
