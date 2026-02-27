const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex > -1 ? parseInt(args[portIndex + 1], 10) : 4173;
const buildDir = path.join(__dirname, '..', 'build');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
};

const sendFile = (filePath, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end('Erro ao ler arquivo');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const { pathname } = parse(req.url || '/');
  const safePath = path
    .normalize(pathname || '/')
    .replace(/^\.{2}(\/|\\)/g, '');
  let filePath = path.join(buildDir, safePath);

  if ((pathname || '').endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(filePath, res);
      return;
    }

    const fallback = path.join(buildDir, 'index.html');
    sendFile(fallback, res);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve-build] Servindo ${buildDir} em http://localhost:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
