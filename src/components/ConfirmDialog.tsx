import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material';
import { DialogHeader } from './DialogHeader';
import { preventBackdropClose } from '../utils/dialog';
import { ErrorBanner } from './ErrorBanner';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  loadingLabel?: string;
  error?: string | null;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  isLoading = false,
  confirmLabel = 'Eliminar',
  loadingLabel = 'Eliminando...',
  error = null,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={preventBackdropClose(onCancel)} fullWidth maxWidth="xs">
      <DialogHeader onClose={onCancel}>{title}</DialogHeader>
      <DialogContent>
        <Stack spacing={2}>
          <ErrorBanner error={error} />
          {typeof message === 'string' ? <Typography>{message}</Typography> : message}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? loadingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
