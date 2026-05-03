import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, designsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateDesignBody,
  GetDesignParams,
  UpdateDesignParams,
  UpdateDesignBody,
  DeleteDesignParams,
  InterpretDesignParams,
  ListDesignsResponse,
  GetDesignResponse,
  UpdateDesignResponse,
  InterpretDesignResponse,
  GetDesignStatsResponse,
} from "@workspace/api-zod";

function validateStructuredData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("AI output is not an object");
  }
  const d = raw as Record<string, unknown>;
  const requiredNumbers = ["overallWidth", "overallHeight", "overallDepth"];
  for (const key of requiredNumbers) {
    if (typeof d[key] !== "number") {
      throw new Error(`Missing or invalid field: ${key}`);
    }
  }
  if (!Array.isArray(d.components) || d.components.length === 0) {
    throw new Error("components must be a non-empty array");
  }
  if (!Array.isArray(d.buildInstructions) || d.buildInstructions.length === 0) {
    throw new Error("buildInstructions must be a non-empty array");
  }
  const validShapes = new Set(["box", "cylinder", "sphere"]);
  d.components = (d.components as Record<string, unknown>[]).map((c, i) => {
    const comp = c as Record<string, unknown>;
    const numFields = ["width", "height", "depth", "x", "y", "z"];
    for (const f of numFields) {
      if (typeof comp[f] !== "number") {
        throw new Error(`Component[${i}] missing numeric field: ${f}`);
      }
    }
    if (!validShapes.has(comp.shape as string)) comp.shape = "box";
    if (typeof comp.quantity !== "number") comp.quantity = 1;
    return comp;
  });
  if (!d.unit) d.unit = "inches";
  return d;
}

const router: IRouter = Router();

async function interpretDescription(rawDescription: string) {
  const systemPrompt = `You are a professional CAD design assistant. When given a description of something to build, you output a precise JSON structure describing the 3D geometry, materials, and build instructions.

Return ONLY valid JSON matching this exact schema:
{
  "overallWidth": number (in inches),
  "overallHeight": number (in inches),
  "overallDepth": number (in inches),
  "unit": "inches",
  "designType": string (e.g. "furniture", "woodworking", "metalwork", "room", "shelf", "table", "chair", "cabinet"),
  "summary": string (one sentence describing the design),
  "estimatedCost": string (e.g. "$200 - $400"),
  "components": [
    {
      "name": string,
      "material": string (e.g. "walnut", "pine", "steel", "plywood", "MDF"),
      "quantity": number,
      "width": number (inches),
      "height": number (inches),
      "depth": number (inches),
      "x": number (center position in 3D scene),
      "y": number (center position in 3D scene),
      "z": number (center position in 3D scene),
      "color": string (hex color representing the material, e.g. "#8B6914" for walnut),
      "shape": "box" | "cylinder" | "sphere"
    }
  ],
  "buildInstructions": string[] (ordered step-by-step instructions, 6-12 steps)
}

Rules for components:
- Each entry in the "components" array represents ONE physical part (quantity = 1).
- If the same part type appears multiple times (e.g. 4 table legs), include a SEPARATE entry for each one with its own unique x/y/z position.
- This allows every physical piece to be rendered at its correct location in the 3D scene.

Rules for 3D positioning:
- Use a right-handed coordinate system. Y is up.
- Position components so they form the complete assembled object.
- The object should be centered around origin (0, 0, 0).
- Components should be correctly positioned relative to each other (e.g. 4 table legs at the 4 corners, top resting on legs).
- Use realistic proportions and measurements for the described object type.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Design this: ${rawDescription}` },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const raw = JSON.parse(content);
  return validateStructuredData(raw);
}

router.get("/designs", async (_req, res): Promise<void> => {
  const designs = await db
    .select({
      id: designsTable.id,
      name: designsTable.name,
      rawDescription: designsTable.rawDescription,
      status: designsTable.status,
      designType: sql<string | null>`${designsTable.structuredData}->>'designType'`,
      summary: sql<string | null>`${designsTable.structuredData}->>'summary'`,
      createdAt: designsTable.createdAt,
      updatedAt: designsTable.updatedAt,
    })
    .from(designsTable)
    .orderBy(desc(designsTable.createdAt));
  res.json(ListDesignsResponse.parse(designs));
});

