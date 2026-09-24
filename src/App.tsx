import { ArrowLeft } from 'lucide-react';
import { Suspense, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES } from '@/categories/registry';
import { BackContext } from '@/lib/back';
import { peekProgress } from '@/lib/drill/logic';

function App() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const category = CATEGORIES.find((c) => c.id === categoryId) ?? null;
  const backOverride = useRef<(() => void) | null>(null);

  return (
    <BackContext.Provider value={backOverride}>
    <div className="mx-auto min-h-svh w-full max-w-md px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        {category ? (
          <Button type="button" variant="ghost" size="icon" onClick={() => (backOverride.current ? backOverride.current() : setCategoryId(null))}
            aria-label="Back"
          >
            <ArrowLeft />
          </Button>
        ) : null}
        <h1 className="text-lg font-semibold">{category ? category.name : 'Shit You Should Know'}</h1>
      </header>

      {category ? (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <category.Component />
        </Suspense>
      ) : (
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            // read on every render of this list, so it's current each time you come back to it
            const { best, inProgress } = peekProgress(c.id);
            return (
              <Card key={c.id} className="cursor-pointer transition-colors hover:bg-muted" onClick={() => setCategoryId(c.id)}>
                <CardHeader>
                  <div className="flex items-baseline justify-between gap-3">
                    <CardTitle>{c.name}</CardTitle>
                    {(best > 0 || inProgress) && (
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {[best > 0 && `Best ${best}/${c.size}`, inProgress && 'In progress'].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </BackContext.Provider>
  );
}

export default App;
