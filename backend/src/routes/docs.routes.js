const express = require('express');
const openapiDocument = require('../docs/openapi');

const router = express.Router();

router.get('/openapi.json', (_req, res) => {
  res.status(200).json(openapiDocument);
});

module.exports = router;
