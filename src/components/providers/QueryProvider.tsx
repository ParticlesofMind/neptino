"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { type ReactNode, useState } from "react"

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh longer to prevent rapid refetch flicker between view transitions.
            staleTime: 2 * 60 * 1000,
            // Keep unused data in cache long enough to survive common navigation loops.
            gcTime: 10 * 60 * 1000,
            // Retry once on failure before surfacing the error
            retry: 1,
            // Keep prior data visible while fetching the next result.
            placeholderData: (previousData) => previousData,
            // Avoid unexpected refetch flashes when tab focus changes.
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
