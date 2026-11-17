import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { interceptorSesion } from './app/api.service';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([interceptorSesion])), provideRouter(routes)]
}).catch(error => console.error('No se pudo iniciar Sala ESPE.', error));
