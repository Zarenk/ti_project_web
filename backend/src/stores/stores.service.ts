import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, AuditAction } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class StoresService {
  
  constructor(
    private prismaService: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(createStoreDto: CreateStoreDto, req: Request) {
    try {
      const store = await this.prismaService.store.create({
        data: createStoreDto,
      });

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          entityId: store.id.toString(),
          action: AuditAction.CREATED,
          summary: `Tienda ${store.name} creada`,
          diff: { after: store } as any,
        },
        req,
      );

      return store;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `La tienda con el nombre "${createStoreDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error;
    }
  }

  findAll() {
    return this.prismaService.store.findMany()
  }

  async findOne(id: number) {

    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    const storeFound = await this.prismaService.store.findUnique({ // NO OLVIDAR EL AWAIT O ASYNC CON FUNCIONES
      where: {id: id,},
    })

    if(!storeFound){
      throw new NotFoundException(`Store with id ${id} not found`)
    }

    return storeFound;
  }

  // store.service.ts
  async checkIfExists(name: string): Promise<boolean> {
    const store = await this.prismaService.store.findUnique({
      where: { name },
    });
    return !!store; // Devuelve true si el proveedor existe, false si no
  }

  async update(id: number, updateStoreDto: UpdateStoreDto, req: Request) {
    try {
      const before = await this.prismaService.store.findUnique({
        where: { id: Number(id) },
      });
      const updated = await this.prismaService.store.update({
        where: { id: Number(id) },
        data: updateStoreDto,
      });

      if (!updated) {
        throw new NotFoundException(`Store with id ${id} not found`);
      }

      const diff: any = { before: {}, after: {} };
      for (const key of Object.keys(updated)) {
        if (
          JSON.stringify((before as any)?.[key]) !==
          JSON.stringify((updated as any)?.[key])
        ) {
          diff.before[key] = (before as any)?.[key];
          diff.after[key] = (updated as any)?.[key];
        }
      }
    
      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          entityId: updated.id.toString(),
          action: AuditAction.UPDATED,
          summary: `Tienda ${updated.name} actualizada`,
          diff,
        },
        req,
      );

      return updated;
    } catch (error) {

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `La tienda con el nombre "${updateStoreDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }    
  }

  async updateMany(stores: UpdateStoreDto[], req: Request) {
    if (!Array.isArray(stores) || stores.length === 0) {
      throw new BadRequestException('No se proporcionaron tiendas para actualizar.');
    }
  
    try {
      // Validar que todos los productos tengan un ID válido
      const invalidProducts = stores.filter(
        (store) => !store.id || isNaN(Number(store.id)),
      );
      if (invalidProducts.length > 0) {
        throw new BadRequestException('Todas las tiendas deben tener un ID válido.');
      }
  
      // Ejecutar la transacción para actualizar múltiples productos
      const updatedStores = await this.prismaService.$transaction(
        stores.map((store) =>
          this.prismaService.store.update({
            where: { id: Number(store.id) },
            data: {  
              name: store.name,
              description: store.description,  
              ruc: store.ruc,        
              phone: store.phone,
              adress: store.adress,
              email: store.email,
              website: store.website,
              status: store.status,
            },
          })
        )
      );

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          action: AuditAction.UPDATED,
          summary: `${updatedStores.length} tienda(s) actualizada(s)`,
          diff: { after: updatedStores } as any,
        },
        req,
      );
  
      return {
        message: `${updatedStores.length} tienda(s) actualizada(s) correctamente.`,
        updatedStores,
      };
    } catch (error) {
      console.error('Error al actualizar tiendas:', error);
  
      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Una o más tiendas no fueron encontrados.');
        }
      }
  
      throw new InternalServerErrorException('Hubo un error al actualizar los tiendas.');
    }
  }

  async remove(id: number, req: Request) {
    const deletedStore = await this.prismaService.store.delete({
      where: {
        id,
      },
    });

    if(!deletedStore){
      throw new NotFoundException(`Store with id ${id} not found`)
    }

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Store',
        entityId: id.toString(),
        action: AuditAction.DELETED,
        summary: `Tienda ${deletedStore.name} eliminada`,
        diff: { before: deletedStore } as any,
      },
      req,
    );

    return deletedStore;
  }

  async removes(ids: number[], req: Request) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }
  
    try {

      // Convertir los IDs a números
      const numericIds = ids.map((id) => Number(id));

      const deletedStores = await this.prismaService.store.deleteMany({
        where: {
          id: {
            in: numericIds, // Elimina todos los productos cuyos IDs estén en este array
          },
        },
      });
  
      if (deletedStores.count === 0) {
        throw new NotFoundException('No se encontraron tiendas con los IDs proporcionados.');
      }

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          entityId: numericIds.join(','),
          action: AuditAction.DELETED,
          summary: `${deletedStores.count} tienda(s) eliminada(s)`,
          diff: { ids: numericIds } as any,
        },
        req,
      );
        
      return {
        message: `${deletedStores.count} tienda(s) eliminada(s) correctamente.`,
      };
    } catch (error) {
      console.error("Error en el backend:", error);
      throw new InternalServerErrorException('Hubo un error al eliminar los productos.');     
    }
  }
}

