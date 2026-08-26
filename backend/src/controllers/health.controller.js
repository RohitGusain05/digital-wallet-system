const getHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'digital-wallet-api',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
};

module.exports = { getHealth };
