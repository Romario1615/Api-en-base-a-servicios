import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError, Recuperacion } from './api.service';

type Modo = 'acceso' | 'registro' | 'recuperar';

const textos = {
  acceso: { titulo: 'Iniciar sesión', instruccion: 'Ingresa a tu cuenta para reservar una sala.', accion: 'Iniciar sesión' },
  registro: { titulo: 'Crear cuenta', instruccion: 'Registra tus datos para reservar un espacio de estudio.', accion: 'Crear cuenta' },
  recuperar: { titulo: 'Recuperar acceso', instruccion: 'Ingresa tu correo para generar un código temporal. En esta práctica, el código aparece en pantalla.', accion: 'Generar código' }
} as const;

@Component({
  selector: 'app-acceso',
  imports: [FormsModule, RouterLink],
  templateUrl: './acceso.component.html'
})
export class AccesoComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ciclo = inject(DestroyRef);
  protected readonly modo = this.route.snapshot.data['modo'] as Modo;
  protected readonly texto = textos[this.modo];
  protected readonly visible = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly intento = signal(false);
  protected readonly recuperacion = signal<Recuperacion | null>(null);
  protected readonly copiado = signal('');
  protected nombre = '';
  protected email = '';
  protected password = '';

  constructor() {
    const emailRegistrado = this.router.currentNavigation()?.extras.state?.['emailRegistrado'];
    if (this.modo === 'acceso' && typeof emailRegistrado === 'string') {
      this.email = emailRegistrado;
      this.aviso.set('Cuenta creada. Ya puedes iniciar sesión.');
    } else if (this.route.snapshot.queryParamMap.get('sesion') === 'vencida') {
      this.aviso.set('Tu sesión caducó. Inicia sesión para continuar.');
    }
  }

  protected async enviar(formulario: NgForm) {
    if (this.ocupado()) return;
    this.intento.set(true);
    this.error.set('');
    this.aviso.set('');
    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      this.elemento.nativeElement.querySelector<HTMLInputElement>('input.ng-invalid')?.focus();
      return;
    }
    const email = this.email.trim().toLowerCase();
    if (this.modo === 'registro') {
      if (!this.nombre.trim()) { this.error.set('Escribe tu nombre completo.'); return; }
      if (new TextEncoder().encode(this.password).length > 72) {
        this.error.set('La contraseña admite hasta 72 bytes. Prueba con una contraseña más corta.');
        return;
      }
    }

    this.ocupado.set(true);
    try {
      if (this.modo === 'registro') {
        await this.api.registrar(this.nombre.trim(), email, this.password);
        if (!this.ciclo.destroyed) await this.router.navigate(['/acceso'], { state: { emailRegistrado: email } });
      } else if (this.modo === 'recuperar') {
        const resultado = await this.api.recuperar(email);
        if (!this.ciclo.destroyed) this.recuperacion.set(resultado);
      } else {
        await this.api.iniciarSesion(email, this.password);
        if (!this.ciclo.destroyed) await this.router.navigate(['/reservas'], { replaceUrl: true });
      }
    } catch (error) {
      this.error.set(mensajeError(error));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      this.copiado.set('Código copiado.');
    } catch {
      this.copiado.set('Selecciona el código para copiarlo.');
    }
  }
}
