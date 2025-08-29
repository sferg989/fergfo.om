This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.cursor/
  rules/
    astro-component-structure.mdc
    astro-database-integration.mdc
    astro-error-handling.mdc
    astro-performance-patterns.mdc
    astro-ssr-patterns.mdc
    file-nameing.mdc
    principals.mdc
    terminal.mdc
    ts-zod.mdc
    ts.mdc
.github/
  workflows/
    ci.yml
public/
  .assetsignore
  favicon.svg
src/
  components/
    highest_score_option.astro
    historical_data_view.astro
    optionRow.astro
    optionsGroup.astro
    OptionsTable.astro
    preferredStocksView.astro
    searchForm.astro
    seo.astro
    stock_options_section.astro
  enums/
    preferredStocks.ts
    scoreThresholds.ts
  layouts/
    Layout.astro
  migrations/
    001_initial_schema.sql
  pages/
    api/
      historical-snapshots.ts
      stock-options.ts
      stock-performance.ts
      top-performing-options.ts
    index.astro
    preferred.astro
    scoring.astro
  services/
    database_service.ts
    optionsService.ts
  styles/
    global.css
    optionIndicators.css
    optionRow.css
    optionsGroup.css
    optionsTable.css
  types/
    database.ts
    option.ts
  utils/
    optionScorer.ts
    optionsUtils.ts
    returnCalculator.ts
  env.d.ts
.assetsignore
.cursorrules
.eslintrc.cjs
.gitignore
.npmrc
.nvmrc
astro.config.mjs
DATABASE_SETUP.md
DEV_SETUP.md
package.json
README.md
setup-local-db.sh
tailwind.config.mjs
tsconfig.json
wrangler.jsonc
```

# Files

## File: .cursor/rules/astro-component-structure.mdc
````
---
globs: *.astro
description: Astro component structure and organization best practices
---

# Astro Component Structure

## Standard Component Structure

Follow this order for Astro component sections:

```astro
---
// 1. Imports first
import { SomeService } from '../services/someService';
import type { ComponentProps } from '../types/component';

// 2. Interface definitions
interface Props {
  symbol: string;
  forceRefresh?: boolean;
}

// 3. Props destructuring
const { symbol, forceRefresh = false } = Astro.props;

// 4. Runtime/environment setup
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;

// 5. Data fetching and business logic
let data: { items: any[]; error?: string } = { items: [] };

if (db) {
  try {
    const service = SomeService.getInstance(db);
    const items = await service.fetchData(symbol, forceRefresh);
    data = { items };
  } catch (err) {
    data = { items: [], error: err instanceof Error ? err.message : 'Error' };
  }
}
---

<!-- 6. HTML template -->
<div class="component-container">
  <!-- Component content here -->
</div>

<!-- 7. Scoped styles -->
<style>
  .component-container {
    /* Styles here */
  }
</style>

<!-- 8. Client-side scripts (only when necessary) -->
<script>
  // Minimal client-side enhancement only
</script>
```

## Component Best Practices

### Props Interface
- Always define a `Props` interface for type safety
- Use optional properties with defaults where appropriate
- Keep props simple and focused

### Data Structure
- Use consistent data structure pattern: `{ items: any[]; error?: string }`
- Separate concerns: one data object per logical data source
- Always include error states

### Template Patterns
- Use conditional rendering with ternary operators
- Provide meaningful fallbacks for empty states
- Keep templates readable with proper indentation

### Error Handling in Templates
```astro
<div>
  {data.error ? (
    <p class="text-red-500">Error: {data.error}</p>
  ) : data.items.length > 0 ? (
    <div>
      {data.items.map((item) => (
        <div class="item">{item.name}</div>
      ))}
    </div>
  ) : (
    <p class="text-gray-500">No data available</p>
  )}
</div>
```

## File Naming
- Use snake_case for component files (following project convention)
- Be descriptive: `historical_data_view.astro` not `history.astro`
- Group related components in appropriate directories

## Import Organization
```astro
---
// 1. External libraries
import { z } from 'zod';

// 2. Internal services
import { OptionsService } from '../services/optionsService';

// 3. Internal utilities
import { formatDate } from '../utils/dateUtils';

// 4. Internal components
import SearchForm from './searchForm.astro';

// 5. Types (last)
import type { OptionData } from '../types/option';
---
```
````

## File: .cursor/rules/astro-database-integration.mdc
````
---
globs: *.astro
description: Astro D1 database integration patterns and best practices
---

# Astro D1 Database Integration

## Database Access Pattern

Always follow this pattern for accessing D1 database in Astro components:

```astro
---
import { DatabaseService } from '../services/database_service';

// Standard D1 database access pattern
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;

let data: { results: any[]; error?: string } = { results: [] };

if (db) {
  try {
    const dbService = DatabaseService.getInstance(db);
    const results = await dbService.getData();
    data = { results };
  } catch (err) {
    console.error('Database error:', err);
    data = { results: [], error: err instanceof Error ? err.message : 'Database error' };
  }
} else {
  console.warn('Database not available in runtime');
  data = { results: [], error: 'Database not available' };
}
---
```

## Key Principles

- **Always check for db availability**: Database may not be available in all environments
- **Use proper error handling**: Wrap database calls in try-catch blocks
- **Log errors appropriately**: Console.error for debugging, user-friendly messages for UI
- **Provide fallbacks**: Handle cases where database is unavailable gracefully
- **Type safety**: Cast database connection with proper TypeScript types

## Service Layer Pattern

- Use service classes (like `OptionsService`, `DatabaseService`) to encapsulate database logic
- Pass database connection to service instances
- Keep database queries out of component frontmatter - delegate to services

## Error Handling Strategy

```astro
---
// Individual try-catch for each operation
let snapshotsData: { snapshots: any[]; error?: string } = { snapshots: [] };
let performanceData: { data: any[]; error?: string } = { data: [] };

if (db) {
  try {
    const service = SomeService.getInstance(db);
    
    // Separate error handling for each operation
    try {
      const snapshots = await service.getSnapshots();
      snapshotsData = { snapshots };
    } catch (err) {
      snapshotsData = { snapshots: [], error: err instanceof Error ? err.message : 'Snapshots error' };
    }
    
    try {
      const performance = await service.getPerformance();
      performanceData = { data: performance };
    } catch (err) {
      performanceData = { data: [], error: err instanceof Error ? err.message : 'Performance error' };
    }
  } catch (err) {
    console.error('Service initialization error:', err);
  }
}
---
```
````

## File: .cursor/rules/astro-error-handling.mdc
````
---
globs: *.astro
description: Error handling patterns and best practices for Astro components
---

# Astro Error Handling Patterns

## Frontmatter Error Handling

### Individual Operation Error Handling
Wrap each async operation in its own try-catch to isolate failures:

```astro
---
let userData: { user: any; error?: string } = { user: null };
let postsData: { posts: any[]; error?: string } = { posts: [] };
let commentsData: { comments: any[]; error?: string } = { comments: [] };

if (db) {
  try {
    const service = DataService.getInstance(db);
    
    // Each operation isolated
    try {
      const user = await service.getUser(userId);
      userData = { user };
    } catch (err) {
      console.error('Error fetching user:', err);
      userData = { user: null, error: err instanceof Error ? err.message : 'User error' };
    }
    
    try {
      const posts = await service.getPosts(userId);
      postsData = { posts };
    } catch (err) {
      console.error('Error fetching posts:', err);
      postsData = { posts: [], error: err instanceof Error ? err.message : 'Posts error' };
    }
    
    try {
      const comments = await service.getComments(userId);
      commentsData = { comments };
    } catch (err) {
      console.error('Error fetching comments:', err);
      commentsData = { comments: [], error: err instanceof Error ? err.message : 'Comments error' };
    }
    
  } catch (err) {
    console.error('Service initialization error:', err);
  }
}
---
```

## Template Error Display

### Consistent Error UI Pattern
```astro
<div class="section">
  {data.error ? (
    <p class="text-red-500">Error: {data.error}</p>
  ) : data.items.length > 0 ? (
    <div>
      {data.items.map((item) => (
        <div class="item">{item.name}</div>
      ))}
    </div>
  ) : (
    <p class="text-gray-500">No data available</p>
  )}
</div>
```

### Error State Classes
Use consistent Tailwind classes for error states:
- `text-red-500` for error messages
- `text-gray-500` for empty states
- `text-yellow-600` for warning states

## Error Logging Strategy

### Server-Side Logging
```astro
---
try {
  const result = await service.fetchData();
  data = { result };
} catch (err) {
  // Log detailed error for debugging
  console.error('Detailed error context:', {
    error: err,
    symbol,
    timestamp: new Date().toISOString(),
    operation: 'fetchData'
  });
  
  // Provide user-friendly error message
  const userMessage = err instanceof Error ? err.message : 'Unable to load data';
  data = { result: null, error: userMessage };
}
---
```

## Database Error Handling

### Connection Availability
```astro
---
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;

if (!db) {
  console.warn('Database not available in current environment');
  data = { items: [], error: 'Database not available' };
} else {
  // Proceed with database operations
}
---
```

### Service Layer Error Propagation
```astro
---
try {
  const service = OptionsService.getInstance(db);
  const result = await service.fetchData(symbol);
  data = { result };
} catch (err) {
  if (err instanceof Error) {
    // Different handling based on error type
    if (err.message.includes('rate limit')) {
      data = { result: null, error: 'API rate limit exceeded. Please try again later.' };
    } else if (err.message.includes('not found')) {
      data = { result: null, error: `Symbol ${symbol} not found.` };
    } else {
      data = { result: null, error: 'Unable to fetch data. Please try again.' };
    }
  } else {
    data = { result: null, error: 'An unexpected error occurred.' };
  }
}
---
```

## Error Recovery Patterns

### Graceful Degradation
```astro
---
// Primary data source
let primaryData: { items: any[]; error?: string } = { items: [] };
// Fallback data source
let fallbackData: { items: any[]; error?: string } = { items: [] };

try {
  const primary = await service.getPrimaryData();
  primaryData = { items: primary };
} catch (err) {
  console.error('Primary data source failed:', err);
  primaryData = { items: [], error: 'Primary source unavailable' };
  
  // Try fallback
  try {
    const fallback = await service.getFallbackData();
    fallbackData = { items: fallback };
  } catch (fallbackErr) {
    console.error('Fallback data source failed:', fallbackErr);
    fallbackData = { items: [], error: 'All data sources unavailable' };
  }
}

// Use the best available data
const displayData = primaryData.items.length > 0 ? primaryData : fallbackData;
---
```
````

## File: .cursor/rules/astro-performance-patterns.mdc
````
---
globs: *.astro
description: Performance optimization patterns for Astro applications
---

# Astro Performance Patterns

## Server-Side vs Client-Side Decision Matrix

### ✅ Use Server-Side Rendering (SSR) For:
- **Initial page data**: Historical data, user profiles, product listings
- **SEO-critical content**: Meta information, structured data, primary content
- **Static or slow-changing data**: Configuration, settings, reference data
- **Database queries**: Direct database access for initial data load
- **API aggregation**: Combining multiple API calls into single server request

### ✅ Use Client-Side Rendering (CSR) For:
- **Real-time updates**: Live chat, stock prices, notification feeds
- **User interactions**: Form validation, interactive filters, dynamic searches
- **Progressive enhancement**: Adding interactivity to server-rendered content
- **Client-only APIs**: Geolocation, camera, local storage, WebRTC
- **Infinite scroll/pagination**: Loading additional content on demand

## Performance Optimization Patterns

### Data Prefetching in Frontmatter
```astro
---
// ✅ GOOD: Aggregate multiple API calls server-side
const [userData, postsData, commentsData] = await Promise.allSettled([
  userService.getUser(userId),
  postService.getPosts(userId),
  commentService.getComments(userId)
]);

// Transform results with error handling
const user = userData.status === 'fulfilled' ? userData.value : null;
const posts = postsData.status === 'fulfilled' ? postsData.value : [];
const comments = commentsData.status === 'fulfilled' ? commentsData.value : [];
---

<!-- ❌ AVOID: Multiple client-side API calls -->
<!-- <script>
  Promise.all([
    fetch('/api/user'),
    fetch('/api/posts'),
    fetch('/api/comments')
  ]).then(...)
</script> -->
```

### Conditional Loading Strategies
```astro
---
interface Props {
  priority: 'high' | 'low';
  symbol: string;
}

const { priority, symbol } = Astro.props;

// Load expensive data only for high-priority requests
let expensiveData: any = null;
if (priority === 'high') {
  try {
    expensiveData = await expensiveService.getDetailedAnalysis(symbol);
  } catch (err) {
    console.error('Failed to load detailed analysis:', err);
  }
}

// Always load basic data
const basicData = await basicService.getQuickData(symbol);
---

<div>
  <!-- Always show basic data -->
  <BasicDataDisplay data={basicData} />
  
  <!-- Conditionally show expensive data -->
  {expensiveData && (
    <DetailedAnalysis data={expensiveData} />
  )}
  
  <!-- Client-side enhancement for low priority -->
  {priority === 'low' && (
    <button id="load-details" data-symbol={symbol}>
      Load Detailed Analysis
    </button>
  )}
</div>

{priority === 'low' && (
  <script>
    document.getElementById('load-details')?.addEventListener('click', async (e) => {
      const symbol = e.target.dataset.symbol;
      const response = await fetch(`/api/detailed-analysis?symbol=${symbol}`);
      // Handle client-side loading for low priority
    });
  </script>
)}
```

### Caching Strategies
```astro
---
// Use service-level caching for expensive operations
const cacheKey = `analysis_${symbol}_${new Date().toDateString()}`;

let analysisData: any;
try {
  // Check cache first
  analysisData = await cacheService.get(cacheKey);
  
  if (!analysisData) {
    // Compute and cache
    analysisData = await expensiveAnalysisService.analyze(symbol);
    await cacheService.set(cacheKey, analysisData, 3600); // 1 hour cache
  }
} catch (err) {
  console.error('Analysis cache error:', err);
  analysisData = null;
}
---
```

## Bundle Size Optimization

### Minimal Client-Side JavaScript
```astro
<!-- ✅ GOOD: Minimal client enhancement -->
<button id="toggle-details" data-expanded="false">
  Show Details
</button>

<div id="details" class="hidden">
  <!-- Server-rendered content -->
</div>

<script>
  // Simple DOM manipulation only
  document.getElementById('toggle-details')?.addEventListener('click', (e) => {
    const details = document.getElementById('details');
    const expanded = e.target.dataset.expanded === 'true';
    
    details?.classList.toggle('hidden', expanded);
    e.target.dataset.expanded = (!expanded).toString();
    e.target.textContent = expanded ? 'Show Details' : 'Hide Details';
  });
