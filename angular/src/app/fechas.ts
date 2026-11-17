const idioma = 'es-EC';
const formatoLargo = new Intl.DateTimeFormat(idioma, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatoBreve = new Intl.DateTimeFormat(idioma, { day: 'numeric', month: 'long', year: 'numeric' });
const formatoMes = new Intl.DateTimeFormat(idioma, { month: 'long', year: 'numeric' });
const mesAbreviado = new Intl.DateTimeFormat(idioma, { month: 'short' });

export function fechaCivil(anio: number, mes: number, dia: number): Date {
  const fecha = new Date(2000, 0, 1, 12);
  fecha.setFullYear(anio, mes, dia);
  return fecha;
}

export function fechaISO(fecha: Date): string {
  return [String(fecha.getFullYear()).padStart(4, '0'), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-');
}

export function desdeISO(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return fechaCivil(anio, mes - 1, dia);
}

export const fechaLarga = (iso: string) => formatoLargo.format(desdeISO(iso));
export const fechaBreve = (iso: string) => formatoBreve.format(desdeISO(iso));
export const tituloMes = (fecha: Date) => formatoMes.format(fecha);
export const mesCorto = (iso: string) => mesAbreviado.format(desdeISO(iso)).replace('.', '');
