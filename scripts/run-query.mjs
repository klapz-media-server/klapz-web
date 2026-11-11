// Runs a named query from src/graphql/queries.js: node scripts/run-query.mjs MOVIE '{"id":"..."}'
import { print } from 'graphql';
const mod = await import('../src/graphql/queries.js');
const [name, vars = '{}'] = process.argv.slice(2);
const t = Date.now();
const res = await fetch(process.env.API_URL || 'http://127.0.0.1:32500/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: print(mod[name]), variables: JSON.parse(vars) }) });
const json = await res.json();
console.log(`${name} ${Date.now() - t}ms`, JSON.stringify(json).slice(0, Number(process.env.LEN || 600)));
