import { IsString, IsNotEmpty } from 'class-validator';

export class AddPuzzleCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
