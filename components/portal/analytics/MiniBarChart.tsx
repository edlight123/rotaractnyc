'use client';

interface BarData {
  label: string;
  value: number;
  max: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarData[];
}

/**
 * Pure SVG horizontal bar chart with labels and percentage annotations.
 * No charting library required.
 */
export default function MiniBarChart({ data }: MiniBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 dark:text-gray-600 py-8">
        No data available
      </div>
    );
  }

  const barHeight = 28;
  const gap = 16;
  const labelWidth = 100;
  const valueWidth = 60;
  const padding = { top: 8, right: 12, bottom: 8, left: 8 };
  const totalHeight = padding.top + padding.bottom + data.length * (barHeight + gap) - gap;
  const innerWidth = 500;
  const barAreaWidth = innerWidth - padding.left - padding.right - labelWidth - valueWidth;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${innerWidth} ${totalHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        role="img"
        aria-label="Horizontal bar chart"
      >
        {data.map((d, i) => {
          const y = padding.top + i * (barHeight + gap);
          const pct = d.max > 0 ? d.value / d.max : 0;
          const filledW = pct * barAreaWidth;
          const barColor = d.color || '#10b981';
          const displayPct = `${Math.round(pct * 100)}%`;

          return (
            <g key={i}>
              {/* Label */}
              <text
                x={padding.left}
                y={y + barHeight / 2 + 4}
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={12}
                fontWeight={500}
              >
                {d.label.length > 14 ? d.label.slice(0, 13) + '…' : d.label}
              </text>

              {/* Background track */}
              <rect
                x={padding.left + labelWidth}
                y={y}
                width={barAreaWidth}
                height={barHeight}
                rx={6}
                className="fill-gray-100 dark:fill-gray-800"
              />

              {/* Filled bar */}
              <rect
                x={padding.left + labelWidth}
                y={y}
                width={Math.max(filledW, 0)}
                height={barHeight}
                rx={6}
                fill={barColor}
                opacity={0.85}
              >
                <animate
                  attributeName="width"
                  from="0"
                  to={Math.max(filledW, 0)}
                  dur="0.6s"
                  fill="freeze"
                />
              </rect>

              {/* Value + percentage text */}
              <text
                x={padding.left + labelWidth + barAreaWidth + 8}
                y={y + barHeight / 2 + 4}
                className="fill-gray-500 dark:fill-gray-400"
                fontSize={11}
                fontWeight={600}
              >
                {d.value}/{d.max} ({displayPct})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
