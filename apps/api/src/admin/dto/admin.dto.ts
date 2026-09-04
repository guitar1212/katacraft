import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsIn(['MEMBER', 'DESIGNER', 'ADMIN'])
  role?: 'MEMBER' | 'DESIGNER' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}

export class AdjustCreditsDto {
  @IsInt()
  delta: number;

  @IsString()
  @Length(1, 200)
  reason: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  signupBonusCredits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultDownloadCreditCost?: number;
}
