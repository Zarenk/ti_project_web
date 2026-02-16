// Placeholder toast hook - to be replaced with proper implementation
export function useToast() {
  return {
    toast: (options: {
      title?: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => {
      console.log('[Toast]', options);
    },
  };
}
