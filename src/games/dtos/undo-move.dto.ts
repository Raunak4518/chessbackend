import { IsNotEmpty, IsString } from 'class-validator';

export class UndoMoveDto {
  @IsString()
  @IsNotEmpty()
  room: string;

  @IsString()
  @IsNotEmpty()
  fen: string;

  @IsString()
  from: string;

  @IsString()
  to: string;
}
