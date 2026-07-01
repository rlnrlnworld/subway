'use client'
import useSWR, { type SWRConfiguration } from 'swr'
import type { ArrivalsResponse } from '@/types/arrivals'

class ArrivalsError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const fetcher = async (url: string): Promise<ArrivalsResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new ArrivalsError(`HTTP ${res.status}`, res.status)
  }
  return res.json() as Promise<ArrivalsResponse>
}

function buildKey(ids: readonly string[] | null | undefined): string | null {
  if (!ids || ids.length === 0) return null
  // sort로 순서 무관 dedup — 같은 역 세트를 다른 순서로 요청해도 SWR 캐시 재사용
  const sorted = [...ids].sort()
  return `/api/arrivals?ids=${sorted.map(encodeURIComponent).join(',')}`
}

const DEFAULT_CONFIG: SWRConfiguration<ArrivalsResponse, ArrivalsError> = {
  refreshInterval: 15000,      // 실시간 fresh 15초 (서버 Cache-Control과 동기)
  dedupingInterval: 5000,      // 같은 key 5초 내 재요청 dedup
  revalidateOnFocus: false,    // 탭 복귀 시 재요청 방지 (부담↓)
  shouldRetryOnError: false,   // 실패 시 자동 재시도 없음
  keepPreviousData: true,      // refetch 중 이전 데이터 유지 (UI flicker 방지)
}

/**
 * 역 도착 정보 조회 hook.
 * @param ids station id 배열 (예: ['1호선:서울역:11', '4호선:서울역:14']). null/빈 배열이면 fetch 안 함.
 * @param config SWR 옵션 override.
 */
export function useArrivals(
  ids: readonly string[] | null | undefined,
  config?: SWRConfiguration<ArrivalsResponse, ArrivalsError>,
) {
  const key = buildKey(ids)
  const swr = useSWR<ArrivalsResponse, ArrivalsError>(key, fetcher, {
    ...DEFAULT_CONFIG,
    ...config,
  })

  return {
    data: swr.data,
    error: swr.error,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    mutate: swr.mutate,
    // 편의 파생값
    arrivals: swr.data?.arrivals ?? [],
    source: swr.data?.source ?? 'none',
    generatedAt: swr.data?.generatedAt,
    warning: swr.data?.warning,
    hasData: Boolean(swr.data && swr.data.arrivals.length > 0),
  }
}

export { ArrivalsError }
