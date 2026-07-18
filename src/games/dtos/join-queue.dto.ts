import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class JoinQueueDto {
  @IsInt()
  @Min(0)
  @Max(4000)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  timeControl?: string;

  @IsString()
  @IsOptional()
  targetHexId?: string;
}
