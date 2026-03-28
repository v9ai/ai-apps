# AWS IAM & Security

## The 30-Second Pitch
AWS IAM is the authorization fabric of every AWS resource. Every API call—whether from a human, a service, or a third-party application—must be authenticated as a **principal** and authorized by **policy evaluation** before AWS executes it. Getting IAM wrong is the root cause of most cloud breaches (exposed access keys, over-permissive roles, misconfigured bucket policies). This knowledge base covers the full security stack from IAM primitives through threat detection, giving you crisp answers to every interview question on the topic.

---

## 1. IAM Fundamentals

### Principals
A **principal** is an entity that can make API calls to AWS:
- **IAM User** — long-term identity (username + password or access key). Represents a human or a machine with static credentials.
- **IAM Group** — logical grouping of users. Policies attached to a group apply to all members. Groups cannot be principals in resource-based policies.
- **IAM Role** — identity with no long-term credentials. A role is _assumed_ by a principal and issues temporary credentials via STS. Used for services, cross-account access, federated identity.
- **AWS Service** — services like [Lambda](/aws-lambda-serverless), EC2, ECS that are granted roles to call other AWS services on your behalf.

### Policy Types

| Type | Attached To | Stored In | Use Case |
|---|---|---|---|
| **AWS Managed Policy** | Users, Groups, Roles | AWS account (shared) | Common reusable policies (e.g., `AmazonS3ReadOnlyAccess`) |
| **Customer Managed Policy** | Users, Groups, Roles | Your account | Custom reusable policies you maintain |
| **Inline Policy** | Exactly one user/group/role | Embedded in the entity | Strict 1:1 relationship; deleted with entity |
| **Resource-Based Policy** | Attached to a resource ([S3](/aws-storage-s3), KMS, [Lambda](/aws-lambda-serverless)) | The resource itself | Cross-account access without assuming a role |
| **Permission Boundary** | IAM User or Role | Account | Maximum permissions any identity-based policy can grant (not additive) |
| **Service Control Policy (SCP)** | AWS Organization OU or account | AWS Organizations | Maximum permissions for all principals in the OU/account |
| **Session Policy** | Passed inline during `AssumeRole` | Temporary session | Narrow a role's permissions for a specific session |

### Policy Document Anatomy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Read",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/MyRole" },
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "StringEquals": { "s3:prefix": ["docs/"] },
        "Bool": { "aws:SecureTransport": "true" }
      }
    }
  ]
}
```
Key fields: `Effect` (Allow/Deny), `Action` (service:operation), `Resource` (ARN), `Condition` (optional constraints). `Principal` is only used in resource-based policies and trust policies.

---

## 2. Policy Evaluation Logic

### The Evaluation Order (memorize this)
```
1. Explicit DENY in any policy → DENY (stops immediately)
2. SCP restricts? → DENY
3. Resource-based policy allows? → ALLOW (for cross-account: both sides must allow)
4. Identity-based policy allows? → ALLOW
5. Permission boundary allows? → (identity policy must also allow)
6. Session policy allows? → (identity policy must also allow)
7. Default → IMPLICIT DENY
```

### Effective Permission = Intersection
For same-account access, the effective permission is:
```
effective = identity_policy ∩ permission_boundary ∩ session_policy ∩ SCP
```
Any explicit `Deny` overrides everything. An `Allow` only works if no layer blocks it.

### Cross-Account Access
For principal in Account A to access resource in Account B:
1. Account B's resource-based policy (or role trust policy) must explicitly allow Account A's principal.
2. Account A's identity-based policy must allow the action/resource.
Both sides must grant permission. A resource-based policy alone is **not** sufficient if the principal is in another account (the identity must also allow it).

### Permission Boundaries
A permission boundary is an IAM managed policy attached to a user or role that sets the **maximum** permissions. If a user has `AdministratorAccess` but a boundary only allows S3, the user can only access S3. Useful when delegating IAM management to developers without letting them escalate privileges.

```
Effective Permission = identity_policy AND permission_boundary
```
A permission boundary does not _grant_ permissions; it limits them.

### Condition Keys (most commonly tested)
| Condition Key | Usage |
|---|---|
| `aws:RequestedRegion` | Restrict calls to specific regions |
| `aws:SourceIp` / `aws:VpcSourceIp` | IP-based restrictions |
| `aws:PrincipalArn` | Match the calling principal's ARN |
| `aws:MultiFactorAuthPresent` | Require MFA for sensitive actions |
| `aws:SecureTransport` | Require HTTPS |
| `s3:prefix` | Restrict S3 ListBucket to specific prefixes |
| `sts:ExternalId` | Confused deputy protection for cross-account |
| `aws:PrincipalOrgID` | Restrict to principals within an AWS Organization |

---

## 3. IAM Best Practices

### Least Privilege
- Start with zero permissions; grant only what is needed.
- Use IAM Access Analyzer to identify over-permissive policies and generate least-privilege policies from CloudTrail activity.
- Use **AWS IAM Access Analyzer policy validation** to flag policy mistakes before deployment.
- Scope `Resource` ARNs as specifically as possible (avoid `*` where possible).

### No Root Usage
- Root account = account owner, cannot be restricted by SCPs. Has access to billing, can cancel account.
- Enable MFA on root immediately. Store root credentials in a vault.
- Create individual IAM users or use IAM Identity Center (SSO) for all human access.
- Disable and monitor for root API key usage via CloudTrail.

### MFA
- Enforce MFA via policy condition `"Bool": { "aws:MultiFactorAuthPresent": "true" }`.
- Require MFA for console login and for sensitive API calls (e.g., deleting S3 buckets, assuming privileged roles).
- Supported: virtual MFA (Authenticator apps), hardware TOTP, FIDO2 (passkeys), SMS (avoid).

### Access Key Rotation
- Rotate IAM user access keys regularly (< 90 days). Use AWS Config rule `access-keys-rotated`.
- Prefer IAM roles over long-term access keys everywhere possible.
- Deactivate old key, verify nothing breaks, then delete.
- Use `aws iam get-credential-report` to audit all users' key ages.

### IAM Access Analyzer
- Identifies resources shared with external principals (S3 buckets, IAM roles, KMS keys, Lambda functions, SQS queues, Secrets Manager secrets).
- Findings = resources accessible from outside the **zone of trust** (account or organization).
- Also validates policies for correctness and generates least-privilege policies from CloudTrail history.

---

## 4. IAM Roles

### Role Anatomy
A role has two policies:
1. **Trust Policy** (who can assume this role) — uses `Principal` element.
2. **Permission Policy** (what actions the role grants once assumed).

```json
// Trust Policy — allows EC2 service to assume this role
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

