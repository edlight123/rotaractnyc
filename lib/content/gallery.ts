export type GalleryItem = {
  id: string
  title: string
  alt: string
  imageUrl: string
  order: number
}

export const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: 'community-service',
    imageUrl: '/53cde13b1a312d32c08a429715695a65.jpg',
    alt: 'Rotaract NYC members at community service event',
    title: 'Community Service',
    order: 1,
  },
  {
    id: 'networking-event',
    imageUrl: '/b220fe440206d474a74b2a2467d410ac.jpg',
    alt: 'Rotaract NYC networking event',
    title: 'Networking Event',
    order: 2,
  },
  {
    id: 'team-building',
    imageUrl: '/ce9ea973f79cb6988ad3e2945e3a87ae.jpg',
    alt: 'Rotaract NYC team building activity',
    title: 'Team Building',
    order: 3,
  },
  {
    id: 'social-gathering',
    imageUrl: '/f16b74a04b626f30222c37c4d15d7c80.jpg',
    alt: 'Rotaract NYC social gathering',
    title: 'Social Gathering',
    order: 4,
  },
]
