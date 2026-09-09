export function hotelFilter(hotelId: string, column = 'hotel_id'): [column: string, value: string] {
  return [column, hotelId]
}
