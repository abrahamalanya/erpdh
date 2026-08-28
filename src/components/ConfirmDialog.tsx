import type { ReactNode } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { preventBackdropClose } from '../utils/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
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
  error = null,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={preventBackdropClose(onCancel)} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {typeof message === 'string' ? <Typography>{message}</Typography> : message}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Eliminando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
