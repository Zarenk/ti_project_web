import { ConflictException, Injectable } from '@nestjs/common';
import { CreateJournalDto } from './dto/create-journal.dto';

interface Journal {
  id: number;
  reference: string;
  amount: number;
}

@Injectable()
export class JournalsService {
  private journals: Journal[] = [];

  create(dto: CreateJournalDto): Journal {
    if (this.journals.some((j) => j.reference === dto.reference)) {
      throw new ConflictException('Journal already exists');
    }
    const journal: Journal = { id: this.journals.length + 1, ...dto };
    this.journals.push(journal);
    return journal;
  }
}