</script>

<!-- ❌ AVOID: Heavy client-side frameworks for simple interactions -->
```

### Lazy Loading with client:visible
```astro
---
// Heavy component that should load only when visible
import HeavyChart from './heavy_chart.astro';
---

<div>
  <!-- Critical above-the-fold content renders immediately -->
  <CriticalContent />
  
  <!-- Heavy component loads only when scrolled into view -->
  <HeavyChart client:visible />
</div>
```

## Database Query Optimization

### Efficient Data Loading
```astro
---
// ✅ GOOD: Single optimized query
const combinedData = await db.prepare(`
  SELECT 
    s.symbol, s.current_price,
    COUNT(o.id) as option_count,
    MAX(score.total_score) as max_score
  FROM stock_snapshots s
  LEFT JOIN option_snapshots o ON s.id = o.snapshot_id
  LEFT JOIN option_score_snapshots score ON o.id = score.option_snapshot_id
  WHERE s.symbol = ? AND s.created_at >= ?
  GROUP BY s.id
  ORDER BY s.created_at DESC
  LIMIT 10
`).bind(symbol, cutoffDate).all();

// ❌ AVOID: Multiple separate queries
// const stocks = await getStocks(symbol);
// const options = await getOptions(stockId);
// const scores = await getScores(optionId);
---
```
````

## File: .cursor/rules/astro-ssr-patterns.mdc
````
---
globs: *.astro
description: Astro server-side rendering best practices and patterns
---

# Astro SSR Best Practices

## Prefer Server-Side Rendering Over Client-Side

- **Always prefer SSR**: Use Astro frontmatter for data fetching instead of client-side JavaScript when possible
- **Move API calls to frontmatter**: Fetch data during build/server time rather than in `<script>` tags
- **Eliminate loading states**: Server-rendered content appears immediately without spinners or skeleton screens
- **Improve SEO**: Search engines can index server-rendered content

## Example Pattern

```astro
---
// ✅ GOOD: Server-side data fetching
import { SomeService } from '../services/someService';

const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;
let data: { items: any[]; error?: string } = { items: [] };

if (db) {
  try {
    const service = SomeService.getInstance(db);
    const items = await service.fetchData();
    data = { items };
  } catch (err) {
    data = { items: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
---

<div>
  {data.error ? (
    <p class="text-red-500">Error: {data.error}</p>
  ) : data.items.length > 0 ? (
    <div>
      {data.items.map((item) => (
        <div>{item.name}</div>
      ))}
    </div>
  ) : (
    <p>No data available</p>
  )}
</div>

<!-- ❌ AVOID: Client-side fetching for initial data -->
<!-- <script>
  fetch('/api/data').then(response => {
    // Don't do this for initial page data
  });
</script> -->
```

## When to Use Client-Side JavaScript

- **Interactive features**: User interactions, form submissions, dynamic updates
- **Real-time updates**: WebSocket connections, polling for live data
- **Progressive enhancement**: Adding interactivity to server-rendered content
- **Client-only APIs**: Browser APIs like geolocation, camera, etc.
````

## File: .cursor/rules/file-nameing.mdc
````
---
description: 
globs: 
alwaysApply: true
---
- name files snakeCase.*
- DO NOT NAME NEW FILES starting with uppercase
````

## File: .cursor/rules/principals.mdc
````
---
description: 
globs: 
alwaysApply: true
---
Always use DRY, SOLID typescript design patterns.  
- DO NOT use JSDOC.
-
````

## File: .cursor/rules/terminal.mdc
````
---
description: 
globs: 
alwaysApply: true
---

# Termainal Settings
- before running terminal commands make sure the node version is correct by before everyterminal command .nvmrc
``` nvm use```
````

## File: .cursor/rules/ts-zod.mdc
````
---
description: 
globs: 
alwaysApply: false
---
# Type Validation with Zod

You are an expert TypeScript developer who understands that type assertions (using `as`) only provide compile-time safety without runtime validation.

## Zod Over Type Assertions

- **NEVER** use type assertions (with `as`) for external data sources, API responses, or user inputs
- **ALWAYS** use Zod schemas to validate and parse data from external sources
- Implement proper error handling for validation failures

## Zod Implementation Patterns

- Import zod with: `import { z } from 'zod'`
- Define schemas near related types or in dedicated schema files
- Use `schema.parse()` for throwing validation behavior
- Use `schema.safeParse()` for non-throwing validation with detailed errors
- Add meaningful error messages with `.refine()` and `.superRefine()`
- Set up default values with `.default()` when appropriate
- Use transformations with `.transform()` to convert data formats
- Always handle potential validation errors
```typescript

// ❌ WRONG: Using type assertions
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data as User; // DANGEROUS: No runtime validation!
};
// ✅ RIGHT: Using Zod for validation

import { z } from 'zod';

// Define the schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().min(13),
});

// Derive the type from the schema
type User = z.infer<typeof UserSchema>;

const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // Runtime validation
  return UserSchema.parse(data);
};

