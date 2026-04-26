---
inclusion: auto
---

# AWS Credential Refresh

When you encounter `ExpiredTokenException`, `ExpiredToken`, or `The security token included in the request is expired` in any AWS CLI call, Bedrock API response, or backend log, suggest these steps in order:

1. Refresh Midway auth first (ada depends on it):
   ```bash
   mwinit -f
   ```
2. Then refresh AWS credentials:
   ```bash
   ada credentials update --account 619763002613 --role Admin
   ```
3. Restart the affected service (e.g., the backend uvicorn process).

If `ada credentials update` fails with an auth/cookie error, that means Midway expired — run `mwinit -f` first and retry.
