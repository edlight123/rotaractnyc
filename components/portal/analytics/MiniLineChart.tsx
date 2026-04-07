'use client';

import { useMemo, useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface MiniLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

/**
 * Pure SVG line chart with gradient fill, responsive width, and hover tooltips.
 * No charting library required.
 */
export default function MiniLineChart({
  data,
  color = '#9B1B30',
  height = 220,
}: MiniLineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const padding = { top: 20, right: 16, bottom: 36, left: 44 };
  // Use a fixed internal width; the SVG stretches via viewBox
  const innerWidth = 600;
  const chartW = innerWidth - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, polyline, areaPath, minVal, maxVal, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], polyline: '', areaPath: '', minVal: 0, maxVal: 0, yTicks: [] as number[] };
    }

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Add 10% padding top/bottom so lines don't hug edges
    const range = max - min || 1;
    const padded = range * 0.1;
    const yMin = Math.max(0, min - padded);
    const yMax = max + padded;
    const yRange = yMax - yMin || 1;

    const pts = data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padding.top + chartH - ((d.value - yMin) / yRange) * chartH;
      return { x, y, ...d };
    });

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    const area = [
      ...pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`),
      `L${pts[pts.length - 1].x},${padding.top + chartH}`,
      `L${pts[0].x},${padding.top + chartH}`,
      'Z',
    ].join(' ');

    // Generate ~4 y-axis ticks
    const tickCount = 4;
    const step = yRange / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(yMin + step * i));

    return { points: pts, polyline: line, areaPath: area, minVal: yMin, maxVal: yMax, yTicks: ticks };
  }, [data, chartW, chartH, padding.left, padding.top]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 dark:text-gray-600" style={{ height }}>
        No data available
      </div>
    );
  }

  const gradientId = `line-grad-${color.replace('#', '')}`;
  const yRange = maxVal - minVal || 1;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${innerWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        role="img"
        aria-label="Line chart showing trend over time"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines & labels */}
        {yTicks.map((tick) => {
          const y = padding.top + chartH - ((tick - minVal) / yRange) * chartH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={innerWidth - padding.right}
                y2={y}
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 dark:fill-gray-500"
                fontSize={11}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Gradient fill area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points & X-axis labels */}
        {points.map((p, i) => (
          <g key={i}>
            {/* X-axis label */}
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500"
              fontSize={10}
            >
              {p.label}
            </text>

            {/* Hover target (larger invisible circle) */}
            <circle
              cx={p.x}
              cy={p.y}
              r={14}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />

            {/* Visible dot */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 5 : 3}
              fill={color}
              stroke="white"
              strokeWidth={2}
              className="transition-all duration-150"
            />

            {/* Tooltip */}
            {hovered === i && (
              <g>
                <rect
                  x={p.x - 32}
                  y={p.y - 32}
                  width={64}
                  height={22}
                  rx={6}
                  className="fill-gray-900 dark:fill-gray-100"
                />
                <text
                  x={p.x}
                  y={p.y - 17}
                  textAnchor="middle"
                  className="fill-white dark:fill-gray-900"
                  fontSize={12}
                  fontWeight={600}
                >
                  {p.value}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
