# DocsDrafts Component

The `DocsDrafts` component is a Next.js client component (`"use client"`) that serves as an interactive UI for managing AI-generated documentation drafts. It allows users to view existing drafts, generate new documentation, edit proposed content, change draft statuses, and write accepted changes to GitHub.

## Component Overview

- **Module**: `app/components`
- **File**: `app/components/DocsDrafts.tsx`
- **Type**: React Client Component

## Key Functionality

1. **Fetch Drafts**: Automatically loads documentation drafts on initial render via `GET /api/drafts`.
2. **Generate Documentation**: Initiates new draft generation requests via `POST /api/generate-docs`.
3. **Inline Draft Editing**: Tracks pending content changes locally per draft ID before saving.
4. **Status & Content Actions**: Supports accepting, editing, rejecting (`PATCH /api/drafts/[id]`), or committing (`POST /api/drafts/[id]/write`) drafts.

## Types & Interfaces

### `DraftStatus`
Represents the lifecycle stage of a documentation draft:
- `"proposed"`: Initial generated state ("Propuesto").
- `"accepted"`: Draft accepted by user ("Aceptado").
- `"rejected"`: Draft rejected by user ("Rechazado").
- `"written"`: Draft committed to repository ("Escrito en GitHub").

### `Draft`
```typescript
interface Draft {
  id: string;
  repo: string;
  path: string;
  title: string | null;
  reason: string | null;
  originalContent: string | null;
  proposedContent: string;
  finalContent: string | null;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}
```

## API Integration

- `GET /api/drafts` - Fetches all drafts.
- `POST /api/generate-docs` - Triggers doc generation process.
- `PATCH /api/drafts/[id]` - Updates draft content or rejects draft.
- `POST /api/drafts/[id]/write` - Writes draft to GitHub.
