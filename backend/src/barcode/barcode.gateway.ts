import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets'
import { Server } from 'socket.io'
import { Injectable } from '@nestjs/common'
import { ProductsService } from '../products/products.service'

@WebSocketGateway({
  cors: {
    origin: '*', // o especifica tu frontend
  },
})
@Injectable()
export class BarcodeGateway {
  @WebSocketServer()
  server!: Server

  constructor(private productsService: ProductsService) {}

  @SubscribeMessage('barcode:scan')
  async handleBarcodeScan(@MessageBody() code: string) {
    const product = await this.productsService.findByBarcode(code)
    this.server.emit('barcode:result', product || { error: 'Producto no encontrado' })
  }
}