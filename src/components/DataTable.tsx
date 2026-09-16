import type { ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

export interface DataTableColumn<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => number | string;
  isLoading: boolean;
  emptyMessage: string;
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  maxHeight?: string | number;
}

const DEFAULT_MAX_HEIGHT = 'calc(100dvh - 280px)';

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  isLoading,
  emptyMessage,
  page,
  lastPage,
  onPageChange,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  return (
    <>
      <TableContainer sx={{ maxHeight, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableCell key={index} align={column.align} sx={{ whiteSpace: 'nowrap' }}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={keyExtractor(row)}>
                {columns.map((column, index) => (
                  <TableCell key={index} align={column.align} sx={{ whiteSpace: 'nowrap' }}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {lastPage > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={lastPage} page={page} onChange={(_, value) => onPageChange(value)} />
        </Box>
      )}
    </>
  );
}