### Service Roles vs Instance Profiles
- **Service Role**: a role whose trust policy allows an AWS service ([Lambda](/aws-lambda-serverless), [ECS](/aws-compute-containers), Glue) to assume it.
- **Instance Profile**: a container for a single role that can be attached to an [EC2 instance](/aws-compute-containers). EC2 retrieves temporary credentials from the IMDS (Instance Metadata Service) at `169.254.169.254/latest/meta-data/iam/security-credentials/<role-name>`. IMDSv2 is required (token-based, not just IP-hop exploitable).

### Cross-Account Roles
1. In Account B (resource owner): create role, trust policy allows Account A's principal, permission policy grants needed actions.
2. In Account A: principal's policy must have `sts:AssumeRole` on Account B's role ARN.
3. Add `sts:ExternalId` condition to prevent confused deputy attacks when Account B trusts a third party.

```json
// Trust policy with ExternalId (confused deputy protection)
{
  "Condition": {
    "StringEquals": { "sts:ExternalId": "unique-customer-id-123" }
  }
}
```

### Role Chaining
Assuming Role A, then using those credentials to assume Role B. Session duration resets at each hop (max 1 hour for chained sessions, regardless of role's MaxSessionDuration). Chaining is tracked in CloudTrail.

### Session Duration
- Default: 1 hour. Configurable: 15 min – 12 hours (set on the role via `MaxSessionDuration`).
- Role chaining caps at 1 hour per hop.
- Console sessions via federation: up to 12 hours.

---

## 5. STS (Security Token Service)

### Core API Calls

| API | Used By | Notes |
|---|---|---|
| `AssumeRole` | IAM users, roles, services | Returns temp credentials (AccessKeyId, SecretAccessKey, SessionToken) |
| `AssumeRoleWithWebIdentity` | OIDC federated identities (Cognito, GitHub Actions, K8s IRSA) | JWT validated against OIDC provider |
| `AssumeRoleWithSAML` | Enterprise SSO (ADFS, Okta via SAML 2.0) | SAML assertion validated |
| `GetSessionToken` | IAM users requiring MFA | Elevates session to include MFA context |
| `GetFederationToken` | Custom federation brokers | Returns temp credentials for a federated user |

### Temporary Credentials Lifecycle
```
Principal calls STS API
  → STS validates caller's identity
  → STS checks caller's permission to assume the role (trust policy)
  → STS generates temp credentials with TTL
  → Caller uses AccessKeyId + SecretAccessKey + SessionToken for API calls
  → Credentials expire; caller must re-assume
```

### OIDC Federation (AssumeRoleWithWebIdentity)
Used by: Cognito Identity Pools, [GitHub Actions](/aws-cicd-devops), Kubernetes IRSA (IAM Roles for Service Accounts).
```
GitHub Actions workflow → OIDC token (JWT) from GitHub
  → AssumeRoleWithWebIdentity with JWT + RoleArn
  → STS validates JWT signature against GitHub's JWKS endpoint
  → Returns temp AWS credentials valid for the workflow
```
Trust policy for GitHub Actions:
```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
    }
  }
}
```

---

## 6. Resource-Based Policies

### S3 Bucket Policies
Attached directly to the [S3](/aws-storage-s3) bucket. Can allow cross-account access without role assumption.
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::999999999999:root" },
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": { "aws:PrincipalOrgID": "o-xxxxxxxxxx" }
    }
  }]
}
```
Block Public Access settings override bucket policies for public access. S3 Object Ownership controls ACLs (disable ACLs = bucket owner enforced).

### KMS Key Policies
**Every KMS key must have a key policy** (unlike other resource-based policies, there is no fallback). The key policy must explicitly allow the account root to delegate via IAM policies, otherwise only the policy listed in the key policy has access.
```json
{
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow Lambda to use the key",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/LambdaRole" },
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "*"
    }
  ]
}
```

### Lambda Resource Policies
Allow other AWS services or accounts to invoke a [Lambda](/aws-lambda-serverless) function.
```bash
aws lambda add-permission \
  --function-name myFunction \
  --statement-id AllowS3Invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::my-bucket \
  --source-account 123456789012
