import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Request } from 'express';  

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
   @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logoSvg', maxCount: 1 },
        { name: 'logoPng', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/brands',
          filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${unique}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (
            file.mimetype !== 'image/png' &&
            file.mimetype !== 'image/svg+xml'
          ) {
            return cb(
              new BadRequestException('Solo se permiten archivos PNG o SVG'),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  create(
    @Body() createBrandDto: CreateBrandDto,
    @UploadedFiles()
    files: { logoSvg?: Express.Multer.File[]; logoPng?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const data: CreateBrandDto = { name: createBrandDto.name };
    if (files.logoSvg?.[0]) {
      data.logoSvg = `/uploads/brands/${files.logoSvg[0].filename}`;
    }
    if (files.logoPng?.[0]) {
      data.logoPng = `/uploads/brands/${files.logoPng[0].filename}`;
    }
    return this.brandsService.create(data, req);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.brandsService.findAll(+page, +limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(+id);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logoSvg', maxCount: 1 },
        { name: 'logoPng', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/brands',
          filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${unique}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (
            file.mimetype !== 'image/png' &&
            file.mimetype !== 'image/svg+xml'
          ) {
            return cb(
              new BadRequestException('Solo se permiten archivos PNG o SVG'),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @UploadedFiles()
    files: { logoSvg?: Express.Multer.File[]; logoPng?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const data: UpdateBrandDto = { ...updateBrandDto };
    if (files.logoSvg?.[0]) {
      data.logoSvg = `/uploads/brands/${files.logoSvg[0].filename}`;
    }
    if (files.logoPng?.[0]) {
      data.logoPng = `/uploads/brands/${files.logoPng[0].filename}`;
    }
    return this.brandsService.update(+id, data, req);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.brandsService.remove(+id, req);
  }

  @Post(':id/upload-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/brands',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype !== 'image/png' &&
          file.mimetype !== 'image/svg+xml'
        ) {
          return cb(
            new BadRequestException('Solo se permiten archivos PNG o SVG'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    const filePath = `/uploads/brands/${file.filename}`;
    const updateData =
      file.mimetype === 'image/svg+xml'
        ? { logoSvg: filePath }
        : { logoPng: filePath };
    return this.brandsService.update(+id, updateData, req); 
  }
}