import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class MakeMoveDto {
  @IsString()
  @IsNotEmpty()
  room: string;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsOptional()
  promotion?: string;
}
