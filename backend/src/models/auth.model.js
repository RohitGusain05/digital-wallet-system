const { pgPool } = require('../config/db');

const findUserByEmail = async (email) => {
  const { rows } = await pgPool.query(
    `SELECT id, full_name, email, password_hash, is_active, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

const findUserById = async (id) => {
  const { rows } = await pgPool.query(
    `SELECT id, full_name, email, is_active, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const createUserWithWallet = async ({ fullName, email, passwordHash }) => {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, is_active, created_at, updated_at`,
      [fullName, email, passwordHash]
    );

    const user = userResult.rows[0];

    const walletResult = await client.query(
      `INSERT INTO wallets (user_id, currency)
       VALUES ($1, 'INR')
       RETURNING id, user_id, balance, currency, created_at, updated_at`,
      [user.id]
    );

    await client.query('COMMIT');

    return { user, wallet: walletResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUserWithWallet
};
