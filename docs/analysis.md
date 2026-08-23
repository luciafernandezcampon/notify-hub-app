# Analysis Module

The `lib/analysis` module provides tools to analyze code changes and evaluate their impact on documentation using the Anthropic API.

## Overview

The primary function, `analyzeChange`, takes a code diff, a list of changed files, and a manifest of documentation files, and uses the Claude model (`claude-sonnet-5`) to determine whether documentation updates are needed or have already been addressed.

## Environment Variables

- `ANTHROPIC_API_KEY` *(required)*: The API key used to authenticate with the Anthropic SDK.

## Functions

### `analyzeChange(input: AnalyzeChangeInput): Promise<AnalysisResult>`

Analyzes a code change against a documentation manifest to evaluate documentation impact.

#### Parameters

An object of type `AnalyzeChangeInput` containing:
- `diff` (`string`): The git diff or source changes.
- `changedFiles` (`string[]`): Array of file paths changed in the update.
- `documentationManifest` (`DocumentationManifestEntry[]`): List of documentation manifest items.

#### Returns

Returns a `Promise` resolving to an `AnalysisResult` object.

## Types and Interfaces

### `DocumentationManifestEntry` curtain

Describes an individual document entry in the documentation manifest.

```typescript
export interface DocumentationManifestEntry {
  path: string;
  description?: string;
  relatedPaths?: string[];
  keywords?: string[];
}
```

### `AnalyzeChangeInput`

Input type for the `analyzeChange` function.

```typescript
export interface AnalyzeChangeInput {
  diff: string;
  changedFiles: string[];
  documentationManifest: DocumentationManifestEntry[];
}
```

### `AnalysisResult`

Inferred type from `AnalysisResultSchema` validated via Zod.

```typescript
export interface AnalysisResult {
  requiresDocumentationUpdate: boolean;
  documentationAlreadyUpdated: boolean;
  summary: string;
  impact: "low" | "medium" | "high";
  affectedDocs: string[];
  suggestions: string[];
  confidence: number;
}
```
