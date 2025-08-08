import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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
  ) {
    const data: CreateBrandDto = { name: createBrandDto.name };
    if (files.logoSvg?.[0]) {
      data.logoSvg = `/uploads/brands/${files.logoSvg[0].filename}`;
    }
    if (files.logoPng?.[0]) {
      data.logoPng = `/uploads/brands/${files.logoPng[0].filename}`;
    }
    return this.brandsService.create(data);
  }

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandsService.update(+id, updateBrandDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandsService.remove(+id);
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
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    const filePath = `/uploads/brands/${file.filename}`;
    const updateData =
      file.mimetype === 'image/svg+xml'
        ? { logoSvg: filePath }
        : { logoPng: filePath };
    return this.brandsService.update(+id, updateData);
  }
}