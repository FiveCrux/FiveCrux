const { db } = require('./lib/db/client');
const { props } = require('./lib/db/schema');
const { eq, desc } = require('drizzle-orm');

async function test() {
  try {
    const allProps = await db.query.props.findMany({
      orderBy: [desc(props.createdAt)],
      with: {
        user: true,
      },
      limit: 5
    });
    
    console.log('Props with users:');
    allProps.forEach(p => {
      console.log(`Prop: ${p.name}, Creator ID: ${p.createdBy}, User Obj:`, p.user ? { name: p.user.name, email: p.user.email } : 'NULL');
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
