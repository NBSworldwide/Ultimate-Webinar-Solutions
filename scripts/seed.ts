import { loadProjectEnv } from "./load-env";
import { closeDatabase, getDb } from "@/lib/db";
import { seedStudioSamples, seedSyntheticSamples } from "@/lib/sample-seed";

loadProjectEnv();

async function main(): Promise<void> {
  try {
    const result = await seedSyntheticSamples();
    console.log(result.alreadySeeded
      ? `Synthetic samples already present: ${result.webinars} webinars, ${result.registrations} registrations.`
      : `Seeded ${result.webinars} synthetic webinars and ${result.registrations} synthetic registrations.`);
    const studio = await seedStudioSamples();
    console.log(studio.alreadySeeded
      ? `Studio fixtures already present: ${studio.forms} forms, ${studio.media} media assets, ${studio.entries} entries.`
      : `Seeded ${studio.forms} studio forms, ${studio.media} media assets, and ${studio.entries} entries.`);
    console.log("No archived customer or product records were imported.");
  } catch (error) {
    console.error("Sample seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