```
`source-account` prevents confused deputy when a service (S3) from any account could trigger the function.

---

## 7. AWS Organizations & SCPs

### Structure
```
Root
├── Management Account
├── OU: Security
│   └── Account: Security Tooling (GuardDuty delegated admin)
├── OU: Production
│   ├── Account: Prod App
│   └── Account: Prod Data
└── OU: Sandbox
    └── Account: Developer Sandbox
```

### Service Control Policies (SCPs)
- Applied to root, OUs, or individual accounts. Inherited down the hierarchy.
- Define the **maximum permissions** for all principals (including root) in the affected accounts.
- SCPs do **not** grant permissions; they restrict what IAM policies can allow.
- The management account itself is **never** affected by SCPs.
- SCPs can use `Deny` (blacklist) or `Allow` (whitelist with explicit allow on specific actions).

### Common SCP Patterns
```json
// Deny all actions outside approved regions
{
  "Effect": "Deny",
  "NotAction": [
    "iam:*", "sts:*", "cloudfront:*", "route53:*", "support:*", "budgets:*"
  ],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1", "us-west-2", "eu-west-1"]
    }
  }
}
```
```json
// Prevent disabling CloudTrail
{
  "Effect": "Deny",
  "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail"],
  "Resource": "*"
}
```
```json
// Require MFA for sensitive actions
{
  "Effect": "Deny",
  "Action": ["iam:*", "organizations:*"],
  "Resource": "*",
  "Condition": {
    "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
  }
}
```

### Delegated Administration
GuardDuty, Security Hub, IAM Access Analyzer, and Macie can all designate a **security tooling account** as the delegated administrator, receiving findings from all member accounts.

---

## 8. Amazon Cognito

### User Pools vs Identity Pools

| | User Pool | Identity Pool |
|---|---|---|
| **Purpose** | Authentication (who you are) | Authorization (AWS credentials) |
| **Returns** | JWT tokens (ID, Access, Refresh) | Temporary AWS credentials (STS) |
| **Use Case** | Sign up, sign in, MFA, hosted UI | Exchange JWT/SAML for AWS access |
| **Federated IdPs** | Google, Facebook, SAML, OIDC | User Pool, Google, Facebook, SAML, OIDC, unauthenticated guests |

### User Pool Token Flow
```
User signs in → User Pool authenticates → Returns:
  ID Token     (JWT, claims about the user — for your app)
  Access Token (JWT, OAuth 2.0 scopes — for API calls)
  Refresh Token (long-lived, get new ID/Access tokens)
