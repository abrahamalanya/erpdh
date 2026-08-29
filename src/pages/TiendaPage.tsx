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
import { listTiendaBienes } from '../api/tienda';
import { BIEN_TIPO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { formatMonto } from '../utils/format';
import type { BienTipo, PaginatedData, TiendaBien } from '../types/api';

export function TiendaPage() {
  const [result, setResult] = useState<PaginatedData<TiendaBien> | null>(null);
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<BienTipo | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    listTiendaBienes(page, tipo ? { tipo } : {})
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [page, tipo]);

  const bienes = result?.data ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={4}>
        <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <StorefrontIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Tienda
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 480 }}>
            Bienes recuperados disponibles para la venta. Si te interesa alguno, contáctanos desde su
            página de detalle.
          </Typography>
        </Stack>

        <TextField
          select
          label="Filtrar por tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as BienTipo | '');
            setPage(1);
          }}
          sx={{ maxWidth: 260 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="electro">{BIEN_TIPO_LABELS.electro}</MenuItem>
          <MenuItem value="varios">{BIEN_TIPO_LABELS.varios}</MenuItem>
        </TextField>

        {loadError && <Alert severity="error">{loadError}</Alert>}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress color="inherit" />
          </Box>
        ) : bienes.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
            No hay bienes disponibles por el momento.
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
            {bienes.map((bien) => (
              <Card key={bien.id} variant="outlined">
                <CardActionArea component={RouterLink} to={`/tienda/${bien.id}`}>
                  <CardMedia
                    component="img"
                    height={180}
                    image={bien.foto_cliente_producto_url ?? bien.fotos[0]?.url ?? undefined}
                    alt={bien.nombre}
                    sx={{ objectFit: 'cover', bgcolor: 'action.hover' }}
                  />
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Chip label={BIEN_TIPO_LABELS[bien.tipo]} size="small" sx={{ alignSelf: 'flex-start' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                        {bien.nombre}
                      </Typography>
                      {(bien.marca || bien.modelo) && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                          {[bien.marca, bien.modelo].filter(Boolean).join(' / ')}
                        </Typography>
                      )}
                      <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {formatMonto(bien.precio_venta ?? bien.valorizacion)}
                      </Typography>
                      {bien.agencia && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {bien.agencia.nombre}
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
