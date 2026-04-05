import { useEffect, useState } from 'react'
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning, Wind, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const OW_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

interface WeatherData {
  city: string
  temp: number
  feelsLike: number
  description: string
  iconCode: string
  humidity: number
}

function gardenHint(iconCode: string, temp: number): string {
  const id = iconCode.slice(0, 2)
  if (id === '11') return 'Thunderstorm — stay inside and check on plants after.'
  if (id === '09' || id === '10') return 'Rainy day — hold off on watering.'
  if (id === '13') return 'Frost risk — protect tender plants.'
  if (id === '01' || id === '02') {
    if (temp > 86) return "Hot and sunny — water in the early morning or evening."
    return 'Sunny day — great time to tend the garden.'
  }
  if (id === '03' || id === '04') return 'Overcast — good for transplanting, less shock.'
  if (id === '50') return 'Misty and still — a peaceful day for gentle garden work.'
  return 'A calm day for garden work.'
}

function WeatherIcon({ code, className }: { code: string; className?: string }) {
  const id = code.slice(0, 2)
  const props = { className: className ?? 'h-8 w-8' }
  if (id === '01' || id === '02') return <Sun {...props} />
  if (id === '03' || id === '04') return <Cloud {...props} />
  if (id === '09' || id === '10') return <CloudRain {...props} />
  if (id === '11') return <CloudLightning {...props} />
  if (id === '13') return <CloudSnow {...props} />
  if (id === '50') return <Wind {...props} />
  return <Sun {...props} />
}

type Status = 'idle' | 'locating' | 'loading' | 'ok' | 'denied' | 'error'

export function WeatherWidget() {
  const [status, setStatus] = useState<Status>('idle')
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (!OW_KEY) return
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setStatus('loading')
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${OW_KEY}&units=imperial`
          )
          if (!res.ok) throw new Error('API error')
          const d = await res.json()
          setWeather({
            city: d.name,
            temp: Math.round(d.main.temp),
            feelsLike: Math.round(d.main.feels_like),
            description: d.weather[0].description,
            iconCode: d.weather[0].icon,
            humidity: d.main.humidity,
          })
          setStatus('ok')
        } catch {
          setStatus('error')
        }
      },
      () => setStatus('denied'),
      { timeout: 8000 }
    )
  }, [])

  if (!OW_KEY || status === 'idle') return null

  if (status === 'locating' || status === 'loading') {
    return (
      <Card className="animate-pulse">
        <p className="text-ac-muted text-sm">Checking the weather…</p>
      </Card>
    )
  }

  if (status === 'denied') {
    return (
      <Card>
        <p className="text-ac-muted text-sm">
          Enable location access to see local weather.
        </p>
      </Card>
    )
  }

  if (status === 'error' || !weather) {
    return (
      <Card>
        <p className="text-ac-muted text-sm">Weather unavailable right now.</p>
      </Card>
    )
  }

  const hint = gardenHint(weather.iconCode, weather.temp)
  const isRainy = ['09', '10', '11'].includes(weather.iconCode.slice(0, 2))

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={isRainy ? 'text-ac-muted' : 'text-ac-leaf-dark'}>
            <WeatherIcon code={weather.iconCode} className="h-9 w-9" />
          </span>
          <div>
            <p className="text-ac-ink text-2xl font-bold leading-none">
              {weather.temp}°F
              <span className="text-ac-muted ml-2 text-sm font-normal">
                feels like {weather.feelsLike}°F
              </span>
            </p>
            <p className="text-ac-muted mt-0.5 text-sm capitalize">{weather.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-right">
          <MapPin className="text-ac-muted h-3 w-3 shrink-0" aria-hidden />
          <p className="text-ac-muted text-xs">{weather.city}</p>
        </div>
      </div>
      <p className="text-ac-muted mt-3 border-t border-ac-leaf-dark/10 pt-3 text-xs">
        {hint}
      </p>
    </Card>
  )
}
