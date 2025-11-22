#!/usr/bin/env python3
"""
Generate MCP server configuration for Aurora PostgreSQL using uvx.

This script reads environment variables set by bootstrap-labs.sh to generate
the MCP server configuration file for use with Amazon Q and other MCP clients.

Environment Variables Required (set by bootstrap-labs.sh):
- DB_CLUSTER_ARN: Aurora cluster ARN
- DB_SECRET_ARN: Secrets Manager ARN for database credentials
- DB_NAME: Database name (default: postgres)
- AWS_REGION: AWS region (default: us-west-2)
"""

import json
import os
import sys
from pathlib import Path


def generate_mcp_config():
    """Generate MCP server configuration file using uvx."""
    
    # Get environment variables (set by bootstrap-labs.sh)
    db_cluster_arn = os.environ.get('DB_CLUSTER_ARN')
    db_secret_arn = os.environ.get('DB_SECRET_ARN')
    db_name = os.environ.get('DB_NAME', 'postgres')
    aws_region = os.environ.get('AWS_REGION', 'us-west-2')
    
    # Validate required variables
    if not db_cluster_arn:
        print("ERROR: DB_CLUSTER_ARN environment variable not set", file=sys.stderr)
        print("This should be set by bootstrap-labs.sh at line 67", file=sys.stderr)
        return 1
    
    if not db_secret_arn:
        print("ERROR: DB_SECRET_ARN environment variable not set", file=sys.stderr)
        print("This should be passed from CloudFormation outputs", file=sys.stderr)
        return 1
    
    # Create MCP server configuration using uvx
    config = {
        "mcpServers": {
            "awslabs.postgres-mcp-server": {
                "command": "uvx",
                "args": [
                    "awslabs.postgres-mcp-server@latest",
                    "--resource_arn", db_cluster_arn,
                    "--secret_arn", db_secret_arn,
                    "--database", db_name,
                    "--region", aws_region,
                    "--readonly", "True"
                ],
                "env": {
                    "AWS_REGION": aws_region,
                    "FASTMCP_LOG_LEVEL": "ERROR"
                },
                "disabled": False,
                "autoApprove": []
            }
        }
    }
    
    # Determine output directory (../config from backend/)
    output_dir = Path(__file__).parent.parent / "config"
    
    # Create directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write configuration file
    output_file = output_dir / "mcp-server-config.json"
    
    try:
        with open(output_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print("=" * 70)
        print("✅ MCP Configuration Generated Successfully!")
        print("=" * 70)
        print(f"📁 Location: {output_file}")
        print()
        print("🔧 Configuration Details:")
        print(f"   Server: AWS Labs PostgreSQL MCP Server (uvx)")
        print(f"   Database Cluster: {db_cluster_arn}")
        print(f"   Secret ARN: {db_secret_arn}")
        print(f"   Database: {db_name}")
        print(f"   Region: {aws_region}")
        print(f"   Read-only: True")
        print()
        print("🎯 Usage:")
        print("   - Amazon Q Developer: Automatically detects this config")
        print("   - MCP Clients: Use get_table_schema and run_query tools")
        print("   - Schema Exploration: Safe read-only access to database")
        print("=" * 70)
        
        return 0
        
    except Exception as e:
        print(f"ERROR: Failed to write configuration file: {e}", file=sys.stderr)
        return 1


def main():
    """Main entry point."""
    print()
    print("=" * 70)
    print("MCP Configuration Generator for Aurora PostgreSQL")
    print("=" * 70)
    print()
    
    # Check for required environment variables
    db_cluster_arn = os.environ.get('DB_CLUSTER_ARN')
    db_secret_arn = os.environ.get('DB_SECRET_ARN')
    
    if not db_cluster_arn or not db_secret_arn:
        print("❌ Missing Required Environment Variables")
        print()
        if not db_cluster_arn:
            print("   - DB_CLUSTER_ARN: Not set")
            print("     Expected: Set by bootstrap-labs.sh at line 67")
        if not db_secret_arn:
            print("   - DB_SECRET_ARN: Not set")
            print("     Expected: Passed from CloudFormation outputs")
        print()
        print("💡 Troubleshooting:")
        print("   1. Check CloudFormation stack outputs for DB_SECRET_ARN")
        print("   2. Verify bootstrap-labs.sh is sourcing .env file correctly")
        print("   3. Check /workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env")
        print()
        return 1
    
    # Generate configuration
    return generate_mcp_config()


if __name__ == "__main__":
    sys.exit(main())
