import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AccesoComponent } from './acceso.component';
import { ApiService } from './api.service';
import { ReservasComponent } from './reservas.component';

const requiereSesion: CanActivateFn = () => !!inject(ApiService).sesion() || inject(Router).createUrlTree(['/acceso']);
const soloVisita: CanActivateFn = () => !inject(ApiService).sesion() || inject(Router).createUrlTree(['/reservas']);

export const routes: Routes = [
  { path: 'acceso', component: AccesoComponent, data: { modo: 'acceso' }, canActivate: [soloVisita], title: 'Iniciar sesión | Sala ESPE' },
  { path: 'registro', component: AccesoComponent, data: { modo: 'registro' }, canActivate: [soloVisita], title: 'Crear cuenta | Sala ESPE' },
  { path: 'recuperar', component: AccesoComponent, data: { modo: 'recuperar' }, canActivate: [soloVisita], title: 'Recuperar acceso | Sala ESPE' },
  { path: 'reservas', component: ReservasComponent, canActivate: [requiereSesion], title: 'Mis reservas | Sala ESPE' },
  { path: '', pathMatch: 'full', redirectTo: 'reservas' },
  { path: '**', redirectTo: 'reservas' }
];
