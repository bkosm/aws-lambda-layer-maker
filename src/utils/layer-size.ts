import { $ } from "bun";

export const LAYER_SIZE_LIMIT_MB = 50;

export async function checkLayerSize(zipPath: string): Promise<void> {
  const sizeBytes = parseInt(await $`du -b ${zipPath} | cut -f1`.text());
  const sizeMB = sizeBytes / (1024 * 1024);
  
  if (sizeMB > LAYER_SIZE_LIMIT_MB) {
    console.warn(`Error: Layer size (${sizeMB.toFixed(2)}MB) exceeds AWS Lambda limit of ${LAYER_SIZE_LIMIT_MB}MB. Upload it to S3 first. Be mindful that the Lambda package cannot exceed 250MB unzipped.`);
  } else {
    console.log(`Layer size (${sizeMB.toFixed(2)}MB) is within recommended limits`);
  }
} 