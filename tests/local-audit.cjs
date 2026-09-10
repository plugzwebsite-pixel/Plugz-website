// Windows-compatible adapter for the existing release suites. Runs only on
// localhost and in a separate, explicitly named PostgreSQL schema.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Module = require('node:module');
const { parseEnv } = require('node:util');
const env = parseEnv(fs.readFileSync(path.resolve('.env'), 'utf8'));
const url = new URL(env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local database required');
const schema = 'qa_20260909';
url.searchParams.set('schema', schema);
Object.assign(process.env, env, {
  DATABASE_URL: url.toString(), EMAIL_PROVIDER: 'dev',
  STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: 'whsec_local_audit_only',
  REDIS_URL: '', PLUGGZ_APP: process.cwd(), PLUGGZ_BASE: 'http://localhost:3101',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3101',
  PGOPTIONS: `-c search_path=${schema}`,
});
const psql = 'C:/Program Files/PostgreSQL/17/bin/psql.exe';
const dbUrl = new URL(url); dbUrl.search = '';
function sql(query) {
  const r = spawnSync(psql, [dbUrl.toString(), '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-tA'], {
    input: query, encoding: 'utf8', env: process.env,
  });
  if (r.status !== 0) throw new Error(r.stderr || 'psql failed');
  return r.stdout.trim();
}
global.auditSql = sql;
const mode = process.argv[2];
if (mode === 'schema') {
  const r = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], {stdio:'inherit',env:process.env});
  process.exit(r.status ?? 1);
}
if (mode === 'serve') {
  const r = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3101'], {stdio:'inherit',env:process.env});
  process.exit(r.status ?? 1);
}
if (mode === 'seed') {
  const hash=require('bcryptjs').hashSync('RtProbe!2026',10);
  sql(`insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt") values ('rt_admin_user','rtadmin@pluggz.test','${hash}','Release Test Admin','ADMIN',now(),now(),now()) on conflict (email) do nothing;`);
  console.log('Isolated QA admin ready');
} else if (/^0[2347]-[a-z]+\.js$/.test(mode || '')) {
  const filename=path.resolve('tests',mode);
  let src=fs.readFileSync(filename,'utf8');
  src=src.replace(/const DB = execSync\([\s\S]*?\)\.trim\(\);/, 'const DB = "local";');
  src=src.replace(/function sql\(q\) \{[\s\S]*?\n\}/, 'function sql(q) { return global.auditSql(q); }');
  src=src.replace(/function runSql\(text\) \{[\s\S]*?\n\}/, 'function runSql(text) { return global.auditSql(text); }');
  src=src.replaceAll('"/tmp/', JSON.stringify(require('node:os').tmpdir().replaceAll('\\','/')+'/').slice(0,-1));
  const m=new Module(filename,module); m.filename=filename; m.paths=Module._nodeModulePaths(path.dirname(filename));
  m._compile(src,filename);
} else if (mode !== 'seed') throw new Error('Use schema, seed, serve, or a supported non-money suite');
