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
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need SERVICE_ROLE to bypass RLS for seeding

if (!url || !key) {
  console.error("Missing SUPABASE config in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function countData() {
  const { count: properties } = await supabase.from('properties').select('*', { count: 'exact', head: true });
  const { count: rooms } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
  const { count: beds } = await supabase.from('beds').select('*', { count: 'exact', head: true });
  console.log(`Properties: ${properties}, Rooms: ${rooms}, Beds: ${beds}`);
}

countData();
