import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OwnerPageHeader } from './owner-page-header';
import { MetricCard } from './metric-card';
import { SalesTrendChart } from './dashboard/sales-trend-chart';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Sparkle } from '@phosphor-icons/react';

describe('OwnerPageHeader', () => {
  it('renders title, subtitle, and actions', () => {
    render(
      <OwnerPageHeader
        title="Ringkasan Bisnis"
        subtitle="Analisis penjualan toko Anda"
        actions={<button type="button">Unduh Laporan</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ringkasan Bisnis');
    expect(screen.getByText('Analisis penjualan toko Anda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unduh Laporan' })).toBeInTheDocument();
  });
});

describe('MetricCard', () => {
  it('renders label, formatted value, and description', () => {
    render(
      <MetricCard
        label="Total Penjualan"
        value="Rp 1.500.000"
        description="+12% dari bulan lalu"
        icon={Sparkle}
      />,
    );

    expect(screen.getByText('Total Penjualan')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
    expect(screen.getByText('+12% dari bulan lalu')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renders title, description, and children when open', () => {
    render(
      <Modal open={true} title="Ubah Stok" description="Sesuaikan jumlah stok" onClose={vi.fn()}>
        <div>Form Konten</div>
      </Modal>,
    );

    expect(screen.getByText('Ubah Stok')).toBeInTheDocument();
    expect(screen.getByText('Sesuaikan jumlah stok')).toBeInTheDocument();
    expect(screen.getByText('Form Konten')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Ubah Stok" onClose={onClose}>
        <div>Konten</div>
      </Modal>,
    );

    const closeBtn = screen.getByLabelText('Tutup');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Ubah Stok" onClose={onClose}>
        <div>Konten</div>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render anything when open is false', () => {
    const { container } = render(
      <Modal open={false} title="Ubah Stok" onClose={vi.fn()}>
        <div>Konten</div>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Pagination', () => {
  it('disables previous on page 1 and calls onPageChange on next', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    const prevBtn = screen.getByLabelText('Halaman sebelumnya');
    const nextBtn = screen.getByLabelText('Halaman berikutnya');

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables next on the final page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={5} onPageChange={onPageChange} />);

    const prevBtn = screen.getByLabelText('Halaman sebelumnya');
    const nextBtn = screen.getByLabelText('Halaman berikutnya');

    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});

describe('DataTable', () => {
  type Item = { id: string; name: string; qty: number };
  const columns: ColumnDef<Item>[] = [
    { header: 'Nama', accessor: (row) => row.name },
    { header: 'Jumlah', accessor: (row) => String(row.qty) },
  ];

  it('renders loading skeletons when isLoading is true', () => {
    render(
      <DataTable columns={columns} data={[]} keyExtractor={(item) => item.id} isLoading={true} />,
    );
    expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
  });

  it('renders error state when isError is true', () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        isError={true}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Gagal memuat data.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyTitle="Tidak ada data"
        emptyDescription="Belum ada transaksi"
      />,
    );
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    expect(screen.getByText('Belum ada transaksi')).toBeInTheDocument();
  });

  it('renders table rows when populated with data', () => {
    const items: Item[] = [
      { id: '1', name: 'Kopi Susu', qty: 10 },
      { id: '2', name: 'Roti Bakar', qty: 5 },
    ];
    render(<DataTable columns={columns} data={items} keyExtractor={(item) => item.id} />);
    expect(screen.getByText('Kopi Susu')).toBeInTheDocument();
    expect(screen.getByText('Roti Bakar')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('SalesTrendChart', () => {
  it('renders empty message when points are empty', () => {
    render(<SalesTrendChart points={[]} />);
    expect(screen.getByText('Belum ada data penjualan pada periode ini')).toBeInTheDocument();
  });

  it('renders chart and tooltip hint when points are provided', () => {
    const points = [
      { day: '2026-08-18', revenue: 100000, transactions: 5, units: 10 },
      { day: '2026-08-19', revenue: 200000, transactions: 8, units: 15 },
    ];
    render(<SalesTrendChart points={points} />);
    expect(screen.getByText('Arahkan kursor ke grafik untuk detail harian')).toBeInTheDocument();
  });

  it('renders a responsive SVG that fills the container', () => {
    const points = [
      { day: '2026-08-18', revenue: 100000, transactions: 5, units: 10 },
      { day: '2026-08-19', revenue: 200000, transactions: 8, units: 15 },
    ];
    const { container } = render(<SalesTrendChart points={points} />);
    const svg = container.querySelector('svg');

    expect(screen.getByTestId('sales-trend-chart')).toHaveClass('w-full');
    expect(svg).toBeInTheDocument();
  });

  it('renders comparison legend when comparisonPoints are provided', () => {
    const points = [{ day: '2026-08-19', revenue: 200000, transactions: 8, units: 15 }];
    const comparisonPoints = [{ day: '2026-07-19', revenue: 150000, transactions: 6, units: 12 }];
    render(<SalesTrendChart points={points} comparisonPoints={comparisonPoints} />);
    expect(screen.getByText('Bulan Ini')).toBeInTheDocument();
    expect(screen.getByText('Bulan Lalu')).toBeInTheDocument();
  });
});
