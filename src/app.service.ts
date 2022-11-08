import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  healthy: boolean;
  database: boolean;
  lastSync: Date;
  started: Date;
}

const started = new Date();

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      healthy: true, // TODO: fetch status
      database: true, // TODO: fetch the connection status
      lastSync: new Date(), // TODO: fetch from the service
      started,
    };
  }
}
