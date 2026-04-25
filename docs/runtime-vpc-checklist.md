# AgentCore Runtime VPC checklist — provisioning-time verification

**Status:** OQ-10 closed by docs (no ticket needed).
**Canonical refs:**
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-vpc.html
- Reference implementation walkthrough: https://dev.to/aws/deploying-ai-agents-on-aws-without-creating-a-security-mess-4i

The VPC connectivity model for AgentCore Runtime is fully documented and
mirrors Lambda's VPC config pattern. This file is the **provisioning-time
verification checklist** we run when we stand up the Runtime resource in
Week 3 — it's not a design question any more.

---

## Connectivity model (reference)

- Runtime injects ENIs into customer-specified private subnets.
- Customer-supplied security groups control ingress/egress on those ENIs.
- Standard pattern: **Runtime SG egress 5432 → Aurora SG; Aurora SG
  ingress 5432 ← Runtime SG** (SG-to-SG rule; don't open by CIDR).
- ENI lifecycle is managed by the service-linked role
  `AWSServiceRoleForBedrockAgentCoreNetwork` — we don't touch it, just
  make sure it exists in the account on first Runtime provision.

This matches Lambda's VPC config semantics, so IAM auth to Aurora
(`rds-db:connect`) works the same way — the Runtime execution role is the
principal you grant on the DB resource.

---

## Pre-provision checklist

Run through this before creating the Runtime resource. Each item is a
single command or a short eyeball of CFN template output — no guesswork.

### 1. Subnet AZ support (the one open sanity check)

AgentCore only supports VPC connectivity in specific AZs per region.
`blaize-bazaar-vpc.yml` places Aurora in 2 private subnets across 2 AZs.
Confirm both AZs are on the supported list for `us-west-2` before the
Runtime resource creation — otherwise ENI injection fails at provision
time with an unhelpful error.

```bash
# Replace with the two private-subnet IDs from the VPC stack outputs.
aws ec2 describe-subnets \
  --subnet-ids subnet-xxxxxxxx subnet-yyyyyyyy \
  --query 'Subnets[].[SubnetId, AvailabilityZone, AvailabilityZoneId]' \
  --output table
```

Then cross-reference the AZ IDs (e.g., `usw2-az1`, `usw2-az2`) against
the AgentCore supported-AZ list in the docs linked above. If an AZ is
unsupported, rebuild the VPC on supported AZs (2-minute CFN edit).

### 2. Security group wiring

```bash
# Runtime SG — outbound to Aurora's port 5432 only. No 0.0.0.0/0 egress
# unless the Runtime also needs to reach Bedrock/Cohere over public
# endpoints (see VPC endpoint note below).
aws ec2 describe-security-groups \
  --group-ids <runtime-sg-id> \
  --query 'SecurityGroups[].IpPermissionsEgress'

# Aurora SG — ingress 5432 from Runtime SG (SG-to-SG, not CIDR).
aws ec2 describe-security-groups \
  --group-ids <aurora-sg-id> \
  --query 'SecurityGroups[].IpPermissions[?FromPort==`5432`]'
```

### 3. Service-linked role present

```bash
aws iam get-role --role-name AWSServiceRoleForBedrockAgentCoreNetwork
```

Returns 200 if present; `NoSuchEntity` means AWS creates it lazily on
first Runtime provision (fine, just noting what to expect).

### 4. VPC endpoints for AWS services (best practice)

If Runtime needs Bedrock/Cohere without egressing to the public
internet via NAT, add:

- `com.amazonaws.us-west-2.bedrock-runtime` (Bedrock invoke)
- `com.amazonaws.us-west-2.secretsmanager` (if IAM auth resolves
  secrets on the connect path)

Not required for the workshop — the VPC already has NAT per public
subnet per `blaize-bazaar-vpc.yml`. But documented here so Week 3
provisioning knows the "private-only" option exists.

### 5. IAM DB auth — Runtime execution role principal

Once Runtime is provisioned, the execution role ARN goes into the
Aurora `rds-db:connect` grant. Confirm the grant lands on the right
DB username (should match the backend's `DB_USER`, typically
`blaize_app`).

```sql
-- Inside Aurora, verify the IAM auth grant landed.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'blaize_app';
```

---

## Cold-start implication

Historically Lambda's VPC ENI attach added seconds of cold-start
latency. AgentCore may or may not inherit this — **measure in Week 3**
(item 3, `scripts/bench_runtime_coldstart.py`). If cold-start clocks
>3s after VPC attach, the pre-warm narrative kicks in; if <2s, no
narrative needed.

---

## History

Originally drafted as a ticket body (`docs/runtime-vpc-ticket.md`)
before the docs were found. Repurposed in Week 2 once we confirmed the
connectivity model was fully documented. Keeping the checklist so the
provisioning step itself has a short runnable script rather than "read
the docs again" guidance.
