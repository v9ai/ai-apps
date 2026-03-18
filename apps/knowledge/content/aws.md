# Amazon Web Services

## The 30-Second Pitch
AWS is a comprehensive, evolving cloud computing platform from Amazon that provides a mix of infrastructure-as-a-service (IaaS), platform-as-a-service (PaaS), and packaged software-as-a-service (SaaS) offerings. It solves the fundamental problem of capital expenditure and operational overhead for computing resources by providing on-demand, scalable, and pay-as-you-go services. A team—especially one in a multi-cloud environment like this role—would pick AWS for its market-leading breadth and depth of services (over 200), its mature ecosystem, its global infrastructure (Regions, Availability Zones), and its powerful primitives for AI/ML, data engineering, and serverless computing, which enable rapid innovation without managing underlying hardware.

## How It Actually Works
The core mental model is **global infrastructure composed of Regions and Availability Zones (AZs)**. A Region is a geographic area (e.g., `us-east-1`), and each Region contains multiple, isolated AZs—physically separate data centers with redundant power, networking, and connectivity. This is the foundation of high availability and fault tolerance. Services are built on top of this, abstracting into several key layers:

1.  **Compute:** EC2 (virtual servers), Lambda (serverless functions), ECS/EKS (container orchestration).
2.  **Storage:** S3 (object storage), EBS (block storage for EC2), EFS (file storage).
3.  **Database:** RDS (managed relational), DynamoDB (managed NoSQL), Aurora (high-performance MySQL/PostgreSQL).
4.  **Networking & Content Delivery:** VPC (private virtual network), CloudFront (CDN), Route 53 (DNS).
5.  **AI/ML:** SageMaker (end-to-end ML platform), Bedrock (managed foundation models), Comprehend (NLP).

**Data Flow & Control Plane:** Users interact with AWS via the AWS Management Console (UI), CLI, or SDKs (like for Node.js). These calls go to the AWS public API endpoints, which are served by a globally distributed control plane. The control plane authenticates the request (using IAM credentials), authorizes it, and then issues commands to the **data plane**—the actual resources (EC2 instances, S3 buckets) in your chosen Region. For example, a `PUT` request to S3 goes to the `s3.us-east-1.amazonaws.com` endpoint, is validated by IAM, and then writes data to storage systems in the `us-east-1` region.

```
[User/App] --(API Call)--> [AWS Global Endpoint / Control Plane]
                                  |
                                  v
                          [Authentication & Authorization (IAM)]
                                  |
                                  v
                [Command to Data Plane in Specific Region]
                                  |
                                  v
                [Resource (e.g., EC2, S3 Bucket, Lambda)]
```

**Key Internals to Know:**
*   **IAM (Identity and Access Management):** The absolute core of security. Everything that calls an AWS API (a user, an EC2 instance, a Lambda function) is a **principal**. Principals are authenticated and then authorized via **policies** (JSON documents defining permissions). The **security triad** is: Principal -> Authentication -> Authorization -> Action -> Resource.
*   **VPC Networking:** Your logically isolated network. You define IP ranges (CIDR blocks), subnets (public/private), route tables, and internet/NAT gateways. Crucial for microservices architecture.
*   **Event-Driven Architecture:** Many services (S3, DynamoDB, API Gateway) can emit events to **EventBridge** or directly invoke **Lambda** functions, enabling loose coupling. This is a dominant pattern for serverless applications.

## Patterns You Should Know

### 1. Serverless API Backend with AI Integration
A common pattern for full-stack AI apps. API Gateway handles HTTP requests, Lambda runs business logic (potentially in Node.js), and it calls AWS AI services or your own model deployed on SageMaker.

```javascript
// Lambda function (Node.js) using the AWS SDK to call Amazon Bedrock
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

exports.handler = async (event) => {
    const userPrompt = JSON.parse(event.body).prompt;

    const payload = {
        prompt: `\n\nHuman: ${userPrompt}\n\nAssistant:`,
        max_tokens_to_sample: 300,
        temperature: 0.7,
    };

    const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-v2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
    });

    try {
        const response = await bedrockClient.send(command);
        const result = JSON.parse(Buffer.from(response.body).toString());
        return {
            statusCode: 200,
            body: JSON.stringify({ completion: result.completion }),
        };
    } catch (error) {
        console.error('Error invoking Bedrock:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Model invocation failed' }) };
    }
};
```
*API Gateway is configured with a POST method that triggers this Lambda.*

### 2. Event-Driven Data Processing Pipeline
Ideal for processing uploaded files (e.g., documents for RAG with LlamaIndex). S3 event triggers Lambda, which processes the file and stores metadata/results in DynamoDB.

```yaml
# SAM (Serverless Application Model) Template Snippet
Resources:
  DocumentProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: document-processor/
      Handler: index.handler
      Runtime: nodejs18.x
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref SourceBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref MetadataTable
      Events:
        FileUpload:
          Type: S3
          Properties:
            Bucket: !Ref SourceBucket
            Events: s3:ObjectCreated:*
```

