import { useQuery } from '@tanstack/react-query'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { useMemo } from 'react'
import { Bar, Line } from 'react-chartjs-2'

import { PaddedSpinner } from '@/lib/components/ui'
import { accentColor } from '@/lib/metadata'
import { formatNumber } from '@/lib/utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

export function ChartFromQuery({
  queryKey,
  queryFn,
  title,
  subtitleFunc,
  xProp,
  yProp,
  yProps,
  type = 'bar',
  stacked = true,
}: any) {
  const { data, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: 5 * 60 * 1000,
  })

  const subtitle = useMemo(() => {
    if (!data || !subtitleFunc) return null
    return subtitleFunc(data)
  }, [data])

  if (isLoading) return <PaddedSpinner />
  if (!data) return null

  return (
    <div className="p-4">
      <div className="flex flex-row items-start justify-between gap-4  mb-4">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="whitespace-pre-wrap text-right">{subtitle}</div>}
      </div>

      <ChartFromData data={data} title={title} xProp={xProp} yProp={yProp} yProps={yProps} stacked={stacked} />
    </div>
  )
}

export function ChartFromData({ data, title, xProp, yProp, yProps, type = 'bar', stacked = true }: any) {
  const yProps_ = yProps ?? (yProp ? [yProp] : [])
  const config = useMemo(() => {
    return getChartConfig({ data, title, xProp, yProps: yProps_, type, stacked })
  }, [data, stacked])

  if (!data || !config) return null
  return <Chart config={config} />
}

function Chart({ config }) {
  if (!config) return null
  // return <img src={getChartImageUrl(config)} className="w-full mb-5" />
  const Component = config.type === 'line' ? Line : Bar
  return <Component data={config.data} options={config.options} />
}

// function getChartImageUrl(chartConfig) {
//   return `https://quickchart.io/chart?w=500&h=350&c=${encodeURIComponent(JSON.stringify(chartConfig))}`
// }

const datasetColors = [accentColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

function getChartConfig({ data, title, xProp, yProps, type = 'bar', stacked = true }) {
  if (!data || !yProps?.length) return null
  const data_ = data?.slice().reverse()
  const isMulti = yProps.length > 1
  const chartData = {
    labels: data_.map((item: any) => item[xProp]?.slice(5, 10)),
    datasets: yProps.map((yProp: string, i: number) => {
      const color = datasetColors[i % datasetColors.length]
      return {
        label: isMulti ? yProp : title,
        data: data_?.map((item: any) => item[yProp]),
        backgroundColor: color, //type === 'line' ? 'transparent' : color,
        borderColor: color,
      }
    }),
  }
  const options = {
    ...chartOptions,
    plugins: isMulti ? { ...chartOptions.plugins, legend: { display: true, position: 'right' } } : chartOptions.plugins,
    scales: {
      y: { ...chartOptions.scales.y, stacked },
      x: { ...chartOptions.scales.x, stacked },
    },
  }
  return { type, data: chartData, options }
}

const gridLineColor = 'rgba(130, 130, 130, 0.2)'

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1.45,
  animation: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  elements: {
    point: {
      radius: 0, // Set pointRadius globally for all datasets
    },
  },

  plugins: {
    legend: {
      display: false,
      position: 'right',
      // labels: {
      //   boxWidth: 20,
      //   fontColor: '#888',
      // },
    },
  },
  scales: {
    y: {
      stacked: true,
      beginAtZero: false,
      ticks: {
        fontColor: '#888',
        // callback: formatNumber,
      },
      grid: {
        color: gridLineColor,
        zeroLineColor: gridLineColor,
      },
    },
    x: {
      stacked: true,
      ticks: {
        fontColor: '#888',
      },
      grid: {
        display: false,
        color: gridLineColor,
        zeroLineColor: gridLineColor,
      },
    },
  },
}
