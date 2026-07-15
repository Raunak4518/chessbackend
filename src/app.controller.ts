import { Controller } from '@nestjs/common';
import { AppService } from './app.service';

import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@AllowAnonymous()
@Controller()
export class AppController {
}
