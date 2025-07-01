import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProvidersService {
  
  constructor(private prismaService: PrismaService) {}

  async create(createProviderDto: CreateProviderDto) {
    try{
      return await this.prismaService.provider.create({
        data: createProviderDto
      })   
    }
    catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `El Proveedor con el RUC "${createProviderDto.documentNumber}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error;
    }
  }

  findAll() {
    try{
      return this.prismaService.provider.findMany()
    }
    catch(error){
      console.error("Error en el backend:", error);
      throw error;
    }
  }

  async findOne(id: number) {
    try{
      if (!id || typeof id !== 'number') {
        throw new Error('El ID proporcionado no es válido.');
      }
  
      const providerFound = await this.prismaService.provider.findUnique({ // NO OLVIDAR EL AWAIT O ASYNC CON FUNCIONES
        where: {id: id,},
      })
  
      if(!providerFound){
        throw new NotFoundException(`Provider with id ${id} not found`)
      }
  
      return providerFound;
    }
    catch(error){
      console.error("Error en el backend:", error);
      throw error;
    }
  }

  // providers.service.ts
  async checkIfExists(documentNumber: string): Promise<boolean> {
    const provider = await this.prismaService.provider.findUnique({
      where: { documentNumber },
    });
    return !!provider; // Devuelve true si el proveedor existe, false si no
  }

  async update(id: number, updateProviderDto: UpdateProviderDto) {
    try{
      const providerFound = await this.prismaService.provider.update({
        where: {id: Number(id)},  
        data: updateProviderDto
      })
  
      if(!providerFound){
        throw new NotFoundException(`Provider with id ${id} not found`)
      }
  
      return providerFound;
    } catch (error){
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `El proveedor con el RUC "${updateProviderDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }    
  }

  async updateMany(providers: UpdateProviderDto[]) {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new BadRequestException('No se proporcionaron proveedores para actualizar.');
    }
  
    try {
      // Validar que todos los productos tengan un ID válido
      const invalidProviders = providers.filter((provider) => !provider.id || isNaN(Number(provider.id)));
      if (invalidProviders.length > 0) {
        throw new BadRequestException('Todos los proveedores deben tener un ID válido.');
      }
  
      // Ejecutar la transacción para actualizar múltiples productos
      const updatedProviders = await this.prismaService.$transaction(
        providers.map((provider) =>
          this.prismaService.provider.update({
            where: { id: Number(provider.id) },
            data: {  
              name: provider.name,
              document: provider.document,
              documentNumber: provider.documentNumber,
              description: provider.description,          
              phone: provider.phone,
              adress: provider.adress,
              email: provider.email,
              website: provider.website,
              status: provider.status,
            },
          })
        )
      );
  
      return {
        message: `${updatedProviders.length} Proveedor(es) actualizado(s) correctamente.`,
        updatedProviders,
      };
    } catch (error) {
      console.error('Error al actualizar proveedores:', error);
  
      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Uno o mas proveedores no fueron encontrados.');
        }
      }
  
      throw new InternalServerErrorException('Hubo un error al actualizar los proveedores.');
    }
  }

  async remove(id: number) {
    try{

      // Verificar si la categoría tiene productos relacionados
      const relatedProviders = await this.prismaService.entry.findMany({
        where: { providerId: id },
      });

      if (relatedProviders.length > 0) {
        throw new ConflictException(
          `No se puede eliminar el proveedor con ID ${id} porque tiene entradas relacionadas.`
        );
      }
      // Proceder con la eliminación si no hay proveedores relacionados
      const deteledProvider = this.prismaService.provider.delete({
        where:{
          id
        }
      })
      if(!deteledProvider){
        throw new NotFoundException(`Provider with id ${id} not found`)
      }
  
      return deteledProvider;

    }
    catch(error){
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }
      // Verificar si alguna de las categorías tiene productos relacionados
      const relatedProviders = await this.prismaService.entry.findMany({
        where: {
          providerId: {
            in: ids,
          },
        },
      });

      if (relatedProviders.length > 0) {
        throw new ConflictException(
          `No se pueden eliminar los proveedores porque algunos tienen datos relacionados.`
        );
      }
      
      try{
        const deletedProviders = await this.prismaService.provider.deleteMany({
          where: {
            id: {
              in: ids,
            },
          },
        });
        
        if(deletedProviders.count === 0){
          throw new NotFoundException(`No se encontraron proveedores con los IDs proporcionados.`);
        }
  
        return {
          message: `${deletedProviders.count} proveedor(es) eliminado(s) correctamente.`,
        };
      }
      catch (error) {
      console.error("Error en el backend:", error);
      throw new InternalServerErrorException('Hubo un error al eliminar los proveedores.');     
    }
  }
}