// With error handling
const fetchUserSafe = async (id: string): Promise<User | null> => {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    const result = UserSchema.safeParse(data);
    if (!result.success) {
      console.error('Invalid user data:', result.error.format());
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};
```
````

## File: .cursor/rules/ts.mdc
````
---
description: 
globs: 
alwaysApply: true
---
# TypeScript Best Practices

## Type Safety & Configuration

- Enable `strict: true` in [tsconfig.json](mdc:tsconfig.json) with additional flags:
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`
  - `strictBindCallApply: true`
  - `strictPropertyInitialization: true`
  - `noImplicitThis: true`
  - `alwaysStrict: true`
  - `exactOptionalPropertyTypes: true`
- Never use `// @ts-ignore` or `// @ts-expect-error` without explanatory comments
- Use `--noEmitOnError` compiler flag to prevent generating JS files when TypeScript errors exist

## Type Definitions

- Do not ever use `any`. Ever. If you feel like you have to use `any`, use `unknown` instead.
- Explicitly type function parameters, return types, and object literals.
- Please don't ever use Enums. Use a union if you feel tempted to use an Enum.
- Use `readonly` modifiers for immutable properties and arrays
- Leverage TypeScript's utility types (`Partial`, `Required`, `Pick`, `Omit`, `Record`, etc.)
- Use discriminated unions with exhaustiveness checking for type narrowing

## Advanced Patterns

- Implement proper generics with appropriate constraints
- Use mapped types and conditional types to reduce type duplication
- Leverage `const` assertions for literal types
- Implement branded/nominal types for type-level validation
## Code Organization

- Organize types in dedicated files (types.ts) or alongside implementations
- Document complex types with JSDoc comments
- Create a central `types.ts` file or a `src/types` directory for shared types
````

## File: .github/workflows/ci.yml
````yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      NPM_GH_TOKEN: ${{ secrets.NPM_GH_TOKEN }}

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run Astro check
      run: npm run astro:check

    - name: Build project
      run: npm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    # Only deploy on pushes to main branch (not on PRs)
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    env:
      NPM_GH_TOKEN: ${{ secrets.NPM_GH_TOKEN }}
      PUBLIC_FINNHUB_API_KEY: ${{ secrets.PUBLIC_FINNHUB_API_KEY }}
    
    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build
      env:
        NODE_ENV: production

    - name: Deploy to Cloudflare Workers
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        command: deploy --env production
````

## File: public/.assetsignore
````
_worker.js
_routes.json
````

## File: public/favicon.svg
````
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="
    M 30 20
    C 45 20, 65 20, 80 20
    Q 82 20, 82 22
    L 82 28
    Q 82 30, 80 30
    C 65 30, 55 30, 50 30
    L 50 50
    C 55 50, 60 50, 70 50
    Q 72 50, 72 52
    L 72 58
    Q 72 60, 70 60
    C 65 60, 55 60, 50 60
    L 50 85
    Q 50 87, 48 87
    L 42 87
    Q 40 87, 40 85
    L 40 22
    Q 40 20, 38 20
    L 32 20
    Q 30 20, 30 22
    Z" 
  />
  <style>
    path { 
      fill: #000;
      stroke: #000;
      stroke-width: 1;
    }
    @media (prefers-color-scheme: dark) {
      path { 
        fill: #FFF;
        stroke: #FFF;
      }
    }
  </style>
</svg>
````

## File: src/components/highest_score_option.astro
````
---
import type { OptionData } from '../types/option';
import { OptionScorer } from '../utils/optionScorer';
import '../styles/optionsTable.css';

interface Props {
  options: OptionData[];
  currentPrice: number;
  symbol: string;
}

const { options, currentPrice, symbol } = Astro.props;

// Find the highest scoring option
let highestScore = 0;
let highestScoreOption: OptionData | null = null;

options.forEach((option) => {
  const score = OptionScorer.calculateScore(option, currentPrice);
  if (score.total > highestScore) {
    highestScore = score.total;
    highestScoreOption = option;
  }
});

// Calculate details for the highest scoring option
let premiumPct = 0;
let annualizedPremiumPct = 0;
let daysToExpiry = 0;
let scoreClass = '';

if (highestScoreOption) {
  // Add type assertion to help TypeScript
  const option = highestScoreOption as OptionData;
  const expiryDate = new Date(option.expirationDate);
  const today = new Date();
  daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  premiumPct = (option.bid / option.strike) * 100;
  annualizedPremiumPct = (premiumPct * 365) / daysToExpiry;

  scoreClass = OptionScorer.getScoreClass(highestScore);
}
---

{highestScoreOption && (
  <div class="highest-score-option mb-6">
    <h2 class="text-xl font-bold mb-3">🏆 Highest Score Option for {symbol}</h2>
    <div class="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center gap-2">
          <span class={`score-badge ${scoreClass}`}>{highestScore.toFixed(1)}</span>
          <span class="text-lg font-bold">${(highestScoreOption as OptionData).strike} Strike</span>
          <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {new Date((highestScoreOption as OptionData).expirationDate).toLocaleDateString()} ({daysToExpiry} days)
          </span>
        </div>
        <div class="text-right">
          <div class="text-green-700 font-semibold">${(highestScoreOption as OptionData).bid} premium</div>
          <div class="text-xs text-gray-600">
            {premiumPct.toFixed(2)}% premium ({annualizedPremiumPct.toFixed(2)}% ann.)
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4 text-sm">
        <div>
          <span class="text-gray-600">Volume:</span>
          <span class="font-medium">{(highestScoreOption as OptionData).volume || 'N/A'}</span>
        </div>
        <div>
          <span class="text-gray-600">Open Interest:</span>
          <span class="font-medium">{(highestScoreOption as OptionData).openInterest || 'N/A'}</span>
        </div>
        <div>
          <span class="text-gray-600">IV:</span>
          <span class="font-medium">{(highestScoreOption as OptionData).impliedVolatility ?
            ((highestScoreOption as OptionData).impliedVolatility * 100).toFixed(2) + '%' : 'N/A'}</span>
        </div>
        <div>
          <span class="text-gray-600">Theta:</span>
          <span class="font-medium">{(highestScoreOption as OptionData).theta?.toFixed(4) || 'N/A'}</span>
        </div>
      </div>
    </div>
  </div>
)}

<style>
  .highest-score-option {
    animation: highlight-pulse 2s ease-in-out infinite;
  }

  @keyframes highlight-pulse {
    0%, 100% { box-shadow: 0 0 0 rgba(16, 185, 129, 0); }
    50% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
  }

  .score-badge {
    display: inline-block;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
  }

  .score-excellent {
    background: linear-gradient(45deg, #10b981, #059669);
  }

  .score-good {
    background: linear-gradient(45deg, #3b82f6, #2563eb);
  }

  .score-moderate {
    background: linear-gradient(45deg, #f59e0b, #d97706);
  }

  .score-weak {
    background: linear-gradient(45deg, #f97316, #ea580c);
  }

  .score-poor {
    background: linear-gradient(45deg, #ef4444, #dc2626);
  }
</style>
````

## File: src/components/historical_data_view.astro
````
---
import { OptionsService } from '../services/optionsService';

interface Props {
  symbol: string;
}

const { symbol } = Astro.props;

// Get D1 database from runtime if available
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;

let snapshotsData: { snapshots: any[]; error?: string } = { snapshots: [] };
let topOptionsData: { topOptions: any[]; error?: string } = { topOptions: [] };
let performanceData: { snapshots: any[]; error?: string } = { snapshots: [] };

if (db) {
  try {
    const optionsService = OptionsService.getInstance(db);

    // Fetch historical snapshots
    try {
      const snapshots = await optionsService.getHistoricalSnapshots(symbol, 5);
      snapshotsData = { snapshots };
    } catch (err) {
      console.error('Error fetching historical snapshots:', err);
      snapshotsData = { snapshots: [], error: err instanceof Error ? err.message : 'Unknown error' };
    }

    // Fetch top performing options
    try {
      const topOptions = await optionsService.getTopPerformingOptions(symbol, 30, 5);
      topOptionsData = { topOptions };
    } catch (err) {
      console.error('Error fetching top performing options:', err);
      topOptionsData = { topOptions: [], error: err instanceof Error ? err.message : 'Unknown error' };
    }

    // Fetch performance data
    try {
      const performanceResult = await optionsService.getStockPerformanceData(symbol, 30);
      performanceData = { snapshots: performanceResult.snapshots };
    } catch (err) {
      console.error('Error fetching performance data:', err);
      performanceData = { snapshots: [], error: err instanceof Error ? err.message : 'Unknown error' };
    }

  } catch (err) {
    console.error('Error initializing options service:', err);
  }
}
---

<div class="historical-data-container">
  <h2 class="text-xl font-bold mb-4">📊 Historical Performance for {symbol}</h2>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Recent Snapshots -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-3">Recent Data Snapshots</h3>
      <div>
        {snapshotsData.error ? (
          <p class="text-red-500">Error: {snapshotsData.error}</p>
        ) : snapshotsData.snapshots.length > 0 ? (
          <div>
            {snapshotsData.snapshots.map((snapshot) => (
              <div class="snapshot-item">
                <div class="font-medium">${snapshot.currentPrice.toFixed(2)}</div>
                <div class="text-sm text-gray-600">{new Date(snapshot.fetchedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <p class="text-gray-500">No historical data available</p>
        )}
      </div>
    </div>

    <!-- Top Performing Options -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-3">Top Performing Options (30 days)</h3>
      <div>
        {topOptionsData.error ? (
          <p class="text-red-500">Error: {topOptionsData.error}</p>
        ) : topOptionsData.topOptions.length > 0 ? (
          <div>
            {topOptionsData.topOptions.map((option) => (
              <div class="option-item">
                <div class="font-medium">${option.strike} Strike</div>
                <div class="text-sm text-blue-600">Score: {option.score?.totalScore?.toFixed(1) || 'N/A'}</div>
                <div class="text-xs text-gray-600">{new Date(option.expirationDate).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <p class="text-gray-500">No historical options data available</p>
        )}
      </div>
    </div>

    <!-- Performance Chart -->
    <div class="bg-white p-4 rounded-lg shadow md:col-span-2">
      <h3 class="text-lg font-semibold mb-3">Performance Trends</h3>
      <div>
        {performanceData.error ? (
          <p class="text-red-500">Error: {performanceData.error}</p>
        ) : performanceData.snapshots.length > 0 ? (
          <div>
            <div class="text-sm text-gray-600 mb-2">Last 30 days performance summary:</div>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="bg-blue-50 p-3 rounded">
                <div class="text-lg font-bold text-blue-600">{performanceData.snapshots.length}</div>
                <div class="text-xs text-gray-600">Data Points</div>
              </div>
              <div class="bg-green-50 p-3 rounded">
                <div class="text-lg font-bold text-green-600">{performanceData.snapshots[0]?.topOptionScore?.toFixed(1) || 'N/A'}</div>
                <div class="text-xs text-gray-600">Latest Top Score</div>
              </div>
              <div class="bg-purple-50 p-3 rounded">
                <div class="text-lg font-bold text-purple-600">${performanceData.snapshots[0]?.currentPrice?.toFixed(2) || 'N/A'}</div>
                <div class="text-xs text-gray-600">Latest Price</div>
              </div>
            </div>
          </div>
        ) : (
          <p class="text-gray-500">No performance data available</p>
        )}
      </div>
    </div>
  </div>
</div>

<style>
  .historical-data-container {
    margin: 2rem 0;
  }

  .snapshot-item {
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
    background: #f9fafb;
  }

  .option-item {
    padding: 0.5rem;
    border-left: 3px solid #3b82f6;
    margin-bottom: 0.5rem;
    background: #f8fafc;
  }
</style>
````

## File: src/components/optionRow.astro
````
---
import type { OptionData } from '../types/option';
import { getStrikeClass, getThetaClass, calculateSimpleReturn, calculateAnnualizedPremium, getPremiumClass, formatContractName } from '../utils/optionsUtils';
import { OptionScorer } from '../utils/optionScorer';
import '../styles/optionRow.css';

interface Props {
  option: OptionData;
  currentPrice: number;
  showExpiry?: boolean;
}

const { option, currentPrice, showExpiry = false } = Astro.props;
const score = OptionScorer.calculateScore(option, currentPrice);
const expiryDate = formatContractName(option.contractName);
---
<tr class={`${getPremiumClass(option)} ${OptionScorer.getScoreClass(score.total)}`}>
  <td class="score-cell">
    <div class="score-value">{score.total.toFixed(0)}</div>
    <div class="score-breakdown">
      <span class="premium">P: {score.premiumScore.toFixed(1)}</span>
      <span class="theta">θ: {score.thetaScore.toFixed(1)}</span>
      <span class="strike">S: {score.strikeScore.toFixed(1)}</span>
      <span class="dte">T: {score.dteScore.toFixed(1)}</span>
    </div>
  </td>
  {showExpiry && <td class="expiry-cell">{expiryDate}</td>}
  <td class={getStrikeClass(option.strike, currentPrice)}>
    ${option.strike.toFixed(2)}
  </td>
  <td>${option.bid.toFixed(2)}</td>
  <td>${option.ask.toFixed(2)}</td>
  <td>{option.volume}</td>
  <td>{(option.impliedVolatility * 100).toFixed(1)}%</td>
  <td class={getThetaClass(option.theta)}>
    {option.theta ? option.theta.toFixed(4) : 'N/A'}
  </td>
  <td>{calculateSimpleReturn(option).toFixed(2)}%</td>
  <td>{calculateAnnualizedPremium(option).toFixed(1)}%</td>
</tr>

<style>
  .expiry-cell {
    white-space: nowrap;
    font-size: 0.9rem;
  }
</style>
````

## File: src/components/optionsGroup.astro
````
---
import type { GroupedOption } from '../types/option';
import OptionRow from './optionRow.astro';
import '../styles/optionsGroup.css';
import '../styles/optionsTable.css';
import '../styles/optionIndicators.css';

interface Props {
  group: GroupedOption;
  currentPrice: number;
}

const { group, currentPrice } = Astro.props;
---

<div class="expiry-group">
  <button class="expiry-header">
    <span class="expiry-date">{group.expiryDate}</span>
    <span class="days-to-expiry">{group.daysToExpiry} days</span>
    <span class="contract-count">{group.options.length} contracts</span>
  </button>
  <div class="options-details hidden">
    <table class="options-table">
      <thead>
        <tr>
          <th>Score</th>
          <th>Strike</th>
          <th>Bid</th>
          <th>Ask</th>
          <th>Volume</th>
          <th>IV%</th>
          <th>Theta</th>
          <th>Simple%</th>
          <th>Ann. Prem%</th>
        </tr>
      </thead>
      <tbody>
        {group.options.map((option) => (
          <OptionRow option={option} currentPrice={currentPrice} />
        ))}
      </tbody>
    </table>
  </div>
</div>
````

## File: src/components/OptionsTable.astro
````
---
import { OptionsService } from '../services/optionsService';
import { groupOptionsByExpiry } from '../utils/optionsUtils';
import OptionsGroup from './optionsGroup.astro';
import HighScoreOptions from './highScoreOptions.astro';
import HighestScoreOption from './highest_score_option.astro';
// import { Debug } from 'astro:components';

interface Props {
  symbol: string;
}

const { symbol } = Astro.props;

// Get D1 database from runtime if available
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;
const optionsService = OptionsService.getInstance(db);
const { options, currentPrice, error } = await optionsService.fetchOptionsData(symbol);

const sortedGroups = groupOptionsByExpiry(options);

---

<div class="options-table-container">
  {error ? (
    <div class="error-message">
      {error}. Please check the symbol and try again.
    </div>
  ) : (
    <>
      <div class="current-price">
        <div class="flex items-center gap-2">
          <span class="symbol">{symbol}</span>
          <span class="price">Current Price: ${currentPrice.toFixed(4)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="price-range">
            Range: ${(currentPrice * 0.9).toFixed(2)} - ${(currentPrice * 1.1).toFixed(2)}
          </span>
        </div>
      </div>
      {options.length > 0 && (
        <HighestScoreOption options={options} currentPrice={currentPrice} symbol={symbol} />
      )}
{/* <Debug value={options} /> */}
      <HighScoreOptions options={options} currentPrice={currentPrice} />

      <div class="expiry-groups">
        {sortedGroups.map((group) => (
          <OptionsGroup group={group} currentPrice={currentPrice} />
        ))}
      </div>
    </>
  )}
</div>

<style>
  .options-table-container {
    overflow-x: auto;
    margin: 1rem 0;
  }

  .current-price {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 0.375rem;
  }

  .symbol {
    font-size: 1.5rem;
    color: #2563eb;
  }

  .price-range {
    font-size: 0.875rem;
    color: #4b5563;
  }

  .refresh-button {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background-color: #e5e7eb;
    color: #4b5563;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .refresh-button:hover {
    background-color: #d1d5db;
  }

  .expiry-groups {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-message {
    padding: 1rem;
    background-color: #fee2e2;
    border: 1px solid #ef4444;
    border-radius: 0.375rem;
    color: #991b1b;
    margin: 1rem 0;
  }
</style>

<script>
  // Handle expiry group expansion
  document.querySelectorAll('.expiry-header').forEach(button => {
    button.addEventListener('click', () => {
      const details = button.nextElementSibling as HTMLElement;
      details.classList.toggle('hidden');
    });
  });
</script>
````

## File: src/components/preferredStocksView.astro
````
---
import { PreferredStocks } from '../enums/preferredStocks';
import StockOptionsSection from './stock_options_section.astro';
import { OptionsService } from '../services/optionsService';
import type { OptionData } from '../types/option';
import '../styles/optionsTable.css';

interface FetchedData {
  options: OptionData[];
  currentPrice: number;
  error?: string;
}

const symbols = Object.values(PreferredStocks);
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;
let stocksData: { symbol: string; data: FetchedData }[] = [];

if (db) {
  const optionsService = OptionsService.getInstance(db);
  const promises = symbols.map((symbol) => optionsService.fetchOptionsData(symbol));
  const results = await Promise.allSettled(promises);

  stocksData = results.map((result, index) => {
    const symbol = symbols[index];
    if (result.status === 'fulfilled') {
      return { symbol, data: result.value };
    }
    return {
      symbol,
      data: {
        options: [],
        currentPrice: 0,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error fetching data',
      },
    };
  });
} else {
  stocksData = symbols.map((symbol) => ({
    symbol,
    data: {
      options: [],
      currentPrice: 0,
      error: 'Database not available',
    },
  }));
}
---

<div class="preferred-stocks-container">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Preferred Stocks Top Scoring Options</h1>
  </div>

  <div class="grid gap-8" id="stocks-container">
    {
      stocksData.map(({ symbol }) => (
        <StockOptionsSection symbol={symbol} />
      ))
    }
  </div>
</div>

<style>
  .preferred-stocks-container {
    padding: 1rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Global styles for score classes used by child components */
  :global(.score-excellent) {
    background-color: #dcfce7 !important;
    font-weight: bold;
    color: #166534;
  }

  :global(.score-good) {
    background-color: #d1fae5 !important;
    color: #047857;
  }

  :global(.score-moderate) {
    background-color: #ecfdf5 !important;
    color: #0f766e;
  }

  :global(.score-weak) {
    background-color: #f0f9ff !important;
    color: #0369a1;
  }

  :global(.score-poor) {
    background-color: #f9fafb !important;
    color: #4b5563;
  }
</style>
````

## File: src/components/searchForm.astro
````
---
import { PreferredStocks } from '../enums/preferredStocks';

interface Props {
  symbol?: string;
}

const { symbol } = Astro.props;
const preferredStocksList = Object.values(PreferredStocks);
---

<form class="flex items-center gap-3" id="symbolForm">
  <div class="form-group relative">
    <input
      type="text"
      id="symbol"
      name="symbol"
      value={symbol || ''}
      class="w-44 h-12 px-4 py-2 text-lg uppercase font-semibold
        rounded-xl bg-white/50 backdrop-blur-sm
        border-2 border-gray-200/80
        focus:border-blue-500/80 focus:ring-4 focus:ring-blue-200/50
        outline-none transition-all duration-300 ease-in-out
        shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]
        hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]
        placeholder-gray-400
        hover:border-gray-300"
      placeholder="Symbol"
      pattern="[A-Za-z]+"
      maxlength="5"
      required
    />
    <div class="absolute -top-2.5 left-3 px-2 text-xs font-medium
      text-gray-600 bg-white rounded-full border border-gray-200/50
      shadow-sm transition-all duration-300 group-hover:text-gray-700">
      Stock Symbol
    </div>
  </div>

  <div class="form-group relative">
    <select
      id="preferredStockSelect"
      class="h-12 px-4 py-2 text-base font-medium
        rounded-xl bg-white/50 backdrop-blur-sm
        border-2 border-gray-200/80
        focus:border-blue-500/80 focus:ring-4 focus:ring-blue-200/50
        outline-none transition-all duration-300 ease-in-out
        shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]
        hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]
        text-gray-600
        hover:border-gray-300
        appearance-none"
    >
      <option value="">Preferred Stocks</option>
      {preferredStocksList.map((stock) => (
        <option value={stock}>{stock}</option>
      ))}
    </select>
    <div class="absolute -top-2.5 left-3 px-2 text-xs font-medium
      text-gray-600 bg-white rounded-full border border-gray-200/50
      shadow-sm transition-all duration-300 group-hover:text-gray-700">
      Quick Select
    </div>
    <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </div>
  </div>

  <button
    type="submit"
    class="h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-700
      text-white font-medium rounded-lg
      hover:from-blue-700 hover:to-blue-800
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      transition-all duration-200 transform hover:scale-105
      shadow-sm hover:shadow-md
      flex items-center gap-2"
  >
    <span>Load</span>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
    </svg>
  </button>
</form>

<style>
  input:invalid {
    border-color: rgb(254 202 202); /* red-200 */
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 0.9),
      rgba(254, 226, 226, 0.3)
    );
  }

  input:invalid:focus {
    border-color: rgb(248 113 113); /* red-400 */
    box-shadow: 0 0 0 3px rgba(254, 226, 226, 0.8); /* ring-red-100 */
  }

  .form-group {
    position: relative;
    display: inline-block;
  }

  input:focus, select:focus {
    transform: translateY(-1px);
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.06),
      0 4px 12px rgba(59, 130, 246, 0.1);
  }

  .form-group:focus-within div {
    transform: translateY(-1px);
    color: rgb(37, 99, 235);
    border-color: rgba(37, 99, 235, 0.2);
    background: linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,1));
  }

  input:hover, select:hover {
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 0.9),
      rgba(255, 255, 255, 0.8)
    );
  }

  input, select {
    text-shadow: 0 1px 1px rgba(0,0,0,0.1);
    transition: all 0.2s ease-in-out;
  }

  button:hover::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      120deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    100% {
      left: 200%;
    }
  }
</style>

<script>
  const form = document.getElementById('symbolForm');
  const input = document.getElementById('symbol') as HTMLInputElement;
  const select = document.getElementById('preferredStockSelect') as HTMLSelectElement | null;

  input?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.toUpperCase();
  });

  select?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    if (target.value) {
      input.value = target.value;
      form?.dispatchEvent(new Event('submit'));
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const symbol = formData.get('symbol')?.toString().toUpperCase().trim();
    if (symbol) {
      const url = new URL(window.location.href);
      url.searchParams.set('symbol', symbol);
      window.location.href = url.toString();
    }
  });
</script>
````

## File: src/components/seo.astro
````
---
interface Props {
  title?: string;
  description?: string;
  image?: string;
}

const {
  title = 'Stock Options Data',
  description = 'Real-time stock options data and analysis',
  image = '/og-image.jpg',
} = Astro.props;

// Fix for the URL error - only create canonical URL if Astro.site is defined
const canonicalURL = Astro.site
  ? new URL(Astro.url.pathname, Astro.site)
  : Astro.url.pathname;
---

<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="generator" content={Astro.generator} />

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalURL} />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content={Astro.url} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={image} />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content={Astro.url} />
<meta property="twitter:title" content={title} />
<meta property="twitter:description" content={description} />
<meta property="twitter:image" content={image} />
````

## File: src/components/stock_options_section.astro
````
---
import { OptionsService } from '../services/optionsService';
import { OptionScorer } from '../utils/optionScorer';
import type { ScoredOption, OptionData } from '../types/option';

interface Props {
  symbol: string;
}

const { symbol } = Astro.props;

// Standard D1 database access pattern
const db = (Astro.locals.runtime?.env?.DB as D1Database) || null;

let optionsData: {
  options: OptionData[];
  currentPrice: number;
  scoredOptions: ScoredOption[];
  topOptions: ScoredOption[];
  highestScore: number;
  error?: string;
} = {
  options: [],
  currentPrice: 0,
  scoredOptions: [],
  topOptions: [],
  highestScore: 0
};


if (db) {
  try {
    const optionsService = OptionsService.getInstance(db);

    // Fetch options data
    const rawData = await optionsService.fetchOptionsData(symbol);

    if (rawData.error) {
      optionsData = {
        ...optionsData,
        error: rawData.error
      };
    } else if (rawData.options.length > 0) {
      // Score the options
      const scoredOptions: ScoredOption[] = rawData.options
        .map(option => ({
          ...option,
          score: OptionScorer.calculateScore(option, rawData.currentPrice)
        }))
        .sort((a, b) => b.score.total - a.score.total);

      // Get the highest score
      const highestScore = scoredOptions.length > 0 ? scoredOptions[0].score.total : 0;

      // Get all options with the highest score (including ties)
      const topOptions = scoredOptions.filter(option =>
        Math.abs(option.score.total - highestScore) < 0.01 // Using small epsilon for float comparison
      );

      optionsData = {
        options: rawData.options,
        currentPrice: rawData.currentPrice,
        scoredOptions,
        topOptions,
        highestScore,
      };
    }


  } catch (err) {
    console.error(`Error fetching options for ${symbol}:`, err);
    optionsData = {
      ...optionsData,
      error: err instanceof Error ? err.message : 'Failed to fetch options data'
    };
  }
} else {
  console.warn(`Database not available for ${symbol}`);
  optionsData = {
    ...optionsData,
    error: 'Database not available'
  };
}

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function calculateAnnualPremium(bid: number, strike: number, daysToExpiry: number): string {
  const premiumPct = (bid / strike) * 100;
  return (premiumPct * 365 / daysToExpiry).toFixed(2);
}
---

<div class="stock-section" id={`stock-${symbol}`}>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-xl font-semibold text-blue-600">{symbol}</h2>
  </div>

  {optionsData.error ? (
    <div class="p-4 bg-red-50 text-red-700 rounded">
      Error: {optionsData.error}
    </div>
  ) : optionsData.topOptions.length > 0 ? (
    <div class="high-score-section">
      <h3 class="text-lg font-bold mb-3">
        🏆 Top Scoring Options (Score: {Math.round(optionsData.highestScore)})
      </h3>
      <div class="overflow-x-auto">
        <table class="options-table">
          <caption class="sr-only">Top scoring options for {symbol}</caption>
          <thead>
            <tr>
              <th scope="col">Score</th>
              <th scope="col">Expiry</th>
              <th scope="col">Strike</th>
              <th scope="col">Bid</th>
              <th scope="col">Ask</th>
              <th scope="col">Volume</th>
              <th scope="col">IV%</th>
              <th scope="col">Theta</th>
              <th scope="col">Simple%</th>
              <th scope="col">Ann. Prem%</th>
            </tr>
          </thead>
          <tbody>
            {optionsData.topOptions.map((option) => {
              const dte = Math.ceil(
                (new Date(option.expirationDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
              );
              const simplePremiumPct = (option.bid / optionsData.currentPrice * 100).toFixed(2);
              const annualPremium = calculateAnnualPremium(option.bid, option.strike, dte);
              const scoreClass = OptionScorer.getScoreClass(option.score.total);

              return (
                <tr>
                  <td class={scoreClass}>{Math.round(option.score.total)}</td>
                  <td>{formatDate(option.expirationDate)}</td>
                  <td>${option.strike.toFixed(2)}</td>
                  <td>${option.bid.toFixed(2)}</td>
                  <td>${option.ask.toFixed(2)}</td>
                  <td>{option.volume.toLocaleString()}</td>
                  <td>{(option.impliedVolatility * 100).toFixed(2)}%</td>
                  <td>{option.theta ? option.theta.toFixed(4) : 'N/A'}</td>
                  <td>{simplePremiumPct}%</td>
                  <td>{annualPremium}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  ) : (
    <div class="p-4 bg-gray-50 rounded text-center text-gray-500">
      No options found for {symbol}
    </div>
  )}
</div>

<style>
  .stock-section {
    background: #ffffff;
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .high-score-section {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #e9ecef;
  }
</style>
````

## File: src/enums/preferredStocks.ts
````typescript
export enum PreferredStocks {
  TSLA = 'TSLA',
  NET = 'NET',
  LRCX = 'LRCX',
  CRWD = 'CRWD',
  NVDA = 'NVDA',
  SE = 'SE',
  KKR = 'KKR',
  BX = 'BX',
  AAPL = 'AAPL',
  GOOGL = 'GOOGL',
  META = 'META',
  AMD = 'AMD',
  AMZN = 'AMZN',
  NFLX = 'NFLX',
  MSFT = 'MSFT',
}
````

## File: src/enums/scoreThresholds.ts
````typescript
export enum ScoreThresholds {
  PREFERRED = 95,  // High score threshold for preferred stocks
  STANDARD = 95,   // Standard high score threshold
  MINIMUM = 50     // Minimum score to consider
}
````

## File: src/layouts/Layout.astro
````
---
import SEO from '../components/seo.astro';
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <SEO title={title} description={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <script>
      // Global polyfill for browser environments
      if (typeof global === 'undefined') {
        window.global = window;
      }
    </script>
  </head>
  <body class="min-h-screen bg-gray-50">
    <header class="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
      <nav class="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" class="text-lg font-bold text-gray-800 hover:text-blue-700 transition-colors">
          fergfo.om
        </a>
        <div class="flex items-center gap-2">
          <a href="/preferred" class="px-3 py-1.5 text-sm rounded-md text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
            Preferred
          </a>
          <a href="/scoring" class="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
            Scoring Guide
          </a>
        </div>
      </nav>
    </header>
    <slot />
  </body>
</html>
````

## File: src/migrations/001_initial_schema.sql
````sql
-- Initial schema for options tracking database
-- This migration creates the core tables for storing stock snapshots,
-- option data, and calculated scores over time.

-- Stock snapshots table - stores stock price and metadata at each fetch
CREATE TABLE stock_snapshots (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    current_price REAL NOT NULL,
    fetched_at TEXT NOT NULL, -- ISO timestamp when data was fetched
    source TEXT NOT NULL DEFAULT 'finnhub', -- data source identifier
    created_at TEXT NOT NULL DEFAULT (datetime('now')), -- when record was created
    
    -- Create index for efficient symbol lookups
    CONSTRAINT unique_symbol_fetch UNIQUE (symbol, fetched_at)
);

CREATE INDEX idx_stock_snapshots_symbol ON stock_snapshots(symbol);
CREATE INDEX idx_stock_snapshots_created_at ON stock_snapshots(created_at);
CREATE INDEX idx_stock_snapshots_symbol_created ON stock_snapshots(symbol, created_at);

-- Option snapshots table - stores individual option data for each stock snapshot
CREATE TABLE option_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL, -- foreign key to stock_snapshots
    contract_name TEXT NOT NULL,
    strike REAL NOT NULL,
    last_price REAL NOT NULL,
    bid REAL NOT NULL,
    ask REAL NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    open_interest INTEGER NOT NULL DEFAULT 0,
    expiration_date TEXT NOT NULL, -- ISO date string
    implied_volatility REAL NOT NULL,
    delta REAL,
    gamma REAL,
    theta REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (snapshot_id) REFERENCES stock_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX idx_option_snapshots_snapshot_id ON option_snapshots(snapshot_id);
CREATE INDEX idx_option_snapshots_contract_name ON option_snapshots(contract_name);
CREATE INDEX idx_option_snapshots_expiration ON option_snapshots(expiration_date);
CREATE INDEX idx_option_snapshots_strike ON option_snapshots(strike);

-- Option score snapshots table - stores calculated scores for each option
CREATE TABLE option_score_snapshots (
    id TEXT PRIMARY KEY,
    option_snapshot_id TEXT NOT NULL, -- foreign key to option_snapshots
    total_score REAL NOT NULL,
    premium_score REAL NOT NULL,
    theta_score REAL NOT NULL,
    strike_score REAL NOT NULL,
    dte_score REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (option_snapshot_id) REFERENCES option_snapshots(id) ON DELETE CASCADE,
    CONSTRAINT unique_option_score UNIQUE (option_snapshot_id)
);

CREATE INDEX idx_option_score_snapshots_option_id ON option_score_snapshots(option_snapshot_id);
CREATE INDEX idx_option_score_snapshots_total_score ON option_score_snapshots(total_score);

-- Create a view for easy querying of complete option data with scores
CREATE VIEW option_data_with_scores AS
SELECT 
    ss.symbol,
    ss.current_price,
    ss.fetched_at,
    os.contract_name,
    os.strike,
    os.bid,
    os.ask,
    os.volume,
    os.open_interest,
    os.expiration_date,
    os.implied_volatility,
    os.delta,
    os.gamma,
    os.theta,
    oss.total_score,
    oss.premium_score,
    oss.theta_score,
    oss.strike_score,
    oss.dte_score,
    ss.id as snapshot_id,
    os.id as option_id,
    oss.id as score_id
FROM stock_snapshots ss
JOIN option_snapshots os ON ss.id = os.snapshot_id
LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
ORDER BY ss.created_at DESC, oss.total_score DESC;

-- Create a view for performance tracking over time
CREATE VIEW stock_performance_summary AS
SELECT 
    ss.symbol,
    DATE(ss.created_at) as date,
    AVG(ss.current_price) as avg_price,
    MAX(oss.total_score) as max_score,
    AVG(oss.total_score) as avg_score,
    COUNT(os.id) as option_count,
    COUNT(CASE WHEN oss.total_score >= 80 THEN 1 END) as excellent_options,
    COUNT(CASE WHEN oss.total_score >= 65 THEN 1 END) as good_options
FROM stock_snapshots ss
LEFT JOIN option_snapshots os ON ss.id = os.snapshot_id
LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
GROUP BY ss.symbol, DATE(ss.created_at)
ORDER BY ss.symbol, date DESC;
````

## File: src/pages/api/historical-snapshots.ts
````typescript
import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const optionsService = OptionsService.getInstance(db);
    const snapshots = await optionsService.getHistoricalSnapshots(symbol, limit);
    
    return new Response(
      JSON.stringify({ 
        symbol: symbol.toUpperCase(),
        snapshots,
        count: snapshots.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching historical snapshots for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
````

## File: src/pages/api/stock-options.ts
````typescript
import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';
import type { StockOptionsData } from '../../types/option';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    const optionsService = OptionsService.getInstance(db);
    
    const { options, currentPrice, error } = await optionsService.fetchOptionsData(symbol);
    
    const responseData: StockOptionsData = {
      symbol,
      options,
      currentPrice,
      error
    };
    
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching data for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
````

## File: src/pages/api/stock-performance.ts
````typescript
import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const optionsService = OptionsService.getInstance(db);
    const performanceData = await optionsService.getStockPerformanceData(symbol, days);
    
    return new Response(
      JSON.stringify(performanceData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching performance data for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
````

## File: src/pages/api/top-performing-options.ts
````typescript
import type { APIRoute } from 'astro';
import { OptionsService } from '../../services/optionsService';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  
  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'Symbol parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const optionsService = OptionsService.getInstance(db);
    const topOptions = await optionsService.getTopPerformingOptions(symbol, days, limit);
    
    return new Response(
      JSON.stringify({ 
        symbol: symbol.toUpperCase(),
        days,
        topOptions,
        count: topOptions.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(`Error fetching top performing options for ${symbol}:`, err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
````

## File: src/pages/index.astro
````
---
export const prerender = false;

import Layout from '../layouts/Layout.astro';
import OptionsTable from '../components/OptionsTable.astro';
import SearchForm from '../components/searchForm.astro';
import HistoricalDataView from '../components/historical_data_view.astro';

// Get the symbol from URL params with more robust handling
const currentUrl = new URL(Astro.request.url);
const symbol = currentUrl.searchParams.get('symbol')?.toUpperCase();

---

<Layout title={symbol ? `${symbol} Options Data` : 'Stock Options Data'}>
  <main class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
      <div class="flex items-center gap-4">
        <h1 class="text-3xl font-bold text-gray-800">Stock Options Data</h1>
        <a
          href="/preferred"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          View Preferred Stocks
        </a>
      </div>
      <SearchForm symbol={symbol} />
    </div>

    {symbol ? (
      <>
        <OptionsTable symbol={symbol} />
        <HistoricalDataView symbol={symbol} />
      </>
    ) : (
      <div class="text-center p-8 bg-gray-50 rounded-lg">
        <p class="text-gray-600">Enter a stock symbol to view options data</p>
      </div>
    )}
  </main>
</Layout>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  input:invalid {
    border-color: rgb(254 202 202); /* red-200 */
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 0.9),
      rgba(254, 226, 226, 0.3)
    );
  }

  input:invalid:focus {
    border-color: rgb(248 113 113); /* red-400 */
    box-shadow: 0 0 0 3px rgba(254, 226, 226, 0.8); /* ring-red-100 */
  }

  .form-group {
    position: relative;
    display: inline-block;
  }

  /* Enhanced input focus animation */
  input:focus {
    transform: translateY(-1px);
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.06),
      0 4px 12px rgba(59, 130, 246, 0.1);
  }

  /* Floating label animation */
  .form-group:focus-within div {
    transform: translateY(-1px);
    color: rgb(37, 99, 235);
    border-color: rgba(37, 99, 235, 0.2);
    background: linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,1));
  }

  /* Glass morphism effect on hover */
  input:hover {
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 0.9),
      rgba(255, 255, 255, 0.8)
    );
  }

  /* Add subtle text shadow to input text */
  input {
    text-shadow: 0 1px 1px rgba(0,0,0,0.1);
  }

  /* Add shimmer effect on hover */
  button:hover::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      120deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    100% {
      left: 200%;
    }
  }

  /* Smooth transition for input focus */
  input {
    transition: all 0.2s ease-in-out;
  }
</style>

<script>
  // Remove auto-refresh logic as we've implemented manual refresh
  // Users can now refresh data by clicking the refresh button
</script>
````

## File: src/pages/preferred.astro
````
---
export const prerender = false;

import Layout from '../layouts/Layout.astro';
import PreferredStocksView from '../components/preferredStocksView.astro';


---

<Layout title="Preferred Stocks Options">
  <main class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Preferred Stocks Options</h1>
      <a
        href="/"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Back to Search
      </a>
    </div>

    <PreferredStocksView />
  </main>
</Layout>

<script>
  // Remove auto-refresh logic as we've implemented manual refresh
  // Users can now refresh data by clicking the refresh button
</script>
````

## File: src/pages/scoring.astro
````
---
import Layout from '../layouts/Layout.astro';

const pageTitle = 'Options Scoring Guide';
const pageDescription = 'How scores are calculated and key options-selling vocabulary.';
---

<Layout title={pageTitle} description={pageDescription}>
  <main class="container mx-auto px-4 py-10">
    <section class="mb-10">
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-8 shadow-md">
        <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">{pageTitle}</h1>
        <p class="mt-3 text-blue-100 max-w-3xl">{pageDescription}</p>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
      <div class="lg:col-span-2 bg-white rounded-xl shadow p-6">
        <h2 class="text-2xl font-bold mb-4">How the Score Is Calculated</h2>
        <p class="text-gray-700 mb-4">Each option receives a composite score out of 100 based on six factors with fixed weights, plus a penalty for wide bid-ask spreads:</p>

        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="text-sm uppercase tracking-wide text-gray-500">Weight</div>
            <div class="mt-1 text-3xl font-extrabold">35</div>
            <div class="text-gray-700 mt-1">Premium % of Strike</div>
          </div>
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="text-sm uppercase tracking-wide text-gray-500">Weight</div>
            <div class="mt-1 text-3xl font-extrabold">25</div>
            <div class="text-gray-700 mt-1">Theta (time decay)</div>
          </div>
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="text-sm uppercase tracking-wide text-gray-500">Weight</div>
            <div class="mt-1 text-3xl font-extrabold">10</div>
            <div class="text-gray-700 mt-1">Strike Distance</div>
          </div>
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="text-sm uppercase tracking-wide text-gray-500">Weight</div>
            <div class="mt-1 text-3xl font-extrabold">10</div>
            <div class="text-gray-700 mt-1">Days to Expiry (DTE)</div>
          </div>
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="text-sm uppercase tracking-wide text-gray-500">Weight</div>
            <div class="mt-1 text-3xl font-extrabold">10</div>
            <div class="text-gray-700 mt-1">Implied Volatility</div>
          </div>
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="text-sm uppercase tracking-wide text-gray-500">Weight</div>
            <div class="mt-1 text-3xl font-extrabold">10</div>
            <div class="text-gray-700 mt-1">Liquidity</div>
          </div>
        </div>

        <div class="space-y-6">
          <div>
            <h3 class="font-semibold text-lg mb-2">Premium Score</h3>
            <p class="text-gray-700">
              Calculated from the premium as a percentage of the strike price using a logarithmic curve with diminishing returns.
              Maxes out near a ~6.7% premium.
            </p>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">Theta Score</h3>
            <p class="text-gray-700">
              More negative theta earns a higher score (better time decay for sellers).
              Values are scaled to reward stronger time decay without over-penalizing small differences.
            </p>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">Strike Distance Score</h3>
            <p class="text-gray-700">Measures how far the strike is from the current price. Closer strikes score higher; each ~0.8% farther reduces points progressively.</p>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">DTE Score</h3>
            <p class="text-gray-700">Peaks around 38 days and decays linearly within 30–45 DTE, with faster decay outside that range to reflect assignment and timing risk.</p>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">Implied Volatility (IV) Score</h3>
            <p class="text-gray-700">Rewards higher IV, as it leads to higher premiums.
              The score is scaled, with the maximum score awarded to options with an IV of 75% or higher.</p>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">Liquidity Score</h3>
            <p class="text-gray-700">Combines open interest and volume to measure how easily an option can be traded.
              Higher liquidity is better, and the score is calculated on a logarithmic scale.</p>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">Bid-Ask Spread Penalty</h3>
            <p class="text-gray-700">A penalty is subtracted from the total score if the bid-ask spread is wider than 10% of the ask price.
              This penalizes illiquid options where slippage is likely.</p>
          </div>
        </div>
      </div>

      <aside class="bg-white rounded-xl shadow p-6">
        <h2 class="text-2xl font-bold mb-4">Score Bands</h2>
        <ul class="space-y-3">
          <li class="flex items-center justify-between">
            <span class="text-gray-700">≥ 80</span>
            <span class="px-3 py-1 rounded-full text-white text-sm font-semibold bg-emerald-600">Excellent</span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-gray-700">65–79.9</span>
            <span class="px-3 py-1 rounded-full text-white text-sm font-semibold bg-cyan-600">Good</span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-gray-700">50–64.9</span>
            <span class="px-3 py-1 rounded-full text-white text-sm font-semibold bg-amber-600">Moderate</span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-gray-700">35–49.9</span>
            <span class="px-3 py-1 rounded-full text-white text-sm font-semibold bg-slate-500">Weak</span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-gray-700">&lt; 35</span>
            <span class="px-3 py-1 rounded-full text-white text-sm font-semibold bg-rose-600">Poor</span>
          </li>
        </ul>
      </aside>
    </section>

    <section class="bg-white rounded-xl shadow p-6 mb-12">
      <h2 class="text-2xl font-bold mb-4">Vocabulary</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="space-y-3">
          <div>
            <h3 class="font-semibold">Premium</h3>
            <p class="text-gray-700">The price received for selling the option (usually the bid). Expressed as an absolute amount and as a % of the strike.</p>
          </div>
          <div>
            <h3 class="font-semibold">Theta</h3>
            <p class="text-gray-700">Daily time decay of the option’s price. For sellers, more negative is generally better.</p>
          </div>
          <div>
            <h3 class="font-semibold">DTE (Days to Expiry)</h3>
            <p class="text-gray-700">Number of days remaining until the option expires.</p>
          </div>
          <div>
            <h3 class="font-semibold">Strike Distance</h3>
            <p class="text-gray-700">How far the strike is from the current stock price (as a ratio). Closer strikes carry more assignment risk but higher premium.</p>
          </div>
        </div>
        <div class="space-y-3">
          <div>
            <h3 class="font-semibold">Simple Return</h3>
            <p class="text-gray-700">Premium ÷ required collateral (e.g., strike × margin rate). Shown as a percentage.</p>
          </div>
          <div>
            <h3 class="font-semibold">Annualized Premium %</h3>
            <p class="text-gray-700">Simple return scaled by 365 ÷ DTE. Useful for comparing contracts with different expiries.</p>
          </div>
          <div>
            <h3 class="font-semibold">In/Out of the Money</h3>
            <p class="text-gray-700">For puts, a strike above the current price is ITM; below is OTM. Styling indicates this visually in tables.</p>
          </div>
          <div>
            <h3 class="font-semibold">Implied Volatility (IV)</h3>
            <p class="text-gray-700">Market’s estimate of future volatility. Higher IV generally means higher premium.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-blue-50 border border-blue-100 rounded-xl p-6">
      <h2 class="text-xl font-semibold mb-2 text-blue-900">Notes</h2>
      <ul class="list-disc list-inside text-blue-900/80 space-y-1">
        <li>Scores help compare opportunities, but they are not financial advice.</li>
        <li>Always consider liquidity, earnings dates, and personal risk tolerance.</li>
        <li>The model prioritizes premium and time decay; adjust to your strategy as needed.</li>
        <li>IV and Liquidity are now included to give a more balanced view of risk and reward.</li>
      </ul>
    </section>
  </main>

  <style>
    .container { max-width: 1100px; }
  </style>
</Layout>
````

## File: src/services/database_service.ts
````typescript
import type {
  StockSnapshot,
  CreateStockSnapshotParams,
  HistoricalOptionData,
  StockPerformanceData
} from '../types/database';
import type { OptionData, OptionScore } from '../types/option';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: D1Database;

  private constructor(db: D1Database) {
    this.db = db;
  }

  static getInstance(db: D1Database): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService(db);
    }
    return this.instance;
  }

  /**
   * Create a new stock snapshot with current price and timestamp
   */
  async createStockSnapshot(params: CreateStockSnapshotParams): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO stock_snapshots (id, symbol, current_price, fetched_at, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      id,
      params.symbol.toUpperCase(),
      params.currentPrice,
      now,
      params.source || 'finnhub',
      now
    ).run();

    return id;
  }

  /**
   * Create multiple option snapshots for a stock snapshot
   */
  async createOptionSnapshots(
    snapshotId: string,
    options: OptionData[]
  ): Promise<string[]> {
    const optionIds: string[] = [];
    
    for (const option of options) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO option_snapshots (
          id, snapshot_id, contract_name, strike, last_price, bid, ask,
          volume, open_interest, expiration_date, implied_volatility,
          delta, gamma, theta, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await stmt.bind(
        id,
        snapshotId,
        option.contractName,
        option.strike,
        option.lastPrice,
        option.bid,
        option.ask,
        option.volume,
        option.openInterest,
        option.expirationDate,
        option.impliedVolatility,
        option.delta || null,
        option.gamma || null,
        option.theta || null,
        now
      ).run();
      
      optionIds.push(id);
    }
    
    return optionIds;
  }

  /**
   * Create option score snapshots
   */
  async createOptionScoreSnapshots(
    optionSnapshotIds: string[],
    scores: OptionScore[]
  ): Promise<void> {
    if (optionSnapshotIds.length !== scores.length) {
      throw new Error('Mismatch between option snapshot IDs and scores');
    }

    for (let i = 0; i < optionSnapshotIds.length; i++) {
      const id = crypto.randomUUID();
      const optionId = optionSnapshotIds[i];
      const score = scores[i];
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO option_score_snapshots (
          id, option_snapshot_id, total_score, premium_score,
          theta_score, strike_score, dte_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await stmt.bind(
        id,
        optionId,
        score.total,
        score.premiumScore,
        score.thetaScore,
        score.strikeScore,
        score.dteScore,
        now
      ).run();
    }
  }

  /**
   * Save a complete dataset (stock + options + scores) in a transaction
   */
  async saveCompleteSnapshot(
    symbol: string,
    currentPrice: number,
    options: OptionData[],
    scores: OptionScore[]
  ): Promise<string> {
    const snapshotId = await this.createStockSnapshot({
      symbol,
      currentPrice
    });

    const optionIds = await this.createOptionSnapshots(snapshotId, options);
    await this.createOptionScoreSnapshots(optionIds, scores);

    return snapshotId;
  }

  /**
   * Get recent snapshots for a symbol
   */
  async getRecentSnapshots(symbol: string, limit: number = 10): Promise<StockSnapshot[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_snapshots 
      WHERE symbol = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    const result = await stmt.bind(symbol.toUpperCase(), limit).all();
    return (result.results as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        symbol: r.symbol as string,
        currentPrice: r.current_price as number,
        fetchedAt: r.fetched_at as string,
        source: (r.source as string) ?? 'finnhub',
        createdAt: r.created_at as string | undefined
      } satisfies StockSnapshot;
    });
  }

  /**
   * Get options for a specific snapshot
   */
  async getOptionsForSnapshot(snapshotId: string): Promise<HistoricalOptionData[]> {
    const stmt = this.db.prepare(`
      SELECT 
        os.*,
        ss.symbol, ss.current_price, ss.fetched_at, ss.source,
        oss.total_score, oss.premium_score, oss.theta_score, 
        oss.strike_score, oss.dte_score
      FROM option_snapshots os
      JOIN stock_snapshots ss ON os.snapshot_id = ss.id
      LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE os.snapshot_id = ?
      ORDER BY oss.total_score DESC
    `);
    
    const result = await stmt.bind(snapshotId).all();
    
    return result.results.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        snapshotId: r.snapshot_id as string,
        contractName: r.contract_name as string,
        strike: r.strike as number,
        lastPrice: r.last_price as number,
        bid: r.bid as number,
        ask: r.ask as number,
        volume: r.volume as number,
        openInterest: r.open_interest as number,
        expirationDate: r.expiration_date as string,
        impliedVolatility: r.implied_volatility as number,
        delta: r.delta as number | undefined,
        gamma: r.gamma as number | undefined,
        theta: r.theta as number | undefined,
        createdAt: r.created_at as string,
        stockSnapshot: {
          id: snapshotId,
          symbol: r.symbol as string,
          currentPrice: r.current_price as number,
          fetchedAt: r.fetched_at as string,
          source: r.source as string
        },
        score: r.total_score ? {
          id: '',
          optionSnapshotId: r.id as string,
          totalScore: r.total_score as number,
          premiumScore: r.premium_score as number,
          thetaScore: r.theta_score as number,
          strikeScore: r.strike_score as number,
          dteScore: r.dte_score as number
        } : undefined
      } as HistoricalOptionData;
    });
  }

  /**
   * Get top performing options for a symbol over time
   */
  async getTopPerformingOptions(
    symbol: string,
    days: number = 30,
    limit: number = 10
  ): Promise<HistoricalOptionData[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const stmt = this.db.prepare(`
      SELECT 
        os.*,
        ss.symbol, ss.current_price, ss.fetched_at, ss.source,
        oss.total_score, oss.premium_score, oss.theta_score, 
        oss.strike_score, oss.dte_score
      FROM option_snapshots os
      JOIN stock_snapshots ss ON os.snapshot_id = ss.id
      JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE ss.symbol = ? AND ss.created_at >= ?
      ORDER BY oss.total_score DESC
      LIMIT ?
    `);
    
    const result = await stmt.bind(
      symbol.toUpperCase(),
      cutoffDate.toISOString(),
      limit
    ).all();
    
    return result.results.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        snapshotId: r.snapshot_id as string,
        contractName: r.contract_name as string,
        strike: r.strike as number,
        lastPrice: r.last_price as number,
        bid: r.bid as number,
        ask: r.ask as number,
        volume: r.volume as number,
        openInterest: r.open_interest as number,
        expirationDate: r.expiration_date as string,
        impliedVolatility: r.implied_volatility as number,
        delta: r.delta as number | undefined,
        gamma: r.gamma as number | undefined,
        theta: r.theta as number | undefined,
        createdAt: r.created_at as string,
        stockSnapshot: {
          id: r.snapshot_id as string,
          symbol: r.symbol as string,
          currentPrice: r.current_price as number,
          fetchedAt: r.fetched_at as string,
          source: r.source as string
        },
        score: {
          id: '',
          optionSnapshotId: r.id as string,
          totalScore: r.total_score as number,
          premiumScore: r.premium_score as number,
          thetaScore: r.theta_score as number,
          strikeScore: r.strike_score as number,
          dteScore: r.dte_score as number
        }
      } as HistoricalOptionData;
    });
  }

  /**
   * Get performance summary for a symbol
   */
  async getStockPerformanceData(symbol: string, days: number = 30): Promise<StockPerformanceData> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const stmt = this.db.prepare(`
      SELECT 
        DATE(ss.created_at) as date,
        ss.current_price,
        MAX(oss.total_score) as top_option_score,
        COUNT(os.id) as option_count
      FROM stock_snapshots ss
      LEFT JOIN option_snapshots os ON ss.id = os.snapshot_id
      LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE ss.symbol = ? AND ss.created_at >= ?
      GROUP BY DATE(ss.created_at), ss.current_price
      ORDER BY date DESC
    `);
    
    const result = await stmt.bind(symbol.toUpperCase(), cutoffDate.toISOString()).all();
    
    return {
      symbol: symbol.toUpperCase(),
      snapshots: result.results.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          date: r.date as string,
          currentPrice: r.current_price as number,
          topOptionScore: (r.top_option_score as number) || 0,
          optionCount: r.option_count as number
        };
      })
    };
  }
}
````

