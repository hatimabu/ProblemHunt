// Offline structural and policy checks, NOT Azure provider/permission/what-if validation.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const load = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const foundation = await load('foundation.json'), worker = await load('worker.json');
for (const template of [foundation, worker]) {
  assert.match(template.$schema, /deploymentTemplate/);
  assert.equal(new Set(template.resources.map(r => `${r.type}/${r.name}`)).size, template.resources.length);
  for (const resource of template.resources) assert.ok(resource.type && resource.apiVersion && resource.name);
  const inspect = value => {
    if (typeof value === 'string') {
      for (const [, name] of value.matchAll(/parameters\('([^']+)'\)/g)) assert.ok(name in template.parameters, `Undefined parameter ${name}`);
      for (const [, name] of value.matchAll(/variables\('([^']+)'\)/g)) assert.ok(name in template.variables, `Undefined variable ${name}`);
    } else if (value && typeof value === 'object') Object.entries(value).forEach(([k,v]) => { inspect(k); inspect(v); });
  };
  inspect(template);
  assert.ok(!template.resources.some(r => /staticSites|deploymentScripts/.test(r.type)));
}
const resource = (template, type) => template.resources.find(r => r.type === type);
const pg = resource(foundation, 'Microsoft.DBforPostgreSQL/flexibleServers');
assert.equal(pg.properties.network.publicNetworkAccess, 'Disabled');
assert.equal(pg.sku.name, 'Standard_B1ms');
assert.equal(resource(foundation, 'Microsoft.ContainerRegistry/registries').properties.adminUserEnabled, false);
assert.equal(resource(foundation, 'Microsoft.KeyVault/vaults').properties.enableRbacAuthorization, true);
for (const key of ['databaseAdminPassword','workerPassword']) {assert.equal(foundation.parameters[key].type, 'securestring');assert.ok(!('defaultValue' in foundation.parameters[key]));}
const app = resource(worker, 'Microsoft.App/containerApps');
assert.equal(app.properties.configuration.ingress, undefined);
assert.equal(app.properties.template.scale.maxReplicas, 1);
assert.match(app.properties.template.containers[0].image, /@.*imageDigest/);
assert.equal(app.identity.type, 'UserAssigned');
assert.equal(app.properties.template.containers[0].env.find(e=>e.name==='PGPASSWORD').secretRef, 'database-password');
const dockerfile = await readFile(new URL('../../services/notifications/Dockerfile', import.meta.url), 'utf8');
assert.match(dockerfile, /FROM node:22-bookworm-slim@sha256:[a-f0-9]{64} AS runtime/);
assert.doesNotMatch(dockerfile.split('FROM runtime AS lab')[0], /COPY .*lab|COPY .*supabase/);
console.log('ARM structure, references, isolation, secrets, image digest and runtime separation checks passed. Provider validation still required.');
