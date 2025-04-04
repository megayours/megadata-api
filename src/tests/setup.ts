import { beforeAll } from "bun:test";
import { config } from "dotenv";

// Set up test environment variables
config({ path: ".env.local" });

// Add any other test setup here
beforeAll(() => {
  // Add any setup that needs to run before all tests
});