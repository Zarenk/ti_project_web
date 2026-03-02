import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { CreateGymTrainerDto } from './dto/create-gym-trainer.dto';
import { UpdateGymTrainerDto } from './dto/update-gym-trainer.dto';

@Injectable()
export class GymTrainerService {
  private readonly logger = new Logger(GymTrainerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateGymTrainerDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para registrar un entrenador.',
      );
    }

    return this.prisma.gymTrainer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        specialty: dto.specialty ?? null,
        bio: dto.bio ?? null,
        photo: dto.photo ?? null,
        companyId,
        organizationId,
      },
    });
  }

  async findAll(
    organizationId: number | null,
    companyId: number | null,
    query?: { search?: string; status?: string; page?: number; pageSize?: number },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymTrainerWhereInput;

    const where: Prisma.GymTrainerWhereInput = { ...baseFilter };

    if (query?.status) {
      where.status = query.status as any;
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { specialty: { contains: term, mode: 'insensitive' } },
      ];
    }

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.gymTrainer.findMany({
        where,
        orderBy: { lastName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.gymTrainer.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymTrainerWhereInput;

    const trainer = await this.prisma.gymTrainer.findFirst({
      where: { id, ...filter },
      include: {
        schedules: {
          where: { isActive: true },
          include: { gymClass: { select: { id: true, name: true } } },
        },
      },
    });

    if (!trainer) {
      throw new NotFoundException('Entrenador no encontrado.');
    }

    return trainer;
  }

  async update(
    id: number,
    dto: UpdateGymTrainerDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    await this.findOne(id, organizationId, companyId);

    const data: Prisma.GymTrainerUpdateInput = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.specialty !== undefined) data.specialty = dto.specialty;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.photo !== undefined) data.photo = dto.photo;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.gymTrainer.update({
      where: { id },
      data,
    });
  }

  async remove(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    await this.findOne(id, organizationId, companyId);

    return this.prisma.gymTrainer.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
