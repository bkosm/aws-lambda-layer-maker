import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = join(process.cwd(), "output");

export function getAvailableZips(): string[] {
  if (!existsSync(OUTPUT_DIR)) {
    return [];
  }

  try {
    const files = readdirSync(OUTPUT_DIR);
    if (files.length === 0) {
      console.log("No zip files found in output directory.");
      return [];
    }
    return files
      .filter((file) => file.endsWith(".zip"))
      .map((file) => join(OUTPUT_DIR, file));
  } catch (error) {
    console.error("Error reading output directory:", error);
    return [];
  }
} 