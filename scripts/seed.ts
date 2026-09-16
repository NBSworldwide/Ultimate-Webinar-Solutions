import { getDb } from "@/lib/db";

const database = getDb();
const webinars = database.prepare("SELECT COUNT(*) AS count FROM webinars").get() as { count: number };
const registrations = database.prepare("SELECT COUNT(*) AS count FROM registrations").get() as { count: number };

console.log(`Database ready: ${webinars.count} webinars, ${registrations.count} registrations.`);
console.log("The seed is synthetic and is created automatically on first initialization.");