```
- **ID Token**: contains user attributes (`email`, `sub`, custom attributes). Verify signature with Cognito's JWKS endpoint.
- **Access Token**: used to call Cognito User Pool API (e.g., update user info). Can be used as a Bearer token for API Gateway authorizers.

### Identity Pool Federation Flow
```
User authenticates with User Pool (or Google, etc.)
→ Receives JWT
→ Calls Cognito Identity Pool with JWT
→ Identity Pool calls STS AssumeRoleWithWebIdentity
→ Returns temporary AWS credentials
→ User directly calls AWS services (S3, DynamoDB) with those credentials
```
Identity Pools define **authenticated role** and **unauthenticated role** (guest access). Enhanced flow adds fine-grained role mapping per user group.

### Hosted UI
Cognito-managed OAuth 2.0 / OIDC endpoint. Supports Authorization Code with PKCE, Implicit (legacy), and Client Credentials flows. Custom domain + SSL required for production. Returns authorization code → exchange for tokens via `/oauth2/token` endpoint.

---

## 9. AWS WAF

### Core Concepts
- **Web ACL**: collection of rules applied to CloudFront, ALB, [API Gateway](/aws-api-gateway-networking), AppSync, Cognito User Pool.
- **Rule**: has a statement (what to match) and an action (Allow, Block, Count, CAPTCHA, Challenge).
- **Rule Group**: reusable set of rules with a capacity limit (WCU — WAF Capacity Units).
- **Statement Types**: IP set match, geo match, regex pattern set, size constraint, SQL injection match, XSS match, rate-based rule, managed rule group reference.

### Managed Rule Groups (AWS and Marketplace)
- `AWSManagedRulesCommonRuleSet` — OWASP Top 10 (SQLi, XSS, bad inputs).
- `AWSManagedRulesKnownBadInputsRuleSet` — known exploit patterns.
- `AWSManagedRulesAmazonIpReputationList` — AWS threat intelligence.
- `AWSManagedRulesBotControlRuleSet` — bot detection (common bots, targeted bots with browser fingerprinting).
- `AWSManagedRulesAntiDDoSRuleSet` — DDoS attack signatures (requires Shield Advanced).

### Rate-Based Rules
Aggregate requests by IP or custom key over a 5-minute window. Trigger on threshold → apply action (Block, CAPTCHA). Can scope to specific URIs or header values. First line of defense against credential stuffing and scraping.

### IP Sets and Geo Matching
- IP set: static list of CIDRs, updated manually or via Lambda automation.
- Geo match: allow or block entire countries. Used for compliance (GDPR data residency) or blocking high-abuse regions.

### WAF Logging
Send full request logs to S3, CloudWatch Logs, or Kinesis Data Firehose. Use Athena + S3 for ad-hoc analysis. `COUNT` action during testing before switching to `BLOCK`.

---

## 10. AWS Shield

| Feature | Shield Standard | Shield Advanced |
|---|---|---|
| **Cost** | Free, automatic | $3,000/month per org + data transfer fees |
| **Coverage** | L3/L4 volumetric DDoS (SYN floods, UDP reflection) | L3/L4 + L7 (HTTP floods), application-layer attacks |
| **SRT Access** | No | Yes — AWS Shield Response Team 24/7 |
| **Cost Protection** | No | Yes — credits for scaling costs during DDoS |
| **DDoS Dashboard** | No | Yes — real-time attack visibility |
| **Proactive Engagement** | No | Yes — SRT contacts you during events |
| **Resources Protected** | All AWS | EC2, ELB, CloudFront, Global Accelerator, Route 53 |

Shield Advanced integrates with WAF at no additional WAF cost for protected resources. Use Health-Based Detection (Route 53 health checks) to detect application-level impact.

---

## 11. AWS KMS

### Key Types

| Type | Who Controls Material | Rotation | Cross-Account |
|---|---|---|---|
| **AWS Managed Key** | AWS | Automatic (every year) | No |
| **Customer Managed Key (CMK)** | You (key policy) | Optional automatic or manual | Yes (key policy) |
| **Customer-Provided Key (SSE-C)** | You (sent per-request) | Your responsibility | N/A |
| **External Key Store (XKS)** | Your HSM (on-premises) | Your responsibility | N/A |

### Envelope Encryption
KMS never encrypts large data directly. Instead:
```
1. GenerateDataKey → returns (plaintext data key, encrypted data key)
2. Encrypt data locally with plaintext data key (AES-256-GCM)
3. Store encrypted data key alongside ciphertext
4. Discard plaintext data key from memory

To decrypt:
1. Call KMS Decrypt with encrypted data key → get plaintext data key
2. Decrypt data locally
3. Discard plaintext data key
```
This keeps KMS API calls minimal and supports large data. Used by [S3](/aws-storage-s3), EBS, RDS, [Lambda](/aws-lambda-serverless) environment variables, etc.

### Key Policies vs IAM Policies
- Key policy is **required** and takes precedence.
- If key policy has `"Principal": {"AWS": "arn:aws:iam::ACCOUNT:root"}` then IAM policies in that account can also grant KMS access.
- Without that root delegation statement, only explicit key policy entries grant access — IAM policies alone are insufficient.

### Grants
Temporary, delegated permissions to use a key. Created by `kms:CreateGrant`. Used by services (EBS, S3) to grant temporary access to specific operations on your behalf. No need to modify key policy. Retired when no longer needed via `kms:RetireGrant`.

### Key Rotation
- Automatic rotation: new backing key material created every year. Old material kept to decrypt old ciphertext. Key ID/ARN stays the same.
- Manual rotation: create a new CMK, update references in your application, keep old key enabled until old ciphertext is re-encrypted.

### Multi-Region Keys
Primary key in one region; replica keys in others. Same key material, different ARNs. Allows decrypt in a different region than where data was encrypted. Useful for disaster recovery and global applications.

---

## 12. Secrets Manager vs Parameter Store

| | Secrets Manager | Parameter Store |
|---|---|---|
| **Primary Use** | Database credentials, API keys, OAuth tokens | Configuration data, feature flags, secrets (via SecureString) |
| **Automatic Rotation** | Yes — built-in [Lambda](/aws-lambda-serverless) rotation for RDS, Redshift, DocumentDB; custom rotation Lambda | No native rotation (can implement with EventBridge + Lambda) |
| **Cost** | $0.40/secret/month + $0.05 per 10,000 API calls | Standard: free. Advanced: $0.05/parameter/month. Higher throughput: $0.05 per 10,000 API calls |
| **Max Secret Size** | 65,536 bytes | 4,096 bytes (standard), 8,192 bytes (advanced) |
| **Versioning** | Yes (AWSPENDING, AWSCURRENT, AWSPREVIOUS) | Yes (version labels) |
| **Cross-Account** | Yes (resource-based policy) | No |
| **Encryption** | KMS (required) | KMS (optional for SecureString) |
| **Hierarchies** | No | Yes (`/app/prod/db-url`) |

### Decision Rule
- **Secrets Manager**: anything that rotates, anything with database credentials, anything shared cross-account.
- **Parameter Store**: non-sensitive config, feature flags, anything where cost matters, hierarchical config by environment.

### Rotation Internals (Secrets Manager)
```
Rotation Lambda lifecycle:
  createSecret  → generate new credentials, store as AWSPENDING
  setSecret     → apply new credentials to the service (e.g., RDS password change)
  testSecret    → verify new credentials work
  finishSecret  → swap AWSPENDING → AWSCURRENT; old AWSCURRENT → AWSPREVIOUS
