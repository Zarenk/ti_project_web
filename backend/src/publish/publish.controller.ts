import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PublishService } from './publish.service';
import { CreatePublishDto } from './dto/create-publish.dto';
import { UpdatePublishDto } from './dto/update-publish.dto';

@Controller('publish')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}
}