```javascript
// Lambda handler for the above
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const s3 = new S3Client();
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key);

        // 1. Get file from S3
        const getObjectCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
        const fileData = await s3.send(getObjectCmd);
        const textContent = await fileData.Body.transformToString();

        // 2. Process with LlamaIndex (simplified - would require imports)
        // const index = await LlamaIndex.fromTexts([textContent], ...);
        // const queryEngine = index.asQueryEngine();
        // const summary = await queryEngine.query("Summarize this document");

        // 3. Store metadata in DynamoDB
        const putItemCmd = new PutItemCommand({
            TableName: process.env.METADATA_TABLE,
            Item: {
                documentId: { S: key },
                processedDate: { S: new Date().toISOString() },
                // summary: { S: summary.response }
                rawTextSnippet: { S: textContent.substring(0, 500) }
            }
        });
        await ddb.send(putItemCmd);
    }
};
```

### 3. Containerized Microservice Deployment on ECS Fargate
For longer-running or more complex services than Lambda. Docker container deployed via ECS Fargate (serverless containers) behind an Application Load Balancer (ALB).

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

```yaml
# task-definition.json snippet (simplified)
{
  "family": "ai-microservice",
  "networkMode": "awsvpc",
  "executionRoleArn": "arn:aws:iam::account-id:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "app",
    "image": "<ECR_REPO_URI>:latest",
    "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
    "environment": [
      { "name": "MODEL_ENDPOINT", "value": "https://runtime.sagemaker.us-east-1.amazonaws.com/..." }
    ],
    "secrets": [
      { "name": "API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:account-id:parameter/AI_API_KEY" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/ai-microservice",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048"
}
```
*CI/CD pipeline (e.g., using AWS CodePipeline) would build the Docker image, push to ECR, and update the ECS service.*

### 4. Multi-Cloud Strategy with AWS as Primary
Given the role mentions Azure and GCP, a common pattern is using AWS as the primary cloud for core applications and AI/ML (SageMaker, Bedrock), while using other clouds for specific services, disaster recovery, or due to acquisitions. Key is **identity federation** (using IAM Identity Center/SAML 2.0 to grant AWS access to corporate identities) and **network connectivity** (AWS Direct Connect/Azure ExpressRoute) for hybrid/multi-cloud.

## What Interviewers Actually Ask

**Q: Explain how IAM works. How do you grant an EC2 instance permission to read from an S3 bucket?**
**A:** IAM authenticates principals (users, roles, services) and authorizes actions via JSON policies attached to them. For an EC2 instance, you don't use user credentials. Instead, you create an **IAM Role** with a policy granting `s3:GetObject` on the target bucket. You then attach this role to the EC2 instance (or its launch configuration). The instance metadata service provides temporary credentials to the instance, allowing it to call S3.

**Q: When would you choose Amazon Aurora over DynamoDB, or vice versa?**
**A:** Choose **Aurora** when you need a relational database with complex queries, joins, transactions (ACID compliance), and you have a well-defined schema. It's great for traditional application data. Choose **DynamoDB** for massively scalable, low-latency workloads with a simple key-value or document access pattern. It's serverless, scales automatically, and is ideal for high-traffic microservices, session stores, or real-time data where predictable single-digit millisecond latency is critical.

**Q: You have a Lambda function that's timing out intermittently. What's your debugging process?**
**A:** First, check **CloudWatch Logs** for the specific invocation's logs and any errors. Then, examine the **Lambda metrics** in CloudWatch: `Duration` (is it near the configured timeout?), `Throttles`, `ConcurrentExecutions`, and `Errors`. Check if it's hitting an external dependency (database, API) that's slow—use X-Ray for tracing. Also, verify the function's memory configuration; increasing memory also increases CPU proportionally, which can reduce duration.

**Q: How would you design a system to process thousands of PDFs uploaded by users, extract text, and make it queryable?**
**A:** This is a classic event-driven, serverless ETL pipeline. 1) Users upload PDFs to an S3 bucket. 2) S3 triggers a Lambda function (or Step Function workflow) for each new file. 3) The function uses a library (like Textract or a Python PDF lib) to extract text. 4) The text is chunked and embedded (using a model from SageMaker or Bedrock). 5) The embeddings and metadata are stored in a vector database (like Pinecone) or a purpose-built service like Amazon OpenSearch with vector support. 6) A separate query API (API Gateway + Lambda) uses LlamaIndex on top of this vector store to answer questions.

**Q: When would you NOT use a serverless approach (Lambda)?**
**A:** Avoid Lambda for long-running processes (over 15 minutes), applications with consistent, predictable high traffic where reserved instances would be far cheaper, tasks requiring specific GPU instances for long periods, or when you need fine-grained control over the underlying OS, file system, or need to keep a persistent in-memory cache warm.

