import { Mastra } from '@mastra/core'
import { CloudflareDeployer } from '@mastra/deployer-cloudflare'
import { PostgresStore } from '@mastra/pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'knowledge-mastra',
    schemaName: 'mastra',
    connectionString: databaseUrl,
  }),
  deployer: new CloudflareDeployer({
    name: 'knowledge-mastra',
    vars: {
      NODE_ENV: 'production',
    },
  }),
  agents: {},
  workflows: {},
})
