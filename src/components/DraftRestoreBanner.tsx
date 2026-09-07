import { Alert, Button, Stack } from '@mui/material';

interface DraftRestoreBannerProps {
  savedAt: number | null;
  onRestore: () => void;
  onDiscard: () => void;
}

function formatSavedAt(savedAt: number): string {
  return new Date(savedAt).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Offers to restore a create form that was left unsaved when the tab reloaded
 * (see {@link file://../hooks/useFormDraft.tsx}). Rendered at the top of the
 * dialog body only while a draft is pending.
 */
export function DraftRestoreBanner({ savedAt, onRestore, onDiscard }: DraftRestoreBannerProps) {
  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      action={
        <Stack direction="row" spacing={1}>
          <Button color="inherit" size="small" onClick={onRestore}>
            Restaurar
          </Button>
          <Button color="inherit" size="small" onClick={onDiscard}>
            Descartar
          </Button>
        </Stack>
      }
    >
      Se recuperaron datos sin guardar de un formulario anterior
      {savedAt ? ` (${formatSavedAt(savedAt)})` : ''}.
    </Alert>
  );
}