router.get("/designs/stats", async (_req, res): Promise<void> => {
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(designsTable);
  const [ready] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(designsTable)
    .where(eq(designsTable.status, "ready"));
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(designsTable)
    .where(eq(designsTable.status, "pending"));

  const recentDesigns = await db
    .select({
      id: designsTable.id,
      name: designsTable.name,
      rawDescription: designsTable.rawDescription,
      status: designsTable.status,
      designType: sql<string | null>`${designsTable.structuredData}->>'designType'`,
      summary: sql<string | null>`${designsTable.structuredData}->>'summary'`,
      createdAt: designsTable.createdAt,
      updatedAt: designsTable.updatedAt,
    })
    .from(designsTable)
    .orderBy(desc(designsTable.createdAt))
    .limit(5);

  const stats = GetDesignStatsResponse.parse({
    total: total?.count ?? 0,
    readyCount: ready?.count ?? 0,
    pendingCount: pending?.count ?? 0,
    materialBreakdown: [],
    recentDesigns,
    designTypeBreakdown: [],
  });
  res.json(stats);
});

router.post("/designs", async (req, res): Promise<void> => {
  const parsed = CreateDesignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, rawDescription, autoInterpret = true } = parsed.data;

  const [design] = await db
    .insert(designsTable)
    .values({ name, rawDescription, status: "pending" })
    .returning();

  if (autoInterpret) {
    await db
      .update(designsTable)
      .set({ status: "interpreting" })
      .where(eq(designsTable.id, design.id));

    try {
      const structuredData = await interpretDescription(rawDescription);
      const [updated] = await db
        .update(designsTable)
        .set({ structuredData, status: "ready", updatedAt: new Date() })
        .where(eq(designsTable.id, design.id))
        .returning();
      res.status(201).json(GetDesignResponse.parse(updated));
    } catch {
      await db
        .update(designsTable)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(designsTable.id, design.id));
      res.status(201).json(GetDesignResponse.parse({ ...design, status: "error" }));
    }
    return;
  }

  res.status(201).json(GetDesignResponse.parse(design));
});

router.get("/designs/:id", async (req, res): Promise<void> => {
  const params = GetDesignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [design] = await db
    .select()
    .from(designsTable)
    .where(eq(designsTable.id, params.data.id));

  if (!design) {
    res.status(404).json({ error: "Design not found" });
    return;
  }

  res.json(GetDesignResponse.parse(design));
});

router.patch("/designs/:id", async (req, res): Promise<void> => {
  const params = UpdateDesignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDesignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(designsTable)
    .where(eq(designsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Design not found" });
    return;
  }

  const updates: Partial<typeof existing> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.rawDescription) updates.rawDescription = parsed.data.rawDescription;

  await db
    .update(designsTable)
    .set({ ...updates, status: "interpreting", updatedAt: new Date() })
    .where(eq(designsTable.id, params.data.id));

  try {
    const newDescription = parsed.data.rawDescription ?? existing.rawDescription;
    const structuredData = await interpretDescription(newDescription);
    const [updated] = await db
      .update(designsTable)
      .set({ structuredData, status: "ready", updatedAt: new Date() })
      .where(eq(designsTable.id, params.data.id))
      .returning();
    res.json(UpdateDesignResponse.parse(updated));
  } catch {
    await db
      .update(designsTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(designsTable.id, params.data.id));
    res.status(500).json({ error: "Failed to interpret design" });
  }
});

router.delete("/designs/:id", async (req, res): Promise<void> => {
  const params = DeleteDesignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [design] = await db
    .delete(designsTable)
    .where(eq(designsTable.id, params.data.id))
    .returning();

  if (!design) {
    res.status(404).json({ error: "Design not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/designs/:id/interpret", async (req, res): Promise<void> => {
  const params = InterpretDesignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(designsTable)
    .where(eq(designsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Design not found" });
    return;
  }

  await db
    .update(designsTable)
    .set({ status: "interpreting", updatedAt: new Date() })
    .where(eq(designsTable.id, params.data.id));

  try {
    const structuredData = await interpretDescription(existing.rawDescription);
    const [updated] = await db
      .update(designsTable)
      .set({ structuredData, status: "ready", updatedAt: new Date() })
      .where(eq(designsTable.id, params.data.id))
      .returning();
    res.json(InterpretDesignResponse.parse(updated));
  } catch {
    await db
      .update(designsTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(designsTable.id, params.data.id));
    res.status(500).json({ error: "Failed to interpret design" });
  }
});

export default router;
