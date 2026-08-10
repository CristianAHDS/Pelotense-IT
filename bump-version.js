const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const versionPath = path.join(root, 'VERSION');
const backendPkg = path.join(root, 'backend', 'package.json');
const frontendPkg = path.join(root, 'frontend', 'package.json');
const configuracoes = path.join(root, 'frontend', 'src', 'pages', 'Configuracoes.jsx');

const current = fs.readFileSync(versionPath, 'utf8').trim();
const [major, minor, patch] = current.split('.').map(Number);
const next = `${major}.${minor}.${patch + 1}`;

fs.writeFileSync(versionPath, `${next}\n`);

function bumpPackage(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

bumpPackage(backendPkg);
bumpPackage(frontendPkg);

let configContent = fs.readFileSync(configuracoes, 'utf8');
configContent = configContent.replace(/(Versão|version|versao)[^<]*<dd>[^<]*<\/dd>/gi, `Versão</dt><dd>${next}</dd>`);
fs.writeFileSync(configuracoes, configContent);

console.log(`Versão atualizada: ${current} -> ${next}`);

const commitMsgFile = process.argv[2];
if (commitMsgFile) {
  const msg = fs.readFileSync(commitMsgFile, 'utf8');
  if (!msg.includes('[skip bump]')) {
    console.log('Arquivos versionados. Commit incluído.');
  }
}
