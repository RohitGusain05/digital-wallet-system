const { pgPool } = require('../config/db');
const AppError = require('../utils/app-error');

const parseAmount = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const getWalletByUserId = async (userId) => {
  const { rows } = await pgPool.query(
    `SELECT id, user_id, balance, currency, created_at, updated_at
     FROM wallets WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const getWalletSnapshot = async (userId) => {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  return wallet;
};

const findExistingIdempotentTransaction = async (client, key, walletId) => {
  if (!key) return null;
  const { rows } = await client.query(
    `SELECT t.id, t.reference_id, t.sender_wallet_id, t.receiver_wallet_id,
            t.type, t.status, t.amount, t.currency, t.description, t.created_at
     FROM transactions t
     WHERE t.idempotency_key = $1
       AND (t.sender_wallet_id = $2 OR t.receiver_wallet_id = $2)
     LIMIT 1`,
    [key, walletId]
  );
  return rows[0] || null;
};

const deposit = async ({ userId, amount, idempotencyKey, description }) => {
  const parsedAmount = parseAmount(amount);
  if (!parsedAmount) throw new AppError('Amount must be a positive value with up to 2 decimals', 400, 'INVALID_AMOUNT');

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const walletResult = await client.query(
      `SELECT id, user_id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');

    const existing = await findExistingIdempotentTransaction(client, idempotencyKey, wallet.id);
    if (existing) {
      await client.query('COMMIT');
      return { transaction: existing, idempotent: true };
    }

    const balanceResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, balance, currency, updated_at`,
      [parsedAmount, wallet.id]
    );

    const transactionResult = await client.query(
      `INSERT INTO transactions
       (receiver_wallet_id, type, status, amount, currency, idempotency_key, description)
       VALUES ($1, 'DEPOSIT', 'COMPLETED', $2, $3, $4, $5)
       RETURNING id, reference_id, type, status, amount, currency, description, created_at`,
      [wallet.id, parsedAmount, wallet.currency, idempotencyKey || null, description?.trim() || null]
    );

    await client.query('COMMIT');
    return { wallet: balanceResult.rows[0], transaction: transactionResult.rows[0], idempotent: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && idempotencyKey) {
      const existing = await getWalletByUserId(userId);
      throw new AppError('The idempotency key has already been used', 409, 'IDEMPOTENCY_KEY_REUSED');
    }
    throw error;
  } finally {
    client.release();
  }
};

const withdraw = async ({ userId, amount, idempotencyKey, description }) => {
  const parsedAmount = parseAmount(amount);
  if (!parsedAmount) throw new AppError('Amount must be a positive value with up to 2 decimals', 400, 'INVALID_AMOUNT');

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const walletResult = await client.query(
      `SELECT id, user_id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');

    const existing = await findExistingIdempotentTransaction(client, idempotencyKey, wallet.id);
    if (existing) {
      await client.query('COMMIT');
      return { transaction: existing, idempotent: true };
    }

    const balance = Number(wallet.balance);
    if (balance < parsedAmount) {
      throw new AppError('Insufficient wallet balance', 400, 'INSUFFICIENT_BALANCE');
    }

    const updated = await client.query(
      `UPDATE wallets SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, user_id, balance, currency, updated_at`,
      [parsedAmount, wallet.id]
    );

    const transactionResult = await client.query(
      `INSERT INTO transactions
       (sender_wallet_id, type, status, amount, currency, idempotency_key, description)
       VALUES ($1, 'WITHDRAWAL', 'COMPLETED', $2, $3, $4, $5)
       RETURNING id, reference_id, type, status, amount, currency, description, created_at`,
      [wallet.id, parsedAmount, wallet.currency, idempotencyKey || null, description?.trim() || null]
    );

    await client.query('COMMIT');
    return { wallet: updated.rows[0], transaction: transactionResult.rows[0], idempotent: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && idempotencyKey) {
      throw new AppError('The idempotency key has already been used', 409, 'IDEMPOTENCY_KEY_REUSED');
    }
    throw error;
  } finally {
    client.release();
  }
};

