import { Skeleton, Stack } from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 6 }: TableSkeletonProps) {
  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={160} height={40} />
        <Skeleton variant="rounded" width={140} height={36} />
      </Stack>
      <Stack spacing={1}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={48} />
        ))}
      </Stack>
    </Stack>
  );
}
