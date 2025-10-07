import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection with connection pooling and limits
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 5, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  max_lifetime: 60 * 30, // Close connections after 30 minutes
});

export const db = drizzle(client, { schema });

// Log successful connection
console.log('Database connection initialized with connection pooling');

// Export schema for use in other files
export * from './schema';
