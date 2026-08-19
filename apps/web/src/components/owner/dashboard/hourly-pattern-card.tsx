import { useMemo, useState } from 'react';
import { Clock, Flame } from '@phosphor-icons/react';
import type { HourlySales } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type HourlyPatternCardProps = {
  hourly?: HourlySales | null;
  className?: string;
};

export function HourlyPatternCard({ hourly, className = '' }: HourlyPatternCardProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Finding 3: Consistently use `transactions` for busy peak determination
  const peakHour = useMemo(() => {
    if (!hourly || hourly.hours.length === 0) return null;
    const validHours = hourly.hours.filter((h) => h.transactions > 0 || h.revenue > 0);
    if (validHours.length === 0) return null;

    return (
      [...validHours].sort(
        (a, b) => b.transactions - a.transactions || b.revenue - a.revenue,
      )[0] ?? null
    );
  }, [hourly]);

  const maxHourlyTransactions = useMemo(() => {
    if (!hourly || hourly.hours.length === 0) return 1;
    return Math.max(...hourly.hours.map((h) => h.transactions), 1);
  }, [hourly]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-1.5">
              <Clock size={18} weight="duotone" className="text-accent" />
              Pola Jam Sibuk
            </CardTitle>
            <CardDescription>Distribusi transaksi 24 jam</CardDescription>
          </div>
          {peakHour && peakHour.transactions > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-deep">
              <Flame size={14} weight="fill" className="text-accent-deep" />
              <span>
                Puncak: {String(peakHour.hour).padStart(2, '0')}:00 ({peakHour.transactions} trx)
              </span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!hourly || hourly.hours.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-2">
            Belum ada data aktivitas per jam pada periode ini.
          </p>
        ) : (
          <div data-testid="hourly-distribution" className="flex flex-col gap-3">
            {/* Hover Info Header */}
            <div className="min-h-5 text-xs">
              {hoveredHour !== null && hourly.hours[hoveredHour] ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">
                    Pukul {String(hoveredHour).padStart(2, '0')}:00:
                  </span>
                  <span className="font-semibold text-accent-deep">
                    {formatIdr(hourly.hours[hoveredHour].revenue)}
                  </span>
                  <span className="text-ink-2">
                    ({hourly.hours[hoveredHour].transactions} transaksi •{' '}
                    {hourly.hours[hoveredHour].units} produk)
                  </span>
                </div>
              ) : (
                <span className="text-ink-2">Arahkan kursor ke bar jam untuk detail waktu</span>
              )}
            </div>

            <div className="flex h-32 items-end gap-1 pt-1">
              {hourly.hours.map((h) => {
                // Finding 3: Bar height scales consistently by transaction count (with minimum height if non-zero)
                const heightPct =
                  h.transactions > 0
                    ? Math.max(14, (h.transactions / maxHourlyTransactions) * 100)
                    : h.revenue > 0
                      ? 10
                      : 4;
                const isPeak =
                  peakHour !== null &&
                  h.hour === peakHour.hour &&
                  peakHour.transactions > 0;
                const isHovered = hoveredHour === h.hour;

                return (
                  <div
                    key={h.hour}
                    className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                    onMouseEnter={() => setHoveredHour(h.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-xs transition-all duration-150 ${
                        isHovered
                          ? 'bg-accent-deep shadow-sm ring-2 ring-accent'
                          : isPeak
                            ? 'bg-accent shadow-xs'
                            : h.transactions > 0 || h.revenue > 0
                              ? 'bg-accent/40 group-hover:bg-accent/80'
                              : 'bg-paper'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="relative flex h-5 gap-1 border-t border-line pt-1.5 text-[10px] text-ink-2">
              {hourly.hours.map((h) => {
                const isFirst = h.hour === 0;
                const isLast = h.hour === 23;
                const isKeyHour = [0, 4, 8, 12, 16, 20, 23].includes(h.hour);
                const isHovered = hoveredHour === h.hour;

                if (!isKeyHour && !isHovered) {
                  return <div key={h.hour} className="flex-1" />;
                }

                return (
                  <div key={h.hour} className="relative flex-1">
                    <span
                      className={`absolute whitespace-nowrap transition-colors duration-150 ${
                        isFirst
                          ? 'left-0'
                          : isLast
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2 text-center'
                      } ${isHovered ? 'font-semibold text-accent-deep' : 'text-ink-2'}`}
                    >
                      {String(h.hour).padStart(2, '0')}:00
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
