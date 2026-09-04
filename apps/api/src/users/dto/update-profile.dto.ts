import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @IsOptional()
  @IsIn(['zh-TW', 'en'])
  language?: string;
}
