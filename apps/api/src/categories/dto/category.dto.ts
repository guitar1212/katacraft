import { IsInt, IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
