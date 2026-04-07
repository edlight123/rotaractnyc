'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/hooks/useFirestore';
import Spinner from '@/components/ui/Spinner';
import type { BadgeDefinition } from '@/lib/badges';

// ── Types ──

interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

interface BadgeResponse {
  badges: EarnedBadge[];
  available: BadgeDefinition[];
}

// ── Tier colours ──

const TIER_COLORS: Record<BadgeDefinition['tier'], string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
};

const TIER_GLOW: Record<BadgeDefinition['tier'], string> = {
  bronze: '0 0 10px 2px rgba(205,127,50,0.45)',
  silver: '0 0 10px 2px rgba(192,192,192,0.50)',
  gold: '0 0 10px 2px rgba(255,215,0,0.50)',
};

const TIER_RING: Record<BadgeDefinition['tier'], string> = {
  bronze: 'ring-[#CD7F32]/40',
  silver: 'ring-[#C0C0C0]/40',
  gold: 'ring-[#FFD700]/40',
};

// Category display names
const CATEGORY_LABELS: Record<BadgeDefinition['category'], string> = {
  engagement: '🎯 Engagement',
  service: '🤝 Service',
  community: '💬 Community',
  milestone: '🏅 Milestones',
};

const CATEGORY_ORDER: BadgeDefinition['category'][] = [
  'engagement',
  'service',
  'community',
  'milestone',
];

// ── Component ──

interface MemberBadgesProps {
  memberId: string;
  compact?: boolean;
}

export default function MemberBadges({ memberId, compact = false }: MemberBadgesProps) {
  const [data, setData] = useState<BadgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBadges() {
      try {
        setLoading(true);
        const res = await apiGet<BadgeResponse>(
          `/api/portal/badges?memberId=${encodeURIComponent(memberId)}`,
        );
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load badges');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBadges();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // ── Loading / Error ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
        Unable to load badges.
      </p>
    );
  }

  const { badges: earned, available } = data;
  const earnedMap = new Map(earned.map((b) => [b.badgeId, b.earnedAt]));

  // ── Compact Mode ──

  if (compact) {
    const earnedBadges = available.filter((b) => earnedMap.has(b.id));

    if (earnedBadges.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        {earnedBadges.map((badge) => (
          <span
            key={badge.id}
            title={`${badge.name} — ${badge.description}`}
            className="relative cursor-default text-lg leading-none select-none rounded-full"
            style={{ filter: `drop-shadow(0 0 4px ${TIER_COLORS[badge.tier]})` }}
          >
            {badge.icon}
          </span>
        ))}
      </div>
    );
  }

  // ── Full Mode ──

  // Group badges by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    badges: available.filter((b) => b.category === cat),
  })).filter((g) => g.badges.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.category}>
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
            {group.label}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.badges.map((badge) => {
              const isEarned = earnedMap.has(badge.id);
              const earnedAt = earnedMap.get(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`
                    relative rounded-xl border p-4 text-center transition-all duration-200
                    ${
                      isEarned
                        ? `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ring-2 ${TIER_RING[badge.tier]}`
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50'
                    }
                  `}
                  style={
                    isEarned
                      ? { boxShadow: TIER_GLOW[badge.tier] }
                      : undefined
                  }
                >
                  {/* Icon */}
                  <div className="text-3xl mb-2 select-none">
                    {isEarned ? badge.icon : '🔒'}
                  </div>

                  {/* Name */}
                  <p
                    className={`text-sm font-semibold ${
                      isEarned
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {badge.name}
                  </p>

                  {/* Description */}
                  <p
                    className={`text-xs mt-0.5 ${
                      isEarned
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    {badge.description}
                  </p>

                  {/* Earned date */}
                  {isEarned && earnedAt && (
                    <p className="text-[10px] mt-2 text-gray-400 dark:text-gray-500">
                      Earned{' '}
                      {new Date(earnedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}

                  {/* Tier indicator */}
                  {isEarned && (
                    <span
                      className="absolute top-2 right-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: TIER_COLORS[badge.tier] }}
                      title={`${badge.tier} tier`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Summary */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
        {earned.length} of {available.length} badges earned
      </p>
    </div>
  );
}
