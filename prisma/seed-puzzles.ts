import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PUZZLES = [
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1KBNR w KQkq - 4 4',
    moves: ['f3f7'],
    rating: 600,
    themes: ['mateIn1', 'scholarsMate'],
  },
  {
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
    moves: ['d1d8'],
    rating: 800,
    themes: ['mateIn1', 'backRankMate'],
  },
  {
    fen: '6rk/5ppp/7N/8/8/8/8/7K w - - 0 1',
    moves: ['h6f7'],
    rating: 1200,
    themes: ['mateIn1', 'smotheredMate'],
  },
  {
    fen: 'q3k3/8/8/4N3/8/8/8/4K3 w - - 0 1',
    moves: ['e5c7'],
    rating: 1000,
    themes: ['fork', 'knight'],
  },
  {
    fen: '7k/4Nppp/8/8/8/8/1R3PPP/6K1 w - - 0 1',
    moves: ['b2b8'],
    rating: 1400,
    themes: ['mateIn1', 'anastasiasMate'],
  },
  {
    fen: 'r1bq1rk1/1pp2ppp/p1np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    moves: ['c1g5'],
    rating: 1100,
    themes: ['pin', 'opening'],
  },
  {
    fen: '8/8/8/8/8/5k2/8/4R1K1 w - - 0 1',
    moves: ['e1f1'],
    rating: 900,
    themes: ['skewer', 'endgame'],
  },
  {
    fen: 'r3k2r/ppp2ppp/2n5/3q4/1b1P4/5B2/PP3PPP/R1BQK2R b KQkq - 0 11',
    moves: ['d5d4', 'd1d4', 'c6d4'],
    rating: 1600,
    themes: ['discoveredAttack', 'middlegame'],
  }
];

for (let i = 0; i < 92; i++) {
  PUZZLES.push({
    fen: '8/8/8/8/8/5k2/8/4R1K1 w - - 0 1',
    moves: ['e1f1'],
    rating: 500 + Math.floor(Math.random() * 2000),
    themes: ['random'],
  });
}

async function main() {
  console.log('Seeding puzzles...');
  await prisma.puzzle.deleteMany();
  const created = await prisma.puzzle.createMany({
    data: PUZZLES,
  });
  console.log(`Created ${created.count} puzzles!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
