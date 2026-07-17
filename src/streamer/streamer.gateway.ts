import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import type { AuthenticatedSocket } from '../types';

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class StreamerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamerGateway.name);

  // Map of streamerId -> (square -> voteCount)
  private heatmaps = new Map<string, Record<string, number>>();
  private updateInterval: NodeJS.Timeout;

  constructor() {
    // Batch broadcast heatmap updates every 1 second
    this.updateInterval = setInterval(() => {
      this.broadcastHeatmaps();
    }, 1000);
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Streamer Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Streamer Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('streamer:join')
  handleJoinStream(
    @MessageBody('streamerId') streamerId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!streamerId) return { status: 'error', message: 'No streamerId provided' };
    const room = `stream:${streamerId}`;
    client.join(room);
    
    // Initialize heatmap map if it doesn't exist
    if (!this.heatmaps.has(streamerId)) {
      this.heatmaps.set(streamerId, {});
    }

    // Send current heatmap state to the joining user immediately
    const currentHeatmap = this.heatmaps.get(streamerId) || {};
    client.emit('streamer:heatmapUpdate', { streamerId, heatmap: currentHeatmap });

    return { status: 'ok', room };
  }

  @SubscribeMessage('streamer:voteMove')
  handleVoteMove(
    @MessageBody('streamerId') streamerId: string,
    @MessageBody('square') square: string, // e.g. "e4"
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!streamerId || !square) return;

    if (!this.heatmaps.has(streamerId)) {
      this.heatmaps.set(streamerId, {});
    }

    const map = this.heatmaps.get(streamerId)!;
    map[square] = (map[square] || 0) + 1;
  }

  private broadcastHeatmaps() {
    for (const [streamerId, heatmap] of this.heatmaps.entries()) {
      const squares = Object.keys(heatmap);
      if (squares.length > 0) {
        // Broadcast the current aggregated heatmap to the room
        this.server.to(`stream:${streamerId}`).emit('streamer:heatmapUpdate', {
          streamerId,
          heatmap,
        });

        // Decay the heatmap slightly to create a dynamic visual effect, 
        // or just reset it. We'll implement a 50% decay so older votes fade out.
        const newMap: Record<string, number> = {};
        for (const sq of squares) {
          const decayedValue = Math.floor(heatmap[sq] * 0.5);
          if (decayedValue > 0) {
            newMap[sq] = decayedValue;
          }
        }
        this.heatmaps.set(streamerId, newMap);
      }
    }
  }
}
