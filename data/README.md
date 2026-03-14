# Workshop Data

## `premium-products-with-embeddings.csv`

Curated product catalog with ~1,000 premium products across 25+ categories. Each product includes pre-generated 1024-dimensional embeddings from Cohere Embed v4 via Amazon Bedrock.

Columns: `productId`, `product_description`, `imgUrl`, `productURL`, `stars`, `reviews`, `price`, `category_id`, `isBestSeller`, `boughtInLastMonth`, `category_name`, `quantity`, `embedding`

This file is loaded into Aurora PostgreSQL during workshop bootstrap via `scripts/load-database-fast.sh`.
