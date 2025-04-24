#!/usr/bin/env bun

import inquirer from "inquirer";
import {
  LambdaClient,
  PublishLayerVersionCommand,
} from "@aws-sdk/client-lambda";
import { readFileSync } from "fs";
import { getAvailableZips } from "./utils/available-zips";
import { loadConfig, saveConfig } from "./utils/config";

function checkAwsCredentials() {
  const requiredEnvVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingVars.length > 0) {
    console.error("Missing required AWS credentials:");
    missingVars.forEach((varName) => console.error(`- ${varName}`));
    process.exit(1);
  }
}

async function main() {
  console.log("Starting layer publishing process...");

  checkAwsCredentials();
  const config = loadConfig();
  const availableZips = getAvailableZips();

  const sourceAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Select layer source:",
      choices: [
        { name: "Local file", value: "local" },
        { name: "S3 bucket", value: "s3" },
      ],
    },
  ]);

  if (sourceAnswer.source === "local" && availableZips.length === 0) {
    console.error("No zip files available for publishing. Please run the make command first.");
    process.exit(1);
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "region",
      message: "Enter AWS region:",
      default: config.region || "us-west-2",
    },
    {
      type: "input",
      name: "layerName",
      message: "Enter layer name:",
      default: config.layerName,
    },
    {
      type: "input",
      name: "description",
      message: "Enter layer description:",
      default: config.description,
    },
    {
      type: "list",
      name: "runtime",
      message: "Select runtime:",
      choices: ["python3.12"],
      default: config.runtime || "python3.12",
    },
    ...(sourceAnswer.source === "local" ? [
      {
        type: "list",
        name: "layerFilePath",
        message: "Select layer zip file:",
        choices: availableZips,
        default: config.layerFilePath,
      },
    ] : [
      {
        type: "input",
        name: "bucket",
        message: "Enter S3 bucket name:",
        default: config.bucket,
        validate: (input: string) => {
          if (!input) return "Bucket name is required";
          return true;
        },
      },
      {
        type: "input",
        name: "key",
        message: "Enter S3 object key:",
        default: config.key,
        validate: (input: string) => {
          if (!input) return "Object key is required";
          return true;
        },
      },
    ]),
  ]);

  // Save inputs for next time
  saveConfig(answers);

  const lambdaClient = new LambdaClient({
    region: answers.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    },
  });

  try {
    let content;
    if (sourceAnswer.source === "local") {
      console.log("Reading local file...");
      content = {
        ZipFile: readFileSync(answers.layerFilePath),
      };
    } else {
      console.log("Using S3 source...");
      content = {
        S3Bucket: answers.bucket,
        S3Key: answers.key,
      };
    }

    console.log("Publishing layer to AWS...");
    const command = new PublishLayerVersionCommand({
      LayerName: answers.layerName,
      Description: answers.description,
      Content: content,
      CompatibleRuntimes: [answers.runtime],
    });

    const startTime = performance.now();
    const response = await lambdaClient.send(command);
    const uploadTime = performance.now() - startTime;

    console.log("\nLayer published successfully!");
    console.log("Layer details:");
    console.log("-------------");
    console.log(`Layer Version ARN: ${response.LayerVersionArn}`);
    console.log(`Layer Version: ${response.Version}`);
    if (response.Description) console.log(`Description: ${response.Description}`);
    if (response.CreatedDate) console.log(`Created: ${response.CreatedDate}`);
    if (response.CompatibleRuntimes?.length) console.log(`Compatible Runtimes: ${response.CompatibleRuntimes.join(", ")}`);
    console.log(`Upload duration: ${(uploadTime / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error("Error publishing layer:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
