import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class SearchUsersDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;
}

export class GetRatingHistoryDto {
  @IsString()
  @IsOptional()
  timeframe?: string;
}
