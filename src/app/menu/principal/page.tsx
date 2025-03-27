import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";

export default function Principal() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-start min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="text-left">
        <h1 className="text-2xl font-bold">Mis Cursos</h1>
        <p className="text-muted-foreground">Explora tus cursos</p>
      </header>

      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start justify-start">
        <Card>
          <CardHeader>
            <img
              src="/path-to-python-image.jpg"
              alt="Python de Cero a Experto"
              className="w-full h-40 object-cover rounded-t-xl"
            />
          </CardHeader>
          <CardContent>
            <CardTitle>Python de Cero a Experto</CardTitle>
          </CardContent>
        </Card>
      </main>

      <footer className="w-full flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationPrevious href="#" />
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationNext href="#" />
          </PaginationContent>
        </Pagination>
      </footer>
    </div>
  );
}
