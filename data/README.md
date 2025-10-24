# Data Files

## Large Files Not Included in Git

Due to GitHub's 100MB file size limit, the following files are hosted externally:

### `amazon-products-sample-with-embeddings.csv` (455 MB)

This file contains 21,704 Amazon products with pre-generated embeddings for fast database loading.

**Automatic Download**: The bootstrap script (`scripts/load-database-fast.sh`) will automatically download this file from the Workshop Studio assets bucket during workshop setup.

**For Workshop Studio**: Upload this file to the workshop assets folder. The CloudFormation template passes `AssetsBucketName` and `AssetsBucketPrefix` variables to the bootstrap script.

**Manual Download** (for local development):
```bash
# Contact workshop maintainers for the S3 URL
aws s3 cp s3://ws-assets-prod-iad-r-pdx-f3b3f9f1a7d6a3d0/YOUR-EVENT-ID/amazon-products-sample-with-embeddings.csv data/
```
