import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './endpoints/auth/auth.service';
import { SessionMiddleware } from './endpoints/auth/session.middleware';
import { AuthController } from './endpoints/auth/auth.controller';
import { AlertsService } from './endpoints/alerts/alerts.service';
import { AlertsController } from './endpoints/alerts/alerts.controller';
import { PgRestController } from './endpoints/pgrest/pgrest.controller';
import { PgRestService } from './endpoints/pgrest/pgrest.service';
import { TemplatesService } from './endpoints/templates/templates.service';
import { TemplatesController } from './endpoints/templates/templates.controller';
import { WorkCenterController } from './endpoints/work-center/work-center.controller';
import { WorkCenterService } from './endpoints/work-center/work-center.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    AuthController,
    AlertsController,
    PgRestController,
    TemplatesController,
    WorkCenterController
  ],
  providers: [
    AppService,
    AuthService,
    AlertsService,
    PgRestService,
    TemplatesService,
    WorkCenterService
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('/auth/login');
  }
}
