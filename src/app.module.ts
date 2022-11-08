import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Handles syncing / the main logic
import { SyncModule } from './sync/sync.module';
import { SyncService } from './sync/sync.service';

// Cron
import { ScheduleModule } from '@nestjs/schedule';

// For communicating with HTTP
import { HttpModule } from '@nestjs/axios';

// MySQL
import { MysqlModule } from 'nest-mysql';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    SyncModule,
    HttpModule,
    MysqlModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        host: configService.get('MYSQL_HOST') ?? '127.0.0.1',
        port: configService.get('MYSQL_PORT') ?? 3306,
        user: configService.get('MYSQL_USERNAME'),
        password: configService.get('MYSQL_PASSWORD'),
        database: configService.get('MYSQL_DATABASE'),
        trace: true,
        typeCast: true,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, SyncService],
})
export class AppModule {}
