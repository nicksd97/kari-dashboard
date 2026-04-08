const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('app').concat(walk('lib'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // We'll do a simple set of replacements for common inline styles.
  // Note: this is a heuristic approach and might require manual fixups.
  content = content.replace(/style=\{\{\s*color:\s*"var\(--foreground\)"\s*\}\}/g, 'className="text-foreground"');
  content = content.replace(/style=\{\{\s*color:\s*"var\(--muted\)"\s*\}\}/g, 'className="text-muted-foreground"');
  content = content.replace(/style=\{\{\s*color:\s*"var\(--muted-light\)"\s*\}\}/g, 'className="text-muted-foreground/70"');
  
  // Replace card styles
  content = content.replace(/style=\{\{\s*border:\s*"1px solid var\(--card-border\)",\s*backgroundColor:\s*"var\(--card-bg\)"\s*\}\}/g, 'className="border border-border bg-card"');
  content = content.replace(/style=\{\{\s*backgroundColor:\s*"var\(--card-bg\)",\s*border:\s*"1px solid var\(--card-border\)"\s*\}\}/g, 'className="bg-card border border-border"');

  // Surface styles
  content = content.replace(/style=\{\{\s*backgroundColor:\s*"var\(--surface\)"\s*\}\}/g, 'className="bg-muted"');
  
  // Divider
  content = content.replace(/style=\{\{\s*borderBottom:\s*"1px solid var\(--divider\)"\s*\}\}/g, 'className="border-b border-border"');
  content = content.replace(/style=\{\{\s*borderTop:\s*"1px solid var\(--divider\)"\s*\}\}/g, 'className="border-t border-border"');

  // Also replace when there's an existing className by using regex to merge them, or just let them be manually merged.
  // Actually, standard regex merge:
  // className="something" style={{ color: "var(--foreground)" }} -> className="something text-foreground"
  content = content.replace(/className="([^"]*)"\s*style=\{\{\s*color:\s*"var\(--foreground\)"\s*\}\}/g, 'className="$1 text-foreground"');
  content = content.replace(/className="([^"]*)"\s*style=\{\{\s*color:\s*"var\(--muted\)"\s*\}\}/g, 'className="$1 text-muted-foreground"');
  content = content.replace(/className="([^"]*)"\s*style=\{\{\s*color:\s*"var\(--muted-light\)"\s*\}\}/g, 'className="$1 text-muted-foreground/70"');

  fs.writeFileSync(file, content, 'utf8');
});

console.log("Done");
