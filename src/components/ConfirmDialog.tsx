import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  isLoading = false,
  confirmLabel = 'Eliminar',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof message === 'string' ? <Typography>{message}</Typography> : message}
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