```
RDS Proxy integration: caches database connections, transparently uses latest secret during rotation with zero downtime.

---

## 13. VPC Security

### Security Groups vs NACLs

| | Security Group | NACL |
|---|---|---|
| **Level** | Instance/ENI (network interface) | Subnet |
| **State** | **Stateful** — return traffic auto-allowed | **Stateless** — must explicitly allow inbound AND outbound |
| **Rules** | Allow only (no explicit deny) | Allow and Deny |
| **Evaluation** | All rules evaluated, most permissive wins | Rules evaluated in order (lowest number first); first match wins |
| **Default** | New SG: deny all inbound, allow all outbound | Default NACL: allow all. Custom NACL: deny all |
| **Scope** | Can reference other SGs as source/dest | Only CIDR ranges |

### Security Group Best Practices
- Reference other SGs instead of CIDRs for dynamic cluster membership (e.g., `sg-alb-id` as source for `sg-app`).
- Inbound: only allow what's needed. Outbound: consider restricting to specific endpoints (VPC endpoints, NAT gateway).
- No `0.0.0.0/0` inbound on SSH/RDP; use SSM Session Manager instead.

### VPC Flow Logs
Log metadata (not payload) of IP traffic in/out of ENIs, subnets, or VPCs. Fields: version, account-id, interface-id, srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, start, end, **action** (ACCEPT/REJECT), log-status.

Destinations: CloudWatch Logs, S3. Query with CloudWatch Insights or Athena. Use for:
- Troubleshooting connectivity (REJECT records).
- Detecting port scans, exfiltration, unusual traffic patterns.
- Security investigations.

### VPC Endpoints
- **Gateway endpoints** ([S3](/aws-storage-s3), [DynamoDB](/dynamodb-data-services)): route table entries, no cost, keep traffic inside AWS.
- **Interface endpoints** (PrivateLink): ENI in your subnet, per-hour + per-GB cost. Works for most AWS services. Use endpoint policies to restrict which [S3](/aws-storage-s3) buckets are accessible via the endpoint.

---

## 14. CloudTrail

### What It Does
Records **every AWS API call** (management plane actions): who called what, from where, at what time, with what result. Essential for security forensics, compliance, and change auditing.

### Trail Configuration
- **Event types**: Management events (default, includes console logins, IAM changes, EC2 starts) and Data events (S3 object-level, Lambda invocations, DynamoDB item-level — not logged by default; costs more).
- **Multi-region trail**: single trail covers all regions. Recommended.
- **Organization trail**: created in management account, covers all member accounts.
- **S3 delivery**: logs delivered within ~15 minutes. Enable S3 MFA delete + versioning + access logging on the trail bucket.
- **CloudWatch Logs integration**: stream events to CloudWatch for real-time metric filters and alarms (e.g., alert on root login, SCP changes, unauthorized API calls).

### CloudTrail Log Structure (key fields)
```json
{
  "eventVersion": "1.08",
  "userIdentity": {
    "type": "AssumedRole",
    "principalId": "AROAEXAMPLE:session-name",
    "arn": "arn:aws:sts::123:assumed-role/AdminRole/session-name",
    "accountId": "123456789012"
  },
  "eventTime": "2026-03-28T12:00:00Z",
  "eventSource": "s3.amazonaws.com",
  "eventName": "DeleteBucket",
  "awsRegion": "us-east-1",
  "sourceIPAddress": "1.2.3.4",
  "requestParameters": { "bucketName": "critical-data-bucket" },
  "responseElements": null,
  "errorCode": "AccessDenied",
  "errorMessage": "Access Denied"
}
```

### Athena Analysis
Partition the CloudTrail S3 prefix by region/year/month/day. Create an Athena table with the CloudTrail schema. Example queries:
```sql
-- Find all API calls by a specific principal in the last 24 hours
SELECT eventtime, eventsource, eventname, errorcode
FROM cloudtrail_logs
WHERE useridentity.arn LIKE '%suspicious-role%'
  AND eventtime > '2026-03-27'
