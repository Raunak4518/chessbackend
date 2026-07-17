import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateDailyGameDto {
  @IsString()
  @IsNotEmpty()
  opponentId!: string;

  @IsNumber()
  @IsNotEmpty()
  daysPerMove!: number;
}

export class MakeDailyMoveDto {
  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
