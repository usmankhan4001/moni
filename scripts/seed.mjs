import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function seed() {
  console.log("Seeding database via PostgreSQL connection...");
  const client = await pool.connect();

  try {
    const tenantId = "00000000-0000-0000-0000-000000000001";

    // Ensure default workspace exists
    await client.query(
      `INSERT INTO tenants (id, name, slug, plan)
       VALUES ($1, 'Personal Workspace', 'default', 'pro')
       ON CONFLICT (id) DO NOTHING`,
      [tenantId]
    );

    // Clear existing data for default tenant
    await client.query(`DELETE FROM transactions WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM outsourcer_payments WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM projects WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM outsourcers WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM accounts WHERE tenant_id = $1`, [tenantId]);

    // Insert Accounts
    const acc1 = await client.query(
      `INSERT INTO accounts (tenant_id, name, currency) VALUES ($1, 'Wise Business', 'USD') RETURNING id`,
      [tenantId]
    );
    const acc2 = await client.query(
      `INSERT INTO accounts (tenant_id, name, currency) VALUES ($1, 'HBL Current', 'PKR') RETURNING id`,
      [tenantId]
    );

    const wiseId = acc1.rows[0].id;

    // Insert Outsourcers
    const os1 = await client.query(
      `INSERT INTO outsourcers (tenant_id, name, tax_rate, transfer_fee_rate) VALUES ($1, 'Ahmed Khan', 5, 2) RETURNING id`,
      [tenantId]
    );
    const os2 = await client.query(
      `INSERT INTO outsourcers (tenant_id, name, tax_rate, transfer_fee_rate) VALUES ($1, 'Fatima Ali', 5, 2) RETURNING id`,
      [tenantId]
    );
    const os3 = await client.query(
      `INSERT INTO outsourcers (tenant_id, name, tax_rate, transfer_fee_rate) VALUES ($1, 'Hassan Malik', 5, 2) RETURNING id`,
      [tenantId]
    );

    const ahmedId = os1.rows[0].id;
    const fatimaId = os2.rows[0].id;
    const hassanId = os3.rows[0].id;

    // Insert Projects
    await client.query(
      `INSERT INTO projects (tenant_id, title, amount_usd, outsourcer_id, status)
       VALUES 
       ($1, 'E-commerce Dashboard', 2400.00, $2, 'completed'),
       ($1, 'Mobile App Redesign', 3800.00, $3, 'active'),
       ($1, 'API Integration', 1500.00, $4, 'active'),
       ($1, 'Brand Identity', 1800.00, $2, 'completed')`,
      [tenantId, ahmedId, fatimaId, hassanId]
    );

    // Insert Transactions
    await client.query(
      `INSERT INTO transactions (tenant_id, type, description, amount, currency, account_id)
       VALUES 
       ($1, 'income', 'Client payment — Acme Corp', 5200.00, 'USD', $2),
       ($1, 'expense', 'Cloud hosting — AWS', 95.00, 'USD', $2)`,
      [tenantId, wiseId]
    );

    // Insert App Settings
    await client.query(
      `INSERT INTO app_settings (tenant_id, exchange_rate, pay_percentage, default_tax_rate, default_transfer_fee_rate)
       VALUES ($1, 284.50, 70.00, 5.00, 2.00)
       ON CONFLICT (tenant_id) DO UPDATE 
       SET exchange_rate = EXCLUDED.exchange_rate, pay_percentage = EXCLUDED.pay_percentage`,
      [tenantId]
    );

    console.log("Successfully seeded database with starter data.");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
