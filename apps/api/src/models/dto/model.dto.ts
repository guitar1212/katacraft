import { IsIn, IsInt, IsOptional, IsString, IsObject, Length, Min } from 'class-validator';

export class CreateModelDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['MODEL', 'PRINTABLE'])
  kind: 'MODEL' | 'PRINTABLE';

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditCost?: number;
}

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditCost?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CreateVersionDto {
  @IsString()
  scadSource: string;

  @IsObject()
  paramSchema: Record<string, unknown>;
}

export class PublishDto {
  @IsString()
  versionId: string;
}
