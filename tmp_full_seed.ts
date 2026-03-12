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

const propertiesData = [
  {
    name: "Aura Premium Coliving",
    city: "Bangalore",
    area: "Whitefield",
    address: "Plot 42, ITPL Main Rd, Whitefield",
    latitude: 12.9698,
    longitude: 77.7499,
    description: "Ultra-luxury coliving space located steps away from ITPL. Features a rooftop cafe, gym, and smart home enabled rooms. Perfect for IT professionals seeking a premium lifestyle.",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1e54ca0a60?w=800&auto=format&fit=crop&q=80"
    ],
    amenities: ["WiFi", "Power Backup", "Gym", "Housekeeping", "Meals", "Cinema Room", "Coworking Space"],
    gender_allowed: "any",
    rating: 4.9,
    is_verified: true,
    is_active: true,
    price_range: "₹18000 - ₹35000"
  },
  {
    name: "Zolo Zenith Coliving",
    city: "Bangalore",
    area: "Koramangala",
    address: "Block 3, Koramangala",
    latitude: 12.9352,
    longitude: 77.6245,
    description: "Modern, chic living spaces right in the vibrant heart of Koramangala. Steps away from cafes and startups.",
    photos: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80"
    ],
    amenities: ["WiFi", "Power Backup", "Housekeeping", "Meals", "Lounge"],
    gender_allowed: "any",
    rating: 4.7,
    is_verified: true,
    is_active: true,
    price_range: "₹15000 - ₹25000"
  },
  {
    name: "Stanza Living Queens",
    city: "Bangalore",
    area: "HSR Layout",
    address: "Sector 2, HSR Layout",
    latitude: 12.9081,
    longitude: 77.6476,
    description: "Premium female-exclusive residency featuring advanced 24/7 security, biometric access, and chef-curated meals.",
    photos: [
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop&q=80"
    ],
    amenities: ["WiFi", "Power Backup", "Housekeeping", "Meals", "Laundry", "Fingerprint Lock"],
    gender_allowed: "female",
    rating: 4.8,
    is_verified: true,
    is_active: true,
    price_range: "₹12000 - ₹20000"
  }
];

async function generateUUID(email: string) {
   // To assign owner and agent, let's create a fake user in auth.users via admin api
   const { data: user, error } = await supabase.auth.admin.createUser({
     email: email,
     password: 'Password123!',
     email_confirm: true
   });
   
   // If already exists, query it
   if (error && error.message.includes('User already registered')) {
     const { data: users } = await supabase.auth.admin.listUsers();
     const existing = users.users.find(u => u.email === email);
     return existing ? existing.id : null;
   }
   return user?.user?.id;
}

async function runSeed() {
  console.log("Starting DB Seed...");
  
  const ownerId = await generateUUID("owner@gharpayy.com");
  const agentId = await generateUUID("agent@gharpayy.com");
  
  if (!ownerId) {
    console.warn("Could not create/find owner ID, seeding relations might fail if RLS or FK requires it.");
  }
  
  // Make sure we have roles if needed
  if (ownerId) await supabase.from('user_roles').upsert({ user_id: ownerId, role: 'owner' });
  if (agentId) await supabase.from('user_roles').upsert({ user_id: agentId, role: 'agent' });
  
  // Insert agent for routing later
  if (agentId) {
    await supabase.from('agents').upsert({
      id: agentId,
      user_id: agentId,
      name: "Rohit Sharma",
      email: "agent@gharpayy.com",
      phone: "9876543210",
      role: "sales_executive",
      is_active: true
    });
  }

  for (const property of propertiesData) {
    // 1. Insert Property
    const propToInsert = { ...property, owner_id: ownerId };
    
    // Check if exists
    let insertedProp;
    const { data: existingProp } = await supabase.from('properties').select('id, name, lock_in_months').eq('name', property.name).single();
    if (existingProp) {
        console.log(`Property ${property.name} already exists. Using existing ID.`);
        insertedProp = existingProp;
    } else {
      const { data: newProp, error: propErr } = await supabase.from('properties').insert(propToInsert).select().single();
      if (propErr) {
        console.error("Error inserting property:", propErr);
        continue;
      }
      insertedProp = newProp;
      console.log(`Inserted property: ${insertedProp.name}`);
    }
    
    // 2. Insert Rooms for this property
    const roomSubTypes = [
     { number: "101", type: "Private", count: 1, rent: parseInt(property.price_range.split('-')[1].replace('₹','').trim()) },
     { number: "102", type: "2 Sharing", count: 2, rent: parseInt(property.price_range.split('-')[0].replace('₹','').trim()) + 2000 },
     { number: "103", type: "3 Sharing", count: 3, rent: parseInt(property.price_range.split('-')[0].replace('₹','').trim()) }
    ];
    
    for (const roomDef of roomSubTypes) {
       const roomToInsert = {
         property_id: insertedProp.id,
         room_number: roomDef.number,
         room_type: roomDef.type,
         floor: 1,
         bed_count: roomDef.count,
         rent_per_bed: roomDef.rent,
         expected_rent: roomDef.rent,
         status: "vacant",
         furnishing: "full",
         bathroom_type: "attached",
         amenities: ["AC", "TV", "Geyser", "Wardrobe"]
       };
       
       const { data: insertedRoom, error: roomErr } = await supabase.from('rooms').insert(roomToInsert).select().single();
       if (roomErr) {
         console.error(`Error inserting room ${roomDef.number}:`, roomErr);
         continue;
       }
       
       // 3. Insert Beds for this room
       const bedsToInsert = Array.from({ length: roomDef.count }, (_, i) => ({
         room_id: insertedRoom.id,
         bed_number: String.fromCharCode(65 + i), // A, B, C...
         status: "vacant",
         current_rent: roomDef.rent
       }));
       
       const { error: bedErr } = await supabase.from('beds').insert(bedsToInsert);
       if (bedErr) {
         console.error(`Error inserting beds for room ${roomDef.number}:`, bedErr);
       }
    }
  }
  
  // Also insert a tech park landmark just for UI testing
  const { error: lmErr } = await supabase.from('landmarks').upsert({
      name: "ITPL Tech Park",
      type: "tech_park",
      city: "Bangalore",
      area: "Whitefield",
      latitude: 12.9850,
      longitude: 77.7300
  }, { onConflict: 'id' });
  if (lmErr) {
    console.error("Landmark upsert error:", lmErr);
  }
  
  console.log("Database Seed Complete!");
}

runSeed().catch(console.error);
