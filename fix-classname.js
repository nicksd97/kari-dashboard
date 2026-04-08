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

  // Find all components with two classNames on the same line or next line
  // Example: className="a" className="b"
  // Example: className="a" \n className="b"
  let previous = content;
  do {
    previous = content;
    content = content.replace(/className=(?:\{([^}]+)\}|"([^"]+)")\s+className=(?:\{([^}]+)\}|"([^"]+)")/g, (match, expr1, str1, expr2, str2) => {
      // For simplicity, if both are strings
      if (str1 && str2) {
        return `className="${str1} ${str2}"`;
      }
      // If one is expression, we combine them into template literal or clsx
      // For now, let's just make it simple if we only injected strings
      if (str1 && expr2) {
        return `className={\`${str1} \${${expr2}}\`}`;
      }
      if (expr1 && str2) {
        return `className={\`\${${expr1}} ${str2}\`}`;
      }
      if (expr1 && expr2) {
        return `className={\`\${${expr1}} \${${expr2}}\`}`;
      }
      return match;
    });
  } while (content !== previous);

  fs.writeFileSync(file, content, 'utf8');
});

console.log("Done fixing classNames");