ORDER BY eventtime DESC;

-- Find all DeleteBucket calls
SELECT eventtime, sourceipaddress, requestparameters
FROM cloudtrail_logs
WHERE eventname = 'DeleteBucket';
```

### CloudTrail Insights
Detects unusual API activity (write management events). Compares baseline to current activity. Generates Insights events for anomalies like unusual IAM API call rates.

---

## 15. Amazon GuardDuty

### What It Does
Continuous threat detection ML service. Ingests: CloudTrail management + [S3](/aws-storage-s3) data events, VPC Flow Logs, DNS logs, [EKS](/aws-compute-containers) audit logs, RDS login activity, [Lambda](/aws-lambda-serverless) network activity, S3 access patterns, Malware Protection (EBS volumes).

### Finding Types (by threat purpose)
| Category | Example Findings |
|---|---|
| **Backdoor** | `Backdoor:EC2/C&CActivity.B` — EC2 communicating with known C2 |
| **Behavior** | `Behavior:EC2/NetworkPortUnusual` — instance using unusual port |
| **CryptoMining** | `CryptoCurrency:EC2/BitcoinTool.B` — crypto mining detected |
| **Recon** | `Recon:IAMUser/MaliciousIPCaller` — API calls from malicious IP |
| **Stealth** | `Stealth:IAMUser/CloudTrailLoggingDisabled` — trail stopped |
| **Trojan** | `Trojan:EC2/BlackholeTraffic` — traffic to sinkhole domain |
| **UnauthorizedAccess** | `UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B` — console login from Tor |
| **Execution** | `Execution:ECS/MaliciousFile` — malware in container |
| **PrivilegeEscalation** | `PrivilegeEscalation:IAMUser/AnomalousBehavior` — unusual IAM action |

### Suppression Rules
Filter out low-value findings (known benign activity) from current and future findings. Does not delete underlying data. Suppression rules match on finding type, severity, resource, or attribute.

### Delegated Admin
In AWS Organizations, designate a security account as GuardDuty delegated admin. All member accounts auto-enrolled. Aggregated findings in the security account. Individual accounts cannot disable GuardDuty.

### Response Automation
```
GuardDuty Finding → EventBridge Rule → Lambda
Lambda:
  - Isolate EC2 instance (change SG to deny-all)
  - Revoke IAM credentials (add inline deny policy)
  - Create snapshot of EBS volume for forensics
  - Send notification to Slack/PagerDuty
