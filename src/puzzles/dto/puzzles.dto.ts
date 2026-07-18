import { IsString, IsNotEmpty, IsArray, IsNumber, IsOptional } from 'class-validator';

export class AddPuzzleCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class SubmitPuzzleResultDto {
  @IsArray()
  @IsString({ each: true })
  movesMade: string[];

  @IsNumber()
  timeTaken: number;
}

export class CustomPuzzlesQueryDto {
  @IsString()
  @IsOptional()
  theme?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}

export class RushBatchQueryDto {
  @IsString()
  @IsOptional()
  limit?: string;
}