## File: src/services/optionsService.ts
````typescript
import { DatabaseService } from './database_service';
import { OptionScorer } from '../utils/optionScorer';
import YahooFinance from 'yahoo-finance2';

export interface OptionData {
  contractName: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  expirationDate: string;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
}

interface YahooOptionData {
  percentChange?: number;
  openInterest?: number;
  strike: number;
  change?: number;
  inTheMoney: boolean;
  impliedVolatility?: number;
  volume?: number;
  ask?: number;
  contractSymbol: string;
  lastTradeDate?: Date;
  expiration?: Date;
  contractSize?: string;
  currency?: string;
  bid?: number;
  lastPrice?: number;
}



export class OptionsService {
  private static instance: OptionsService;
  private dbService: DatabaseService | null = null;

  private constructor() {
    // Yahoo Finance doesn't require an API key
  }

  static getInstance(db?: D1Database): OptionsService {
    if (!this.instance) {
      this.instance = new OptionsService();
    }
    if (db && !this.instance.dbService) {
      this.instance.dbService = DatabaseService.getInstance(db);
    }
    return this.instance;
  }

  // Set database service for dependency injection
  setDatabase(db: D1Database): void {
    this.dbService = DatabaseService.getInstance(db);
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Get basic options data to retrieve current price from quote
      const data = await YahooFinance.options(symbol, { formatted: true });
      const currentPrice = data.quote?.regularMarketPrice ?? 0;
      
      return currentPrice;
    } catch (error) {
      console.error('Error fetching current price:', error);
      return 0;
    }
  }

  async fetchOptionsData(symbol: string): Promise<{ options: OptionData[]; currentPrice: number; error?: string }> {
    try {
      // Get base options data to retrieve current price and available expiration dates
      const baseData = await YahooFinance.options(symbol, { formatted: true });
      const currentPrice = baseData.quote?.regularMarketPrice ?? 0;

      // Get Friday expiration dates within 90 days
      const fridayDates = this.getFridayExpirationDates();
      
      // Fetch options data for each Friday expiration date
      const allOptions: OptionData[] = [];
      
      for (const date of fridayDates) {
        try {
          const dateOptionsData = await YahooFinance.options(symbol, {
            date: date,
            formatted: true,
          });
          
          if (dateOptionsData.options[0]?.puts) {
            const transformedOptions = this.transformYahooOptionsData(
              dateOptionsData.options[0].puts, 
              currentPrice,
              date
            );
            allOptions.push(...transformedOptions);
          }
        } catch (dateError) {
          console.error(`Error fetching options for date ${date.toISOString().split('T')[0]}:`, dateError);
          // Continue with other dates even if one fails
        }
      }

      // Save to database if available
      if (this.dbService && allOptions.length > 0) {
        try {
          const scores = allOptions.map(option => 
            OptionScorer.calculateScore(option, currentPrice)
          );
          
          await this.dbService.saveCompleteSnapshot(
            symbol,
            currentPrice,
            allOptions,
            scores
          );
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
          // Continue execution even if database save fails
        }
      }

      return { options: allOptions, currentPrice };
    } catch (error) {
      console.error('Error fetching options data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        options: [], 
        currentPrice: 0, 
        error: `Failed to fetch options data: ${errorMessage}` 
      };
    }
  }

  private getFridayExpirationDates(): Date[] {
    const today = new Date();
    
    // Find the next Friday
    const daysUntilNextFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today.getTime() + (daysUntilNextFriday * 24 * 60 * 60 * 1000));
    
    // Generate the next 5 Fridays
    const fridayDates: Date[] = [];
    for (let i = 0; i < 10; i++) {
      let fridayDate = new Date(nextFriday.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      fridayDate = new Date(fridayDate.toISOString().split('T')[0]);
      fridayDates.push(fridayDate);
    }
    return fridayDates;
  }

  private transformYahooOptionsData(puts: YahooOptionData[], currentPrice: number, expirationDate: Date): OptionData[] {
    const priceRange = {
      min: currentPrice * 0.9,
      max: currentPrice * 1.1
    };

    return puts
      .filter(option => {
        // Ensure we have valid strike price and some bid/ask data
        return option.strike >= priceRange.min && 
               option.strike <= priceRange.max &&
               (option.bid ?? 0) > 0; // Only include options with meaningful bid prices
      })
      .map((option): OptionData => {
        // Estimate theta based on time decay if not provided
        // This is a rough estimation: theta ≈ -option premium / days to expiry / 365
        const daysToExpiry = Math.ceil(
          (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const estimatedTheta = daysToExpiry > 0 ? 
          -((option.bid ?? 0) / daysToExpiry / 365) : undefined;

        return {
          contractName: option.contractSymbol,
          strike: option.strike,
          lastPrice: option.lastPrice ?? 0,
          bid: option.bid ?? 0,
          ask: option.ask ?? 0,
          volume: option.volume ?? 0,
          openInterest: option.openInterest ?? 0,
          expirationDate: expirationDate.toISOString(),
          impliedVolatility: option.impliedVolatility ?? 0,
          delta: undefined, // Yahoo Finance doesn't provide Greeks in basic response
          gamma: undefined,
          theta: estimatedTheta // Use estimated theta for scoring
        };
      });
  }



  // Database query methods
  async getHistoricalSnapshots(symbol: string, limit: number = 10) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getRecentSnapshots(symbol, limit);
  }

  async getOptionsForSnapshot(snapshotId: string) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getOptionsForSnapshot(snapshotId);
  }

  async getTopPerformingOptions(symbol: string, days: number = 30, limit: number = 10) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getTopPerformingOptions(symbol, days, limit);
  }

  async getStockPerformanceData(symbol: string, days: number = 30) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getStockPerformanceData(symbol, days);
  }
}
````

