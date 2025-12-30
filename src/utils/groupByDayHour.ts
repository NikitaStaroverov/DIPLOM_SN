import type { SensorReading } from '../types'

export function groupByDayHour(readings: SensorReading[]) {
	const map: Record<number, Record<number, SensorReading[]>> = {}

	readings.forEach(r => {
		const d = new Date(r.timestamp)
		const day = d.getDate() // 1–31
		const hour = d.getHours() // 0–23

		map[day] ??= {}
		map[day][hour] ??= []
		map[day][hour].push(r)
	})

	return map
}
