// backend/src/clients/clients.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  buildOrganizationFilter,
  resolveCompanyId,
} from 'src/tenancy/organization.utils';

@Injectable()
export class ClientService {
  constructor(private prismaService: PrismaService) {}

  private async assertCompanyMatchesOrganization(
    companyId: number,
    organizationId: number,
  ) {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: { organizationId: true },
    });
    if (!company || company.organizationId !== organizationId) {
      throw new BadRequestException(
        `La compania ${companyId} no pertenece a la organizacion ${organizationId}.`,
      );
    }
  }

  async create(
    data: {
      name: string;
      type: string;
      typeNumber: string;
      userId?: number;
      image?: string;
      organizationId?: number | null;
      companyId?: number | null;
    },
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const orgId =
      organizationIdFromContext === undefined
        ? (data.organizationId ?? null)
        : organizationIdFromContext;
    const compId =
      companyIdFromContext === undefined
        ? resolveCompanyId({
            provided: data.companyId ?? null,
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          })
        : resolveCompanyId({
            provided: data.companyId ?? null,
            fallbacks: [companyIdFromContext],
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          });

    if (compId !== null) {
      if (orgId === null) {
        throw new BadRequestException(
          'Debe indicar una organizacion valida para asociar el cliente a una compania.',
        );
      }
      await this.assertCompanyMatchesOrganization(compId, orgId);
    }

    logOrganizationContext({
      service: ClientService.name,
      operation: 'create',
      organizationId: orgId,
      companyId: compId,
      metadata: { userId: data.userId ?? null, type: data.type },
    });

    const userId = data.userId || (await this.createGenericUser(orgId));

    try {
      return await this.prismaService.client.create({
        data: {
          name: data.name,
          type: data.type,
          typeNumber: data.typeNumber,
          userId,
          image: data.image,
          organizationId: orgId ?? null,
          companyId: compId ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un cliente con esos datos');
      }
      throw new InternalServerErrorException('Error al crear el cliente');
    }
  }

  private async createGenericUser(organizationId?: number | null) {
    logOrganizationContext({
      service: ClientService.name,
      operation: 'createGenericUser',
      organizationId,
    });
    const genericUser = await this.prismaService.user.create({
      data: {
        email: `generic_${Date.now()}@example.com`,
        username: `generic_${Date.now()}`,
        password: 'default_password', // recuerda encriptar si aplica
        role: 'CLIENT',
        organizationId: organizationId ?? null,
      },
    });
    return genericUser.id;
  }

  async createGuest(
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const orgId = organizationIdFromContext ?? null;
    const compId = companyIdFromContext ?? null;

    if (compId !== null && orgId === null) {
      throw new BadRequestException(
        'Debe indicar una organizacion valida para asociar el cliente invitado a una compania.',
      );
    }
    if (compId !== null) {
      await this.assertCompanyMatchesOrganization(compId, orgId as number);
    }

    logOrganizationContext({
      service: ClientService.name,
      operation: 'createGuest',
      organizationId: orgId,
      companyId: compId,
    });

    const username = `generic_${randomUUID()}`;
    const user = await this.prismaService.user.create({
      data: {
        email: `${username}@guest.local`,
        username,
        password: 'default_password',
        role: 'GUEST',
        organizationId: orgId,
      },
      select: { id: true },
    });

    try {
      const client = await this.prismaService.client.create({
        data: {
          name: username,
          userId: user.id,
          organizationId: orgId,
          companyId: compId,
        },
        select: { id: true, name: true },
      });

      return { userId: user.id, client };
    } catch (error) {
      await this.prismaService.user.delete({ where: { id: user.id } });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un cliente con esos datos');
      }
      throw new InternalServerErrorException(
        'Error al crear el cliente invitado',
      );
    }
  }

  async verifyOrCreateClients(
    clients: {
      name: string;
      type: string;
      typeNumber: string;
      idUser: number;
      organizationId?: number | null;
      companyId?: number | null;
    }[],
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const created: any[] = [];

    for (const client of clients) {
      const orgId =
        organizationIdFromContext === undefined
          ? (client.organizationId ?? null)
          : organizationIdFromContext;
      const compId =
        companyIdFromContext === undefined
          ? resolveCompanyId({
              provided: client.companyId ?? null,
              mismatchError:
                'La compania proporcionada no coincide con el contexto.',
            })
          : resolveCompanyId({
              provided: client.companyId ?? null,
              fallbacks: [companyIdFromContext],
              mismatchError:
                'La compania proporcionada no coincide con el contexto.',
            });

      if (compId !== null) {
        if (orgId === null) {
          throw new BadRequestException(
            'Debe indicar una organizacion valida para asociar el cliente a una compania.',
          );
        }
        await this.assertCompanyMatchesOrganization(compId, orgId);
      }

      logOrganizationContext({
        service: ClientService.name,
        operation: 'verifyOrCreateClients',
        organizationId: orgId,
        companyId: compId,
        metadata: { userId: client.idUser, typeNumber: client.typeNumber },
      });

      const existing = await this.prismaService.client.findUnique({
        where: { typeNumber: client.typeNumber }, // es unique global en tu schema
      });

      if (!existing) {
        const newClient = await this.prismaService.client.create({
          data: {
            name: client.name,
            type: client.type || '',
            typeNumber: client.typeNumber || '',
            userId: client.idUser,
            organizationId: orgId,
            companyId: compId,
          },
        });
        created.push(newClient);
      } else {
        created.push(existing);
      }
    }

    return created;
  }

  async selfRegister(
    data: {
      name: string;
      userId: number;
      type?: string | null;
      typeNumber?: string | null;
      image?: string | null;
      organizationId?: number | null;
      companyId?: number | null;
    },
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const orgId =
      organizationIdFromContext === undefined
        ? (data.organizationId ?? null)
        : organizationIdFromContext;
    const compId =
      companyIdFromContext === undefined
        ? resolveCompanyId({
            provided: data.companyId ?? null,
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          })
        : resolveCompanyId({
            provided: data.companyId ?? null,
            fallbacks: [companyIdFromContext],
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          });

    if (compId !== null) {
      if (orgId === null) {
        throw new BadRequestException(
          'Debe indicar una organizacion valida para asociar el cliente a una compania.',
        );
      }
      await this.assertCompanyMatchesOrganization(compId, orgId);
    }

    logOrganizationContext({
      service: ClientService.name,
      operation: 'selfRegister',
      organizationId: orgId,
      companyId: compId,
      metadata: { userId: data.userId },
    });

    const existing = await this.prismaService.client.findUnique({
      where: { userId: data.userId },
    });
    if (existing) return existing;

    try {
      return await this.prismaService.client.create({
        data: {
          name: data.name,
          type: data.type ?? null,
          typeNumber: data.typeNumber ?? null,
          userId: data.userId,
          image: data.image ?? null,
          organizationId: orgId,
          companyId: compId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un cliente con esos datos');
      }
      throw new InternalServerErrorException('Error al registrar el cliente');
    }
  }

  async checkIfExists(typeNumber: string): Promise<boolean> {
    const client = await this.prismaService.client.findUnique({
      where: { typeNumber },
    });
    return !!client;
  }

  findAll(organizationId?: number | null, companyId?: number | null) {
    const where = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.ClientWhereInput;
    return Object.keys(where).length === 0
      ? this.prismaService.client.findMany()
      : this.prismaService.client.findMany({ where });
  }

  findRegistered(organizationId?: number | null, companyId?: number | null) {
    const orgFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.ClientWhereInput;
    const where: Prisma.ClientWhereInput = {
      ...orgFilter,
      OR: [{ name: 'Sin Cliente' }, { user: { role: 'CLIENT' } }],
    };
    return this.prismaService.client.findMany({ where });
  }

  findAllForChat(organizationId?: number | null, companyId?: number | null) {
    const where = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.ClientWhereInput;
    return this.prismaService.client.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { user: true },
    });
  }

  async findOne(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }
    const clientFound = await this.prismaService.client.findFirst({
      where: {
        id,
        ...(buildOrganizationFilter(
          organizationId,
          companyId,
        ) as Prisma.ClientWhereInput),
      },
    });
    if (!clientFound)
      throw new NotFoundException(`Client with id ${id} not found`);
    return clientFound;
  }

  async update(
    id: number,
    updateClientDto: UpdateClientDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const before = await this.findOne(
      id,
      organizationIdFromContext,
      companyIdFromContext,
    );

    const orgId =
      organizationIdFromContext === undefined
        ? (updateClientDto.organizationId ?? before.organizationId ?? null)
        : organizationIdFromContext;

    const compId =
      companyIdFromContext === undefined
        ? resolveCompanyId({
            provided: updateClientDto.companyId ?? null,
            fallbacks: [before.companyId ?? null],
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          })
        : resolveCompanyId({
            provided: updateClientDto.companyId ?? null,
            fallbacks: [companyIdFromContext],
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          });

    if (compId !== null) {
      if (orgId === null) {
        throw new BadRequestException(
          'Debe indicar una organizacion valida para asociar el cliente a una compania.',
        );
      }
      await this.assertCompanyMatchesOrganization(compId, orgId);
    }

    try {
      return await this.prismaService.client.update({
        where: { id: Number(id) },
        data: {
          name: updateClientDto.name,
          type: updateClientDto.type,
          typeNumber: updateClientDto.typeNumber,
          phone: updateClientDto.phone,
          adress: updateClientDto.adress,
          email: updateClientDto.email,
          status: updateClientDto.status,
          organizationId: orgId ?? null,
          companyId: compId ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El cliente con el nombre "${updateClientDto.name}" ya existe.`,
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Client with id ${id} not found`);
      }
      throw new InternalServerErrorException('Error al actualizar el cliente');
    }
  }

  async updateMany(
    clients: UpdateClientDto[],
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    if (!Array.isArray(clients) || clients.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron clientes para actualizar.',
      );
    }

    // Validación de IDs
    const invalid = clients.filter((c) => !c.id || isNaN(Number(c.id)));
    if (invalid.length > 0)
      throw new BadRequestException(
        'Todos los clientes deben tener un ID válido.',
      );

    // Asegurar pertenencia del conjunto al tenant (si llega contexto fijo)
    if (organizationId !== undefined || companyId !== undefined) {
      for (const c of clients) {
        await this.findOne(Number(c.id), organizationId, companyId);
      }
    }

    try {
      const updatedClients = await this.prismaService.$transaction(
        clients.map((client) =>
          this.prismaService.client.update({
            where: { id: Number(client.id) },
            data: {
              name: client.name,
              type: client.type,
              typeNumber: client.typeNumber,
              phone: client.phone,
              adress: client.adress,
              email: client.email,
              status: client.status,
              organizationId: client.organizationId ?? organizationId ?? null,
              companyId: client.companyId ?? companyId ?? null,
            },
          }),
        ),
      );

      return {
        message: `${updatedClients.length} cliente(s) actualizado(s) correctamente.`,
        updatedClients,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Uno o más clientes no fueron encontrados.',
        );
      }
      throw new InternalServerErrorException(
        'Hubo un error al actualizar los clientes.',
      );
    }
  }

  async remove(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.findOne(id, organizationId, companyId);
    return this.prismaService.client.delete({ where: { id } });
  }

  async removes(
    ids: number[],
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
    }
    // Verificar pertenencia (evita borrar fuera del tenant)
    for (const id of ids) {
      await this.findOne(Number(id), organizationId, companyId);
    }
    const numericIds = ids.map((id) => Number(id));
    const deleted = await this.prismaService.client.deleteMany({
      where: { id: { in: numericIds } },
    });
    if (deleted.count === 0) {
      throw new NotFoundException(
        'No se encontraron clientes con los IDs proporcionados.',
      );
    }
    return {
      message: `${deleted.count} cliente(s) eliminado(s) correctamente.`,
    };
  }
}
