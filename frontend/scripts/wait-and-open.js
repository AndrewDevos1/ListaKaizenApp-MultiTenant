#!/usr/bin/env node

/**
 * Script que aguarda o servidor React ficar pronto e depois abre o navegador
 *
 * Aguarda a porta 3000 estar respondendo antes de abrir o browser
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const MAX_ATTEMPTS = 60; // Máximo de tentativas (60 segundos com delay de 1s)
const DELAY = 1000; // 1 segundo entre tentativas

let attempts = 0;

/**
 * Testa se a porta está respondendo
 */
function isServerReady(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve(res.statusCode === 200 || res.statusCode === 304);
      });
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.setTimeout(1000);
  });
}

/**
 * Aguarda o servidor ficar pronto
 */
async function waitForServer() {
  console.log(`⏳ Aguardando servidor React na porta ${PORT}...`);

  while (attempts < MAX_ATTEMPTS) {
    const isReady = await isServerReady(PORT);

    if (isReady) {
      console.log(`✅ Servidor pronto!`);
      return true;
    }

    attempts++;
    if (attempts % 10 === 0) {
      console.log(`⏳ Tentativa ${attempts}/${MAX_ATTEMPTS}...`);
    }

    // Aguarda antes de tentar novamente
    await new Promise((resolve) => setTimeout(resolve, DELAY));
  }

  console.log('⚠️ Timeout ao aguardar servidor');
  return false;
}

/**
 * Abre o navegador
 */
function openBrowser() {
  try {
    const url = `http://localhost:${PORT}`;

    // Executa o script de abertura
    if (process.platform === 'win32') {
      execSync(`node "${__dirname}/open-browser.js" "${url}"`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`node "${__dirname}/open-browser.js" "${url}"`, {
        stdio: 'inherit',
        shell: '/bin/bash',
      });
    }
  } catch (error) {
    console.error('Erro ao abrir navegador:', error.message);
  }
}

/**
 * Função principal
 */
async function main() {
  const serverReady = await waitForServer();

  if (serverReady) {
    openBrowser();
  } else {
    console.log(`\n📌 Acesse manualmente: http://localhost:${PORT}`);
  }
}

// Executa
main();
