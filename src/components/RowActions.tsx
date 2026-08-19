import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface RowAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface RowActionsProps {
  actions: RowAction[];
}

/**
 * Row-level actions for a DataTable "Acciones" column. On desktop it's the
 * usual row of icon buttons with hover tooltips; on mobile (where tooltips
 * barely show before the tap already fires the action) it collapses into a
 * single "⋮" button with a text-labeled menu instead.
 */
export function RowActions({ actions }: RowActionsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (actions.length === 0) {
    return null;
  }

  function handleSelect(action: RowAction) {
    setAnchorEl(null);
    action.onClick();
  }

  return (
    <>
      <Stack direction="row" sx={{ display: { xs: 'none', md: 'flex' } }}>
        {actions.map((action) => (
          <Tooltip key={action.key} title={action.label}>
            <span>
              <IconButton
                size="small"
                aria-label={action.label}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.icon}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Stack>

      <span>
        <IconButton
          size="small"
          aria-label="Más opciones"
          onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
          sx={{ display: { xs: 'inline-flex', md: 'none' } }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </span>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.disabled}
            onClick={() => handleSelect(action)}
          >
            <ListItemIcon>{action.icon}</ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
