import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST_INDEX = join(process.cwd(), 'dist', 'index.js');
const PKG = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

function run(args: string[], env: Record<string, string> = {}): { stdout: string; stderr: string; exitCode: number | null } {
  // Remove MCP_TESTING so main() actually runs in the subprocess
  const { MCP_TESTING: _, ...cleanEnv } = process.env;
  const result = spawnSync('node', [DIST_INDEX, ...args], {
    timeout: 3000,
    env: { ...cleanEnv, ...env },
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status,
  };
}

describe('CLI argument parsing', () => {
  it('--transport bogus exits with error', () => {
    const result = run(['--transport', 'bogus']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Invalid transport/);
  });

  it('--port 0 exits with error', () => {
    const result = run(['--port', '0', '--transport', 'http']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Invalid port/);
  });

  it('--port 99999 exits with error', () => {
    const result = run(['--port', '99999', '--transport', 'http']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Invalid port/);
  });

  it('--port abc exits with error', () => {
    const result = run(['--port', 'abc', '--transport', 'http']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Invalid port/);
  });

  it('default transport is stdio', () => {
    // stdio mode blocks on stdin — process will be killed after timeout
    const result = run([]);
    assert.match(result.stderr, /\(stdio\)/);
  });

  it('--transport http starts HTTP', () => {
    const result = run(['--transport', 'http', '--port', '18923']);
    assert.match(result.stderr, /\(HTTP/i);
  });

  it('env var fallback works', () => {
    const result = run([], { MCP_TRANSPORT: 'http', MCP_HTTP_PORT: '18924' });
    assert.match(result.stderr, /\(HTTP/i);
  });

  it('CLI flags override env vars', () => {
    const result = run(['--transport', 'stdio'], { MCP_TRANSPORT: 'http' });
    assert.match(result.stderr, /\(stdio\)/);
  });

  it('--version prints version and exits', () => {
    const result = run(['--version']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes(PKG.version), `expected version ${PKG.version} in: ${result.stdout}`);
  });

  it('--help prints usage and exits', () => {
    const result = run(['--help']);
    assert.equal(result.exitCode, 0);
    assert.ok(
      result.stdout.includes('Usage') || result.stdout.includes('transport'),
      `expected usage info in: ${result.stdout}`,
    );
  });
});
