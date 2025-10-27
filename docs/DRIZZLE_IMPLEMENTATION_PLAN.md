# Drizzle ORM Implementation Plan

This document outlines the plan to migrate the application's database access from raw SQL queries to Drizzle ORM.

## 1. Installation & Configuration

*   **Install Dependencies**:
    *   Install `drizzle-orm` for core ORM functionality.
    *   Install `drizzle-kit` as a dev dependency for schema and migration management.
*   **Configure Drizzle Kit**:
    *   Create a `drizzle.config.ts` file in the project root.
    *   This file will configure the dialect as `'sqlite'`, the driver as `'d1-http'`, and specify the schema file path.
    *   It will require Cloudflare credentials (`accountId`, `databaseId`, `token`) which will need to be provided as environment variables.

## 2. Schema Definition

*   **Create Schema File**:
    *   Create a new directory `src/db` to hold the Drizzle schema.
    *   Create a `src/db/schema.ts` file.
*   **Translate Existing Schema**:
    *   Translate the existing SQL schema from `src/migrations/001_initial_schema.sql` and `src/migrations/002_symbol_tracking.sql` into Drizzle's schema syntax using `sqliteTable`.

## 3. Service Refactoring

*   **Update `DatabaseService`**:
    *   Refactor `src/services/database_service.ts` to use Drizzle.
    *   Initialize Drizzle using the `drizzle` function from `drizzle-orm/d1` and the D1 binding from the environment.
    *   Rewrite the existing methods (`getRecentSnapshots`, `getTopPerformingOptions`, `getStockPerformanceSummary`, etc.) to use Drizzle's query builder instead of raw SQL. The public interface of the service will be kept the same to minimize changes in components.

## 4. Migration Generation

*   **Generate Migrations**:
    *   Once the schema is defined in Drizzle, use `drizzle-kit generate` to create a new migration.
*   **Apply Migrations**:
    *   Use `wrangler d1 migrations apply` to apply the new migration to the database. This will ensure the Drizzle schema and the database schema are in sync.

## 5. Verification

*   **Static Analysis**:
    *   Run `astro check` and `eslint` to ensure the new code is correct and follows the project's style.
*   **Manual Testing**:
    *   The application will need to be run and tested manually to ensure the new implementation works as expected, as there are no automated tests.

## 6. Cleanup

*   **Remove Old Migrations**:
    *   After confirming the new implementation works, the old `.sql` migration files will be removed.
