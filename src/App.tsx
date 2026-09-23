import { ArrowLeft } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES } from '@/categories/registry';

function App() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const category = CATEGORIES.find((c) => c.id === categoryId) ?? null;

  return (
    <div className="mx-auto min-h-svh w-full max-w-md px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        {category ? (
          <Button type="button" variant="ghost" size="icon" onClick={() => setCategoryId(null)} aria-label="Back">
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
          {CATEGORIES.map((c) => (
            <Card key={c.id} className="cursor-pointer transition-colors hover:bg-muted" onClick={() => setCategoryId(c.id)}>
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
