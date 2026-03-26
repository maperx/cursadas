"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

type Noticia = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  sidebar: boolean;
  visible: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

interface NoticiasCarouselProps {
  noticias: Noticia[];
}

export function NoticiasCarousel({ noticias }: NoticiasCarouselProps) {
  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
      className="group"
    >
      <CarouselContent>
        {noticias.map((noticia) => (
          <CarouselItem key={noticia.id}>
            <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg">
              {noticia.imageUrl ? (
                <>
                  <div className="w-full h-[28rem] sm:h-[32rem] overflow-hidden">
                    <img
                      src={noticia.imageUrl}
                      alt={noticia.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                    <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                      <CalendarDays className="h-4 w-4" />
                      {format(new Date(noticia.publishedAt), "d 'de' MMMM, yyyy", {
                        locale: es,
                      })}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-3 drop-shadow-md">
                      {noticia.title}
                    </h2>
                    <div
                      className="prose prose-sm prose-invert max-w-none line-clamp-3 text-white/90"
                      dangerouslySetInnerHTML={{ __html: noticia.content }}
                    />
                  </div>
                </>
              ) : (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <CalendarDays className="h-4 w-4" />
                    {format(new Date(noticia.publishedAt), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
                    {noticia.title}
                  </h2>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: noticia.content }}
                  />
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4 h-10 w-10 bg-white/90 dark:bg-black/60 backdrop-blur-sm border-0 shadow-lg hover:bg-white dark:hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CarouselNext className="right-4 h-10 w-10 bg-white/90 dark:bg-black/60 backdrop-blur-sm border-0 shadow-lg hover:bg-white dark:hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Carousel>
  );
}
