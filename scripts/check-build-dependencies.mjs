import { spawnSync } from 'node:child_process';

const audit = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], { encoding: 'utf8' });
if (audit.status === 0) {
  console.log('Dependency audit passed.');
  process.exit(0);
}

const report = JSON.parse(audit.stdout || '{}');
const findings = Object.values(report.vulnerabilities ?? {});
const advisories = findings.flatMap(({ via }) => via.filter((item) => typeof item === 'object'));
const blocking = advisories.filter(({ severity }) => severity === 'high' || severity === 'critical');

// Pages receives only Astro's static output. Matching happens in CI against
// repository-controlled patterns. Remove this exception when upstream ships a fix.
const buildOnlyAdvisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
if (audit.status === 1 && !report.error && blocking.length > 0 && blocking.every(
  ({ name, url, severity }) => name === 'picomatch' && url === buildOnlyAdvisory && severity === 'high',
)) {
  console.warn(`Known build-only dependency finding: ${buildOnlyAdvisory}`);
  process.exit(0);
}

console.error(audit.stderr || audit.stdout || 'Dependency audit did not complete.');
process.exit(1);
