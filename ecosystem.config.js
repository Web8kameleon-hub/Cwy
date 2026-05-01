/**
 * PM2 Ecosystem Configuration
 * Ndez të gjitha shërbimet Web8 / Clisonix 24/7 në Hetzner
 * Command: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [
    // ═══════════════════════════════════════════════════════
    // CORE AGI SERVICES (7000-8000) — Clisonix Neural Layer
    // ═══════════════════════════════════════════════════════

    {
      name: 'ocean-core',
      script: '/opt/ocean-core/ocean_core.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '4G',
      error_file: '/var/log/ocean-core-error.log',
      out_file: '/var/log/ocean-core.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: { PORT: 7000, CWY_BRIDGE: 'true' }
    },

    {
      name: 'asi-agents',
      script: '/opt/asi-agents/agents_registry.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '3G',
      error_file: '/var/log/asi-agents-error.log',
      out_file: '/var/log/asi-agents.log',
      env: { PORT: 7100, AGENT_COUNT: 12 }
    },

    {
      name: 'ai-v2',
      script: '/opt/ai-v2/model_orchestration.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '5G',
      error_file: '/var/log/ai-v2-error.log',
      out_file: '/var/log/ai-v2.log',
      env: { PORT: 7200, MODEL_CACHE: '/opt/models' }
    },

    {
      name: 'euroweb-agi',
      script: '/opt/euroweb-agi/thinking_engine.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '4G',
      error_file: '/var/log/euroweb-agi-error.log',
      out_file: '/var/log/euroweb-agi.log',
      env: { PORT: 7300, META_REASONING: 'true' }
    },

    {
      name: 'labors',
      script: '/opt/labors/labor_units.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '6G',
      error_file: '/var/log/labors-error.log',
      out_file: '/var/log/labors.log',
      env: { PORT: 7400, WORKER_COUNT: 4 }
    },

    {
      name: 'nin-engine',
      script: '/opt/cwy-nin-engine/nin_core.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '2G',
      error_file: '/var/log/nin-engine-error.log',
      out_file: '/var/log/nin-engine.log',
      env: { PORT: 7500, SENSE_INTERVAL: 10 }
    },

    {
      name: 'orchestrator',
      script: '/opt/orchestrator/main.py',
      interpreter: 'python3',
      watch: false,
      max_memory_restart: '8G',
      error_file: '/var/log/orchestrator-error.log',
      out_file: '/var/log/orchestrator.log',
      env: {
        PORT: 8000,
        ORCHESTRATOR_MODE: 'production',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        DATABASE_URL: process.env.DATABASE_URL
      }
    },

    // ═══════════════════════════════════════════════════════
    // CWY LICENSE SERVER (Node.js)
    // ═══════════════════════════════════════════════════════

    {
      name: 'cwy-license-server',
      script: '/home/cwy/server.js',
      interpreter: 'node',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/cwy-license-error.log',
      out_file: '/var/log/cwy-license.log',
      env: {
        PORT: 9000,
        NODE_ENV: 'production',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        DATABASE_URL: process.env.DATABASE_URL
      }
    }
  ],

  // ═══════════════════════════════════════════════════════
  // CLUSTER SETTINGS
  // ═══════════════════════════════════════════════════════

  deploy: {
    production: {
      user: 'root',
      host: '62.238.21.125',
      ref: 'origin/main',
      repo: 'https://github.com/Web8kameleon-hub/Cwy.git',
      path: '/opt/cwy-production',
      'post-deploy': 'npm install && pm2 restart all'
    }
  }
};