const transfer = async ({ userId, receiverEmail, amount, idempotencyKey, description }) => {
  const parsedAmount = parseAmount(amount);
  if (!parsedAmount) throw new AppError('Amount must be a positive value with up to 2 decimals', 400, 'INVALID_AMOUNT');
  if (!receiverEmail || typeof receiverEmail !== 'string') throw new AppError('Receiver email is required', 400, 'RECEIVER_REQUIRED');

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const senderResult = await client.query(
      `SELECT w.id, w.user_id, w.balance, w.currency, u.email
       FROM wallets w JOIN users u ON u.id = w.user_id
       WHERE w.user_id = $1 FOR UPDATE`,
      [userId]
    );
    const sender = senderResult.rows[0];
    if (!sender) throw new AppError('Sender wallet not found', 404, 'WALLET_NOT_FOUND');

    const normalizedEmail = receiverEmail.trim().toLowerCase();
    if (normalizedEmail === sender.email) throw new AppError('You cannot transfer money to yourself', 400, 'SELF_TRANSFER');

    const existing = await findExistingIdempotentTransaction(client, idempotencyKey, sender.id);
    if (existing) {
      await client.query('COMMIT');
      return { transaction: existing, idempotent: true };
    }

    const receiverResult = await client.query(
      `SELECT w.id, w.user_id, w.balance, w.currency, u.email
       FROM wallets w JOIN users u ON u.id = w.user_id
       WHERE u.email = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [normalizedEmail]
    );
    const receiver = receiverResult.rows[0];
    if (!receiver) throw new AppError('Receiver account not found', 404, 'RECEIVER_NOT_FOUND');
    if (receiver.currency !== sender.currency) throw new AppError('Wallet currencies do not match', 400, 'CURRENCY_MISMATCH');

    // Lock the second wallet in deterministic UUID order to reduce deadlock risk.
    if (receiver.id !== sender.id) {
      const [firstId, secondId] = [sender.id, receiver.id].sort();
      await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [firstId]);
      await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [secondId]);
    }

    const balanceResult = await client.query(
      `SELECT balance FROM wallets WHERE id = $1 FOR UPDATE`,
      [sender.id]
    );
    if (Number(balanceResult.rows[0].balance) < parsedAmount) {
      throw new AppError('Insufficient wallet balance', 400, 'INSUFFICIENT_BALANCE');
    }

    await client.query(
      `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
      [parsedAmount, sender.id]
    );
    await client.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [parsedAmount, receiver.id]
    );

    const transactionResult = await client.query(
      `INSERT INTO transactions
       (sender_wallet_id, receiver_wallet_id, type, status, amount, currency, idempotency_key, description)
       VALUES ($1, $2, 'TRANSFER', 'COMPLETED', $3, $4, $5, $6)
       RETURNING id, reference_id, sender_wallet_id, receiver_wallet_id, type, status, amount, currency, description, created_at`,
      [sender.id, receiver.id, parsedAmount, sender.currency, idempotencyKey || null, description?.trim() || null]
    );

    await client.query('COMMIT');
    return { transaction: transactionResult.rows[0], idempotent: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && idempotencyKey) {
      throw new AppError('The idempotency key has already been used', 409, 'IDEMPOTENCY_KEY_REUSED');
    }
    throw error;
  } finally {
    client.release();
  }
};

const listTransactions = async ({ userId, page = 1, limit = 10, type }) => {
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);
  const offset = (safePage - 1) * safeLimit;
  const params = [userId];
  let typeFilter = '';

  if (type) {
    const normalizedType = String(type).trim().toUpperCase();
    if (!['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].includes(normalizedType)) {
      throw new AppError('Invalid transaction type', 400, 'INVALID_TRANSACTION_TYPE');
    }
    params.push(normalizedType);
    typeFilter = `AND t.type = $${params.length}`;
  }

  params.push(safeLimit, offset);
  const limitPosition = params.length - 1;
  const offsetPosition = params.length;

  const { rows } = await pgPool.query(
    `SELECT t.id, t.reference_id, t.type, t.status, t.amount, t.currency,
            t.description, t.created_at,
            su.email AS sender_email, ru.email AS receiver_email
     FROM transactions t
     LEFT JOIN wallets sw ON sw.id = t.sender_wallet_id
     LEFT JOIN wallets rw ON rw.id = t.receiver_wallet_id
     LEFT JOIN users su ON su.id = sw.user_id
     LEFT JOIN users ru ON ru.id = rw.user_id
     WHERE (sw.user_id = $1 OR rw.user_id = $1)
       ${typeFilter}
     ORDER BY t.created_at DESC
     LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
    params
  );

  const countParams = type ? [userId, params[1]] : [userId];
  const countTypeFilter = type ? 'AND t.type = $2' : '';
  const count = await pgPool.query(
    `SELECT COUNT(*)::int AS total
     FROM transactions t
     LEFT JOIN wallets sw ON sw.id = t.sender_wallet_id
     LEFT JOIN wallets rw ON rw.id = t.receiver_wallet_id
     WHERE (sw.user_id = $1 OR rw.user_id = $1) ${countTypeFilter}`,
    countParams
  );

  const total = count.rows[0].total;
  return {
    transactions: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

module.exports = {
  getWalletSnapshot,
  deposit,
  withdraw,
  transfer,
  listTransactions
};
