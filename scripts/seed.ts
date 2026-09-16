import { loadProjectEnv } from "./load-env";
import { closeDatabase, getDb } from "@/lib/db";
import { seedSyntheticSamples } from "@/lib/sample-seed";

loadProjectEnv();

async function main(): Promise<void> {
  try {
    const result = await seedSyntheticSamples();
    console.log(result.alreadySeeded
      ? `Synthetic samples already present: ${result.webinars} webinars, ${result.registrations} registrations.`
      : `Seeded ${result.webinars} synthetic webinars and ${result.registrations} synthetic registrations.`);
    console.log("No archived customer or product records were imported.");
  } catch (error) {
    console.error("Sample seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