## File: src/styles/global.css
````css
@tailwind base;
@tailwind components;
@tailwind utilities;
````

## File: src/styles/optionIndicators.css
````css
.theta-excellent,
.theta-good,
.theta-moderate,
.theta-weak,
.theta-unfavorable {
  border-radius: 6px;
  padding: 4px 8px;
  font-weight: 800;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.2),
              0 1px 2px rgba(0, 0, 0, 0.1);
}

.theta-excellent {
  color: #064e3b;
  background-color: #34d399;
  border: 1px solid #059669;
}

.theta-good {
  color: #134e4a;
  background-color: #2dd4bf;
  border: 1px solid #0d9488;
}

.theta-moderate {
  color: #164e63;
  background-color: #22d3ee;
  border: 1px solid #0891b2;
}

.theta-weak {
  color: #1f2937;
  background-color: #d1d5db;
  border: 1px solid #9ca3af;
}

.theta-unfavorable {
  color: #ffffff;
  background-color: #ef4444;
  border: 1px solid #dc2626;
  text-shadow: 0 1px 2px rgba(127, 29, 29, 0.5);
}

/* Hover effects */
.theta-excellent:hover,
.theta-good:hover,
.theta-moderate:hover,
.theta-weak:hover,
.theta-unfavorable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

/* ... rest of the theta and score styles ... */
````

