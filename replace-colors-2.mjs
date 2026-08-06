import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIR = path.join(__dirname, 'src');

const MAPPINGS = {
  'text-ink': 'text-foreground',
  'bg-ink': 'bg-primary',
  'bg-paper': 'bg-background',
  'text-paper': 'text-primary-foreground',
  'text-amber-dark': 'text-primary',
  'text-amber': 'text-primary',
  'bg-amber': 'bg-primary',
  'border-amber': 'border-primary',
  'text-red-ink': 'text-destructive',
  'bg-red-ink': 'bg-destructive',
  'border-red-ink': 'border-destructive',
  'text-green-ink': 'text-emerald-600',
  'bg-green-ink': 'bg-emerald-600',
  'border-green-ink': 'border-emerald-600',
  'text-slate-light': 'text-muted-foreground',
  'text-slate': 'text-muted-foreground',
  'bg-slate': 'bg-muted',
  'border-slate': 'border-border',
  'ledger-dark': 'border',
  'bg-ledger': 'bg-muted',
  'border-ledger': 'border-border',
  'divide-ledger': 'divide-border'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;

      for (const [oldClass, newClass] of Object.entries(MAPPINGS)) {
        // More aggressive replacement
        const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newClass);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

walk(DIR);
