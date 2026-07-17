import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chess } from 'chess.js';
import { AnalysisMove, AnalysisResult } from '../types';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeGame(gameId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');
    if (game.analysis) return game.analysis;

    const finalAnalysis = await this.analyzePgn(game.pgn);

    // Save back to DB
    await this.prisma.game.update({
      where: { id: gameId },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { analysis: finalAnalysis as any }, // Prisma JSON type workaround
    });

    return finalAnalysis;
  }

  async analyzePgn(pgn: string): Promise<AnalysisResult> {
    const chess = new Chess();
    if (pgn) {
      chess.loadPgn(pgn);
    }

    const history = chess.history({ verbose: true });

    // We must rebuild the game move by move to get each FEN
    const tempChess = new Chess();
    const positions: AnalysisMove[] = [];
    positions.push({ fen: tempChess.fen(), move: null }); // Starting position

    for (const move of history) {
      tempChess.move(move);
      positions.push({
        fen: tempChess.fen(),
        move: move.san,
        color: move.color,
      });
    }

    this.logger.log(`Analyzing PGN with ${positions.length} positions...`);

    const analysisData: AnalysisMove[] = [];

    // Batch requests to not overwhelm the API (chunk size 5)
    const chunkSize = 5;
    for (let i = 0; i < positions.length; i += chunkSize) {
      const chunk = positions.slice(i, i + chunkSize);

      const promises = chunk.map(async (pos) => {
        try {
          const res = await fetch('https://chess-api.com/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen: pos.fen, depth: 15 }),
          });
          const data = (await res.json()) as {
            eval: number;
            mate: number | null;
            move: string;
            centipawns: string | number;
          };
          return {
            ...pos,
            eval: data.eval || 0,
            mate: data.mate || null,
            bestMove: data.move || null,
            // Centipawns can be a string or number in the API
            centipawns:
              typeof data.centipawns === 'string'
                ? parseInt(data.centipawns)
                : data.centipawns || data.eval * 100 || 0,
            depth: 15,
          };
        } catch (e: unknown) {
          const errMessage = e instanceof Error ? e.message : 'Unknown error';
          this.logger.error(
            `Error fetching analysis for FEN ${pos.fen}: ${errMessage}`,
          );
          return {
            ...pos,
            eval: 0,
            mate: null,
            centipawns: 0,
            bestMove: null,
          };
        }
      });

      const results = await Promise.all(promises);
      analysisData.push(...results);
    }

    // Now calculate classifications (Blunder, Mistake, Inaccuracy, etc.)
    // We compare position N with position N+1 (from the perspective of the player who just moved)

    const classifiedMoves: AnalysisMove[] = [];
    for (let i = 1; i < analysisData.length; i++) {
      const prev = analysisData[i - 1];
      const curr = analysisData[i];

      let classification = 'Book'; // Default
      let explanation = '';

      if (i > 10) {
        // After opening (very rough heuristic for Book moves)
        const prevCp = prev.mate
          ? prev.mate > 0
            ? 10000
            : -10000
          : (prev.centipawns ?? 0);
        const currCp = curr.mate
          ? curr.mate > 0
            ? 10000
            : -10000
          : (curr.centipawns ?? 0);

        let evalChange = 0;
        if (curr.color === 'w') {
          evalChange = currCp - prevCp;
        } else {
          evalChange = prevCp - currCp;
        }

        // Win Probability (Caps-like scale)
        // formula approx: 50 + 50 * (2 / (1 + exp(-0.00368208 * centipawns)) - 1)
        const winProb = (cp: number) =>
          50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
        const prevWinProb = winProb(prevCp * (curr.color === 'w' ? 1 : -1));
        const currWinProb = winProb(currCp * (curr.color === 'w' ? 1 : -1));
        const probLoss = prevWinProb - currWinProb;

        if (probLoss > 20 || evalChange <= -300) {
          if (prev.mate && !curr.mate) {
            classification = 'Blunder';
            explanation = 'Missed a forced mate.';
          } else if (!prev.mate && curr.mate && Math.abs(curr.mate) < 0) {
            classification = 'Blunder';
            explanation = 'Allowed a forced mate.';
          } else {
            classification = 'Blunder';
            explanation =
              'A critical error that severely worsens your position.';
            if (evalChange <= -300)
              explanation =
                'Blundered significant material or positional advantage.';
          }
        } else if (probLoss > 10 || evalChange <= -150) {
          classification = 'Mistake';
          explanation = 'A poor move that worsens your position.';
        } else if (probLoss > 5 || evalChange <= -50) {
          classification = 'Inaccuracy';
          explanation = 'A suboptimal move. There were better options.';
        } else if (
          probLoss < -10 &&
          currCp * (curr.color === 'w' ? 1 : -1) < 0
        ) {
          classification = 'Miss';
          explanation = 'Missed a tactical opportunity.';
        } else if (curr.move === prev.bestMove) {
          classification = 'Best Move';
          explanation = 'The strongest move in the position.';
        } else if (
          evalChange > 0 &&
          currCp * (curr.color === 'w' ? 1 : -1) > 300
        ) {
          // If we are already winning a lot and found a move that increases eval
          classification = 'Great';
          explanation = 'A powerful move that builds your advantage.';
        } else if (probLoss <= 0.5) {
          classification = 'Excellent';
          explanation = 'A very strong move.';
        } else {
          classification = 'Good';
          explanation = 'A solid, playable move.';
        }

        // Brilliant move logic (very basic heuristic: sacrifice material for advantage)
        // A true brilliant move requires deep analysis, but we simulate it if a piece is lost but eval improves significantly
        if (
          evalChange > 200 &&
          curr.move &&
          curr.move.includes('x') === false &&
          prevCp < currCp
        ) {
          // We'll occasionally mark very high eval jumps as brilliant for fun if it wasn't a capture
          if (Math.random() > 0.8) {
            classification = 'Brilliant';
            explanation = 'A spectacular move!';
          }
        }
      }

      // Compute individual move accuracy
      let moveAccuracy = 100;
      if (classification === 'Blunder') moveAccuracy = 20;
      else if (classification === 'Mistake') moveAccuracy = 50;
      else if (classification === 'Inaccuracy') moveAccuracy = 75;
      else if (classification === 'Good') moveAccuracy = 85;
      else if (classification === 'Excellent') moveAccuracy = 95;
      else if (
        classification === 'Best Move' ||
        classification === 'Great' ||
        classification === 'Brilliant' ||
        classification === 'Book'
      )
        moveAccuracy = 100;

      curr.moveAccuracy = moveAccuracy;

      classifiedMoves.push({
        move: curr.move,
        fen: curr.fen,
        color: curr.color,
        eval: curr.eval,
        mate: curr.mate,
        centipawns: curr.centipawns,
        bestMove: curr.bestMove,
        classification,
        explanation,
      });
    }

    // Calculate CAPS
    let whiteAccSum = 0;
    let blackAccSum = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    for (let i = 1; i < analysisData.length; i++) {
      const m = analysisData[i];
      if (m.color === 'w') {
        whiteAccSum += m.moveAccuracy ?? 100;
        whiteMoves++;
      } else {
        blackAccSum += m.moveAccuracy ?? 100;
        blackMoves++;
      }
    }

    const finalAnalysis = {
      whiteAccuracy:
        whiteMoves > 0 ? +(whiteAccSum / whiteMoves).toFixed(1) : 100,
      blackAccuracy:
        blackMoves > 0 ? +(blackAccSum / blackMoves).toFixed(1) : 100,
      moves: classifiedMoves,
    };

    return finalAnalysis;
  }
}
