import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';

export interface Usuario { id: string; nombre: string; email: string }
export interface Sesion { token: string; usuario: Usuario }
export interface DatosReserva { sala: string; fecha: string; hora: string }
export interface Reserva extends DatosReserva { _id: string }
export interface Recuperacion { mensaje: string; token?: string; expiraEnMinutos?: number }

const claveSesion = 'sala-espe.sesion';

function restaurarSesion(): Sesion | null {
  try {
    const dato = JSON.parse(sessionStorage.getItem(claveSesion) ?? 'null');
    if (typeof dato?.token === 'string' && dato.token && typeof dato.usuario?.nombre === 'string'
      && typeof dato.usuario.id === 'string' && typeof dato.usuario.email === 'string') return dato;
  } catch { /* Una sesión en memoria también funciona si el navegador restringe el almacenamiento. */ }
  return null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly actual = signal<Sesion | null>(restaurarSesion());
  readonly sesion = this.actual.asReadonly();
  readonly usuario = computed(() => this.actual()?.usuario ?? null);

  registrar(nombre: string, email: string, password: string) {
    return firstValueFrom(this.http.post<{ usuario: Usuario }>('/api/auth/register', { nombre, email, password }));
  }

  async iniciarSesion(email: string, password: string) {
    const sesion = await firstValueFrom(this.http.post<Sesion>('/api/auth/login', { email, password }));
    this.actual.set(sesion);
    try { sessionStorage.setItem(claveSesion, JSON.stringify(sesion)); } catch { /* Sesión en memoria. */ }
  }

  cerrarSesion() {
    this.actual.set(null);
    try { sessionStorage.removeItem(claveSesion); } catch { /* Sesión en memoria. */ }
  }

  recuperar(email: string) {
    return firstValueFrom(this.http.post<Recuperacion>('/api/auth/recover', { email }));
  }

  listar() {
    return firstValueFrom(this.http.get<Reserva[]>('/api/reservas'));
  }

  crear(datos: DatosReserva) {
    return firstValueFrom(this.http.post<Reserva>('/api/reservas', datos));
  }

  editar(id: string, datos: DatosReserva) {
    return firstValueFrom(this.http.put<Reserva>(`/api/reservas/${encodeURIComponent(id)}`, datos));
  }

  cancelar(id: string) {
    return firstValueFrom(this.http.delete<{ mensaje: string }>(`/api/reservas/${encodeURIComponent(id)}`));
  }
}

export const interceptorSesion: HttpInterceptorFn = (request, next) => {
  if (!/^\/api\/reservas(?:\/|$)/.test(request.url)) return next(request);
  const api = inject(ApiService);
  const router = inject(Router);
  const token = api.sesion()?.token;
  const autenticada = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(autenticada).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && token === api.sesion()?.token) {
      api.cerrarSesion();
      void router.navigate(['/acceso'], { queryParams: { sesion: 'vencida' }, replaceUrl: true });
    }
    return throwError(() => error);
  }));
};

export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (typeof error.error?.mensaje === 'string') return error.error.mensaje;
    if (error.status === 0 || error.status >= 500) return 'El servicio no está disponible. Vuelve a intentarlo en unos minutos.';
  }
  return 'No se pudo completar la solicitud. Vuelve a intentarlo.';
}
