const fs = require('fs');
const path = require('path');

// Créer le dossier de destination s'il n'existe pas
const destDir = path.join(__dirname, '..', 'dist', 'main', 'migrations');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copier tous les fichiers .sql
const sourceDir = path.join(__dirname, '..', 'main', 'migrations');
const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.sql'));

files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Copié: ${file}`);
});

console.log('Migrations copiées avec succès');
