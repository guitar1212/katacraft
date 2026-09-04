import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDownloadDto {
  @IsString()
  modelId: string;

  @IsOptional()
  @IsString()
  modelVersionId?: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['stl', '3mf', 'obj'])
  format?: 'stl' | '3mf' | 'obj';
}
