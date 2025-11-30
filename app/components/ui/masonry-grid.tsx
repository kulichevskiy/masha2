import Image from "next/image"

const photos = [
  {
    id: 1,
    src: "/photos/DSC_9993.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 2,
    src: "/photos/DSC_9773.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 3,
    src: "/photos/DSC_9398.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 4,
    src: "/photos/DSC_8898-Edit.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 5,
    src: "/photos/DSC_8333.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 6,
    src: "/photos/DSC_7606.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 7,
    src: "/photos/DSC_7040.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 8,
    src: "/photos/DSC_6812.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 9,
    src: "/photos/DSC_6750.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 10,
    src: "/photos/DSC_6120.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 11,
    src: "/photos/DSC_5971-Edit.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 12,
    src: "/photos/DSC_5084.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 13,
    src: "/photos/DSC_4447.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 14,
    src: "/photos/DSC_4274-Edit.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 15,
    src: "/photos/DSC_4176.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 16,
    src: "/photos/DSC_3885.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 17,
    src: "/photos/DSC_3701.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 18,
    src: "/photos/DSC_3591.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 19,
    src: "/photos/DSC_3581.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 20,
    src: "/photos/DSC_3426-Edit.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 21,
    src: "/photos/DSC_2777.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 22,
    src: "/photos/DSC_2348-Edit.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 23,
    src: "/photos/DSC_1770.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 24,
    src: "/photos/DSC_1610-Edit.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 25,
    src: "/photos/DSC_1604.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 26,
    src: "/photos/DSC_1322.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
  {
    id: 27,
    src: "/photos/DSC_1113.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 28,
    src: "/photos/DSC_0987.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 29,
    src: "/photos/DSC_0253.jpg",
    alt: "Portrait photography",
    className: "row-span-2",
  },
  {
    id: 30,
    src: "/photos/DSC_0123.jpg",
    alt: "Portrait photography",
    className: "row-span-3",
  },
]

export function MasonryGrid() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`relative overflow-hidden bg-gray-100 ${photo.className} group cursor-pointer`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover grayscale transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

