import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/Projects/gharpayy-flow/.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkAndSeed() {
  const { data: props, error } = await supabase.from('properties').select('*');
  if (error) {
    console.error("Error fetching properties:", error);
    return;
  }
  
  console.log(`Found ${props.length} properties.`);
  
  if (props.length === 0) {
    console.log("Database is empty. Seeding mock data...");
    // Fetch a user to be the owner
    const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
    let ownerId = users && users.users.length > 0 ? users.users[0].id : null;
    
    // If no users, we might need to create auth user or we can use a UUID if the table allows it without strict FK on auth.users 
    // Actually, properties owner_id is probably FK to profiles or agents or auth.users
    console.log("Owner ID to use:", ownerId);
    
    // Let's just insert basic values without owner_id if nullable, or generate random UUID if no FK constraint.
    const mockProperty = {
      name: "Luxury PG Koramangala",
      city: "Bangalore",
      area: "Koramangala",
      address: "123 Tech Park Road, Koramangala",
      pincode: "560034",
      latitude: 12.9352,
      longitude: 77.6245,
      description: "Premium fully furnished PG near major tech parks.",
      photos: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&auto=format&fit=crop&q=60"
      ],
      amenities: ["WiFi", "Power Backup", "Housekeeping", "Meals"],
      rules: ["No smoking indoor", "No loud music after 10 PM"],
      gender_allowed: "any",
      notice_period_days: 30,
      lock_in_months: 3,
      rating: 4.8,
      is_verified: true,
      is_active: true,
      price_range: "₹10000 - ₹20000"
    };

    if (ownerId) mockProperty.owner_id = ownerId;

    const { data: newProp, error: pErr } = await supabase.from('properties').insert(mockProperty).select().single();
    if (pErr) {
      console.error("Failed to insert property:", pErr);
      // fallback let's see schema
      console.log("Fetching table info to see required columns...");
      return;
    }
    
    console.log("Mock property inserted:", newProp.id);

    const mockRoom = {
      property_id: newProp.id,
      room_number: "101",
      room_type: "Private",
      floor: 1,
      bed_count: 1,
      rent_per_bed: 15000,
      expected_rent: 15000,
      deposit_amount: 30000,
      status: "available",
      furnishing: "full",
      bathroom_type: "attached",
      amenities: ["AC", "TV", "Geyser"]
    };

    const { data: newRoom, error: rErr } = await supabase.from('rooms').insert(mockRoom).select().single();
    if (rErr) {
      console.error("Failed to insert room:", rErr);
      return;
    }
    console.log("Mock room inserted:", newRoom.id);

    const mockBed = {
      room_id: newRoom.id,
      bed_number: "A",
      status: "vacant",
      current_rent: 15000
    };
    
    const { error: bErr } = await supabase.from('beds').insert(mockBed);
    if (bErr) console.error("Failed to insert bed:", bErr);
    else console.log("Mock bed inserted.");
  }
}

checkAndSeed();
