# Lambda Layer Maker 🛠️

A fast and efficient CLI tool for creating AWS Lambda layers using Docker.

## Prerequisites 📋

- [Bun](https://bun.sh) installed
- Docker installed and running
- `zip` command available in your system
- AWS credentials configured (for publishing)

## Installation 💻

```bash
# Clone the repository
git clone https://github.com/bkosm/aws-lambda-layer-maker.git
cd aws-lambda-layer-maker

# Install dependencies
bun install
```

## Usage 🚀

### Quick Start - Direct Publishing

Create and publish a layer directly to AWS Lambda in two commands:

```bash
# 1. Create the layer
bun run make -r python3.12 -f requirements.txt

# 2. Publish directly to Lambda
bun run publish
# -> Select "Local file" when prompted
# -> Follow the prompts to name and configure your layer
```

**Note**: Direct publishing only works for layers under 50MB. For larger layers, you must use the S3 flow described below.

### Advanced Usage - S3 Storage

Create, store in S3, and publish a layer in three commands. This flow is required for layers over 50MB due to AWS Lambda API limitations:

```bash
# 1. Create the layer
bun run make -r python3.12amd64 -f requirements.txt

# 2. Upload to S3
bun run put-s3-object
# -> Follow the prompts to specify bucket and path
# Example output:
# Upload completed successfully!
# S3 Location: s3://my-bucket/lambda-layers/python3-12-layer-2024-03-28.zip

# 3. Publish from S3 to Lambda
bun run publish
# -> Select "S3 bucket" when prompted
# -> The tool will remember your last S3 location
```

### Layer Creation Options

Create a Lambda layer from a requirements.txt file:

```bash
# Using long options
bun run make --runtime python3.12amd64 --requirements path/to/requirements.txt

# Using short options
bun run make -r python3.12amd64 -f path/to/requirements.txt
```

The tool will:
1. Create a Docker container with Python 3.12
2. Install the dependencies from your `requirements.txt`
3. Package them into a Lambda layer
4. Validate the layer size against AWS limits
5. Output a zip file in the `output` directory

### Publishing Options

When publishing a layer, you can choose between two sources:

1. **Local File**
   - Directly uploads the zip file from your machine
   - Faster for small files (under 50MB)
   - No additional storage costs
   - Limited by AWS Lambda API payload size

2. **S3 Bucket**
   - Uses a previously uploaded zip from S3
   - Required for files over 50MB
   - Better for large files
   - Allows sharing layers between accounts
   - Provides backup/versioning if needed

### AWS Credentials

Before running the publish or S3 commands, make sure to set your AWS credentials:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_SESSION_TOKEN="your-session-token"  # Required for temporary credentials
```

### Size Limits 📏

Be mindful of AWS Lambda limits:
- ❌ Error at 50MB for direct publishing (use S3 flow instead)
- 📝 Maximum unzipped size of the Lambda deployment package has to be under 250MB

## Output 📦

The generated layer will be in the `output` directory with a name format:
```
python3-12-layer-2024-03-15T10-30-45-123Z.zip
```

## Docker Usage 🐳

The tool uses official Docker images for each runtime:
- Python 3.12: `python:3.12-slim`

This ensures that dependencies are compiled and packaged in an environment matching AWS Lambda.
