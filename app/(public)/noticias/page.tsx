import { getNoticiasPublicas } from "@/actions/noticias";
import { NoticiasCarousel } from "./noticias-carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Newspaper } from "lucide-react";

export default async function NoticiasPublicPage() {
  const noticias = await getNoticiasPublicas();

  const carouselNoticias = noticias.filter((n) => !n.sidebar);
  const sidebarNoticias = noticias.filter((n) => n.sidebar);

  return (
    <div className="w-full space-y-8">
      {noticias.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Newspaper className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium">No hay noticias publicadas</p>
          <p className="text-sm mt-1">Vuelve pronto para ver las novedades</p>
        </div>
      ) : (
        <>
          {/* Carousel principal centrado */}
          {carouselNoticias.length > 0 ? (
            <div className="max-w-5xl mx-auto">
              <NoticiasCarousel noticias={carouselNoticias} />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto text-center py-24 text-muted-foreground rounded-2xl bg-muted/30 border border-dashed">
              <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay noticias en el carousel</p>
            </div>
          )}

          {/* Mosaico de noticias */}
          {sidebarNoticias.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 px-1">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-lg font-bold tracking-tight">Informaci&oacute;n</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sidebarNoticias.map((noticia) => (
                  <Card
                    key={noticia.id}
                    className="flex flex-row overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300"
                  >
                    {noticia.imageUrl && (
                      <div className="w-28 min-h-full shrink-0 overflow-hidden">
                        <img
                          src={noticia.imageUrl}
                          alt={noticia.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {format(new Date(noticia.publishedAt), "d 'de' MMMM, yyyy", {
                            locale: es,
                          })}
                        </div>
                        <CardTitle className="text-base leading-snug mt-1">
                          {noticia.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div
                          className="prose prose-sm max-w-none text-muted-foreground [&>p]:mb-1.5 [&>p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{ __html: noticia.content }}
                        />
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
