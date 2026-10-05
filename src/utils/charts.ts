/**
 * Paleta categórica para los gráficos de @mui/x-charts.
 *
 * Orden fijo e identidad estable: el mismo significado conserva el mismo
 * color entre gráficos y entre light/dark (los valores solo se ajustan para
 * mantener el contraste contra el fondo). No ciclar: con 5 slots más un gris
 * neutro para "Otros" cubre todos los gráficos de este app.
 *
 * Antes vivía duplicada en ReporteFlujoCajaPage y ReporteCobranzaMensualPage;
 * se extrajo al añadir el dashboard inicial, que la necesita igual.
 */
export const PALETA_CATEGORIAS: Record<'light' | 'dark', string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
};

/** Gris neutro para el agregado "Otros" de los gráficos por categoría. */
export const COLOR_OTROS: Record<'light' | 'dark', string> = { light: '#898781', dark: '#898781' };
