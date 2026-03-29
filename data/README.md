# Workshop Data

## `product-catalog-cohere-v4.csv`

Curated product catalog with 1,008 premium products across 24 categories (42 per category). Each product includes a unique Unsplash image and pre-generated 1024-dimensional embeddings from Cohere Embed v4 via Amazon Bedrock.

Columns: `productId`, `product_description`, `imgUrl`, `productURL`, `stars`, `reviews`, `price`, `category_id`, `isBestSeller`, `boughtInLastMonth`, `category_name`, `quantity`, `embedding`

This file is loaded into Aurora PostgreSQL during workshop bootstrap via `scripts/seed-database.sh`.
