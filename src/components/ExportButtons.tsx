import { useState } from 'react';
import { Button, ButtonGroup, Stack, Tooltip } from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { downloadBlob } from '../utils/download';

interface ExportButtonsProps {
  exportPdf: () => Promise<Blob>;
  exportExcel: () => Promise<Blob>;
  /** Sin extensión — se le agrega .pdf / .xlsx según el botón. */
  filename: string;
}

/**
 * Botones "Excel"/"PDF" reusables para cualquier reporte — el archivo lo
 * genera el backend (mismo que consumirá la app móvil más adelante); acá
 * solo se pide el Blob ya armado y se fuerza su descarga.
 */
export function ExportButtons({ exportPdf, exportExcel, filename }: ExportButtonsProps) {
  const [loading, setLoading] = useState<'pdf' | 'excel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(formato: 'pdf' | 'excel') {
    setLoading(formato);
    setError(null);

    try {
      const blob = await (formato === 'pdf' ? exportPdf() : exportExcel());
      downloadBlob(blob, `${filename}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setLoading(null);
    }
  }

  const buttons = (
    <ButtonGroup variant="outlined" size="small" disabled={loading !== null}>
      <Button startIcon={<TableViewIcon />} onClick={() => handleExport('excel')}>
        Excel
      </Button>
      <Button startIcon={<PictureAsPdfIcon />} onClick={() => handleExport('pdf')}>
        PDF
      </Button>
    </ButtonGroup>
  );

  if (!error) {
    return buttons;
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Tooltip title={error}>{buttons}</Tooltip>
    </Stack>
  );
}
