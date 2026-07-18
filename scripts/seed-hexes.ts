import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, HexTerrain } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const mapRadius = 5; // Generates a map of radius 5 (approx 91 hexes)

async function seed() {
  console.log('Seeding Aethelgard World Map...');
  
  // Create Factions
  const ironSyndicate = await prisma.faction.upsert({
    where: { name: 'Iron Syndicate' },
    update: {},
    create: { name: 'Iron Syndicate', colorTheme: 'red', description: 'Masters of the forge.' }
  });
  
  const celestialOrder = await prisma.faction.upsert({
    where: { name: 'Celestial Order' },
    update: {},
    create: { name: 'Celestial Order', colorTheme: 'blue', description: 'Scholars of the light.' }
  });
  
  const voidborn = await prisma.faction.upsert({
    where: { name: 'Voidborn' },
    update: {},
    create: { name: 'Voidborn', colorTheme: 'purple', description: 'Children of the abyss.' }
  });

  const terrains = Object.values(HexTerrain);

  for (let q = -mapRadius; q <= mapRadius; q++) {
    const r1 = Math.max(-mapRadius, -q - mapRadius);
    const r2 = Math.min(mapRadius, -q + mapRadius);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      
      // Random terrain
      const terrain = terrains[Math.floor(Math.random() * terrains.length)];
      
      // Assign controlling faction based on quadrants roughly
      let factionId: string | null = null;
      if (q > 2) factionId = celestialOrder.id;
      else if (q < -2) factionId = ironSyndicate.id;
      else if (r > 2) factionId = voidborn.id;

      await prisma.worldHex.upsert({
        where: { q_r: { q, r } },
        update: {},
        create: {
          q, r, s,
          terrain,
          controllingFactionId: factionId
        }
      });
    }
  }

  console.log('Map seeded successfully.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
