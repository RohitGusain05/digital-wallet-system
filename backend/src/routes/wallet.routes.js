const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const {
  getWallet,
  deposit,
  withdraw,
  transfer,
  getTransactions
} = require('../controllers/wallet.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', getWallet);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/transfer', transfer);
router.get('/transactions', getTransactions);

module.exports = router;
