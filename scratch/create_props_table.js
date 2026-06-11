const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_xBL8Zd9SzPiu@ep-steep-silence-a171izgq-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    const query = `
      CREATE TABLE IF NOT EXISTS "props" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "discount_percentage" numeric(5, 2) DEFAULT 0,
        "discounted_price" numeric(10, 2),
        "images" text[] DEFAULT '{}',
        "zip_file" text NOT NULL,
        "created_by" text NOT NULL REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `;
    
    console.log('Executing query...');
    await client.query(query);
    console.log('Table "props" created successfully.');
  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    await client.end();
  }
}

main();
