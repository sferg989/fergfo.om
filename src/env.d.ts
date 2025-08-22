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


