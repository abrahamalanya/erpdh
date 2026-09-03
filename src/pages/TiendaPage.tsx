import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { listTiendaArticulos } from '../api/tienda';
import { formatMonto } from '../utils/format';
import type { ArticuloTipo, PaginatedData, TiendaArticulo } from '../types/api';

const ARTICULO_TIPO_LABELS: Record<ArticuloTipo, string> = {
  bien: 'Bien',
  vehiculo: 'Vehículo',
  inmueble: 'Inmueble',
};

export function TiendaPage() {
  const [result, setResult] = useState<PaginatedData<TiendaArticulo> | null>(null);
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<ArticuloTipo | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    listTiendaArticulos(page, tipo ? { tipo } : {})
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [page, tipo]);

  const articulos = result?.data ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={4}>
        <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <StorefrontIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Tienda
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 480 }}>
            Bienes, vehículos e inmuebles recuperados disponibles para la venta. Si te interesa
            alguno, contáctanos desde su página de detalle.
          </Typography>
        </Stack>

        <TextField
          select
          label="Filtrar por tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as ArticuloTipo | '');
            setPage(1);
          }}
          sx={{ maxWidth: 260 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(ARTICULO_TIPO_LABELS) as ArticuloTipo[]).map((t) => (
            <MenuItem key={t} value={t}>
              {ARTICULO_TIPO_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>

        {loadError && <Alert severity="error">{loadError}</Alert>}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress color="inherit" />
          </Box>
        ) : articulos.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
            No hay artículos disponibles por el momento.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2.5,
            }}
          >
            {articulos.map((a) => (
              <Card key={`${a.articulo_tipo}-${a.id}`} variant="outlined">
                <CardActionArea component={RouterLink} to={`/tienda/${a.articulo_tipo}/${a.id}`}>
                  <CardMedia
                    component="img"
                    height={180}
                    image={a.foto_cliente_producto_url ?? a.fotos[0]?.url ?? undefined}
                    alt={a.nombre}
                    sx={{ objectFit: 'cover', bgcolor: 'action.hover' }}
                  />
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Chip
                        label={ARTICULO_TIPO_LABELS[a.articulo_tipo]}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                        {a.nombre}
                      </Typography>
                      {(a.marca || a.modelo) && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                          {[a.marca, a.modelo].filter(Boolean).join(' / ')}
                        </Typography>
                      )}
                      <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {formatMonto(a.precio_venta ?? a.valorizacion)}
                      </Typography>
                      {a.agencia && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {a.agencia.nombre}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}

        {result && result.last_page > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Pagination count={result.last_page} page={page} onChange={(_, value) => setPage(value)} />
          </Box>
        )}
      </Stack>
    </Container>
  );
}
