import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async create(name: string, sortOrder = 0) {
    const base = slugify(name);
    let slug = base;
    let n = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }
    return this.prisma.category.create({ data: { name, slug, sortOrder } });
  }

  async update(id: string, data: { name?: string; sortOrder?: number }) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
  }
}
