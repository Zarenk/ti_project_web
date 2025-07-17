import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { Prisma} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  
  constructor(
    private prismaService: PrismaService,
  ) {}

  async create(data: { name: string; type: string; typeNumber: string; userId?: number; image?: string }) {
    const userId = data.userId || (await this.createGenericUser()); // Crear un usuario genérico si no se proporciona uno
  
    return this.prismaService.client.create({
      data: {
        name: data.name,
        type: data.type,
        typeNumber: data.typeNumber,
        userId,
        image: data.image,
      },
    });
  }
  
  private async createGenericUser() {
    const genericUser = await this.prismaService.user.create({
      data: {
        email: `generic_${Date.now()}@example.com`,
        username: `generic_${Date.now()}`,
        password: "default_password", // Asegúrate de encriptar esto si es necesario
        role: "CLIENT",
      },
    });
    return genericUser.id;
  }

  async verifyOrCreateClients(clients: { name: string; type:string; typeNumber: string; idUser: number }[]) {
    const createdClients: {
      id: number;
      name: string | null;
      type: string | null;
      typeNumber: string | null;
      phone: string | null;
      adress: string | null;
      email: string | null;
      status: string | null;
      image: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[] = [];
  
    for (const client of clients) {
      // Verificar si el documento ya existe
      let existingClient = await this.prismaService.client.findUnique({
        where: { typeNumber: client.typeNumber },
      });
  
      if (!existingClient) {
        // Crear el producto si no existe
        const newClient = await this.prismaService.client.create({
          data: {
            name: client.name,
            type: client.type || '',
            typeNumber: client.typeNumber || '',
            userId: client.idUser,
          },
        });
        createdClients.push(newClient);
      }
      else {
        createdClients.push(existingClient);
      }
    }
  
    console.log("Clientes creados/verificados:", createdClients);
    return createdClients;
  }

  // client.service.ts
  async checkIfExists(typeNumber: string): Promise<boolean> {
    const client = await this.prismaService.client.findUnique({
      where: { typeNumber },
    });
    return !! client; // Devuelve true si el proveedor existe, false si no
  }

  findAll() {
    return this.prismaService.client.findMany()
  }

  async findOne(id: number) {

    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    const clientFound = await this.prismaService.client.findUnique({ // NO OLVIDAR EL AWAIT O ASYNC CON FUNCIONES
      where: {id: id,}
    })

    if(!clientFound){
      throw new NotFoundException(`Client with id ${id} not found`)
    }

    return clientFound;
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    try{
      const productFound = await this.prismaService.product.update({
        where: {id: Number(id)},  
        data: updateClientDto
      })
  
      if(!productFound){
        throw new NotFoundException(`Client with id ${id} not found`)
      }
  
      return productFound;
    } catch (error){
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `El cliente con el nombre "${updateClientDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }    
  }

  async updateMany(clients: UpdateClientDto[]) {
    if (!Array.isArray(clients) || clients.length === 0) {
      throw new BadRequestException('No se proporcionaron clientes para actualizar.');
    }
  
    try {
      // Validar que todos los productos tengan un ID válido
      const invalidClients = clients.filter((client) => !client.id || isNaN(Number(client.id)));
      if (invalidClients.length > 0) {
        throw new BadRequestException('Todos los clientes deben tener un ID válido.');
      }
  
      // Ejecutar la transacción para actualizar múltiples productos
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
            },
          })
        )
      );
  
      return {
        message: `${updatedClients.length} cliente(s) actualizado(s) correctamente.`,
        updatedClients,
      };
    } catch (error) {
      console.error('Error al actualizar clientes:', error);
  
      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Uno o más clientes no fueron encontrados.');
        }
      }
  
      throw new InternalServerErrorException('Hubo un error al actualizar los clientes.');
    }
  }

  async remove(id: number) {
      const deletedClient = this.prismaService.client.delete({
      where:{
        id
      }
    })

    if(!deletedClient){
      throw new NotFoundException(`Client with id ${id} not found`)
    }

    return deletedClient;
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }
  
    try {

      // Convertir los IDs a números
      const numericIds = ids.map((id) => Number(id));

      const deletedClients = await this.prismaService.client.deleteMany({
        where: {
          id: {
            in: numericIds, // Elimina todos los productos cuyos IDs estén en este array
          },
        },
      });
  
      if (deletedClients.count === 0) {
        throw new NotFoundException('No se encontraron clientes con los IDs proporcionados.');
      }
        
      return {
        message: `${deletedClients.count} cliente(s) eliminado(s) correctamente.`,
      };
    } catch (error) {
      console.error("Error en el backend:", error);
      throw new InternalServerErrorException('Hubo un error al eliminar los clientes.');     
    }
  }
}
