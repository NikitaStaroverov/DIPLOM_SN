import type { SensorReading, Field } from '../types'

/**
 * Эмулятор потока данных датчиков (каждые 10 секунд).
 * В реальном проекте замените на WebSocket/MQTT/REST.
 */
type Subscriber = (reading: SensorReading, fieldId: string) => void

const subs = new Set<Subscriber>()
let timer: number | null = null

function randomBetween(min: number, max: number) {
	return Math.round((min + Math.random() * (max - min)) * 10) / 10
}

function tick(fields: Field[]) {
	const ts = Date.now()
	for (const f of fields) {
		// раз в тик выдаем значения от части датчиков, чтобы не "засорять" демо
		const subset = f.sensors.slice(0, Math.min(f.sensors.length, 5))
		for (const sensorId of subset) {
			const reading: SensorReading = {
				timestamp: ts,
				sensorId,
				wetness: Math.round(randomBetween(15, 85)),
				temperature: Math.round(randomBetween(10, 38)),
				charge: Math.round(randomBetween(5, 100)),
			}
			subs.forEach(fn => fn(reading, f.id))
		}
	}
}

export function startMockStream(fields: Field[]) {
	if (timer) return
	tick(fields)
	timer = window.setInterval(() => tick(fields), 10_000)
}

export function stopMockStream() {
	if (!timer) return
	window.clearInterval(timer)
	timer = null
}

export function subscribe(fn: Subscriber) {
	subs.add(fn)
	return () => subs.delete(fn)
}
