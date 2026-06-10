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
 * the event-type emoji when no image is set.
 */
export default function EventHero({ event }: EventHeroProps) {
  return (
    <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800">
      {event.imageURL ? (
        <>
          {/* Blurred fill behind the contained image */}
          <Image
            src={event.imageURL}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 680px, 100vw"
            className="object-cover scale-110 blur-2xl opacity-50 dark:opacity-40"
          />
          {/* Full image, centered and never cropped */}
          <Image
            src={event.imageURL}
            alt={event.title}
            fill
            sizes="(min-width: 1024px) 680px, 100vw"
            className="object-contain"
            priority
          />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFor(event.type)} flex items-end`}>
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 0)', backgroundSize: '28px 28px' }}
          />
          <div className="relative p-6">
            <span className="text-5xl">{iconFor(event.type)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
