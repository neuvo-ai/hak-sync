import { Controller, Get, Logger, Post } from '@nestjs/common';
import { AppService, HealthStatus } from './app.service';
import { SyncService } from './sync/sync.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(SyncService.name);
  constructor(
    private readonly appService: AppService,
    private readonly syncService: SyncService,
  ) {}

  @Get()
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }

  @Post('/sync')
  async triggerSync(): Promise<boolean> {
    try {
      await this.syncService.sync();
    } catch (e) {
      this.logger.error(e);
      return false;
    }
    return true;
  }
}
