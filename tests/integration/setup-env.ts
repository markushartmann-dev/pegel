// Umgebung für Integrationstests – muss vor dem Import der Server-Module gesetzt sein.
process.env.DATABASE_URL = "postgresql://pegel:pegel@localhost:54331/pegel_test";
process.env.AUTH_SECRET = "integration-test-secret-0123456789-abcdefghijklmnop";
process.env.APP_URL = "http://localhost:3000";
process.env.COOKIE_SECURE = "false";
process.env.SCHEDULER_ENABLED = "false";
process.env.DISABLE_AUTH_RATE_LIMIT = "true";
process.env.REGISTRATION_ENABLED = "true";
process.env.SESSION_MAX_AGE_DAYS = "30";
