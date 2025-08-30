import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <Card className="min-h-[300px] flex flex-col">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>

          <Skeleton className="h-12 w-48 mx-auto mb-4" />

          <Skeleton className="h-8 w-32 mx-auto" />
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-center">
          <div className="text-center space-y-4">
            {/* Skeleton para traduções */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 mx-auto" />
              <div className="flex flex-wrap gap-2 justify-center">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>

            {/* Skeleton para nível de confiança */}
            <div className="pt-4">
              <Skeleton className="h-4 w-48 mx-auto mb-3" />

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2"
                  >
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>

              {/* Skeleton para botões de ação */}
              <div className="flex gap-3 justify-center mt-6">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeleton para informações adicionais */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <Skeleton className="h-3 w-20 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
            <div>
              <Skeleton className="h-3 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
            <div>
              <Skeleton className="h-3 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
