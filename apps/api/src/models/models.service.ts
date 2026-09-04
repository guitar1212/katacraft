import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ModelDetail, ModelSummary } from '@katacraft/shared';
import { ModelStatus, ParamSchemaSchema } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import type { Model, ModelVersion } from '../generated/prisma/client';

export interface ListModelsQuery {
  kind?: 'MODEL' | 'PRINTABLE';
  categoryId?: string;
  q?: string;
  sort?: 'popular' | 'newest';
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  toSummary(model: Model): ModelSummary {
    return {
      id: model.id,
      slug: model.slug,
      name: model.name,
      description: model.description,
      kind: model.kind as ModelSummary['kind'],
      status: model.status as ModelSummary['status'],
      categoryId: model.categoryId,
      thumbnailUrl: model.thumbnailUrl,
      creditCost: model.creditCost,
      downloadCount: model.downloadCount,
      favoriteCount: model.favoriteCount,
      featured: model.featured,
    };
  }

  toDetail(model: Model, version: ModelVersion | null): ModelDetail {
    return {
      ...this.toSummary(model),
      currentVersion: version
        ? {
            id: version.id,
            versionNo: version.versionNo,
            paramSchema: ParamSchemaSchema.parse(version.paramSchemaJson),
          }
        : null,
    };
  }

  async listPublic(query: ListModelsQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 && query.pageSize <= 60 ? query.pageSize : 20;

    const where = {
      status: ModelStatus.PUBLISHED,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { description: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const orderBy =
      query.sort === 'popular' ? { downloadCount: 'desc' as const } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.model.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.model.count({ where }),
    ]);

    return { items: items.map((m) => this.toSummary(m)), total };
  }

  async getBySlug(slug: string): Promise<ModelDetail> {
    const model = await this.prisma.model.findUnique({ where: { slug }, include: { currentVersion: true } });
    if (!model || model.status !== ModelStatus.PUBLISHED) throw new NotFoundException('Model not found');
    return this.toDetail(model, model.currentVersion);
  }

  async toggleFavorite(userId: string, modelId: string) {
    const existing = await this.prisma.favorite.findUnique({ where: { userId_modelId: { userId, modelId } } });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.favorite.delete({ where: { userId_modelId: { userId, modelId } } }),
        this.prisma.model.update({ where: { id: modelId }, data: { favoriteCount: { decrement: 1 } } }),
      ]);
      return { favorited: false };
    }
    await this.prisma.$transaction([
      this.prisma.favorite.create({ data: { userId, modelId } }),
      this.prisma.model.update({ where: { id: modelId }, data: { favoriteCount: { increment: 1 } } }),
    ]);
    return { favorited: true };
  }

  async listFavorites(userId: string): Promise<ModelSummary[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { model: true },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => this.toSummary(f.model));
  }

  // --- Admin ---

  async adminList(query: { status?: string; q?: string; page?: number }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.model.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.model.count({ where }),
    ]);
    return { items: items.map((m) => this.toSummary(m)), total };
  }

  async adminGet(id: string) {
    const model = await this.prisma.model.findUnique({ where: { id }, include: { currentVersion: true, printableFiles: true } });
    if (!model) throw new NotFoundException('Model not found');
    return model;
  }

  async create(createdById: string, data: { name: string; description?: string; kind: 'MODEL' | 'PRINTABLE'; categoryId?: string; creditCost?: number }) {
    const base = slugify(data.name);
    let slug = base;
    let n = 1;
    while (await this.prisma.model.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }
    return this.prisma.model.create({
      data: {
        slug,
        name: data.name,
        description: data.description ?? '',
        kind: data.kind,
        categoryId: data.categoryId,
        creditCost: data.creditCost ?? 1,
        createdById,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; categoryId?: string; creditCost?: number; thumbnailUrl?: string }) {
    await this.adminGet(id);
    return this.prisma.model.update({ where: { id }, data });
  }

  async createVersion(modelId: string, createdById: string, scadSource: string, paramSchemaRaw: unknown) {
    const model = await this.adminGet(modelId);
    if (model.kind !== 'MODEL') {
      throw new BadRequestException('Only MODEL-kind entries have OpenSCAD versions');
    }
    const paramSchema = ParamSchemaSchema.parse(paramSchemaRaw); // throws ZodError -> 400 via global filter
    const last = await this.prisma.modelVersion.findFirst({ where: { modelId }, orderBy: { versionNo: 'desc' } });
    const versionNo = (last?.versionNo ?? 0) + 1;
    return this.prisma.modelVersion.create({
      data: { modelId, versionNo, scadSource, paramSchemaJson: paramSchema as any, createdById },
    });
  }

  listVersions(modelId: string) {
    return this.prisma.modelVersion.findMany({
      where: { modelId },
      orderBy: { versionNo: 'desc' },
      select: { id: true, versionNo: true, createdAt: true, createdBy: { select: { name: true } } },
    });
  }

  async getVersion(modelId: string, versionId: string) {
    const version = await this.prisma.modelVersion.findUnique({ where: { id: versionId } });
    if (!version || version.modelId !== modelId) throw new NotFoundException('Version not found');
    return version;
  }

  async publish(modelId: string, versionId: string) {
    const version = await this.getVersion(modelId, versionId);
    return this.prisma.model.update({
      where: { id: modelId },
      data: { status: ModelStatus.PUBLISHED, currentVersionId: version.id },
    });
  }

  async unpublish(modelId: string) {
    await this.adminGet(modelId);
    return this.prisma.model.update({ where: { id: modelId }, data: { status: ModelStatus.UNPUBLISHED } });
  }

  async addPrintableFile(modelId: string, file: { fileUrl: string; filename: string; sizeBytes: number }) {
    const model = await this.adminGet(modelId);
    if (model.kind !== 'PRINTABLE') throw new BadRequestException('Only PRINTABLE-kind entries take files here');
    return this.prisma.printableFile.create({ data: { modelId, ...file } });
  }
}
