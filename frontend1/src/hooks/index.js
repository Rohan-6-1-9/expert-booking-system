import { useState, useEffect, useCallback, useRef } from 'react'
import { expertsApi, bookingsApi } from '../api'
import { subscribeToExpertSlots } from '../socket'

// ─── useExperts ────────────────────────────────────────────────────────────
/**
 * Fetches paginated expert listings with search, filter, sort.
 */
export function useExperts(params) {
  const [experts, setExperts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const fetch = useCallback(async () => {
    // Cancel previous request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await expertsApi.getAll({ ...params, signal: controller.signal })
      const data = res.data
      console.log("Hook loaded - totalPages =", data.pagination?.totalPages);
      setExperts(data.experts || data.data || [])
      /* setPagination({
        page: data.pagination?.page || params.page || 1,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || data.total || data.count || 0,
      }) */
      const paginationData = {
        page: data.pagination?.page || params.page || 1,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || data.total || data.count || 0,
      };
      console.log("Pagination being set:", paginationData)

      setPagination(paginationData)
    } catch (err) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return { experts, pagination, loading, error, refetch: fetch }
}

// ─── useCategories ────────────────────────────────────────────────────────
export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    expertsApi.getCategories()
      .then(res => setCategories(res.data?.categories || res.data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

// ─── useExpertDetail ──────────────────────────────────────────────────────
export function useExpertDetail(id) {
  const [expert, setExpert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    expertsApi.getById(id)
      .then(res => setExpert(res.data?.data || null))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { expert, loading, error }
}

// ─── useExpertSlots ────────────────────────────────────────────────────────
export function useExpertSlots(expertId, date) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch slots for date
  useEffect(() => {
    if (!expertId || !date) return
    setLoading(true)
    setError(null)
    expertsApi.getSlots(expertId, date)
      .then(res => setSlots(res.data?.slots || res.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [expertId, date])

  // Real-time slot disabling via socket
  useEffect(() => {
    if (!expertId) return
    const cleanup = subscribeToExpertSlots(expertId, ({ slotId, status }) => {
      setSlots(prev =>
        prev.map(s => s._id === slotId || s.id === slotId ? { ...s, status } : s)
      )
    })
    return cleanup
  }, [expertId])

  return { slots, setSlots, loading, error }
}

// ─── useBookings ──────────────────────────────────────────────────────────
export function useBookings(email) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const res = await bookingsApi.getMyBookings(email)
      const bookingData = Array.isArray(res.data?.data)
        ? res.data.data
        : []

      setBookings(Array.isArray(bookingData) ? bookingData : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => { fetch() }, [fetch])

  return { bookings, loading, error, refetch: fetch }
}
