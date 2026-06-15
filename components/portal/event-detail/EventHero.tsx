import Image from 'next/image';
import type { RotaractEvent } from '@/types';
import { gradientFor, iconFor } from './meta';

interface EventHeroProps {
  event: RotaractEvent;
}

/**
 * Hero banner — fixed aspect ratio with a blurred backdrop so the full image
 * is always visible (object-contain) and never awkwardly cropped, whether
 * it's a wide photo or a portrait event flyer. Falls back to a gradient with
 * the event-type icon when no image is set.
 */
export default function EventHero({ event }: EventHeroProps) {
  const TypeIcon = iconFor(event.type);
  return (
    <div className="relative w-full min-w-0 -mx-4 sm:mx-0 sm:rounded-2xl aspect-[16/9] overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800">
      {event.imageURL ? (
        <Image
          src={event.imageURL}
          alt={event.title}
          fill
          sizes="(min-width: 1024px) 680px, 100vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFor(event.type)} flex items-end`}>
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 0)', backgroundSize: '28px 28px' }}
          />
          <div className="relative p-6">
            <TypeIcon className="w-14 h-14 text-white/90" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
