# IAM Requirements for DAT406 Workshop

## Overview

The DAT406 workshop requires specific IAM permissions for the EC2 instance role to enable both direct database access (Lab 1) and MCP server functionality (Lab 2).

## Required Permissions

### 1. RDS Data API (Required for MCP Server)

The AWS Labs PostgreSQL MCP server uses the **RDS Data API** instead of direct PostgreSQL connections. This requires the following permissions:

```json
{
  "Effect": "Allow",
  "Action": [
    "rds-data:ExecuteStatement",
    "rds-data:BatchExecuteStatement",
    "rds-data:BeginTransaction",
    "rds-data:CommitTransaction",
    "rds-data:RollbackTransaction"
  ],
  "Resource": "*"
}
```

**Note**: For production environments, scope the `Resource` to specific cluster ARNs. For workshop/learning purposes, broad scope simplifies setup.

**Why needed**: The MCP server spawns as a subprocess and communicates with Aurora PostgreSQL via the RDS Data API, which provides a serverless HTTP-based query interface.

### 2. RDS Describe (Read-only metadata)

```json
{
  "Effect": "Allow",
  "Action": [
    "rds:DescribeDBClusters",
    "rds:DescribeDBInstances"
  ],
  "Resource": "*"
}
```

**Why needed**: Allows the application to discover database endpoints and cluster information.

### 3. RDS IAM Authentication (Direct database access)

```json
{
  "Effect": "Allow",
  "Action": [
    "rds-db:connect"
  ],
  "Resource": "*"
}
```

**Why needed**: Enables IAM-based authentication for direct PostgreSQL connections (used in Lab 1 semantic search).

### 4. Secrets Manager (Database credentials)

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret"
  ],
  "Resource": [
    "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:apg-pgvector-secret-*",
    "DB_SECRET_ARN"
  ]
}
```

**Why needed**: Retrieves database credentials stored in AWS Secrets Manager.

### 5. Amazon Bedrock (AI models)

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "*"
}
```

**Why needed**: Enables access to Amazon Titan embeddings and Claude Sonnet models.

## Aurora PostgreSQL Configuration

### Data API Enablement

The Aurora PostgreSQL cluster **must have Data API enabled** for the MCP server to work:

```bash
aws rds modify-db-cluster \
  --db-cluster-identifier apg-pgvector-dat406 \
  --enable-http-endpoint \
  --apply-immediately
```

**Verification**:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier apg-pgvector-dat406 \
  --query 'DBClusters[0].HttpEndpointEnabled'
```

Should return: `true`

## Troubleshooting

### Error: "User is not authorized to perform: rds-data:BeginTransaction"

**Cause**: IAM role lacks RDS Data API permissions.

**Solution**: Add the RDS Data API permissions listed above to the EC2 instance role.

### Error: "HttpEndpoint is not enabled for cluster"

**Cause**: Aurora cluster doesn't have Data API enabled.

**Solution**: Enable Data API on the cluster using the command above.

### Error: "Access Denied" when accessing Secrets Manager

**Cause**: IAM role lacks Secrets Manager permissions.

**Solution**: Add Secrets Manager permissions to the role.

## CloudFormation Implementation

The IAM role is defined in `deployment/cfn/dat406-code-editor.yml`:

```yaml
CodeEditorRole:
  Type: AWS::IAM::Role
  Properties:
    Policies:
      - PolicyName: WorkshopPermissions
        PolicyDocument:
          Version: 2012-10-17
          Statement:
            - Effect: Allow
              Action:
                - rds:DescribeDBClusters
                - rds:DescribeDBInstances
                - rds-db:connect
                - rds-data:ExecuteStatement
                - rds-data:BatchExecuteStatement
                - rds-data:BeginTransaction
                - rds-data:CommitTransaction
                - rds-data:RollbackTransaction
              Resource: '*'
```

**Workshop Scope**: Uses `Resource: '*'` for simplicity. For production, scope to specific cluster ARNs.

## Testing Permissions

### Test RDS Data API Access

```bash
aws rds-data execute-statement \
  --resource-arn "arn:aws:rds:REGION:ACCOUNT_ID:cluster:apg-pgvector-dat406" \
  --secret-arn "SECRET_ARN" \
  --database "postgres" \
  --sql "SELECT 1"
```

### Test Bedrock Access

```bash
aws bedrock invoke-model \
  --model-id amazon.titan-embed-text-v2:0 \
  --body '{"inputText":"test"}' \
  --region us-west-2 \
  output.json
```

## References

- [RDS Data API Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html)
- [AWS Labs PostgreSQL MCP Server](https://github.com/awslabs/postgres-mcp-server)
- [IAM Policies for RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/security_iam_service-with-iam.html)
