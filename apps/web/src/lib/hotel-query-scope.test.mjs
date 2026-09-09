import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hotelFilter } from './hotel-query-scope.ts'

describe('scopeQueryToHotel', () => {
  it('adds a direct hotel_id filter', () => {
    assert.deepEqual(hotelFilter('hotel-palazzo'), ['hotel_id', 'hotel-palazzo'])
  })

  it('supports a related-table hotel filter', () => {
    assert.deepEqual(hotelFilter('hotel-palazzo', 'request_categories.hotel_id'), [
      'request_categories.hotel_id',
      'hotel-palazzo',
    ])
  })
})
