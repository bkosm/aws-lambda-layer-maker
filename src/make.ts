#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { $ } from "bun";
import { checkLayerSize } from "./utils/layer-size";
import python3_12amd64 from "./runtimes/python3_12amd64";

interface Args {
  runtime: string;
  requirements?: string;
}

async function main() {
  const { values } = parseArgs({
    options: {
      runtime: {
        type: "string",
        short: "r",
        default: "python3.12amd64",
      },
      requirements: {
        type: "string",
        short: "f",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
  });

  if (values.help) {
    console.log(`
Lambda Layer Maker

Usage:
  bun start [options]

Options:
  -r, --runtime <runtime>         Runtime to create layer for (default: python3.12)
  -f, --requirements <file>       Path to requirements.txt file (for Python runtime)
  -h, --help                      Show this help message
    `);
    process.exit(0);
  }

  const args: Args = {
    runtime: values.runtime as string,
  };

  if (values.requirements) {
    const reqPath = values.requirements as string;
    if (!(await $`test -f ${reqPath}`.quiet())) {
      console.error(`Requirements file not found: ${reqPath}`);
      process.exit(1);
    }
    args.requirements = reqPath;
  }

  let layerPath: string;

  switch (args.runtime) {
    case "python3.12amd64":
      if (!args.requirements) {
        console.error("Requirements file is required for Python runtime");
        process.exit(1);
      }
      layerPath = await python3_12amd64.createLayer(args.requirements);
      break;
    default:
      console.error(`Unsupported runtime: ${args.runtime}`);
      process.exit(1);
  }

  // Check layer size after creation
  await checkLayerSize(layerPath);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
