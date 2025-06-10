import { $ } from "bun";

export default {
  async createLayer(requirementsPath: string): Promise<string> {
    console.log(`Creating Lambda layer for Python 3.12 for amd64 using ${requirementsPath}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = "output";
    const layerDir = `${outputDir}/python`;
    const zipName = `python3-12-amd64-layer-${timestamp}.zip`;
    const zipPath = `${outputDir}/${zipName}`;

    // Create directories
    await $`mkdir -p ${outputDir}`;
    await $`rm -rf ${layerDir}`;
    await $`mkdir -p ${layerDir}`;

    // Copy requirements.txt to output dir
    await $`cp ${requirementsPath} ${outputDir}/requirements.txt`;

    // Run Docker to install packages
    const dockerImage = "python:3.12-slim";

    console.log("Pulling Docker image...");
    await $`docker pull ${dockerImage}`;

    console.log("Installing dependencies in Docker container...");
    await $`docker run --rm --platform linux/amd64 -v ${process.cwd()}/${outputDir}:/output ${dockerImage} \
      bash -c "pip install --platform manylinux2014_aarch64  --only-binary=:all: --implementation cp --python-version 3.12 -r /output/requirements.txt --target /output/python --no-cache-dir"`;

    console.log("Creating zip file...");
    await $`cd ${outputDir} && zip -r ${zipName} python requirements.txt`;

    console.log(`Lambda layer created successfully: ${zipPath}`);
    return zipPath;
  }
};