## File: src/styles/optionRow.css
````css
/* Score cell styling */
.score-cell {
  padding: 0.5rem !important;
  text-align: center !important;
}

.score-value {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.2rem;
}

.score-breakdown {
  display: flex;
  gap: 0.3rem;
  font-size: 0.7rem;
  justify-content: center;
  color: #666;
}

/* Score colors */
.score-excellent .score-value { color: #059669; }
.score-good .score-value { color: #0891b2; }
.score-moderate .score-value { color: #b45309; }
.score-weak .score-value { color: #9ca3af; }
.score-poor .score-value { color: #dc2626; }

/* Row background colors */
tr.score-excellent { background-color: rgba(5, 150, 105, 0.1) !important; }
tr.score-good { background-color: rgba(8, 145, 178, 0.1) !important; }
tr.score-moderate { background-color: rgba(180, 83, 9, 0.1) !important; }
tr.score-weak { background-color: rgba(156, 163, 175, 0.1) !important; }
tr.score-poor { background-color: rgba(220, 38, 38, 0.1) !important; }

/* Row hover states */
tr:hover.score-excellent { background-color: rgba(5, 150, 105, 0.2) !important; }
tr:hover.score-good { background-color: rgba(8, 145, 178, 0.2) !important; }
tr:hover.score-moderate { background-color: rgba(180, 83, 9, 0.2) !important; }
tr:hover.score-weak { background-color: rgba(156, 163, 175, 0.2) !important; }
tr:hover.score-poor { background-color: rgba(220, 38, 38, 0.2) !important; }

/* Strike price styling */
.in-the-money {
  color: #2563eb;
  font-weight: 600;
}

.out-of-the-money {
  color: #dc2626;
  font-weight: 600;
}

/* Premium styling */
.premium-high {
  background-color: rgba(34, 197, 94, 0.2) !important;
}

.premium-high:hover {
  background-color: rgba(34, 197, 94, 0.3) !important;
}

.premium-medium {
  background-color: rgba(245, 158, 11, 0.2) !important;
}

.premium-medium:hover {
  background-color: rgba(245, 158, 11, 0.3) !important;
}

.premium-low {
  background-color: rgba(239, 68, 68, 0.2) !important;
}

.premium-low:hover {
  background-color: rgba(239, 68, 68, 0.3) !important;
}
````

## File: src/styles/optionsGroup.css
````css
.expiry-group {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  overflow: hidden;
}

.expiry-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.expiry-header:hover {
  background: #f1f5f9;
}

.days-to-expiry, .contract-count {
  color: #6b7280;
  font-size: 0.875rem;
}

.options-details {
  background: white;
  overflow-x: auto;
}

.options-details.hidden {
  display: none;
}
````

## File: src/styles/optionsTable.css
````css
/* Options table main styling */
.options-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background-color: white;
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
}

.options-table thead th {
  background-color: #f1f5f9;
  color: #475569;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem;
  text-align: center;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
}

.options-table tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s;
}

.options-table tbody tr:hover {
  background-color: #f8fafc;
}

.options-table tbody tr:last-child {
  border-bottom: none;
}

.options-table tbody td {
  padding: 0.75rem 1rem;
  text-align: center;
  vertical-align: middle;
}

/* Column-specific styling */
.options-table td:nth-child(1) {
  font-weight: 600;
  border-right: 1px solid #f1f5f9;
}

.options-table td:nth-child(2),
.options-table td:nth-child(3) {
  font-variant-numeric: tabular-nums;
}

.options-table td:nth-child(3),
.options-table td:nth-child(4),
.options-table td:nth-child(5) {
  font-family: monospace;
  font-size: 0.9rem;
}

.options-table td:nth-child(9),
.options-table td:nth-child(10) {
  font-weight: 600;
  color: #1e40af;
}

/* Zebra striping for better readability */
.options-table tbody tr:nth-child(even) {
  background-color: #f9fafb;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .options-table {
    font-size: 0.75rem;
  }
  
  .options-table thead th,
  .options-table tbody td {
    padding: 0.5rem;
  }
}
````

## File: src/types/database.ts
````typescript
import type { OptionData, OptionScore } from './option';

export interface StockSnapshot {
  id: string;
  symbol: string;
  currentPrice: number;
  fetchedAt: string; // ISO timestamp
  source: string; // e.g., 'finnhub'
  createdAt?: string;
}

export interface OptionSnapshot {
  id: string;
  snapshotId: string; // foreign key to StockSnapshot
  contractName: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  expirationDate: string;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  createdAt?: string;
}

export interface OptionScoreSnapshot {
  id: string;
  optionSnapshotId: string; // foreign key to OptionSnapshot
  totalScore: number;
  premiumScore: number;
  thetaScore: number;
  strikeScore: number;
  dteScore: number;
  createdAt?: string;
}

export interface CreateStockSnapshotParams {
  symbol: string;
  currentPrice: number;
  source?: string;
}

export interface CreateOptionSnapshotParams extends Omit<OptionData, 'contractName'> {
  snapshotId: string;
  contractName: string;
}

export interface CreateOptionScoreSnapshotParams extends OptionScore {
  optionSnapshotId: string;
}

export interface HistoricalOptionData extends OptionSnapshot {
  stockSnapshot: StockSnapshot;
  score?: OptionScoreSnapshot;
}

export interface StockPerformanceData {
  symbol: string;
  snapshots: Array<{
    date: string;
    currentPrice: number;
    topOptionScore: number;
    optionCount: number;
  }>;
}
````

## File: src/types/option.ts
````typescript
export interface OptionData {
  contractName: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  expirationDate: string;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
}

export interface ScoredOption extends OptionData {
  score: OptionScore;
}

export interface OptionScore {
  total: number;
  premiumScore: number;
  thetaScore: number;
  strikeScore: number;
  dteScore: number;
  ivScore: number;
  liquidityScore: number;
  spreadPenalty: number;
}

export interface GroupedOption {
  expiryDate: string;
  rawExpiryDate: string;
  daysToExpiry: number;
  options: OptionData[];
}

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export interface StockOptionsData {
  symbol: string;
  options: OptionData[];
  currentPrice: number;
  error?: string;
}
````

## File: src/utils/optionScorer.ts
````typescript
import type { OptionScore } from '../types/option';

// Adjusted weights to sum to 100 for better score distribution
const SCORE_WEIGHT = {
  PREMIUM: 25,    // Premium as percentage of strike price
  THETA: 20,      // Time decay rate (theta)
  STRIKE: 15,     // Strike distance from current price
  DTE: 15,        // Days till expiration
  IV: 15,         // Implied Volatility
  LIQUIDITY: 10,  // Volume and open interest
} as const;

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export class OptionScorer {
  /**
   * Evaluates the premium as a percentage of strike price
   * Uses a logarithmic function to prevent excessive scaling
   * Max score (25) reached around 5% premium with diminishing returns
   */
  private static calculatePremiumScore(premiumPct: number): number {
    // Cap at 10% premium to prevent unrealistic scores
    const cappedPct = Math.min(premiumPct, 10);
    return Math.min(SCORE_WEIGHT.PREMIUM, Math.log1p(cappedPct) * 8);
  }

  /**
   * Evaluates the rate of time decay (theta)
   * More negative theta = better score (faster time decay)
   * Properly bounded to max score of 20
   */
  private static calculateThetaScore(theta?: number): number {
    if (!theta) return 0;
    
    // Normalize theta to a reasonable range (-0.1 to 0)
    const normalizedTheta = Math.max(-0.1, Math.min(0, theta));
    // Convert to positive scale and bound to max score
    return Math.min(SCORE_WEIGHT.THETA, Math.abs(normalizedTheta) * 200);
  }

  /**
   * Evaluates how far the strike price is from current price
   * Closer to current price = better score
   * Each 1% away from current price reduces score by 1.5 points
   */
  private static calculateStrikeScore(strikeDistance: number): number {
    return Math.max(0, SCORE_WEIGHT.STRIKE - (strikeDistance * 150));
  }

  /**
   * Evaluates the days till expiration (DTE)
   * Optimal range is 30-45 DTE with peak at 35-40
   * Gradual decay outside optimal range
   */
  private static calculateDteScore(dte: number): number {
    const maxScore = SCORE_WEIGHT.DTE;

    if (dte < 25) {
      // Too close to expiration - rapid score decay
      return Math.max(0, maxScore - (25 - dte) * 1.5);
    } else if (dte > 50) {
      // Too far from expiration - gradual score decay
      return Math.max(0, maxScore - (dte - 50) * 0.5);
    } else if (dte >= 30 && dte <= 45) {
      // Optimal range - full score with slight variation
      return maxScore - Math.abs(dte - 37.5) * 0.2;
    } else {
      // Transition zones - linear interpolation
      if (dte < 30) {
        return maxScore - (30 - dte) * 0.8;
      } else {
        return maxScore - (dte - 45) * 0.8;
      }
    }
  }

  /**
   * Evaluates the implied volatility (IV)
   * Higher IV leads to higher premiums, which is favorable for sellers
   * Max score for IV >= 60% with diminishing returns
   */
  private static calculateIvScore(iv: number): number {
    // Cap IV at 100% to prevent unrealistic scores
    const cappedIv = Math.min(iv, 100);
    // Use square root for diminishing returns, max at 60% IV
    return Math.min(SCORE_WEIGHT.IV, (cappedIv / 60) * SCORE_WEIGHT.IV);
  }

  /**
   * Evaluates liquidity based on volume and open interest
   * Uses a logarithmic scale with proper bounds
   */
  private static calculateLiquidityScore(volume?: number, openInterest?: number): number {
    const vol = volume || 0;
    const oi = openInterest || 0;
    
    // Combine volume and open interest with more weight on open interest
    const liquidityMetric = Math.log1p(oi * 0.8 + vol * 0.2);
    
    // Scale to max score with proper bounds
    // Cap at reasonable liquidity levels to prevent excessive scoring
    const maxLiquidity = Math.log1p(10000); // Cap at 10k contracts
    const normalizedLiquidity = Math.min(liquidityMetric, maxLiquidity);
    
    return Math.min(SCORE_WEIGHT.LIQUIDITY, (normalizedLiquidity / maxLiquidity) * SCORE_WEIGHT.LIQUIDITY);
  }

  /**
   * Penalizes options with a wide bid-ask spread
   * A spread wider than 8% of the ask price will receive a penalty
   * Penalty is capped to prevent excessive score reduction
   */
  private static calculateSpreadPenalty(bid: number, ask: number): number {
    if (ask === 0) return 0;
    
    const spread = ask - bid;
    const spreadPct = spread / ask;
    
    // Penalty starts at 8% spread, max penalty of 15 points
    if (spreadPct <= 0.08) return 0;
    
    const penalty = Math.min(15, (spreadPct - 0.08) * 200);
    return penalty;
  }

  static calculateScore(option: {
    bid: number;
    ask: number;
    strike: number;
    theta?: number;
    expirationDate: string;
    impliedVolatility: number;
    volume?: number;
    openInterest?: number;
  }, currentPrice: number): OptionScore {
    const dte = Math.ceil(
      (new Date(option.expirationDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const premiumPct = (option.bid / option.strike) * 100;
    const strikeDistance = Math.abs(1 - (option.strike / currentPrice));

    const premiumScore = this.calculatePremiumScore(premiumPct);
    const thetaScore = this.calculateThetaScore(option.theta);
    const strikeScore = this.calculateStrikeScore(strikeDistance);
    const dteScore = this.calculateDteScore(dte);
    const ivScore = this.calculateIvScore(option.impliedVolatility);
    const liquidityScore = this.calculateLiquidityScore(option.volume, option.openInterest);
    const spreadPenalty = this.calculateSpreadPenalty(option.bid, option.ask);

    // Calculate total score with proper bounds
    const rawTotal = premiumScore + thetaScore + strikeScore + dteScore + ivScore + liquidityScore - spreadPenalty;
    const total = Math.max(0, Math.min(100, rawTotal));

    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      premiumScore: Math.round(premiumScore * 100) / 100,
      thetaScore: Math.round(thetaScore * 100) / 100,
      strikeScore: Math.round(strikeScore * 100) / 100,
      dteScore: Math.round(dteScore * 100) / 100,
      ivScore: Math.round(ivScore * 100) / 100,
      liquidityScore: Math.round(liquidityScore * 100) / 100,
      spreadPenalty: Math.round(spreadPenalty * 100) / 100,
    };
  }

  static getScoreClass(score: number): ScoreClass {
    if (score >= 80) return 'score-excellent';
    if (score >= 65) return 'score-good';
    if (score >= 50) return 'score-moderate';
    if (score >= 35) return 'score-weak';
    return 'score-poor';
  }
}
````

## File: src/utils/optionsUtils.ts
````typescript
import { ReturnCalculator } from './returnCalculator';
import type { OptionData, GroupedOption } from '../types/option';

export const formatContractName = (contractName: string): string => {
  // Ensure the contract name is in the expected format (e.g., 'NET250131P00135000' or 'AAPL250131P00320000')
  if (!contractName || contractName.length < 15) {
    return 'Invalid Contract';
  }

  try {
    // Find the position of 'P' to determine where the date part starts
    const pPosition = contractName.indexOf('P');
    if (pPosition === -1) {
      throw new Error('Invalid contract format');
    }

    // Extract date components - date part starts 6 characters before 'P'
    const datePart = contractName.substring(pPosition - 6, pPosition);
    const year = datePart.slice(0, 2);
    const month = datePart.slice(2, 4);
    const day = datePart.slice(4, 6);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[parseInt(month, 10) - 1];

    if (!monthStr) {
      throw new Error('Invalid month');
    }

    return `${monthStr} ${parseInt(day, 10)} '${year}`;
  } catch (error) {
    console.error('Error formatting contract name:', error, 'for contract:', contractName);
    return 'Invalid Contract';
  }
};

export const getStrikeClass = (strike: number, currentPrice: number): string => {
  return strike < currentPrice ? 'in-the-money' : 'out-of-the-money';
};

export const calculateAnnualizedPremium = (option: OptionData): number => {
  const daysToExpiry = Math.ceil(
    (new Date(option.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return ReturnCalculator.calculateAnnualizedReturn({
    premium: option.bid,
    strike: option.strike,
    daysToExpiry,
    marginRate: 0.20
  });
};

export const getPremiumClass = (option: OptionData): string => {
  const annualizedPremiumPct = calculateAnnualizedPremium(option);
  return ReturnCalculator.getReturnClass(annualizedPremiumPct);
};

export const calculateSimpleReturn = (option: OptionData): number => {
  return ReturnCalculator.calculateSimpleReturn({
    premium: option.bid,
    strike: option.strike,
    marginRate: 0.20
  });
};

export const groupOptionsByExpiry = (options: OptionData[]) => {
  
  const groups = options.reduce((acc, option) => {
    const date = new Date(option.expirationDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const expiryDate = formatContractName(option.contractName);
    const key = option.expirationDate;

    if (!acc[key]) {
      acc[key] = {
        expiryDate,
        rawExpiryDate: option.expirationDate,
        daysToExpiry,
        options: []
      };
    }
    acc[key].options.push(option);
    return acc;
  }, {} as Record<string, GroupedOption>);

  return Object.values(groups).sort((a, b) =>
    new Date(a.rawExpiryDate).getTime() - new Date(b.rawExpiryDate).getTime()
  );
};

export const getThetaClass = (theta: number | undefined): string => {
  if (!theta) return '';
  
  // From a seller's perspective:
  // More negative theta is better (faster time decay)
  if (theta <= -0.03) return 'theta-excellent';     // Very favorable decay
  if (theta <= -0.02) return 'theta-good';          // Good decay
  if (theta <= -0.01) return 'theta-moderate';      // Moderate decay
  if (theta < 0) return 'theta-weak';               // Weak decay
  return 'theta-unfavorable';                       // No decay or positive theta
};
````

## File: src/utils/returnCalculator.ts
````typescript
interface ReturnCalculatorParams {
  premium: number;      // The bid price
  strike: number;       // Strike price
  daysToExpiry: number;
  marginRate: number;   // Default to 20% (0.20)
}

export class ReturnCalculator {
  static calculateSimpleReturn({
    premium,
    strike,
    marginRate = 0.20
  }: Omit<ReturnCalculatorParams, 'daysToExpiry'>): number {
    // Input validation
    if (strike <= 0 || premium <= 0) return 0;
    if (marginRate <= 0 || marginRate > 1) return 0;

    // Calculate required collateral based on margin rate
    const requiredCollateral = strike * marginRate;

    // Calculate simple return (premium / required collateral) as percentage
    return (premium / requiredCollateral) * 100;
  }

  static calculateAnnualizedReturn({
    premium,
    strike,
    daysToExpiry,
    marginRate = 0.20
  }: ReturnCalculatorParams): number {
    // Input validation
    if (daysToExpiry <= 0 || strike <= 0 || premium <= 0) return 0;
    if (marginRate <= 0 || marginRate > 1) return 0;

    // Calculate required collateral based on margin rate
    const requiredCollateral = strike * marginRate;

    // Calculate simple return as decimal
    const simpleReturn = premium / requiredCollateral;

    // Annualize using (simple return × 365 / days to expiry)
    const annualizedReturn = simpleReturn * (365 / daysToExpiry) * 100;

    // Round to 2 decimal places
    return Math.round(annualizedReturn * 100) / 100;
  }

  static getReturnClass(annualizedReturn: number): string {
    if (annualizedReturn >= 15) {
      return 'premium-high';
    } else if (annualizedReturn >= 8) {
      return 'premium-medium';
    }
    return 'premium-low';
  }
}
````

## File: src/env.d.ts
````typescript
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Augment Astro.locals to include Cloudflare runtime types when available
declare namespace App {
  interface Locals {
    runtime?: {
      env?: Record<string, unknown> & { DB?: D1Database };
    };
  }
}
````

## File: .assetsignore
````
# Exclude worker files from static assets
_worker.js
_worker.js.map

# Exclude build artifacts that shouldn't be served as static assets
*.log
*.tmp
.DS_Store
.env*

# Exclude any test files
*.test.*
*.spec.*

# DO NOT exclude CSS and JS files - they need to be served
# *.css - commented out to allow CSS files
# *.js - commented out to allow JS files
````

## File: .cursorrules
````
You are an expert in JavaScript, TypeScript, and Astro framework for scalable web development.

  Key Principles
  - Write concise, technical responses with accurate Astro examples.
  - Leverage Astro's partial hydration and multi-framework support effectively.
  - Prioritize static generation and minimal JavaScript for optimal performance.
  - Use descriptive variable names and follow Astro's naming conventions.
  - Organize files using Astro's file-based routing system.

  Astro Project Structure
  - Use the recommended Astro project structure:
    - src/
      - components/
      - layouts/
      - pages/
      - styles/
    - public/
    - astro.config.mjs

  Component Development
  - Create .astro files for Astro components.
  - Use astro components when possible
  - Implement proper component composition and reusability.
  - Use Astro's component props for data passing.
  - Leverage Astro's built-in components like <Markdown /> when appropriate.

  Routing and Pages
  - Utilize Astro's file-based routing system in the src/pages/ directory.
  - Implement dynamic routes using [...slug].astro syntax.
  - Use getStaticPaths() for generating static pages with dynamic routes.
  - Implement proper 404 handling with a 404.astro page.


  Styling
  - Use Astro's scoped styling with <style> tags in .astro files.
  - Leverage global styles when necessary, importing them in layouts.
  - Utilize CSS preprocessing with Sass or Less if required.
  - Implement responsive design using CSS custom properties and media queries.

  Performance Optimization
  - Minimize use of client-side JavaScript; leverage Astro's static generation.
  - Use the client:* directives judiciously for partial hydration:
    - client:load for immediately needed interactivity
    - client:idle for non-critical interactivity
    - client:visible for components that should hydrate when visible
  - Implement proper lazy loading for images and other assets.
  - Utilize Astro's built-in asset optimization features.

  Data Fetching
  - Use Astro.props for passing data to components.
  - Implement getStaticPaths() for fetching data at build time.
  - Use Astro.glob() for working with local files efficiently.
  - Implement proper error handling for data fetching operations.

  SEO and Meta Tags
  - Use Astro's <head> tag for adding meta information.
  - Implement canonical URLs for proper SEO.
  - Use the <SEO> component pattern for reusable SEO setups.

  Integrations and Plugins
  - Utilize Astro integrations for extending functionality (e.g., @astrojs/image).
  - Implement proper configuration for integrations in astro.config.mjs.
  - Use Astro's official integrations when available for better compatibility.

  Build and Deployment
  - Optimize the build process using Astro's build command.
  - Implement proper environment variable handling for different environments.
  - Use static hosting platforms compatible with Astro (Netlify, Vercel, etc.).
  - Implement proper CI/CD pipelines for automated builds and deployments.

  Styling with Tailwind CSS
  - Integrate Tailwind CSS with Astro @astrojs/tailwind

  Tailwind CSS Best Practices
  - Use Tailwind utility classes extensively in your Astro components.
  - Leverage Tailwind's responsive design utilities (sm:, md:, lg:, etc.).
  - Utilize Tailwind's color palette and spacing scale for consistency.
  - Implement custom theme extensions in tailwind.config.cjs when necessary.
  - Never use the @apply directive

  Testing
  - Implement unit tests for utility functions and helpers.
  - Use end-to-end testing tools like Cypress for testing the built site.
  - Implement visual regression testing if applicable.

  Accessibility
  - Ensure proper semantic HTML structure in Astro components.
  - Implement ARIA attributes where necessary.
  - Ensure keyboard navigation support for interactive elements.

  Key Conventions
  1. Follow Astro's Style Guide for consistent code formatting.
  2. Use TypeScript for enhanced type safety and developer experience.
  3. Implement proper error handling and logging.
  4. Leverage Astro's RSS feed generation for content-heavy sites.
  5. Use Astro's Image component for optimized image delivery.

  Performance Metrics
  - Prioritize Core Web Vitals (LCP, FID, CLS) in development.
  - Use Lighthouse and WebPageTest for performance auditing.
  - Implement performance budgets and monitoring.

  Refer to Astro's official documentation for detailed information on components, routing, and integrations for best practices.
````

## File: .eslintrc.cjs
````
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['plugin:astro/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 'latest'
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro']
      },
       rules: {
    'quotes': ['error', 'single', 'avoid-escape'],
    'semi': ['error', 'always'],
    'no-restricted-imports': ['error'],
    'curly': 'error',
    'eol-last': 'error',
    // Disable indent rule for Astro files due to mixed content causing stack overflow
    'indent': 'off',
    'no-bitwise': 'error',
    'no-dupe-args': 'error',
    'prefer-const': 'error',
    'no-empty': 'error',
    'no-var': 'error',
    'no-eval': 'error',
    'no-trailing-spaces': 'error',
    'no-fallthrough': 'error',
    'no-multiple-empty-lines': 'error',
    'max-len': ['error', 175],
    'max-lines': ['error', 225],
    'max-depth': ['error', 3],
    'no-duplicate-case': 'error',
    'complexity': ['error', 10],
    'brace-style': [
      'error',
      '1tbs',
      {
        'allowSingleLine': true
      }
    ],
    'no-multi-spaces': 'error',
    'no-unreachable': 'error',
    'no-unneeded-ternary': 'error',
    'no-extra-semi': 'error'
  }
    }
  ]
}
````

## File: .gitignore
````
# build output
dist/

# generated types
.astro/
.wrangler/

# dependencies
node_modules/

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# environment variables
.env
.env.production

# macOS-specific files
.DS_Store

# jetbrains setting folder
.idea/
````

## File: .npmrc
````
@sferg989:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_GH_TOKEN}
always-auth=true
````

## File: .nvmrc
````
22.11
````

## File: astro.config.mjs
````
import {defineConfig} from "astro/config";
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// Determine if we're in local development or production
const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.CF_PAGES;

export default defineConfig({
  adapter: cloudflare(
    isLocalDev ? {
      // Local development configuration with hardcoded bindings
      runtime: {
        mode: 'local',
        type: 'pages',
        bindings: {
          DB: {
            type: 'd1',
            database_id: 'a89f41ce-342e-4711-8aec-ab0d6f8fdaca',
            database_name: 'options-tracker-local'
          }
        }
      }
    } : {
      // Production configuration for Workers deployment
      runtime: {
        mode: 'remote',
        type: 'module'
      },
      // Ensure assets are properly configured for Workers
      imageService: 'passthrough',
      platformProxy: {
        enabled: true
      },
      routes: {
        strategy: 'auto'
      }
    }
  ),
  output: 'server',
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
    build: {
      // Ensure CSS is properly bundled for Workers
      cssCodeSplit: false,
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Ensure consistent asset naming
          assetFileNames: '_astro/[name].[hash][extname]'
        }
      }
    }
  },
  integrations: [
    tailwind({
      // Ensure Tailwind CSS is properly optimized for production
      applyBaseStyles: true,
      config: {
        content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}']
      }
    })
  ],
  build: {
    // Ensure proper asset handling in production
    inlineStylesheets: 'never',
    assets: '_astro'
  }
})
````

