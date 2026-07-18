import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class SocialGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    let sessionToken = (client.handshake.auth as Record<string, unknown>)
      ?.token as string;
    if (!sessionToken && client.handshake.headers.cookie) {
      const match = client.handshake.headers.cookie.match(
        /better-auth\.session-token=([^;]+)/,
      );
      if (match) {
        sessionToken = match[1];
      }
    }

    if (sessionToken) {
      try {
        const session = await this.prisma.session.findUnique({
          where: { token: sessionToken },
          include: { user: true },
        });

        if (session && session.expiresAt > new Date()) {
          this.userSockets.set(session.user.id, client.id);
          this.server.emit('userOnline', { userId: session.user.id });
        }
      } catch {

      }
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.server.emit('userOffline', { userId });
        break;
      }
    }
  }

  notifyUser(userId: string, event: string, data: unknown) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
