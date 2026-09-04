import { IsIn, IsObject, IsString } from 'class-validator';

export class CreateRenderDto {
  @IsString()
  modelVersionId: string;

  @IsObject()
  params: Record<string, unknown>;

  /** Only PREVIEW is accepted here — FINAL renders are only ever created via POST /downloads. */
  @IsIn(['PREVIEW'])
  purpose: 'PREVIEW';
}