## File: DATABASE_SETUP.md
````markdown
# Options Tracker Database Setup

## Overview
The application now includes a Cloudflare D1 database to store and track historical options data. This allows you to analyze performance trends and track option scores over time.

## Database Information
- **Database Name**: `options-tracker`
- **Database ID**: `06cd1245-d0de-4491-be4b-4f1e7c2de1f3`
- **Binding Name**: `DB`

## Database Schema

### Tables Created:
1. **stock_snapshots** - Stores stock price and metadata at each fetch
2. **option_snapshots** - Stores individual option data for each stock snapshot
3. **option_score_snapshots** - Stores calculated scores for each option

### Views Created:
1. **option_data_with_scores** - Easy querying of complete option data with scores
2. **stock_performance_summary** - Performance tracking over time

## Features Added

### Automatic Data Persistence
- Every time you fetch options data, it's automatically saved to the database
- Option scores are calculated and stored alongside the raw data
- Timestamps are preserved for historical analysis

### New API Endpoints

#### `/api/historical-snapshots`
Get recent data snapshots for a symbol
- **Parameters**: `symbol` (required), `limit` (optional, default: 10)
- **Example**: `/api/historical-snapshots?symbol=AAPL&limit=5`

#### `/api/top-performing-options`
Get top performing options for a symbol over time
- **Parameters**: `symbol` (required), `days` (optional, default: 30), `limit` (optional, default: 10)
- **Example**: `/api/top-performing-options?symbol=AAPL&days=30&limit=10`

