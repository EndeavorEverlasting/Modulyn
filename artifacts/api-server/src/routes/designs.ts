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

function validateComponents(
  components: unknown,
  context: string
): Record<string, unknown>[] {
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error(`${context}: components must be a non-empty array`);
  }
  const validShapes = new Set(["box", "cylinder", "sphere"]);
  return (components as Record<string, unknown>[]).map((c, i) => {
    const comp = c as Record<string, unknown>;
    for (const f of ["width", "height", "depth", "x", "y", "z"]) {
      if (typeof comp[f] !== "number") {
        throw new Error(`${context} Component[${i}] missing numeric field: ${f}`);
      }
    }
    if (!validShapes.has(comp.shape as string)) comp.shape = "box";
    if (typeof comp.quantity !== "number") comp.quantity = 1;
    if (!comp.color) comp.color = "#888888";
    return comp;
  });
}

function validateStructuredData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("AI output is not an object");
  }
  const d = raw as Record<string, unknown>;
  for (const key of ["overallWidth", "overallHeight", "overallDepth"]) {
    if (typeof d[key] !== "number") {
      throw new Error(`Missing or invalid field: ${key}`);
    }
  }
  if (!Array.isArray(d.buildInstructions) || d.buildInstructions.length === 0) {
    throw new Error("buildInstructions must be a non-empty array");
  }
  d.components = validateComponents(d.components, "primary");
  if (!d.unit) d.unit = "inches";

  // Normalize nullable optional string fields: AI may return null, schema expects undefined
  for (const key of ["printTimeEstimate", "weightCapacity", "installationNotes", "estimatedCost"]) {
    if (d[key] === null) delete d[key];
  }

  // Validate design variants if present
  if (Array.isArray(d.designVariants)) {
    d.designVariants = (d.designVariants as Record<string, unknown>[]).map(
      (v, i) => {
        const variant = v as Record<string, unknown>;
        if (!variant.name) variant.name = `Variant ${i + 1}`;
        if (!variant.description) variant.description = "";
        variant.components = validateComponents(
          variant.components,
          `variant[${i}]`
        );
        return variant;
      }
    );
  }
  return d;
}

const router: IRouter = Router();

async function interpretDescription(rawDescription: string) {
  const systemPrompt = `You are a professional CAD design assistant specializing in 3D-printable hardware, furniture, woodworking, metalwork, and architectural elements. When given a description of something to build, you output a precise JSON structure describing the 3D geometry, materials, build instructions, and design variants.

Return ONLY valid JSON matching this exact schema:
{
  "overallWidth": number (in inches — the bounding box width of the primary design),
  "overallHeight": number (in inches — the bounding box height),
  "overallDepth": number (in inches — the bounding box depth, i.e. how far it sticks out from the wall or floor),
  "unit": "inches",
  "designType": string (e.g. "3d-printable", "furniture", "woodworking", "metalwork", "wall-mount", "shelf", "cabinet"),
  "summary": string (one sentence describing the primary design),
  "estimatedCost": string (e.g. "$5 - $15 in PETG filament" or "$200 - $400 in walnut lumber"),
  "printTimeEstimate": string or null (ONLY for 3D-printable items: e.g. "2–3 hours at 0.2mm layer height, 40% infill". Set to null if not 3D-printable),
  "weightCapacity": string or null (ONLY when the user specifies a load requirement: e.g. "Rated for 50 lbs in PETG at 40% infill — use wall stud anchor". Set to null if not applicable),
  "installationNotes": string or null (ONLY for wall-mounted, ceiling-mounted, or floor-anchored items: detailed installation steps as a single paragraph covering anchor type, screw spec, stud vs drywall, torque. Set to null if free-standing),
  "components": [
    {
      "name": string,
      "material": string (e.g. "PETG", "PLA", "walnut", "pine", "steel", "plywood"),
      "quantity": 1,
      "width": number (inches),
      "height": number (inches),
      "depth": number (inches),
      "x": number (center X in 3D scene),
      "y": number (center Y in 3D scene — Y is UP),
      "z": number (center Z in 3D scene),
      "color": string (hex color, e.g. "#2B4EAF" for blue PETG, "#8B6914" for walnut),
      "shape": "box" | "cylinder" | "sphere"
    }
  ],
  "buildInstructions": string[] (6–10 ordered steps covering fabrication AND installation if wall-mounted),
  "designVariants": [
    {
      "name": string (short name, e.g. "L-Hook", "J-Hook", "Double Prong"),
      "description": string (one sentence explaining what's different about this shape),
      "components": [ ...same Component3D structure as above, with positions for THIS variant's geometry... ]
    }
  ]
}

IMPORTANT RULES:

Rules for design variants:
- ALWAYS output exactly 2–3 design variants in "designVariants", even for simple items.
- Each variant must have a DIFFERENT shape/form factor (e.g. L-hook vs J-hook vs double prong for a hook; single shelf vs L-bracket vs floating bracket for a shelf).
- The "components" field at the top level represents variant 1's primary geometry (they should match).
- Each variant's "components" array must contain full 3D geometry with correct positions.

Rules for components:
- Each entry represents ONE physical part (quantity = 1 always).
- If a part appears multiple times (e.g. 2 screws), create separate entries for each with unique positions.
- Keep component counts reasonable: 3–12 parts per variant.

Rules for 3D positioning:
- Use a right-handed coordinate system. Y is UP.
- Center the assembled object around origin (0, 0, 0).
- For wall-mounted items: the back face of the item sits at z=0 (wall face), and the hook/shelf extends in the +Z direction (toward the viewer).
- Components must be correctly positioned relative to each other and not overlap unrealistically.
- Use realistic proportions matching the user's specified dimensions.

Rules for material/color:
- For 3D-printable items, use materials like "PETG", "PLA", "ABS", "Nylon" with appropriate plastic colors.
- For wooden items, use warm brown hex values. For metal, use silver/gray. For plastic, pick a purposeful color.

Rules for print time (3D-printable items only):
- Estimate based on the object's volume at standard settings (0.2mm layer height, 40% infill, 60mm/s).
- Small items (<50cm³): 1–3 hours. Medium (50–200cm³): 3–6 hours. Large (>200cm³): 6–15 hours.

Rules for weight capacity:
- When the user specifies a required load, state the recommended material and infill to meet it.
- Always specify whether a wall stud or drywall anchor is required.`;

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

  if (!parsed.data.rawDescription) {
    const [updated] = await db
      .update(designsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(designsTable.id, params.data.id))
      .returning();
    res.json(UpdateDesignResponse.parse(updated));
    return;
  }

  await db
    .update(designsTable)
    .set({ ...updates, status: "interpreting", updatedAt: new Date() })
    .where(eq(designsTable.id, params.data.id));

  try {
    const structuredData = await interpretDescription(parsed.data.rawDescription);
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