```

---

## 16. AWS Security Hub

### What It Does
Single pane of glass for AWS security findings. Aggregates findings from: GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager, Systems Manager Patch Manager, and third-party partners (CrowdStrike, Palo Alto, etc.).

### CSPM (Cloud Security Posture Management)
Security Hub runs continuous automated checks against your AWS resources. Findings are mapped to **ASFF** (Amazon Security Finding Format) and scored by severity.

### Compliance Standards
| Standard | What It Checks |
|---|---|
| **AWS Foundational Security Best Practices (FSBP)** | AWS-specific controls (MFA on root, no public S3, etc.) |
| **CIS AWS Foundations Benchmark v1.4/v3.0** | 50+ controls for AWS account hardening |
| **PCI DSS v3.2.1** | Controls for cardholder data environments |
| **NIST SP 800-53** | Federal security controls |
| **SOC 2** | Trust service criteria |

### Aggregation
- **Cross-region aggregation**: designate a home region; findings from all other regions flow in.
- **Cross-account (Organizations)**: delegated admin receives all member account findings.
- Custom action integrations: send findings to EventBridge for automated remediation.

### Finding Workflow
```
NEW → NOTIFIED → SUPPRESSED / RESOLVED
```
Integrate with Jira/ServiceNow via EventBridge + Lambda to auto-create tickets for high-severity findings.

---

## 17. Common Interview Questions & Strong Answers

**Q: What is the difference between an IAM role and an IAM user?**
**A:** An IAM user has long-term, static credentials (password + access key) representing a specific human or application. An IAM role has no long-term credentials; instead, it is _assumed_ by trusted principals (users, services, external identities) via STS, which issues short-lived temporary credentials. Use roles for all service-to-service communication, cross-account access, and federated identities. Prefer roles over users for non-human access because temporary credentials limit the blast radius of a compromise.

---

**Q: How does policy evaluation work when there are conflicting allow and deny statements?**
**A:** An explicit `Deny` always wins over any `Allow`, regardless of where it lives (identity policy, resource policy, SCP, permission boundary). The evaluation order is: explicit Deny first → SCP restrictions → resource-based policy → identity-based policy → permission boundary → session policy → implicit Deny (default). This means even if a user has `AdministratorAccess`, a single `Deny` statement in an SCP or permission boundary will block that action.

---

**Q: An EC2 instance in your VPC cannot reach an S3 bucket. How do you troubleshoot?**
**A:** Check in order: (1) Does the EC2 instance role have `s3:GetObject`/`s3:PutObject` on the bucket ARN? (2) Does the S3 bucket policy have an explicit Deny overriding it (e.g., restricting to a VPC endpoint)? (3) Is S3 Block Public Access blocking it? (4) Is there a VPC Gateway Endpoint for S3 in the route table for the subnet? If not, traffic goes through the internet — does the instance have a route to the internet (NAT for private subnet, IGW for public)? (5) Does the security group allow outbound HTTPS (443) to S3? (6) Does the NACL allow outbound HTTPS and inbound ephemeral ports (1024-65535)?

---

**Q: Explain envelope encryption and why KMS doesn't encrypt data directly.**
**A:** KMS has a 4KB payload limit and adds latency per API call. Envelope encryption solves this: you call `GenerateDataKey` to get a plaintext data key (256-bit AES) and its KMS-encrypted copy. You encrypt your data locally with the plaintext key (fast, no KMS call), then discard the plaintext key and store the encrypted key alongside the ciphertext. To decrypt, you call KMS `Decrypt` on the encrypted data key, then use the returned plaintext key to decrypt locally. This keeps all large data operations local while KMS protects the key material.

---

**Q: What is a confused deputy attack and how do you prevent it in AWS?**
**A:** The confused deputy problem occurs when a trusted service uses its authority to perform actions on behalf of an attacker. In AWS, a third-party SaaS (Account B) has a role in your account (Account A) to read your S3. Without protection, Account B's software could substitute your role ARN with another customer's role ARN, reading _their_ data using its AWS service permissions. Prevention: add a `sts:ExternalId` condition to the role's trust policy. The SaaS must supply the unique external ID (which only you and the SaaS know) when assuming the role, proving the call is legitimately on your behalf.

---

**Q: What is the difference between a Security Group and a NACL? Which would you use to block a specific IP?**
**A:** Security Groups are stateful and operate at the ENI level — return traffic is automatically allowed without an explicit rule. They only support Allow rules. NACLs are stateless and operate at the subnet level — you must explicitly allow both inbound and outbound traffic including return packets. NACLs support Deny rules and evaluate in ascending rule number order (first match wins). To block a specific IP address, use a **NACL** (or WAF for HTTP traffic) because Security Groups cannot deny — they only allow. Place the Deny rule at a lower number than any Allow rules.

---

**Q: How do you securely allow a Lambda function in Account A to read from an S3 bucket in Account B?**
**A:** Two-sided permission grant is required. In Account B, add a bucket policy statement granting `s3:GetObject` to `arn:aws:iam::ACCOUNT_A:role/LambdaExecutionRole`. In Account A, the Lambda's execution role must have an IAM policy allowing `s3:GetObject` on Account B's bucket ARN. Both sides must allow; either alone is insufficient for cross-account access. Use `aws:PrincipalOrgID` condition in the bucket policy for an added guardrail, ensuring only principals from your organization can be granted access.

---

**Q: What does GuardDuty detect and how does it differ from CloudTrail?**
**A:** CloudTrail is a raw audit log — it records every API call but does no analysis. GuardDuty is a threat detection service that consumes CloudTrail, VPC Flow Logs, and DNS logs as inputs and applies ML models and threat intelligence feeds to detect malicious patterns: EC2 instances calling C2 servers, crypto mining, credential exfiltration, unusual API call sequences (privilege escalation, data exfiltration). CloudTrail = what happened; GuardDuty = what looks malicious. GuardDuty finding triggers EventBridge for automated response.

---

**Q: How do SCPs differ from IAM policies? Can an SCP grant permissions?**
**A:** SCPs are guardrails, not grants. An SCP restricts the _maximum_ permissions available to all principals in an AWS Organization OU or account — including the account's root user. An SCP cannot grant any permissions; it only limits what IAM policies can allow. If an SCP allows `s3:*` and denies nothing else, a user still needs an IAM policy that explicitly allows S3 access. SCPs also never affect the management account.

---

**Q: When would you use Cognito User Pools vs Identity Pools? Can you use both together?**
**A:** User Pools handle application-level authentication: sign-up, sign-in, MFA, password reset. They return JWTs your API can validate. Identity Pools handle AWS authorization: they exchange a JWT (from a User Pool, Google, SAML, etc.) for temporary AWS credentials via STS. Use them together when your application needs to both authenticate users AND have those users call AWS services directly (S3, DynamoDB, IoT). The User Pool authenticates, and the Identity Pool federates those identities into AWS IAM roles.

---

**Q: How would you detect if an IAM access key has been compromised?**
**A:** (1) GuardDuty: `UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B` or recon finding types detect unusual API calls from malicious IPs/Tor. (2) CloudTrail: search for API calls from unusual IPs, unusual regions, at unusual times. (3) IAM Access Analyzer: check for unexpected resource access. (4) AWS Health events and credential report for old/unrotated keys. (5) AWS Config rule `access-keys-rotated`. Response: immediately deactivate the key, attach an explicit Deny inline policy to the user, investigate CloudTrail for the blast radius, rotate all secrets the compromised identity could access.

---

**Q: What is IAM Access Analyzer and how does it help with least privilege?**
**A:** Access Analyzer has three functions: (1) **External access analysis** — continuously scans IAM roles, S3 buckets, KMS keys, Lambda functions, SQS queues, Secrets Manager secrets to find any that allow access from outside the zone of trust (your account or org). (2) **Policy validation** — checks policies for correctness, security warnings, and adherence to best practices before deployment. (3) **Policy generation** — uses CloudTrail activity logs (up to 90 days) to generate a least-privilege policy that includes only the actions a principal actually used, eliminating permission bloat.

---

**Q: Explain the KMS key policy and why it is different from other resource-based policies.**
**A:** Every KMS CMK **must** have a key policy — there is no implicit default grant via IAM alone. If you create a CMK and do not include the root account delegation statement (`"Principal": {"AWS": "arn:aws:iam::ACCOUNT:root"}, "Action": "kms:*"`), then only the entities explicitly named in the key policy can use the key, even if they have `kms:*` in their IAM policy. This is unlike S3, where a missing bucket policy falls through to IAM. The key policy is the authoritative source; it must explicitly enable IAM delegation or list every principal. This prevents inadvertent key access due to overly broad IAM policies.

---

## 18. Architecture Patterns (Security-Focused)

### Secure Baseline Account Setup
```
Root account:
  - MFA enabled, no access keys
  - Budget alert set
  - CloudTrail organization trail enabled → S3 with MFA delete
  - GuardDuty delegated admin → security account
  - Security Hub delegated admin → security account
  - IAM Access Analyzer organization-level analyzer
  - Config rules: required-tags, restricted-ssh, mfa-enabled-for-iam-console
  - SCP: deny-root-access, require-mfa, restrict-regions, prevent-cloudtrail-disable
