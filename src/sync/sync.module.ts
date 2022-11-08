import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT'),
        maxRedirects: configService.get('HTTP_MAX_REDIRECTS'),
        headers: {
          'Neuvo-Secret': `Bearer ${configService.get('NEUVO_SECRET')}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [],
})
export class SyncModule {}