**Q: How does AWS fit into a multi-cloud strategy alongside Azure and GCP?**
**A:** AWS can serve as the **primary cloud** for its superior breadth of AI/ML services (SageMaker, Bedrock) and mature container ecosystem (EKS). The key is to avoid deep vendor lock-in for any one component. Use Terraform or Crossplane for infrastructure-as-code to manage resources across clouds. Leverage cloud-agnostic services (Kubernetes, Kafka) where possible. Use each cloud for its strengths: AWS for AI innovation and global reach, Azure for tight Microsoft integration (if needed), GCP for data analytics (BigQuery) or specific AI models.

**Q: How do you manage secrets (API keys, database passwords) in AWS?**
**A:** Never hardcode secrets. Use **AWS Secrets Manager** for automatic rotation and retrieval of secrets (e.g., RDS passwords). For non-rotating configuration data, use **AWS Systems Manager Parameter Store** (especially the SecureString type). Both integrate with IAM for fine-grained access control. In Lambda, reference them via environment variables that pull from these services at runtime. In ECS/EKS, use task definition secrets or Kubernetes Secrets (integrated with ASM via CSI driver).

**Q: Explain the difference between an Availability Zone outage and a Region outage. How do you design for each?**
**A:** An **AZ outage** is a failure within one data center complex. Design for this by distributing resources across multiple AZs in an active-active or active-passive configuration (e.g., EC2 instances in an Auto Scaling Group across AZs, Multi-AZ RDS). A **Region outage** is a complete geographic failure. Design for this with a **disaster recovery (DR)** strategy, like the pilot light (minimal resources running in a second region) or warm standby (scaled-down but functional environment in a second region), using Route 53 for DNS failover. Data must be replicated cross-region (e.g., S3 Cross-Region Replication).

## How It Connects to This Role's Stack
As a **Senior Full Stack AI Engineer** in a multi-cloud environment, AWS is likely the core platform for **AI/ML workloads** and **scalable backend services**.

*   **LlamaIndex & AWS:** You'd use LlamaIndex to build RAG (Retrieval-Augmented Generation) pipelines. The data sources would be documents in **S3**. The embedding models and LLMs could be served from **Amazon SageMaker** endpoints or accessed via **Bedrock**. The vector index could be stored in **OpenSearch** (with k-NN) or **Pinecone** (via API). The entire pipeline can be orchestrated using **Step Functions** or **Lambda**.
*   **Node.js & AWS:** Node.js is a first-class citizen in AWS. Lambda natively supports it for serverless functions. You can containerize Node.js apps and run them on **ECS Fargate** or **EKS**. The AWS SDK for JavaScript (v3) is modular and efficient.
*   **Multi-Cloud (Azure, GCP):** The role demands understanding where AWS fits. You might use **AWS for core AI model training (SageMaker)** and **real-time inference**, while using **Azure for enterprise AD integration** or **GCP's Vertex AI for specific model APIs**. Networking them via VPC peering or transit gateways, and managing identity across them via IAM Identity Center/SAML, is key.
*   **CI/CD:** AWS provides **CodePipeline, CodeBuild, and CodeDeploy** for a fully managed CI/CD suite. You'd use this to automate testing and deployment of your Node.js microservices and AI model pipelines to Lambda, ECS, or SageMaker.
*   **Microservices, Docker, Kubernetes:** AWS's primary managed Kubernetes service is **EKS**. You'd deploy your Dockerized microservices here. **AWS App Mesh** (service mesh) or the **AWS Load Balancer Controller** integrate deeply with EKS for networking. For simpler container orchestration, **ECS** is a robust alternative.

## Red Flags to Avoid
*   **"I just use the Console for everything."** Senior engineers automate with CloudFormation, CDK, or Terraform. Mention Infrastructure-as-Code (IaC) as a non-negotiable practice.
*   **"IAM is just for users."** Not understanding IAM roles for services (EC2, Lambda) is a fundamental gap.
*   **"We put everything in the public subnet to make it easier."** This shows a lack of security-first VPC design understanding. Always place backend resources in private subnets.
*   **"Lambda is for everything, it's always cheaper."** Not recognizing its limitations (timeout, cold starts, cost at scale) shows inexperience.
*   **"High availability means using multiple EC2 instances in the same AZ."** This misses the core AZ failure domain concept.
*   **"We store database passwords in environment variables in the code repository."** This is a major security anti-pattern. You must mention Secrets Manager or Parameter Store.
*   **"AWS is the only cloud we need to think about."** For this specific multi-cloud role, failing to articulate how AWS compares and integrates with Azure/GCP would be a significant miss. Show strategic thinking about using the best tool for the job across providers.
*   **"S3 is a file system."** Referring to S3 like a traditional filesystem (e.g., expecting strong consistency for all operations, using it for frequent small writes) indicates a shallow understanding. It's an object store with specific consistency models (read-after-write for PUTs, eventual for DELETEs/overwrites).