import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OverworldService } from './overworld.service';
import { UsePipes, ValidationPipe, UseFilters } from '@nestjs/common';
import { IsNumber, IsNotEmpty } from 'class-validator';

class MoveAvatarDto {
  @IsNumber()
  @IsNotEmpty()
  q: number;

  @IsNumber()
  @IsNotEmpty()
  r: number;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Should match your main config
    credentials: true,
  },
  namespace: '/overworld',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class OverworldGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly overworldService: OverworldService) {}

  handleConnection(client: Socket) {
    // In a real scenario, extract userId from JWT token via handshake
    // For now we assume the client sends an auth payload or registers later
    console.log(`Client connected to Overworld: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from Overworld: ${client.id}`);
  }

  @SubscribeMessage('joinOverworld')
  async handleJoin(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.data.userId = data.userId;
    // Broadcast to others that a player spawned
    const pos = await this.overworldService.getPlayerPosition(data.userId) || { q: 0, r: 0 };
    client.emit('spawned', pos);
  }

  @SubscribeMessage('moveAvatar')
  async handleMove(
    @MessageBody() data: MoveAvatarDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.overworldService.setPlayerPosition(userId, data.q, data.r);
    
    // Broadcast movement to all other players in the overworld
    this.server.emit('avatarMoved', { userId, q: data.q, r: data.r });
  }
}
