import { Injectable } from '@nestjs/common';

@Injectable()
export class CampaignsService {
  async create(dto: any) {
    return { id: Date.now(), ...dto };
  }

  async schedule(id: number, publishAt: string) {
    return { id, publishAt };
  }
}