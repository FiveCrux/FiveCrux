require("dotenv/config");

const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(`
      select
        to_regclass('public.pending_props') as pending,
        to_regclass('public.approved_props') as approved,
        to_regclass('public.rejected_props') as rejected
    `);

    console.log(JSON.stringify(result.rows[0]));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
