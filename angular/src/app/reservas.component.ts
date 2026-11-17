import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService, DatosReserva, mensajeError, Reserva } from './api.service';
import { desdeISO, fechaBreve, fechaCivil, fechaISO, fechaLarga, mesCorto, tituloMes } from './fechas';

type ModoDialogo = 'nueva' | 'editar' | 'cancelar';
interface Aviso { texto: string; error: boolean }

@Component({ selector: 'app-reservas', imports: [FormsModule], templateUrl: './reservas.component.html' })
export class ReservasComponent {
  private readonly api = inject(ApiService);
  private readonly cambios = inject(ChangeDetectorRef);
  @ViewChild('dialogo') private dialogo!: ElementRef<HTMLDialogElement>;
  @ViewChild('formReserva') private formReserva?: NgForm;
  private turnoCarga = 0;
  protected readonly salas: string[] = ['Sala Andina', 'Sala Ceibo'];
  protected readonly diasSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  protected readonly hoy = fechaISO(new Date());
  protected readonly mes = signal(desdeISO(this.hoy));
  protected readonly filtro = signal('');
  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorLista = signal('');
  protected readonly aviso = signal<Aviso | null>(null);
  protected readonly modo = signal<ModoDialogo>('nueva');
  protected readonly elegida = signal<Reserva | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly errorDialogo = signal('');
  protected readonly fechaLarga = fechaLarga;
  protected readonly fechaBreve = fechaBreve;
  protected readonly mesCorto = mesCorto;
  protected borrador: DatosReserva = { sala: '', fecha: '', hora: '' };

  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    return this.reservas().filter(r => !filtro || r.fecha === filtro).sort((a, b) =>
      a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora) || a.sala.localeCompare(b.sala, 'es'));
  });
  protected readonly mesVisible = computed(() => tituloMes(this.mes()));
  protected readonly calendario = computed(() => {
    const mes = this.mes();
    const anio = mes.getFullYear();
    const indice = mes.getMonth();
    const inicio = (fechaCivil(anio, indice, 1).getDay() + 6) % 7;
    const cantidad = fechaCivil(anio, indice + 1, 0).getDate();
    const conteo = new Map<string, number>();
    for (const reserva of this.reservas()) conteo.set(reserva.fecha, (conteo.get(reserva.fecha) ?? 0) + 1);
    return Array.from({ length: inicio + cantidad }, (_, i) => {
      const dia = i - inicio + 1;
      if (dia < 1) return null;
      const iso = fechaISO(fechaCivil(anio, indice, dia));
      return { dia, iso, cantidad: conteo.get(iso) ?? 0 };
    });
  });

  constructor() { void this.cargar(); }

  protected async cargar(mostrarCarga = true) {
    const turno = ++this.turnoCarga;
    if (mostrarCarga) this.cargando.set(true);
    this.errorLista.set('');
    try {
      const reservas = await this.api.listar();
      if (turno === this.turnoCarga) this.reservas.set(reservas);
    } catch (error) {
      if (turno === this.turnoCarga) this.errorLista.set(mensajeError(error));
    } finally {
      if (turno === this.turnoCarga) this.cargando.set(false);
    }
  }

  protected moverMes(direccion: number) {
    const base = this.mes();
    const siguiente = fechaCivil(base.getFullYear(), base.getMonth() + direccion, 1);
    if (siguiente.getFullYear() < 1 || siguiente.getFullYear() > 9999) return;
    this.mes.set(siguiente);
    this.filtro.set('');
  }

  protected irAHoy() {
    this.mes.set(desdeISO(this.hoy));
    this.filtro.set(this.hoy);
  }

  protected abrir(modo: ModoDialogo, reserva: Reserva | null = null) {
    this.modo.set(modo);
    this.elegida.set(reserva);
    this.aviso.set(null);
    this.errorDialogo.set('');
    this.borrador = reserva ? { sala: reserva.sala, fecha: reserva.fecha, hora: reserva.hora }
      : { sala: '', fecha: this.filtro() || this.hoy, hora: '' };
    this.cambios.detectChanges();
    this.formReserva?.resetForm(this.borrador);
    this.dialogo.nativeElement.showModal();
    this.dialogo.nativeElement.querySelector<HTMLElement>('[data-inicial]')?.focus();
  }

  protected cerrar() {
    if (!this.ocupado()) this.dialogo.nativeElement.close();
  }

  protected async guardar(formulario?: NgForm) {
    if (this.ocupado()) return;
    if (formulario?.invalid) {
      formulario.control.markAllAsTouched();
      this.dialogo.nativeElement.querySelector<HTMLElement>('.ng-invalid:not(form)')?.focus();
      return;
    }

    const modo = this.modo();
    const original = this.elegida();
    this.errorDialogo.set('');
    this.ocupado.set(true);
    try {
      if (modo === 'cancelar' && original) {
        await this.api.cancelar(original._id);
        this.reservas.update(lista => lista.filter(r => r._id !== original._id));
        this.aviso.set({ texto: 'Reserva cancelada.', error: false });
      } else {
        const guardada = original ? await this.api.editar(original._id, this.borrador) : await this.api.crear(this.borrador);
        this.reservas.update(lista => [...lista.filter(r => r._id !== guardada._id), guardada]);
        this.mes.set(desdeISO(guardada.fecha));
        if (this.filtro()) this.filtro.set(guardada.fecha);
        this.aviso.set({ texto: original ? 'Cambios guardados.' : 'Reserva creada.', error: false });
      }
      this.dialogo.nativeElement.close();
      void this.cargar(false);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404 && original) {
        this.aviso.set({ texto: mensajeError(error), error: true });
        this.dialogo.nativeElement.close();
        void this.cargar();
      } else {
        this.errorDialogo.set(mensajeError(error));
      }
    } finally {
      this.ocupado.set(false);
    }
  }
}
