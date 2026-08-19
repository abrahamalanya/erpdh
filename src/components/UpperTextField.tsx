import type { ChangeEvent } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

/**
 * TextField that forces its displayed value to uppercase as the user types.
 * Use for free-text fields (nombre, dirección, observación, etc.) — the API
 * payload should still be lowercased before sending, see `toLower`.
 */
export function UpperTextField({ onChange, ...props }: TextFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    event.target.value = event.target.value.toUpperCase();
    onChange?.(event as ChangeEvent<HTMLInputElement>);
  }

  return <TextField {...props} onChange={handleChange} />;
}
