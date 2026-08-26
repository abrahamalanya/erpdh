import { useState, type ReactNode } from 'react';
import { Badge, Button, Popover, Stack } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

interface FiltrosPanelProps {
  /** Cantidad de filtros activos (no vacíos) — se muestra como badge sobre el botón. */
  activeCount: number;
  /** Limpia todos los filtros del módulo que usa este panel. */
  onClear: () => void;
  /** Los campos de filtro propios de cada módulo (Nombre, Rol, Estado, etc.). */
  children: ReactNode;
}

/**
 * Botón "Filtros" de una sola fila que abre un panel compacto con los
 * campos de filtro — para no saturar la página con una fila de TextFields
 * siempre visible. Usa Popover (no un Popper + ClickAwayListener a mano):
 * los filtros son casi siempre <TextField select>, y su menú se monta en un
 * portal aparte — un ClickAwayListener casero puede confundir ese clic con
 * uno "de afuera" y cerrar el panel antes de poder elegir una opción;
 * Popover ya resuelve eso. Genérico a propósito (no sabe qué campos filtra
 * cada módulo): cada página define sus propios filtros y los pasa como
 * children, y solo necesita calcular activeCount/onClear sobre su propio
 * estado — pensado para reusarse en Usuarios, Clientes, Bienes, Créditos, etc.
 */
export function FiltrosPanel({ activeCount, onClear, children }: FiltrosPanelProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Badge badgeContent={activeCount} color="primary">
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<FilterListIcon />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          Filtros
        </Button>
      </Badge>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2.5, width: 320, maxWidth: '90vw' } } }}
      >
        <Stack spacing={2}>
          {children}
          {activeCount > 0 && (
            <Button size="small" onClick={onClear} sx={{ alignSelf: 'flex-start' }}>
              Limpiar filtros
            </Button>
          )}
        </Stack>
      </Popover>
    </>
  );
}
