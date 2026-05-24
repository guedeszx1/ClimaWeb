const fs = require('fs');
const path = require('path');

const dir = 'C:/ClimaWeb_GIT/ClimaWeb/ClimaWeb_Admin/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  const regexes = [
    { tag: '<Bar ', r: /<Bar\s+(?!.*isAnimationActive={false})/g },
    { tag: '<Line ', r: /<Line\s+(?!.*isAnimationActive={false})/g },
    { tag: '<Area ', r: /<Area\s+(?!.*isAnimationActive={false})/g },
    { tag: '<Treemap ', r: /<Treemap\s+(?!.*isAnimationActive={false})/g }
  ];

  for (const {tag, r} of regexes) {
    content = content.replace(r, tag + 'isAnimationActive={false} ');
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated animations in " + file);
  }
}
