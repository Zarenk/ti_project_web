# Web Worker Quick Start Guide

## What's This?

A Web Worker that runs pattern analysis in the background, preventing UI freezing.

## Do I Need to Do Anything?

**No!** It works automatically. Just use the help system as normal.

## How It Works

```typescript
// You write this (same as before):
recordLearningSession({
  query: "how to create invoice",
  normalizedQuery: "how to create invoice",
  matchFound: true,
  matchScore: 0.9,
  timestamp: Date.now(),
  section: "sales",
})

// It automatically:
// 1. Stores session in buffer (instant)
// 2. Every 10 sessions → analyzes in worker (background)
// 3. No UI blocking! 🎉
```

## Files You Need to Know About

1. **`worker-factory.ts`** - Creates the worker
2. **`worker-types.ts`** - TypeScript types
3. **`use-help-worker.ts`** - Hook (for advanced usage)

## Advanced Usage (Optional)

### Use TF-IDF Search

```typescript
import { useHelpWorker } from '@/hooks/use-help-worker'

function MyComponent() {
  const { searchTFIDF, isWorkerAvailable } = useHelpWorker()

  const search = async () => {
    const docs = [
      { id: '1', text: 'How to create invoice' },
      { id: '2', text: 'How to edit products' },
    ]

    const results = await searchTFIDF('create invoice', docs)
    console.log(results) // [{ id: '1', score: 0.87 }, ...]
  }

  return <button onClick={search}>Search</button>
}
```

## Debugging

### Check if worker is running

```typescript
// Open browser console
// You should see:
// [Worker] Pattern analysis complete: 5 aliases, 3 entries in 127.45ms
```

### Worker not working?

1. Check console for errors
2. Worker automatically falls back to main thread
3. System continues to work (just might have slight lag)

## Performance

- **Before**: 100-500ms UI freeze every 10 queries
- **After**: 0ms UI freeze (runs in background)

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge).

## Need Help?

- See `README_WORKER.md` for full documentation
- See `worker-example.tsx` for code examples
- Check console for worker logs

## That's It!

You don't need to do anything special. The worker runs automatically and makes the help system faster. 🚀
