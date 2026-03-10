#!/usr/bin/env python3
"""
Configuration for Blaize Bazaar Workshop Labs

Reads database and AWS settings from environment variables.
Supports .env file loading for local development.
"""

import os
from typing import Optional

try:
    from dotenv import load_dotenv
    # Workshop environment path
    _env_path = "/workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env"
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
    else:
        load_dotenv()  # Try local .env
except ImportError:
    pass  # dotenv not required if env vars are set directly


# ============================================================
# Database Configuration
# ============================================================

DB_HOST: str = os.getenv("DB_HOST", "")
DB_PORT: str = os.getenv("DB_PORT", "5432")
DB_NAME: str = os.getenv("DB_NAME", "postgres")
DB_USER: str = os.getenv("DB_USER", "")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

DB_CONFIG = {
    "host": DB_HOST,
    "port": DB_PORT,
    "name": DB_NAME,
    "user": DB_USER,
    "password": DB_PASSWORD,
}


def get_connection_string() -> str:
    """Build PostgreSQL connection string from environment variables.

    Returns:
        PostgreSQL connection URL string
    """
    return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


# ============================================================
# AWS Configuration
# ============================================================

AWS_REGION: str = os.getenv("AWS_REGION", "us-west-2")
BEDROCK_EMBEDDING_MODEL: str = "us.cohere.embed-v4:0"
BEDROCK_CHAT_MODEL: str = "global.anthropic.claude-sonnet-4-6"

# ============================================================
# RDS Data API Configuration (for testing without VPC access)
# ============================================================
# Set USE_DATA_API=true to use Data API instead of direct psycopg
USE_DATA_API: bool = os.getenv("USE_DATA_API", "false").lower() == "true"
DB_CLUSTER_ARN: str = os.getenv("DB_CLUSTER_ARN", "")
DB_SECRET_ARN: str = os.getenv("DB_SECRET_ARN", "")
