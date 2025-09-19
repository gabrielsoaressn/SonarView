const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 5000;

// Middleware para JSON
app.use(express.json());

// Proxy manual para API do backend
app.use('/api', async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:3000${req.originalUrl}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Erro no proxy:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erro no proxy',
      message: error.message
    });
  }
});

// Servir arquivos estáticos
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname)));

// Servir index.html para todas as rotas (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aurora View Frontend executando em http://localhost:${PORT}`);
});