/**
 * Opciones y agrupaciones de la ficha socioeconómica. Los `value` coinciden
 * con lo que espera el backend (FichaSocioeconomica) y con las etiquetas del
 * PDF (`modules/credito-hipotecario/documentos/ficha_socioeconomica`).
 */

export const SEXO_OPTS = [
  { value: 'm', label: 'Masculino' },
  { value: 'f', label: 'Femenino' },
] as const;

export const ESTADO_CIVIL_OPTS = [
  'soltero',
  'casado',
  'conviviente',
  'divorciado',
  'viudo',
] as const;

export const GRADO_INSTRUCCION_OPTS = [
  'sin_instruccion',
  'primaria',
  'secundaria',
  'tecnico',
  'universitario',
  'postgrado',
] as const;

export const VIV_TENENCIA_OPTS = [
  { value: 'propia', label: 'Propia' },
  { value: 'alquilada', label: 'Alquilada' },
  { value: 'hipoteca', label: 'Hipotecada' },
  { value: 'alojado', label: 'Alojado' },
  { value: 'otros', label: 'Otros' },
] as const;

export const VIV_MATERIAL_OPTS = [
  { value: 'noble_acabado', label: 'Noble/Acabado' },
  { value: 'noble_construccion', label: 'Noble/Construcción' },
  { value: 'rustico', label: 'Rústico/Adobe/Quincha' },
  { value: 'provisional', label: 'Provisional/Prefabricado' },
  { value: 'seminoble', label: 'Seminoble' },
] as const;

export const VIV_HABITACIONES_OPTS = [
  { value: 'uno', label: 'Uno' },
  { value: 'dos', label: 'Dos' },
  { value: 'tres', label: 'Tres' },
  { value: 'cuatro', label: 'Cuatro' },
  { value: 'cinco_a_mas', label: 'Cinco a más' },
] as const;

export const VIV_TIPO_OPTS = [
  { value: 'casa_independiente', label: 'Casa independiente' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'multifamiliar', label: 'Multifamiliar' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'cuarto_solo', label: 'Cuarto solo' },
] as const;

export const VIV_REDES_OPTS = [
  { value: 'luz_electrica', label: 'Luz eléctrica' },
  { value: 'cable', label: 'Cable' },
  { value: 'desague', label: 'Desagüe' },
  { value: 'internet', label: 'Internet' },
] as const;

export const VIV_MUEBLES_OPTS = [
  { value: 'equipo_sonido', label: 'Equipo de sonido' },
  { value: 'cocina_gas', label: 'Cocina a gas' },
  { value: 'refrigeradora', label: 'Refrigeradora' },
  { value: 'lavadora', label: 'Lavadora' },
  { value: 'licuadora', label: 'Licuadora' },
  { value: 'computadora', label: 'Computadora' },
  { value: 'television', label: 'Televisión' },
  { value: 'horno_microondas', label: 'Horno microondas' },
  { value: 'otros', label: 'Otros' },
] as const;

/** Campos de monto por grupo — mismo orden y claves que el backend. */
export const INGRESO_FIELDS: { key: string; label: string }[] = [
  { key: 'ing_conyuge', label: 'Esposa o cónyuge' },
  { key: 'ing_renta1', label: 'Renta 1ª categoría' },
  { key: 'ing_renta2', label: 'Renta 2ª categoría' },
  { key: 'ing_renta3', label: 'Renta 3ª categoría' },
  { key: 'ing_renta4', label: 'Renta 4ª categoría' },
  { key: 'ing_renta5', label: 'Renta 5ª categoría' },
  { key: 'ing_otros_no_formales', label: 'Otros no formales' },
  { key: 'ing_pension_judicial', label: 'Pensión judicial' },
];

export const EGRESO_PERSONAL_FIELDS: { key: string; label: string }[] = [
  { key: 'egp_alimentacion', label: 'Alimentación' },
  { key: 'egp_creditos', label: 'Créditos' },
  { key: 'egp_educacion', label: 'Educación' },
  { key: 'egp_pasajes', label: 'Pasajes' },
  { key: 'egp_agua', label: 'Agua' },
  { key: 'egp_luz', label: 'Luz' },
  { key: 'egp_telefono', label: 'Teléfono' },
  { key: 'egp_salud', label: 'Salud' },
  { key: 'egp_otros', label: 'Otros (deudas, pensiones)' },
  { key: 'egp_impuestos', label: 'Impuestos' },
  { key: 'egp_cable', label: 'Cable' },
];

export const EGRESO_NEGOCIO_FIELDS: { key: string; label: string }[] = [
  { key: 'egn_alquiler', label: 'Alquiler' },
  { key: 'egn_equipo', label: 'Equipo' },
  { key: 'egn_energia_electrica', label: 'Energía eléctrica' },
  { key: 'egn_sueldos_cargas', label: 'Sueldos y cargas sociales' },
  { key: 'egn_agua', label: 'Agua' },
  { key: 'egn_luz', label: 'Luz' },
  { key: 'egn_atenciones_personal', label: 'Atenciones al personal' },
  { key: 'egn_telefonia', label: 'Telefonía' },
  { key: 'egn_otros_impuestos_tasas', label: 'Otros impuestos y tasas' },
  { key: 'egn_seguridad_limpieza', label: 'Seguridad / limpieza' },
  { key: 'egn_suministros', label: 'Suministros' },
];

export const ALL_MONTO_KEYS: string[] = [
  ...INGRESO_FIELDS.map((f) => f.key),
  ...EGRESO_PERSONAL_FIELDS.map((f) => f.key),
  ...EGRESO_NEGOCIO_FIELDS.map((f) => f.key),
  'viv_total_activo_mueble',
  'viv_total_activo_inmueble',
];

export function sumFields(source: Record<string, unknown>, keys: string[]): number {
  return keys.reduce((acc, k) => acc + (Number(source[k]) || 0), 0);
}
