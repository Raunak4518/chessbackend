import { IsNotEmpty, IsString } from 'class-validator';

export class ResetGameDto {
  @IsString()
  @IsNotEmpty()
  room: string;
}
