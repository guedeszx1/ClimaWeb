const fs = require('fs');
const path = require('path');

const dir = 'C:/ClimaWeb_GIT/ClimaWeb/ClimaWeb_Admin/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = [
  { regex: /['"]#f8fafc['"]/gi, replacement: "'var(--text-primary)'" },
  { regex: /['"]#94a3b8['"]/gi, replacement: "'var(--text-secondary)'" },
  { regex: /['"]#64748b['"]/gi, replacement: "'var(--text-muted)'" },
  { regex: /['"]#080c14['"]/gi, replacement: "'var(--bg-primary)'" },
  { regex: /['"]rgba\(8, ?12, ?20, ?0\.95\)['"]/g, replacement: "'var(--bg-card)'" },
  { regex: /['"]rgba\(255, ?255, ?255, ?0\.0[12]\)['"]/g, replacement: "'var(--bg-card-alt)'" },
  { regex: /['"]rgba\(255, ?255, ?255, ?0\.0[3456]\)['"]/g, replacement: "'var(--border)'" },
  { regex: /['"]rgba\(255, ?255, ?255, ?0\.15?\)['"]/g, replacement: "'var(--border-light)'" },
  { regex: /['"]#fff['"]/gi, replacement: "'var(--text-primary)'" },
  { regex: /['"]#ffffff['"]/gi, replacement: "'var(--text-primary)'" },
  { regex: /['"]#121212['"]/gi, replacement: "'var(--bg-primary)'" },
  { regex: /['"]#333['"]/gi, replacement: "'var(--bg-card)'" }
];

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const r of replacements) {
    content = content.replace(r.regex, r.replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
