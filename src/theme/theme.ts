import { createTheme, type ThemeOptions } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

function getDesignTokens(mode: ThemeMode): ThemeOptions {
  const isLight = mode === 'light';

  return {
    palette: {
      mode,
      primary: {
        main: isLight ? '#000000' : '#ffffff',
        contrastText: isLight ? '#ffffff' : '#000000',
      },
      secondary: {
        main: isLight ? '#424242' : '#bdbdbd',
      },
      background: {
        default: isLight ? '#ffffff' : '#000000',
        paper: isLight ? '#ffffff' : '#121212',
      },
      text: {
        primary: isLight ? '#000000' : '#ffffff',
        secondary: isLight ? '#616161' : '#9e9e9e',
      },
      divider: isLight ? '#e0e0e0' : '#2c2c2c',
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            paddingTop: 12,
            paddingBottom: 12,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#ffffff' : '#000000',
            color: isLight ? '#000000' : '#ffffff',
            borderBottom: `1px solid ${isLight ? '#e0e0e0' : '#2c2c2c'}`,
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
        },
      },
      MuiContainer: {
        defaultProps: {
          maxWidth: 'sm',
        },
      },
    },
  };
}

export function buildTheme(mode: ThemeMode) {
  return createTheme(getDesignTokens(mode));
}
