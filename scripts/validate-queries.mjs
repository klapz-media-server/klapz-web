// Validates every GraphQL document in src/graphql against the live schema.
// SCHEMA_SDL=<file> validates against an SDL file instead (e.g. a backend not deployed yet:
// `cargo run -p open-plex-api --example sdl > schema.graphql`).
import fs from 'node:fs';
import { buildClientSchema, buildSchema, getIntrospectionQuery, validate } from 'graphql';
const url = process.env.API_URL || 'http://127.0.0.1:32500/graphql';
let schema;
if (process.env.SCHEMA_SDL) {
  schema = buildSchema(fs.readFileSync(process.env.SCHEMA_SDL, 'utf8'));
} else {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: getIntrospectionQuery() }) });
  schema = buildClientSchema((await res.json()).data);
}
let failed = 0;
for (const file of ['queries', 'mutations']) {
  const mod = await import(`../src/graphql/${file}.js`);
  for (const [name, doc] of Object.entries(mod)) {
    const errors = validate(schema, doc);
    if (errors.length) { failed++; console.log(`✗ ${name}`); errors.forEach((e) => console.log('   ', e.message)); }
    else console.log(`✓ ${name}`);
  }
}
process.exit(failed ? 1 : 0);
