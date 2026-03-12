import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual dotenv parser
const envPath = path.resolve('d:/Projects/gharpayy-flow/.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      // Remove quotes
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Using URL:", url);
console.log("Using Key:", key);

if (!url || !key) {
  console.error("Missing SUPABASE config in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkDb() {
  const { data: props, error } = await supabase.from('properties').select('*');
  if (error) {
    console.error("Error fetching properties:", error);
    return;
  }
  
  console.log(`Successfully connected. Found ${props.length} properties.`);
}

checkDb();
