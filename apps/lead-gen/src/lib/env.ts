/**
 * Environment Configuration Module
 *
 * Loads and validates environment variables for scripts and applications.
 *
 * Environment variables required:
 * - OPENAI_API_KEY (or other LLM provider)
 *
 * Note: Next.js automatically loads .env files at build time.
 * For standalone scripts, load dotenv before importing this module:
 *   require('dotenv').config({ path: '.env.local' });
 */

/**
 * Environment variable configuration with validation
 */
export interface EnvConfig {
  // LLM Provider Configuration
  llm: {
    openaiApiKey?: string;
    deepseekApiKey?: string;
  };

  // Other APIs
  apis?: {
    resendApiKey?: string;
    braveApiKey?: string;
  };
}

/**
 * Get optional environment variable
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key]?.trim();
}

/**
 * Validate and load environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  return {
    llm: {
      openaiApiKey: getOptionalEnv("OPENAI_API_KEY"),
      deepseekApiKey: getOptionalEnv("DEEPSEEK_API_KEY"),
    },

    apis: {
      resendApiKey: getOptionalEnv("RESEND_API_KEY"),
      braveApiKey: getOptionalEnv("BRAVE_API_KEY"),
    },
  };
}

/**
 * Load and validate configuration on import
 * This ensures environment variables are available immediately
 */
let envConfig: EnvConfig;

try {
  envConfig = loadEnvConfig();
} catch (error) {
  console.error("❌ Environment configuration error:");
  console.error(error instanceof Error ? error.message : error);
  throw error;
}

/**
 * Export validated configuration
 */
export const env = envConfig;

/**
 * Export individual environment variables for convenience
 */
export const OPENAI_API_KEY = env.llm.openaiApiKey?.trim();
export const DEEPSEEK_API_KEY = env.llm.deepseekApiKey?.trim();

/**
 * Ensure environment is loaded (call this at the start of scripts)
 */
export function ensureEnvLoaded(): void {
  if (!envConfig) {
    throw new Error("Environment configuration not loaded");
  }
  console.log("✅ Environment configuration loaded successfully");
}

// Export default for easy import
export default env;
