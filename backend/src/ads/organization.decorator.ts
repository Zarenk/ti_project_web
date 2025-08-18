import { SetMetadata } from '@nestjs/common';

export const ORGANIZATION_KEY = 'organizationScoped';
export const OrganizationScoped = () => SetMetadata(ORGANIZATION_KEY, true);