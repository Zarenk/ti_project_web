export class QueryActivityDto {
  page?: number;
  pageSize?: number;
  q?: string;
  actorId?: string;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}