/** Roles y secciones del expediente del crédito hipotecario (mismo set que el backend). */

export type ExpedienteRol = 'deudor' | 'aval1' | 'aval2' | 'inmueble';

export type ExpedienteSeccion =
  | 'dni'
  | 'casa'
  | 'negocio'
  | 'ubicacion_maps'
  | 'croquis'
  | 'terreno'
  | 'trabajo'
  | 'suministro'
  | 'recibo_servicio'
  | 'central_riesgo'
  | 'copia_literal'
  | 'certificado_literal';

export const EXPEDIENTE_ROL_LABELS: Record<ExpedienteRol, string> = {
  deudor: 'Deudor',
  aval1: 'Aval 1',
  aval2: 'Aval 2',
  inmueble: 'Inmueble',
};

export const EXPEDIENTE_SECCION_LABELS: Record<ExpedienteSeccion, string> = {
  dni: 'DNI (anverso / reverso)',
  casa: 'Fotos de la casa',
  negocio: 'Fotos del negocio',
  ubicacion_maps: 'Ubicación (Google Maps)',
  croquis: 'Croquis',
  terreno: 'Fotos del terreno',
  trabajo: 'Fotos del trabajo del cliente',
  suministro: 'Foto de suministro',
  recibo_servicio: 'Recibos de luz / agua',
  central_riesgo: 'Central de riesgo (Equifax)',
  copia_literal: 'Copia literal',
  certificado_literal: 'Certificado literal',
};

/** Secciones que aplican por persona (deudor / aval1 / aval2). */
export const SECCIONES_PERSONA: ExpedienteSeccion[] = [
  'dni',
  'casa',
  'ubicacion_maps',
  'croquis',
  'terreno',
  'trabajo',
  'negocio',
  'suministro',
  'recibo_servicio',
  'central_riesgo',
];

/** Secciones del inmueble. */
export const SECCIONES_INMUEBLE: ExpedienteSeccion[] = ['copia_literal', 'certificado_literal'];
