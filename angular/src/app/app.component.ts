import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <header class="site-header">
      <div class="shell header-inner">
        <a [routerLink]="api.usuario() ? '/reservas' : '/acceso'" class="brand" aria-label="Sala ESPE, inicio">
          <span class="brand-mark" aria-hidden="true"><i class="icon book-open"></i></span><span>Sala ESPE</span>
        </a>
        @if (api.usuario(); as usuario) {
          <div class="account">
            <span class="avatar" aria-hidden="true">{{ iniciales() }}</span>
            <span class="account-name">{{ usuario.nombre }}</span>
            <button type="button" class="logout" (click)="salir()" aria-label="Cerrar sesión" title="Cerrar sesión"><i class="icon log-out" aria-hidden="true"></i><span>Salir</span></button>
          </div>
        } @else {
          <img class="espe-logo" src="espe.png" width="500" height="138" alt="Universidad de las Fuerzas Armadas ESPE">
        }
      </div>
    </header>
    <main id="contenido" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer"><div class="shell footer-inner">
      <span>Universidad de las Fuerzas Armadas ESPE</span>
      <span class="footer-right">Biblioteca universitaria</span>
    </div></footer>
  `
})
export class AppComponent {
  protected readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly iniciales = computed(() => {
    const palabras = this.api.usuario()?.nombre.trim().split(/\s+/) ?? [];
    return [palabras[0], palabras.length > 1 ? palabras.at(-1) : ''].map(p => p?.charAt(0) ?? '').join('').toLocaleUpperCase('es');
  });

  protected salir() {
    this.api.cerrarSesion();
    void this.router.navigate(['/acceso'], { replaceUrl: true });
  }
}
