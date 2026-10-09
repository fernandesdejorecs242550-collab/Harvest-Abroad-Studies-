// Optional conventional Express server for local development or a separate Node host.
require('dotenv').config();
const express = require('express');
const serverlessHandler = require('../netlify/functions/api').handler;
const app = express();
app.use(express.json());
app.use('/api', async (req, res) => {
  // Adapt the request to the same serverless handler used on Netlify.
  const event = {
    httpMethod: req.method,
    path: `/api${req.path}`,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false
  };
  const result = await serverlessHandler(event, {});
  res.status(result.statusCode || 200);
  for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, value);
  res.send(result.body || '');
});
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Harvest Abroad Studies API listening on ${port}`));
