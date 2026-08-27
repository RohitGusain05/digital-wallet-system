const asyncHandler = require('../utils/async-handler');
const AppError = require('../utils/app-error');
const walletService = require('../services/wallet.service');

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWalletSnapshot(req.user.sub);
  res.status(200).json({ success: true, data: { wallet } });
});

const getIdempotencyKey = (req) => {
  const key = req.get('Idempotency-Key');
  if (key && key.length > 255) {
    throw new AppError('Idempotency-Key must be 255 characters or fewer', 400, 'INVALID_IDEMPOTENCY_KEY');
  }
  return key?.trim() || null;
};

const deposit = asyncHandler(async (req, res) => {
  const result = await walletService.deposit({
    userId: req.user.sub,
    amount: req.body.amount,
    idempotencyKey: getIdempotencyKey(req),
    description: req.body.description
  });

  res.status(result.idempotent ? 200 : 201).json({
    success: true,
    message: result.idempotent ? 'Existing deposit returned' : 'Demo deposit completed',
    data: result
  });
});

const withdraw = asyncHandler(async (req, res) => {
  const result = await walletService.withdraw({
    userId: req.user.sub,
    amount: req.body.amount,
    idempotencyKey: getIdempotencyKey(req),
    description: req.body.description
  });

  res.status(result.idempotent ? 200 : 201).json({
    success: true,
    message: result.idempotent ? 'Existing withdrawal returned' : 'Demo withdrawal completed',
    data: result
  });
});

const transfer = asyncHandler(async (req, res) => {
  const result = await walletService.transfer({
    userId: req.user.sub,
    receiverEmail: req.body.receiverEmail,
    amount: req.body.amount,
    idempotencyKey: getIdempotencyKey(req),
    description: req.body.description
  });

  res.status(result.idempotent ? 200 : 201).json({
    success: true,
    message: result.idempotent ? 'Existing transfer returned' : 'Transfer completed successfully',
    data: result
  });
});

const getTransactions = asyncHandler(async (req, res) => {
  const result = await walletService.listTransactions({
    userId: req.user.sub,
    page: req.query.page,
    limit: req.query.limit,
    type: req.query.type
  });

  res.status(200).json({ success: true, data: result });
});

module.exports = {
  getWallet,
  deposit,
  withdraw,
  transfer,
  getTransactions
};
