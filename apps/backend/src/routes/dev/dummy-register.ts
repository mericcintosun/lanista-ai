import { Router } from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dir, '..', '..', '..', '..', '..');

const router = Router();

router.post('/', (req, res) => {
  const apiBase = `${req.protocol}://${req.get('host')}/api`;
  const child = spawn('npx', ['tsx', 'spawn-dummy.ts'], {
    cwd: MONOREPO_ROOT,
    env: { ...process.env, API_BASE: apiBase },
    shell: true,
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (chunk) => { stdout += chunk; });
  child.stderr?.on('data', (chunk) => { stderr += chunk; });

  child.on('close', (code) => {
    if (code === 0) {
      return res.json({ ok: true, message: 'Dummy agents registered.', stdout, stderr });
    }
    res.status(500).json({
      ok: false,
      message: 'spawn-dummy failed',
      code,
      stdout,
      stderr,
    });
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, message: err.message, error: String(err) });
  });
});

export default router;
