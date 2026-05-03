# VoiceCAD Workspace

## Overview

VoiceCAD is a voice-driven CAD design tool for architects, designers, and professional makers. Users speak or type a description of something to build and the AI generates a complete design package: 3D model, dimensioned blueprint, materials cut list, and step-by-step build instructions.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 19 + Vite, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS
- **3D rendering**: Three.js (vanilla, with OrbitControls); falls back to 2D isometric canvas when WebGL unavailable
- **AI**: OpenAI GPT (via `@workspace/integrations-openai-ai-server`) — JSON mode for structured design generation
- **Voice input**: Web Speech API (SpeechRecognition) — no library dependency

## Architecture

```
artifacts/
  api-server/       — Express 5 REST API (port 8080)
  app/              — React+Vite frontend (port from $PORT)
  mockup-sandbox/   — Component preview server for canvas exploration

lib/
  api-spec/         — OpenAPI spec + Orval codegen config
  api-client-react/ — Generated TanStack Query hooks (useListDesigns, useGetDesign, etc.)
  db/               — Drizzle schema (designsTable, designStatusEnum)
  integrations-openai-ai-server/  — Server-side OpenAI client
  integrations-openai-ai-react/   — Client-side OpenAI helpers
```

## Key API Endpoints

- `GET /api/designs` — list all designs
- `POST /api/designs` — create design, body: `{ name, rawDescription, autoInterpret?: boolean }`
- `GET /api/designs/:id` — get single design with structuredData
- `PUT /api/designs/:id` — update design
- `DELETE /api/designs/:id` — delete design
- `POST /api/designs/:id/interpret` — (re)run AI interpretation
- `GET /api/designs/stats` — returns `{ total, readyCount, pendingCount, recentDesigns }`

## Key Generated Hooks (import from `@workspace/api-client-react`)

- `useListDesigns()` — all designs
- `useGetDesign(id, options)` — single design
- `useGetDesignStats()` — stats
- `useCreateDesign()` — mutation
- `useUpdateDesign()` — mutation
- `useDeleteDesign()` — mutation
- `useInterpretDesign()` — mutation (triggers AI re-interpretation)
- Query key helpers: `getListDesignsQueryKey()`, `getGetDesignQueryKey(id)`, `getGetDesignStatsQueryKey()`

## Frontend Pages

- `/` — Dashboard: project list, stats cards, empty state
- `/new` — New Design: name + description form, voice input via Web Speech API
- `/design/:id` — Design Studio: 3-panel layout (metadata/refine | 3D model | blueprint/cut-list/instructions)

## DB Schema (`lib/db/src/schema/designs.ts`)

```
designsTable:
  id            serial PK
  name          text NOT NULL
  raw_description text NOT NULL
  structured_data jsonb (nullable, StructuredData)
  status        enum: pending | interpreting | ready | error
  created_at    timestamp
  updated_at    timestamp
```

## StructuredData Shape (from AI)

```typescript
{
  overallWidth, overallHeight, overallDepth, unit,
  designType, summary, estimatedCost?,
  printTimeEstimate?: string | null,    // 3D-printable items only, e.g. "3–5 hours at 0.2mm/40% infill"
  weightCapacity?: string | null,       // load-bearing items only, e.g. "Rated for 50 lbs with PETG at 40% infill"
  installationNotes?: string | null,    // wall/ceiling-mounted items: anchor type, screw spec, stud vs drywall
  components: Component3D[],            // { name, material, quantity, width, height, depth, x, y, z, color, shape }
  buildInstructions: string[],
  designVariants?: DesignVariant[]      // 2–3 shape alternatives, each with name, description, components[]
}
```

## Design Studio UI (artifacts/app/src/pages/design-studio.tsx)

- **Left panel**: design name, status, type badge; stats grid (material cost, print time, load capacity); original spec; refine textarea
- **Center panel**: Three.js 3D viewer with OrbitControls; variant selector strip at top (switches active 3D model); "Drag to rotate" badge
- **Right panel tabs**: Cut List (parts table for active variant), Blueprint (SVG orthographic), Instructions (installation notes callout + build steps), Variants (selectable cards — clicking switches 3D view + cut list)
- Variant index 0 always shows primary components; variants 1+ pull from `designVariants[index-1].components`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/app run dev` — run frontend locally

## Notes

- The 3D viewer uses vanilla Three.js (not @react-three/fiber) due to React 19 reconciler incompatibility. It auto-detects WebGL availability and falls back to a 2D isometric canvas renderer.
- Voice input uses the browser `SpeechRecognition` API directly. Feature-detected at runtime — button is hidden if unsupported.
- The AI model call uses `response_format: { type: "json_object" }` with a detailed system prompt to produce structured `StructuredData` from free-form text descriptions.
- Polling: Design Studio polls every 2s when `status === "interpreting"` using TanStack Query `refetchInterval`.
