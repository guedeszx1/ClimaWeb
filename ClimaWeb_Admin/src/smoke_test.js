import BrazilMap from './components/BrazilMap';
import ClimaCharts from './components/ClimaCharts';
import Glossary from './components/Glossary';
import AuditPanel from './components/AuditPanel';
import ClimaDashboard from './components/ClimaDashboard';

console.log('--- ClimaWeb Smoke Test ---');
console.log('Checking imports and syntax of newly created components:');

const components = {
  BrazilMap,
  ClimaCharts,
  Glossary,
  AuditPanel,
  ClimaDashboard
};

let success = true;
for (const [name, component] of Object.entries(components)) {
  if (component) {
    console.log(`✅ ${name} imported successfully (type: ${typeof component}).`);
  } else {
    console.error(`❌ Failed to import ${name}.`);
    success = false;
  }
}

if (success) {
  console.log('🎉 Smoke test passed: All components loaded without syntax errors.');
} else {
  console.error('🚨 Smoke test failed.');
  if (globalThis.process && typeof globalThis.process.exit === 'function') {
    globalThis.process.exit(1);
  }
}