```

### Zero-Trust API Pattern
```
Client
  ↓ (HTTPS)
CloudFront + WAF (Managed rules + rate limiting)
  ↓
API Gateway (Cognito User Pool Authorizer or Lambda Authorizer)
  ↓ (validates JWT, injects principal context)
Lambda (execution role: least-privilege, no wildcard resources)
  ↓
DynamoDB / S3 / RDS Proxy
        ↓
   Secrets Manager (rotation enabled, RDS Proxy caches)
```

### Secrets Management Pattern
```
Application start:
  Lambda/ECS calls Secrets Manager GetSecretValue
  → returns JSON { "username": "...", "password": "..." }
  → cached in-process for TTL

Rotation event:
  EventBridge scheduled → rotation Lambda
  → createSecret → setSecret → testSecret → finishSecret
  → RDS Proxy detects new AWSCURRENT → seamless connection refresh
  → Zero downtime
```

### Cross-Account Deployment Pipeline
```
CI/CD Account:
  CodePipeline role → assumes DeployRole in Target Account
  Trust policy: allows ci-cd-account:CodePipelineRole with ExternalId

Target Account:
  DeployRole: permissions to CloudFormation, ECS update, Lambda deploy
  SCPs: prevent deploy role from modifying CloudTrail, GuardDuty, or security tooling

Security Account (delegated admin):
  Receives all GuardDuty + Security Hub findings
  Remediation Lambda auto-isolates resources on CRITICAL findings
```

---

## Red Flags to Avoid
- **"I use IAM users with access keys for everything."** Roles + STS temporary credentials are the standard for all service-to-service and CI/CD access.
- **"Our S3 bucket is private because there is no bucket policy."** Absence of policy means only IAM policies control access; Block Public Access settings must explicitly be enabled too.
- **"We rotate access keys every year."** 90 days maximum; prefer eliminating long-term keys entirely.
- **"GuardDuty and CloudTrail do the same thing."** CloudTrail logs; GuardDuty detects threats using those logs as input.
- **"Our KMS key is secure because the IAM policy denies access."** Without root delegation in the key policy, IAM policies alone do nothing for KMS.
- **"SCPs apply to the management account."** They do not. The management account is always exempt from SCPs.
- **"Permission boundaries add permissions."** They only restrict; they never grant.
- **"We encrypt everything with the same KMS key."** Use separate CMKs per service/environment; a compromised key policy then only affects one data domain.
- **"We disable MFA for service accounts because they are automated."** Service accounts should use IAM roles (which have no password/MFA) — not IAM users.
