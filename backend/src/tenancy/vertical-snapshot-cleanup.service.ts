import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Cron service for cleaning up expired vertical rollback snapshots
 * Runs daily to remove snapshots older than their expiration date
 */
@Injectable()
export class VerticalSnapshotCleanupService {
  private readonly logger = new Logger(VerticalSnapshotCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs daily at 3 AM to clean up expired rollback snapshots
   * Snapshots expire 7 days after creation
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredSnapshots() {
    const now = new Date();
    this.logger.log('[vertical-snapshot-cleanup] Running expired snapshots cleanup job');

    try {
      // Delete all snapshots where expiresAt is in the past
      const result = await this.prisma.companyVerticalRollbackSnapshot.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `[vertical-snapshot-cleanup] ✅ Deleted ${result.count} expired rollback snapshot(s)`,
        );
      } else {
        this.logger.debug(
          '[vertical-snapshot-cleanup] No expired snapshots found',
        );
      }

      // Also clean up organization-level snapshots (if they exist)
      const orgResult = await this.prisma.verticalRollbackSnapshot.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      if (orgResult.count > 0) {
        this.logger.log(
          `[vertical-snapshot-cleanup] ✅ Deleted ${orgResult.count} expired organization rollback snapshot(s)`,
        );
      }

      return {
        companySnapshotsDeleted: result.count,
        organizationSnapshotsDeleted: orgResult.count,
        cleanedAt: now.toISOString(),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `[vertical-snapshot-cleanup] ❌ Error during cleanup: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Manual cleanup method that can be called directly
   * Useful for testing or triggering cleanup on demand
   */
  async manualCleanup() {
    this.logger.log('[vertical-snapshot-cleanup] Manual cleanup triggered');
    return this.cleanupExpiredSnapshots();
  }
}