#### `/api/stock-performance`
Get performance summary for a symbol
- **Parameters**: `symbol` (required), `days` (optional, default: 30)
- **Example**: `/api/stock-performance?symbol=AAPL&days=30`

### UI Enhancements
- Added historical data view on the main page
- Shows recent snapshots, top performing options, and performance trends
- Automatically loads when viewing a stock symbol

## Usage

### Viewing Historical Data
1. Search for any stock symbol (e.g., AAPL, TSLA, etc.)
2. The current options data will be displayed and automatically saved to the database
3. Scroll down to see the "Historical Performance" section
4. View recent snapshots, top options, and performance trends

### API Usage
You can directly call the API endpoints to get historical data:

```javascript
import { RestService } from '@sferg989/astro-utils';

const restService = RestService.Instance();

// Get recent snapshots
const snapshotsResponse = await restService.Get('/api/historical-snapshots?symbol=AAPL');
const snapshots = snapshotsResponse.body;

// Get top performing options
const topOptionsResponse = await restService.Get('/api/top-performing-options?symbol=AAPL&days=30');
const topOptions = topOptionsResponse.body;

// Get performance data
const performanceResponse = await restService.Get('/api/stock-performance?symbol=AAPL');
const performance = performanceResponse.body;
```

## Development Setup

### Local Development
The database is automatically configured in `wrangler.toml` and `astro.config.mjs`.

### Database Migrations
The initial schema has been applied. The migration file is located at:
- `src/migrations/001_initial_schema.sql`

## Data Flow

1. **User searches for a stock** → Options data fetched from Finnhub API
2. **Data processing** → Options filtered and scores calculated
3. **Database storage** → Complete snapshot saved with timestamps
4. **UI display** → Current data shown + historical data loaded via API
5. **Analysis** → Track performance trends over time

## Benefits

- **Historical Analysis**: Track how option scores change over time
- **Performance Tracking**: See which stocks consistently have high-scoring options
- **Trend Analysis**: Understand market patterns for your preferred stocks
- **Data Persistence**: Never lose valuable options data again
- **API Access**: Build custom dashboards or analysis tools

## Next Steps

You can now:
1. Start collecting data by searching for your favorite stocks
2. Build custom analysis pages using the API endpoints
3. Add more sophisticated charting and visualization
4. Implement alerts based on historical patterns
5. Export data for external analysis tools

The database will automatically grow as you use the application, building a valuable historical dataset of options performance over time.
````

## File: DEV_SETUP.md
````markdown
# Development Setup Guide

This guide will help you set up the local development environment for the Options Tracker application.

## Prerequisites

- Node.js 22.11 (check `.nvmrc`)
- npm or pnpm
- Cloudflare Wrangler CLI

## Quick Setup

1. **Install Node.js version**:
   ```bash
   nvm use
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

4. **Setup local database**:
   ```bash
   ./setup-local-db.sh
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## Database Configuration

### Local Development
- Uses local SQLite database via Cloudflare D1 local mode
- Database name: `options-tracker-local`
- Database ID: `a89f41ce-342e-4711-8aec-ab0d6f8fdaca`

### Production
- Uses Cloudflare D1 production database
- Database name: `options-tracker`
- Configured in `wrangler.toml` under `[env.production]`

## Environment Variables

Create a `.env` file with your Finnhub API key:
```
PUBLIC_FINNHUB_API_KEY=your_api_key_here
```

## Database Management

### View local database contents:
```bash
wrangler d1 execute options-tracker-local --local --command="SELECT * FROM stock_snapshots LIMIT 5;"
```

### Apply new migrations:
```bash
wrangler d1 migrations apply options-tracker-local --local
```

### Reset local database:
```bash
wrangler d1 migrations apply options-tracker-local --local --file=src/migrations/001_initial_schema.sql
```

## Troubleshooting

### Issue: "Database not available" errors
1. Make sure the local database is created: `./setup-local-db.sh`
2. Check that wrangler is properly configured
3. Verify the database binding in `astro.config.mjs`

### Issue: Caching problems on /preferred page
- The app now uses intelligent caching - parallel requests when using cache, sequential with delays only when forcing refresh
- Cache duration is 60 minutes
- Use the "Refresh All Data" button to force refresh

### Issue: Historical data not showing
1. Check browser console for API errors
2. Verify database has data: see database management commands above
3. Check that the D1 binding is working properly

## Development Features

### Caching Strategy
- **Normal load**: Parallel requests leverage caching for fast loading
- **Force refresh**: Sequential requests with 2-second delays to avoid rate limits
- Cache shows timestamp and indicates if data is cached

### Database Features
- Automatic data persistence when fetching options
- Historical snapshots tracking
- Performance analysis over time
- Top performing options tracking

### API Endpoints
- `/api/stock-options` - Current options data
- `/api/historical-snapshots` - Recent data snapshots
- `/api/top-performing-options` - Best performing options over time
- `/api/stock-performance` - Performance summary

## Production Deployment

The app is configured for Cloudflare Pages with D1 database.

1. Set up production database in Cloudflare dashboard
2. Update `wrangler.toml` with correct database ID
3. Deploy via `npm run build`

## File Structure

```
src/
├── components/          # Astro components
├── layouts/            # Page layouts
├── pages/              # Routes and API endpoints
├── services/           # Business logic
├── types/              # TypeScript types
├── utils/              # Utility functions
├── styles/             # CSS files
└── migrations/         # Database migrations
```
````

## File: package.json
````json
{
  "name": "fergfo-com",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "lint": "eslint --fix \"src/**/*.{js,ts,jsx,tsx,astro}\"",
    "all": "astro check && eslint --fix \"src/**/*.{js,ts,jsx,tsx,astro}\"",
    "astro:check": "astro check",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.4",
    "@astrojs/cloudflare": "^12.2.1",
    "@astrojs/sitemap": "^3.2.1",
    "@sferg989/astro-utils": "^1.5.0",
    "astro": "^5.0.2",
    "graphql-request": "^7.1.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.5.4",
    "yahoo-finance2": "^2.13.3"
  },
  "devDependencies": {
    "@astrojs/tailwind": "^6.0.0",
    "@cloudflare/workers-types": "^4.20241218.0",
    "@types/jsdom": "^21.1.7",
    "@typescript-eslint/eslint-plugin": "^8.11.0",
    "@typescript-eslint/parser": "^8.2.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.0",
    "eslint-plugin-astro": "^1.2.3",
    "eslint-plugin-jsx-a11y": "^6.9.0",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17"
  }
}
````

## File: README.md
````markdown
# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
````

## File: setup-local-db.sh
````bash
#!/bin/bash

# Setup script for local D1 database development
echo "Setting up local D1 database for options-tracker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Create local D1 database (if it doesn't exist)
echo "Creating local D1 database..."
if ! wrangler d1 list | grep -q "options-tracker-local"; then
    wrangler d1 create options-tracker-local
else
    echo "Database options-tracker-local already exists"
fi

# Apply migrations
echo "Applying database migrations..."
wrangler d1 migrations apply options-tracker-local --local

echo "Local database setup completed!"
echo ""
echo "To run the development server with the local database:"
echo "npm run dev"
echo ""
echo "To view the local database:"
echo "wrangler d1 execute options-tracker-local --local --command='SELECT * FROM stock_snapshots LIMIT 5;' --json"
echo ""
echo "Database ID created: $(wrangler d1 list | grep options-tracker-local | cut -d' ' -f1 2>/dev/null || echo 'Check wrangler d1 list')"
````

## File: tailwind.config.mjs
````
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
````

## File: tsconfig.json
````json
{
  "extends": "astro/tsconfigs/strict",
  "include": [
    ".astro/types.d.ts",
    "**/*"
  ],
  "exclude": [
    "dist"
  ]
}
````

## File: wrangler.jsonc
````
{
  "name": "fergfo-com",
  "main": "./dist/_worker.js",
  "compatibility_date": "2025-07-24",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash"
  },
  "observability": {
    "enabled": true
  },
  "routes": [
    {
      "pattern": "fergfo.com",
      "custom_domain": true
    },
    {
      "pattern": "www.fergfo.com",
      "custom_domain": true
    }
  ],

  "env": {
    "production": {
      "account_id": "bf9a1ae5b7974b7510d15e0d5b6a8ebc",
      "routes": [
        {
          "pattern": "fergfo.com",
          "custom_domain": true
        },
        {
          "pattern": "www.fergfo.com",
          "custom_domain": true
        }
      ],
      "assets": {
        "directory": "./dist",
        "binding": "ASSETS",
        "html_handling": "auto-trailing-slash"
      },
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "options-tracker",
          "database_id": "06cd1245-d0de-4491-be4b-4f1e7c2de1f3",
          "migrations_dir": "src/migrations"
        }
      ]
    },
    "development": {
      "assets": {
        "directory": "./dist",
        "binding": "ASSETS",
        "html_handling": "auto-trailing-slash"
      },
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "options-tracker-local",
          "database_id": "a89f41ce-342e-4711-8aec-ab0d6f8fdaca",
          "migrations_dir": "src/migrations"
        }
      ]
    }
  },
  // Default configuration for wrangler dev
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "options-tracker-local",
      "database_id": "a89f41ce-342e-4711-8aec-ab0d6f8fdaca",
      "migrations_dir": "src/migrations"
    }
  ]
}
````
