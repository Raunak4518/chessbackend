import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class SendChallengeDto {
  @IsString()
  @IsNotEmpty()
  timeControl!: string;

  @IsEnum(['random', 'w', 'b'])
  @IsOptional()
  colorPref?: 'random' | 'w' | 'b';
}
