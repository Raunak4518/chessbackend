import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateArenaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  timeControl: string;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsNumber()
  @Min(0)
  startsInMinutes: number;
}
