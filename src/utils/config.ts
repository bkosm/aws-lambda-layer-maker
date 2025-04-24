import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";

const CONFIG_FILE = join(homedir(), ".lambda-layer-maker.json");

interface Config {
  region?: string;
  // Lambda Layer publishing
  layerName?: string;
  description?: string;
  runtime?: string;
  layerFilePath?: string;
  // S3
  bucket?: string;
  key?: string;
}

export function loadConfig(): Config {
  try {
    const data = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export function saveConfig(config: Partial<Config>) {
  try {
    const existing = loadConfig();
    const merged = { ...existing, ...config };
    const data = JSON.stringify(merged, null, 2);
    writeFileSync(CONFIG_FILE, data);
  } catch (error) {
    console.warn("Failed to save config:", error);
  }
} 