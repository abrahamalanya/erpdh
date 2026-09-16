import type { ReactNode } from 'react';
import { DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface DialogHeaderProps {
  children: ReactNode;
  onClose: () => void;
}

/** DialogTitle con un botón "x" a la derecha para cerrar el modal, además del botón Cancelar del footer. */
export function DialogHeader({ children, onClose }: DialogHeaderProps) {
  return (
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      {children}
      <IconButton onClick={onClose} size="small" aria-label="Cerrar" edge="end">
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  );
}
