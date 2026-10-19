import { useRef, useState, type ReactNode } from 'react';
import { Alert, Portal, Snackbar } from '@mui/material';

interface ErrorBannerProps {
  error: string | null;
  action?: ReactNode;
}

export function ErrorBanner({ error, action }: ErrorBannerProps) {
  return error ? <ErrorNotice key={error} error={error} action={action} /> : null;
}

function ErrorNotice({ error, action }: ErrorBannerProps) {
  const [open, setOpen] = useState(true);
  const anchor = useRef<HTMLSpanElement>(null);

  return (
    <>
      <span ref={anchor} hidden />
      <Portal container={() => anchor.current?.closest('.MuiDialog-container') ?? document.body}>
        <Snackbar
          open={open}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          onClose={(_, reason) => { if (reason !== 'clickaway') setOpen(false); }}
          sx={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          <Alert
            severity="error"
            variant="filled"
            action={action}
            onClose={() => setOpen(false)}
            closeText="Cerrar error"
            sx={{ width: '100%', whiteSpace: 'pre-line', overflowWrap: 'anywhere', maxHeight: '50vh', overflowY: 'auto' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Portal>
    </>
  );
}
