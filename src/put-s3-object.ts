#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import inquirer from "inquirer";
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
  const { values } = parseArgs({
    options: {
      help: {
        type: "boolean",
        short: "h",
      },
    },
  });

  if (values.help) {
    console.log(`
Lambda Layer S3 Uploader

Usage:
  bun run put-s3-object [options]

Options:
  -h, --help                      Show this help message
    `);
    process.exit(0);
  }

  console.log("Starting S3 upload process...");

  checkAwsCredentials();
  const config = loadConfig();

  const availableZips = getAvailableZips();
  if (availableZips.length === 0) {
    console.error("No zip files available for upload. Please run the make command first.");
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
      name: "bucket",
      message: "Enter S3 bucket name:",
      default: config.bucket,
      validate: (input: string) => {
        if (!input) return "Bucket name is required";
        return true;
      },
    },
    {
      type: "list",
      name: "layerFilePath",
      message: "Select layer zip file:",
      choices: availableZips,
    },
    {
      type: "input",
      name: "key",
      message: "Enter S3 object key (path/name in bucket):",
      default: (answers: any) => {
        const fileName = answers.layerFilePath.split("/").pop();
        return fileName;
      },
      validate: (input: string) => {
        if (!input) return "Object key is required";
        return true;
      },
    },
  ]);

  // Save inputs for next time
  saveConfig({
    region: answers.region,
    bucket: answers.bucket,
    key: answers.key,
  });

  const s3Client = new S3Client({
    region: answers.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    },
    useAccelerateEndpoint: false,
    forcePathStyle: false,
    followRegionRedirects: true,
  });

  try {
    console.log("Reading layer file...");
    const fileContent = readFileSync(answers.layerFilePath);

    console.log("Uploading to S3...");
    const startTime = performance.now();

    const command = new PutObjectCommand({
      Bucket: answers.bucket,
      Key: answers.key,
      Body: fileContent,
      ContentType: "application/zip",
    });

    const response = await s3Client.send(command);
    const uploadTime = performance.now() - startTime;

    console.log("\nUpload completed successfully!");
    console.log("Response details:");
    console.log("----------------");
    console.log(`ETag: ${response.ETag}`);
    console.log(`Version ID: ${response.VersionId || 'Not versioned'}`);
    console.log(`Server Side Encryption: ${response.ServerSideEncryption || 'None'}`);
    console.log(`S3 Location: s3://${answers.bucket}/${answers.key}`);
    console.log(`Upload duration: ${(uploadTime / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error("Error uploading to S3:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});