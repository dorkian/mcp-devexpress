import express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from "url";
const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');


function flattenProperties(properties) {
  const flatProps = [];

  for (const prop of properties) {
    if (prop.subMembers) {
      for (const sub of prop.subMembers) {
        flatProps.push({
          section: 'Properties',
          parent: prop.name,
          name: sub.name,
          type: sub.type || 'unknown',
          default: sub.default ?? 'N/A',
          description: sub.description || '',
        });
      }
    } else {
      flatProps.push({
        section: 'Properties',
        name: prop.name,
        type: prop.type || 'unknown',
        default: prop.default ?? 'N/A',
        description: prop.description || '',
      });
    }
  }

  return flatProps;
}

function loadComponentData(component) {
  const filePath = path.join(DATA_DIR, `${component}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = JSON.parse(fs.readFileSync(filePath));

  const entries = [];

  // Flatten Properties
  if (raw.properties) {
    entries.push(...flattenProperties(raw.properties));
  }

  // Add Methods
  if (raw.Methods) {
    for (const m of raw.Methods) {
      entries.push({
        section: 'Methods',
        name: m.name,
        type: m.type || 'unknown',
        default: m.default ?? 'N/A',
        description: m.description || '',
      });
    }
  }

  // Add Events
  if (raw.Events) {
    for (const e of raw.Events) {
      entries.push({
        section: 'Events',
        name: e.name,
        type: e.type || 'function',
        default: e.default ?? 'N/A',
        description: e.description || '',
      });
    }
  }

  // Add Types
  if (raw.Types) {
    for (const t of raw.Types) {
      entries.push({
        section: 'Types',
        name: t.name,
        type: t.type || 'object',
        default: t.default ?? 'N/A',
        description: t.description || '',
      });
    }
  }

  return entries;
}

app.get('/api/devexpress/:component', (req, res) => {
  const { component } = req.params;
  const data = loadComponentData(component);
  if (!data) {
    return res.status(404).json({ error: 'Component not found' });
  }
  res.json(data);
});

app.get('/api/devexpress/:component/:property', (req, res) => {
  const { component, property } = req.params;
  const data = loadComponentData(component);
  if (!data) return res.status(404).json({ error: 'Component not found' });

  const match = data.find(entry => entry.name === property);
  if (!match) return res.status(404).json({ error: 'Property not found' });

  res.json(match);
});


app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.json'));
});

app.listen(3010, () =>
  console.log('🚀 Enhanced DevExpress API running at http://localhost:3010')
);