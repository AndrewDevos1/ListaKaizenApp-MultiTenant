#!/usr/bin/env node

/**
 * Script para abrir o navegador Firefox com fallback automático
 *
 * Tenta abrir preferencialmente no Firefox
 * Se não estiver disponível, abre no navegador padrão do sistema
 *
 * Uso: node scripts/open-browser.js [URL]
 */

const open = require('open');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

// Pega a URL do argumento ou usa localhost:3000
const url = process.argv[2] || 'http://localhost:3000';

// Determina o SO
const platform = os.platform();
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

/**
 * Verifica se um executável está disponível no sistema
 */
function isCommandAvailable(cmd) {
  try {
    if (isWindows) {
      execSync(`where ${cmd}`, { stdio: 'ignore' });
    } else {
      execSync(`command -v ${cmd}`, { stdio: 'ignore', shell: '/bin/bash' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Tenta abrir o Firefox, com fallback para navegador padrão
 */
async function openBrowser() {
  const firefoxAvailable = isCommandAvailable('firefox') ||
                          (isWindows && isCommandAvailable('firefox.exe'));

  if (firefoxAvailable) {
    try {
      console.log('🦊 Abrindo Firefox...');

      if (isWindows) {
        // Windows
        await open(url, { app: { name: 'firefox' } });
      } else if (isMac) {
        // macOS
        await open(url, { app: 'Firefox' });
      } else {
        // Linux
        execSync(`firefox "${url}"`, { detached: true });
      }

      console.log(`✅ Firefox aberto em ${url}`);
      return;
    } catch (error) {
      console.log('⚠️ Erro ao abrir Firefox:', error.message);
    }
  } else {
    console.log('⚠️ Firefox não encontrado. Abrindo no navegador padrão...');
  }

  // Fallback: navegador padrão do sistema
  try {
    await open(url);
    console.log(`✅ Navegador padrão aberto em ${url}`);
  } catch (error) {
    console.error('❌ Erro ao abrir navegador:', error.message);
    console.log(`\n📌 Acesse manualmente: ${url}`);
  }
}

// Executa a função
openBrowser();
