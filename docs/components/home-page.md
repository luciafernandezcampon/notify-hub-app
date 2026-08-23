# Home Page (`app/page.tsx`)

The `Home` component serves as the primary client-side user interface for the PR Documentation Analyzer application. It enables users to submit a Pull Request (PR) number and view analysis results regarding documentation updates.

## Component Overview

- **Type**: Next.js Client Component (`"use client"`)
- **Route**: `/` (`app/page.tsx`)
- **Dependencies**: Uses `DocsDrafts` from `@/app/components/DocsDrafts` and types from `@/lib/analysis/analyzeChange`

## State Management

- `prNumber` (`string`): Tracks the text input value entered by the user.
- `loading` (`boolean`): Indicates whether the `/api/analyze` request is in progress.
- `response` (`ApiResponse | null`): Stores the result of the API call or an error message.

## API Integration & Validation

### `handleAnalyze()`

1. **Validation**: Converts `prNumber` into a number and checks if it is a positive integer. Displays an error response if invalid.
2. **Request**: Sends a POST request to `/api/analyze` with payload `{ prNumber: parsed }`.
3. **Response Handling**: Parses the JSON response as `ApiResponse` (`{ ok: true; result: AnalysisResult }` or `{ ok: false; error: string }`).
4. **Error Handling**: Catches exceptions during fetch or JSON parsing and stores the error message in state.