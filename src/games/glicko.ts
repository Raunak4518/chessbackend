const MIN_RD = 35.0;
const MAX_RD = 350.0;
const C_DECAY = 15.0;
const Q = Math.log(10) / 400.0;

export function decayRD(lastRD: number, lastActive: Date | null): number {
  if (!lastActive) {
    return MAX_RD;
  }
  const elapsedMs = Date.now() - lastActive.getTime();
  const days = elapsedMs / (1000 * 60 * 60 * 24);
  if (days <= 0) {
    return lastRD;
  }
  const newRD = Math.sqrt(lastRD * lastRD + C_DECAY * C_DECAY * days);
  return Math.min(newRD, MAX_RD);
}

export function calculateG(rd: number): number {
  return 1.0 / Math.sqrt(1.0 + (3.0 * Q * Q * rd * rd) / (Math.PI * Math.PI));
}

export function calculateExpectedScore(
  r: number,
  opponentR: number,
  opponentRD: number,
): number {
  const g = calculateG(opponentRD);
  const exponent = (-g * (r - opponentR)) / 400.0;
  return 1.0 / (1.0 + Math.pow(10, exponent));
}

export function calculateNewRatingAndRD(
  rA: number,
  rdA: number,
  rB: number,
  rdB: number,
  outcome: number, // 1.0 for win, 0.5 for draw, 0.0 for loss
): { rating: number; rd: number } {
  const gB = calculateG(rdB);
  const eA = calculateExpectedScore(rA, rB, rdB);

  const dASquared = 1.0 / (Q * Q * gB * gB * eA * (1.0 - eA));

  let newRDA = Math.sqrt(1.0 / (1.0 / (rdA * rdA) + 1.0 / dASquared));
  newRDA = Math.max(newRDA, MIN_RD);

  const newRA =
    rA + (Q / (1.0 / (rdA * rdA) + 1.0 / dASquared)) * gB * (outcome - eA);

  return {
    rating: Math.round(newRA),
    rd: newRDA,
  };
}

export function parseTimeControl(tc?: string): {
  timeControl: string;
  gameType: string;
} {
  if (!tc) {
    return { timeControl: '10|0', gameType: 'RAPID' };
  }

  if (tc.toLowerCase().includes('day')) {
    return { timeControl: tc, gameType: 'DAILY' };
  }

  const parts = tc.split(/[|+]/);
  if (parts.length === 0) {
    return { timeControl: tc, gameType: 'RAPID' };
  }

  const baseMinutes = parseFloat(parts[0]);
  if (isNaN(baseMinutes)) {
    return { timeControl: tc, gameType: 'RAPID' };
  }

  let incrementSeconds = 0;
  if (parts.length > 1) {
    const inc = parseFloat(parts[1]);
    if (!isNaN(inc)) {
      incrementSeconds = inc;
    }
  }

  const totalSeconds = baseMinutes * 60 + 40 * incrementSeconds;

  let gameType = 'RAPID';
  if (totalSeconds < 180) {
    gameType = 'BULLET';
  } else if (totalSeconds < 600) {
    gameType = 'BLITZ';
  }

  return { timeControl: tc, gameType };
}

export function getPlayerRatingField(gameType: string): {
  rating: string;
  rd: string;
  lastActive: string;
} {
  switch (gameType) {
    case 'BULLET':
      return {
        rating: 'ratingBullet',
        rd: 'rdBullet',
        lastActive: 'lastActiveBullet',
      };
    case 'BLITZ':
      return {
        rating: 'ratingBlitz',
        rd: 'rdBlitz',
        lastActive: 'lastActiveBlitz',
      };
    case 'DAILY':
      return {
        rating: 'ratingDaily',
        rd: 'rdDaily',
        lastActive: 'lastActiveDaily',
      };
    default:
      return {
        rating: 'ratingRapid',
        rd: 'rdRapid',
        lastActive: 'lastActiveRapid',
      };
  }
}
