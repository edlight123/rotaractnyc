import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getEventBySlug } from '@/lib/firebase/queries';
import { formatDate, formatCurrency, toPlainText } from '@/lib/utils/format';
import { ogImage } from '@/lib/utils/ogImage';
import { hasMemberDiscount } from '@/lib/utils/pricing';
import { externalRegistrationUrl, resolveHost } from '@/lib/utils/eventAudience';
import { SITE } from '@/lib/constants';
import Badge from '@/components/ui/Badge';
import GuestRsvpForm from '@/components/public/GuestRsvpForm';
import { eventHasEnded, eventDonationsClosed } from '@/lib/utils/eventTime';
import PublicEventActions from '@/components/public/PublicEventActions';
import EventWaitlistForm from '@/components/public/EventWaitlistForm';
import EventDescription from '@/components/public/EventDescription';
import EventDonateSection from '@/components/public/EventDonateSection';
import TicketScarcity from '@/components/public/TicketScarcity';

export const revalidate = 120; // 2 min — event details change more frequently

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  // Search snippets and link previews are plain text — strip the Markdown the
  // description is authored in so "**Neighborhood Supper**" doesn't ship
  // asterisks and all to Google and iMessage.
  const summary = toPlainText(event.description).slice(0, 160);
  return {
    title: `${event.title} | Events | ${SITE.shortName}`,
    description: summary,
    openGraph: {
      title: event.title,
      description: summary,
      url: `${SITE.url}/events/${slug}`,
      type: 'website',
      siteName: SITE.name,
      images: ogImage(event.imageURL, { alt: event.title }),
    },
    alternates: { canonical: `${SITE.url}/events/${slug}` },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  const heroImage =
    event.imageURL ||
    (event as any).imageUrl ||
    (event as any).image ||
    (event as any).coverImage ||
    null;

  // Free and service events have no pricing, so "sign in for member pricing"
  // on a volunteer signup is both confusing and untrue — those get a plain
  // member-portal link instead.
  // Prefer the server-computed flag: once the member price is redacted,
  // hasMemberDiscount() can only see `guestPrice > undefined` and would report
  // a saving on every paid event, including ones that have none.
  const memberDiscount = event.memberDiscountAvailable ?? hasMemberDiscount(event);

  // When the host runs registration we show none of our own registration UI.
  // Collecting RSVPs the host never receives is worse than not listing the
  // event at all — people would show up to an organiser with no record of them.
  const externalUrl = externalRegistrationUrl(event);
  const external = externalUrl !== null;
  const hostLabel = event.hostName || 'the host';

  // Tickets sold for the scarcity nudge: prefer the event-level counter but
  // fall back to summing tier soldCounts if it's higher (the event counter can
  // briefly lag tier totals during high-volume sales).
  const ticketsSold = Math.max(
    (event as any).attendeeCount ?? 0,
    (event.pricing?.tiers ?? []).reduce((sum: number, t: any) => sum + (t.soldCount ?? 0), 0),
  );

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: toPlainText(event.description),
    startDate: event.date,
    location: {
      '@type': 'Place',
      name: event.location?.split(',')[0] || '',
      address: event.location || '',
    },
    // Don't let search engines attribute a partner's event to Rotaract NYC.
    organizer: resolveHost(event) === 'rotaract'
      ? { '@type': 'Organization', name: SITE.name, url: SITE.url }
      : { '@type': 'Organization', name: event.hostName || SITE.name },
    // The public price is what a member of the public pays. This used to
    // publish memberPrice, so search engines were advertising the member rate.
    ...(event.pricing && {
      offers: {
        '@type': 'Offer',
        price: ((event.pricing.guestPrice ?? 0) / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Escape `<` so a title, description or hostName containing
        // "</script>" cannot close the block and inject markup.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* Hero */}
      <section
        className={`relative text-white flex items-end ${
          heroImage
            ? 'min-h-[300px] sm:min-h-[420px]'
            : 'py-28 sm:py-36 bg-gradient-to-br from-cranberry-900 via-cranberry to-cranberry-800'
        }`}
      >
        {heroImage ? (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Full-bleed cover — the photo fills the entire hero (edges of
                unusual aspect ratios are cropped rather than letterboxed). */}
            <Image
              src={heroImage}
              alt={event.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Gradient: dark at the bottom so text stays legible, lighter at top */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          </div>
        ) : null}

        <div className="container-page relative z-10 py-10 sm:py-14">
          <div className="max-w-3xl mx-auto">
            <Link href="/events" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-6 transition-colors">
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Events
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={event.type === 'service' ? 'azure' : event.type === 'paid' ? 'gold' : event.type === 'hybrid' ? 'cranberry' : 'green'}>
                {event.type === 'service' ? '🤝 Service' : event.type === 'paid' ? '🎟️ Ticketed' : event.type === 'hybrid' ? '⭐ Hybrid' : '✓ Free'}
              </Badge>
              {/* Never assert "Free" for an event the host runs — we don't
                  know their pricing, and claiming free on a ticketed event
                  (e.g. The Hunger Project's Fall Event) is simply wrong. */}
              {!external && event.type !== 'free' && (!event.pricing || event.pricing.guestPrice === 0) && (
                <Badge variant="green">✓ Free</Badge>
              )}
              {event.pricing && event.pricing.guestPrice > 0 && event.type !== 'paid' && (
                <Badge variant="gold">🎟️ {formatCurrency(event.pricing.guestPrice)}</Badge>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold break-words">{event.title}</h1>

            {/* Action buttons: Calendar, Share, Directions */}
            <div className="mt-6">
              <PublicEventActions event={event} />
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Date & Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDate(event.date)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Location</p>
                {(event as any).venueHidden ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Shared with members
                    </p>
                    <Link
                      href="/portal/login"
                      className="inline-flex items-center gap-1 text-xs text-cranberry hover:text-cranberry-700 dark:text-cranberry-400 mt-2 font-medium"
                    >
                      Sign in to see the location →
                    </Link>
                  </>
                ) : (
                <>
                <p className="font-semibold text-gray-900 dark:text-white">{event.location}</p>
                {(event.location || event.address) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.location, event.address].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cranberry hover:text-cranberry-700 dark:text-cranberry-400 mt-2 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Get directions
                  </a>
                )}
                </>
                )}
              </div>
            </div>

            <EventDescription text={event.description} />

            {/* Donations — opt-in per event; closes 2 weeks after the event
                ends (the regular /donate page is always open) */}
            {(event as any).acceptsDonations && !eventDonationsClosed(event) && (
              <div className="mt-8">
                <EventDonateSection
                  eventId={event.id}
                  eventTitle={event.title}
                  eventSlug={event.slug}
                  fundraisingGoalCents={(event as any).fundraisingGoalCents}
                  donationsTotalCents={(event as any).donationsTotalCents}
                  donationsCount={(event as any).donationsCount}
                  suggestedDonationCents={(event as any).suggestedDonationCents}
                />
              </div>
            )}

            {/* ── Sold-out banner (event-level capacity + tier-level) ── */}
            {(() => {
              // Capacity is meaningless for an event we do not run.
              if (external) return null;
              const now = new Date();
              const tiers = event.pricing?.tiers ?? [];
              const allTiersSoldOrExpired =
                tiers.length > 0 &&
                tiers.every(
                  (t: any) =>
                    (t.deadline && new Date(t.deadline) < now) ||
                    (t.capacity != null && (t.soldCount ?? 0) >= t.capacity),
                );
              // Use whichever counter is *higher* — `attendeeCount` is the
              // event-level field maintained by the RSVP/checkout APIs and
              // Stripe webhooks, but during high-volume sales it can briefly
              // lag the tier `soldCount` totals. Comparing against both keeps
              // the sold-out banner from flickering off when capacity is hit.
              const tierSold = tiers.reduce(
                (sum: number, t: any) => sum + (t.soldCount ?? 0),
                0,
              );
              const goingTotal = Math.max(
                (event as any).attendeeCount ?? 0,
                tierSold,
              );
              const eventFull =
                event.capacity != null && goingTotal >= event.capacity;
              const isSoldOut = allTiersSoldOrExpired || eventFull;

              if (!isSoldOut) return null;

              return (
                <div className="mt-10 p-6 bg-red-50 dark:bg-red-950/40 rounded-2xl border-2 border-red-300 dark:border-red-800 text-center">
                  <span className="inline-block text-3xl mb-2">🎟️</span>
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Sold Out</h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {eventFull
                      ? 'This event has reached full capacity. Check back for future events!'
                      : 'All tickets for this event have been claimed. Check back for future events!'}
                  </p>
                  {/* Waitlist CTA */}
                  {event.waitlistEnabled !== false && (
                    <EventWaitlistForm eventId={event.id} />
                  )}
                </div>
              );
            })()}

            {/* ── Tickets-left urgency nudge (hidden once sold out or ended) ── */}
            {!external && !eventHasEnded(event) && (
              <TicketScarcity event={event} capacity={event.capacity} ticketsSold={ticketsSold} className="mt-10" />
            )}

            {/* Pricing */}
            {!external && event.pricing && (event.type === 'paid' || event.type === 'hybrid') && (
              <div className="mt-10 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Pricing</h3>

                {event.pricing.tiers?.length ? (
                  /* ── Tier cards (expired tiers hidden from the public) ── */
                  <div className="space-y-3">
                    {[...event.pricing.tiers]
                      .filter((tier) => !(tier.deadline && new Date(tier.deadline) < new Date()))
                      .sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => {
                      const expired = tier.deadline && new Date(tier.deadline) < new Date();
                      const soldOut = tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity;
                      const spots = tier.capacity != null ? Math.max(0, tier.capacity - (tier.soldCount ?? 0)) : null;

                      return (
                        <div
                          key={tier.id}
                          className={`bg-white dark:bg-gray-800 rounded-xl p-5 border ${expired || soldOut ? 'opacity-50 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900 dark:text-white">{tier.label}</p>
                                {expired && <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Expired</span>}
                                {soldOut && <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Sold Out</span>}
                              </div>
                              {tier.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tier.description}</p>
                              )}
                              {tier.deadline && !expired && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Available until {formatDate(tier.deadline)}
                                </p>
                              )}
                              {spots !== null && !soldOut && (
                                <p className={`text-xs mt-1 font-medium ${spots <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                                  {spots} spot{spots !== 1 ? 's' : ''} remaining
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex flex-wrap gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-cranberry uppercase mb-1">Member</p>
                                  {(event as any).memberPriceHidden ? (
                                    memberDiscount ? (
                                      <Link href="/portal/login" className="text-sm font-semibold text-cranberry hover:underline">
                                        Sign in →
                                      </Link>
                                    ) : (
                                      <p className="text-sm text-gray-500 dark:text-gray-400">Same</p>
                                    )
                                  ) : (
                                    <p className="text-xl font-display font-bold text-gray-900 dark:text-white">
                                      {tier.memberPrice === 0 ? 'Free' : formatCurrency(tier.memberPrice)}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Guest</p>
                                  <p className="text-xl font-display font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(tier.guestPrice)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Legacy member/guest ── */
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-cranberry uppercase mb-1">Member Price</p>
                        {(event as any).memberPriceHidden ? (
                          memberDiscount ? (
                            <Link href="/portal/login" className="text-lg font-display font-bold text-cranberry hover:underline">
                              Members pay less — sign in →
                            </Link>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Same as guest price</p>
                          )
                        ) : (
                          <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                            {event.pricing.memberPrice === 0 ? 'Free' : formatCurrency(event.pricing.memberPrice)}
                          </p>
                        )}
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Guest Price</p>
                        <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                          {formatCurrency(event.pricing.guestPrice)}
                        </p>
                      </div>
                    </div>
                    {event.pricing.earlyBirdPrice != null &&
                      event.pricing.earlyBirdDeadline &&
                      new Date(event.pricing.earlyBirdDeadline) > new Date() && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                          🐦 Early Bird: {formatCurrency(event.pricing.earlyBirdPrice)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Available until {formatDate(event.pricing.earlyBirdDeadline)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Guest RSVP + Member CTA — hidden when fully sold out */}
            {(() => {
              // Past events: no ticket sales — show a closed notice instead.
              if (eventHasEnded(event)) {
                return (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
                    <p className="font-display font-bold text-gray-900 dark:text-white text-lg">This event has ended</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Ticket sales are closed. Browse our{' '}
                      <Link href="/events" className="text-cranberry hover:underline font-medium">upcoming events</Link>
                      {' '}or relive the night in the{' '}
                      <Link href="/gallery" className="text-cranberry hover:underline font-medium">photo gallery</Link>.
                    </p>
                  </div>
                );
              }
              // The host runs registration — link out and show nothing of ours.
              if (external) {
                return (
                  <div className="rounded-2xl border border-azure-200 dark:border-azure-900/40 bg-azure-50 dark:bg-azure-900/10 p-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Hosted by{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">{hostLabel}</span>.
                      {' '}Registration is handled by them.
                    </p>
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cranberry px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cranberry-800 transition"
                    >
                      Register on {hostLabel}&rsquo;s site →
                    </a>
                  </div>
                );
              }
              const now = new Date();
              const allTiersSoldOrExpired =
                (event.pricing?.tiers?.length ?? 0) > 0 &&
                (event.pricing?.tiers ?? []).every(
                  (t: any) =>
                    (t.deadline && new Date(t.deadline) < now) ||
                    (t.capacity != null && (t.soldCount ?? 0) >= t.capacity),
                );
              // Also hide the registration form once the event hits its overall
              // capacity (e.g. the gala's 80-ticket cap), not just when tiers
              // sell out — otherwise legacy-priced events could oversell.
              const eventFull = event.capacity != null && ticketsSold >= event.capacity;
              if (allTiersSoldOrExpired || eventFull) return null;
              return (
                <>
                  <GuestRsvpForm
                    eventId={event.id}
                    eventSlug={event.slug}
                    eventTitle={event.title}
                    isPaid={!!(event.pricing && (event.type === 'paid' || event.type === 'hybrid') && event.pricing.guestPrice > 0)}
                    hasMemberDiscount={memberDiscount}
                    guestPrice={event.pricing?.guestPrice}
                    earlyBirdPrice={event.pricing?.earlyBirdPrice}
                    earlyBirdDeadline={event.pricing?.earlyBirdDeadline}
                    tiers={event.pricing?.tiers}
                  />

                  {/* Member login link */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Already a member?{' '}
                      <Link href="/portal/login" className="text-cranberry hover:underline font-medium">
                        {memberDiscount
                          ? 'Sign in for member pricing'
                          : 'Sign in to RSVP from the member portal'}
                      </Link>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>
    </>
  );
}
