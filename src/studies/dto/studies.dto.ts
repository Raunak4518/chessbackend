import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateStudyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class AddChapterDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class UpdateChapterDto {
  @IsString()
  @IsOptional()
  fen?: string;

  @IsString()
  @IsOptional()
  pgn?: string;

  @IsOptional()
  annotations?: unknown;

  @IsString()
  @IsOptional()
  title?: string;
}
