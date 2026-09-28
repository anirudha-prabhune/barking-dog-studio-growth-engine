const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[dev-runner] Initializing Barking Dog Growth Engine dev services...');

// Determine Python binary in virtualenv
const pythonBin = fs.existsSync('/.venv/bin/python3')
  ? '/.venv/bin/python3'
  : (fs.existsSync(path.resolve(__dirname, '.venv/bin/python3'))
    ? path.resolve(__dirname, '.venv/bin/python3')
    : (fs.existsSync('/.venv/bin/python')
      ? '/.venv/bin/python'
      : (fs.existsSync(path.resolve(__dirname, '.venv/bin/python'))
        ? path.resolve(__dirname, '.venv/bin/python')
        : 'python3')));

// 1. Start FastAPI Uvicorn backend on port 8001
console.log(`[dev-runner] Launching FastAPI backend via ${pythonBin} on port 8001...`);
const backendProcess = spawn(
  pythonBin,
  ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8001', '--reload'],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      VITE_API_URL: 'http://127.0.0.1:8001',
      PYTHONPATH: '.',
    },
    stdio: 'inherit'
  }
);

backendProcess.on('error', (err) => {
  console.error('[dev-runner] Failed to start backend:', err);
});

backendProcess.on('exit', (code, signal) => {
  console.log(`[dev-runner] Backend process exited with code ${code}, signal ${signal}`);
});

// 2. Start Vite frontend on port 3000
const viteArgs = process.argv.slice(2);
const viteBin = path.resolve(__dirname, 'node_modules/.bin/vite');

console.log(`[dev-runner] Launching Vite frontend with args: ${viteArgs.join(' ')}`);
const frontendProcess = spawn(
  process.execPath,
  [viteBin, ...viteArgs],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      VITE_API_URL: 'http://127.0.0.1:8001'
    },
    stdio: 'inherit'
  }
);

frontendProcess.on('error', (err) => {
  console.error('[dev-runner] Failed to start Vite frontend:', err);
});

frontendProcess.on('exit', (code, signal) => {
  console.log(`[dev-runner] Frontend process exited with code ${code}, signal ${signal}`);
  cleanup();
  process.exit(code || 0);
});

function cleanup() {
  console.log('[dev-runner] Shutting down child processes...');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  cleanup();
});
