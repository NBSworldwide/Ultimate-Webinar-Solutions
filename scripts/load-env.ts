import { loadEnvConfig } from "@next/env";

/** Load the same project-local environment files that Next.js uses. */
export function loadProjectEnv(): void {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");
}
