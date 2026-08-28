/**
 * MUI Dialog's onClose fires on backdrop click and Escape by default, which
 * silently discards whatever the user typed into a form dialog. Wrap the
 * dialog's real close handler with this so it only closes via an explicit
 * action (Cancel/Close button, or after a successful submit).
 */
export function preventBackdropClose(close: () => void) {
  return (_event: unknown, reason?: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
    close();
  };
}
