import { loadProjectEnv } from "./load-env";
import { closeDatabase } from "@/lib/db";
import { seedDemoUsers } from "@/lib/demo-users";

loadProjectEnv();

async function main(): Promise<void> {
  try {
    const result = await seedDemoUsers();
    console.log(`Demo account setup complete: ${result.created} created, ${result.reset} reset.`);
    for (const user of result.users) {
      console.log(`${user.action === "created" ? "Created" : "Reset"} ${user.role} account: ${user.email}`);
    }
    console.log("Passwords were read from the local environment and were not printed or stored in plaintext.");
  } catch (error) {
    console.error("Demo account setup failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
