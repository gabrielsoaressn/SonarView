const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const PORT = 5000;

// Tipos MIME
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function serveFile(filePath, res) {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Arquivo não encontrado');
  }
}

async function proxyToBackend(req, res) {
  try {
    const url = `http://localhost:3000${req.url}`;
    const response = await axios({
      method: req.method,
      url: url,
      data: req.method !== 'GET' ? await getRequestBody(req) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));
  } catch (error) {
    console.error('Erro no proxy:', error.message);
    res.writeHead(error.response?.status || 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Erro no proxy',
      message: error.message
    }));
  }
}

function getRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body ? JSON.parse(body) : {});
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Proxy para API
  if (url.pathname.startsWith('/api')) {
    await proxyToBackend(req, res);
    return;
  }
  
  // Servir arquivos estáticos
  let filePath = path.join(__dirname, url.pathname);
  
  // Se a requisição é para a raiz ou uma rota do SPA, servir index.html
  if (url.pathname === '/' || (!path.extname(url.pathname) && url.pathname !== '/')) {
    filePath = path.join(__dirname, 'index.html');
  }
  
  // Se o arquivo não tem extensão e não é uma rota da API, assumir que é um arquivo JS/CSS
  if (!path.extname(filePath) && !url.pathname.startsWith('/api')) {
    // Tentar primeiro com .js
    try {
      await fs.access(filePath + '.js');
      filePath = filePath + '.js';
    } catch {
      // Tentar com .css
      try {
        await fs.access(filePath + '.css');
        filePath = filePath + '.css';
      } catch {
        // Se não encontrar, servir index.html (para roteamento SPA)
        filePath = path.join(__dirname, 'index.html');
      }
    }
  }
  
  await serveFile(filePath, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aurora View Frontend executando em http://localhost:${PORT}`);
});

// Tratamento de erros
server.on('error', (error) => {
  console.error('Erro no servidor:', error);
});