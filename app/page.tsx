'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { AccountSheet } from '@/lib/components/account-sheet'
import { AccountIcon, BrandIcon, FeedIcon } from '@/lib/components/icons'
import { Header, TabsWithContent } from '@/lib/components/misc'
import { PaddedSpinner, Section } from '@/lib/components/ui'
import { accentColor, appDescription, appName } from '@/lib/metadata'
import { useAuth } from '@/lib/providers/auth-provider'
import { fetchScoresByCategory } from '@/lib/services/trpc-client'
import { ChartFromData } from '@/lib/utils/chart'
import { haptics } from '@/lib/utils/haptics'

export default function Home() {
  return (
    <div className=" font-sans mb-10">
      <Header shareText={`Check out ${appName} by @moe!\n`} hideMenu>
        <BrandSection />
      </Header>

      <CategoryTabs />
    </div>
  )
}

const categories = [
  'text',
  'code',
  'vision',
  'text-to-image',
  'image-edit',
  'search',
  'text-to-video',
  'image-to-video',
]

function CategoryTabs() {
  const tabs = categories.map((c) => ({
    name: c,
    content: <CategoryScores category={c} />,
  }))
  return <TabsWithContent tabs={tabs} />
}

function CategoryScores({ category }: { category: string }) {
  const { data: scores, isLoading } = useQuery({
    queryKey: ['scoresByCategory', category],
    queryFn: () => fetchScoresByCategory(category),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <PaddedSpinner />
  if (!scores?.length) return null

  return (
    <>
      <CategoryScoresChart scores={scores} />
      <CategoryScoresTable scores={scores} />
    </>
  )
}

function CategoryScoresChart({ scores }: { scores: any[] }) {
  const days = useMemo(() => [...new Set(scores.map((s) => s.day))].sort() as string[], [scores])
  const models = useMemo(() => [...new Set(scores.map((s) => s.model))].slice(0, 10) as string[], [scores])

  const pivoted = useMemo(
    () =>
      days.map((day) => {
        const row: Record<string, any> = { day }
        models.forEach((model) => {
          const s = scores.find((s) => s.day === day && s.model === model)
          row[model] = s ? Math.round(s.score) : null
        })
        return row
      }),
    [scores, days, models],
  )

  return (
    <div className="p-4">
      <ChartFromData data={pivoted} title="Scores" xProp="day" yProps={models} type="line" stacked={false} />
    </div>
  )
}

function CategoryScoresTable({ scores }: { scores: any[] }) {
  const days = [...new Set(scores.map((s: any) => s.day))] as string[]
  const models = [...new Set(scores.map((s: any) => s.model))] as string[]

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 font-medium">Model</th>
              {days.map((day: string) => (
                <th key={day} className="text-right py-2 px-2 font-medium whitespace-nowrap">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map((model: string) => (
              <tr key={model} className="border-b border-white/5">
                <td className="py-2 pr-4 whitespace-nowrap">{model}</td>
                {days.map((day: string) => {
                  const score = scores.find((s: any) => s.model === model && s.day === day)
                  return (
                    <td key={day} className="text-right py-2 px-2 tabular-nums">
                      {score ? Math.round(score.score) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BrandSection() {
  return (
    <div className="flex flex-row items-center gap-3 mb-4">
      <div
        className="flex flex-row items-center justify-center size-[50px] rounded-[12px]"
        style={{ backgroundColor: accentColor }}
      >
        <BrandIcon className="size-[33px] text-white" />
      </div>
      <div className="">
        <h1 className="text-3xl font-medium">{appName}</h1>
        <div className="text-xs opacity-50">{appDescription}</div>
      </div>
    </div>
  )
}

function AccountButton() {
  const auth = useAuth()
  const [showSheet, setShowSheet] = useState(false)

  if (auth?.farcasterMiniApp?.context) return null
  return (
    <div>
      {auth?.userImage ? (
        <img
          className="size-6 rounded-full object-cover m-1 cursor-pointer"
          src={auth?.userImage}
          onClick={() => setShowSheet(true)}
        />
      ) : (
        <AccountIcon className="size-6 m-1 cursor-pointer opacity-50" onClick={() => setShowSheet(true)} />
      )}
      <AccountSheet showSheet={showSheet} setShowSheet={setShowSheet} />
    </div>
  )
}

function FeatureGrid() {
  const router = useRouter()
  const auth = useAuth()

  const links = [
    { title: 'Feeds', Icon: FeedIcon, path: `/feeds` },
    // { title: 'Channels', Icon: ChannelIcon, path: `/channels` },
    // { title: 'Mini Apps', Icon: MiniAppsIcon, path: `/mini-apps` },
    // { title: 'Starter Packs', Icon: StarterPackIcon, path: `/starter-packs` },
    // { title: 'Search', Icon: SearchIcon, path: `/search` },
    // auth?.readAuthenticated && { title: 'Notifications', Icon: NotificationIcon, path: '/notifications' },
    // auth?.readAuthenticated && { title: 'My Profile', Icon: UserIcon, path: `/u/${auth?.username}` },
    // !auth?.farcasterMiniApp?.context && { title: 'Account', Icon: AccountIcon, path: '/account' },
    // { title: 'Users', Icon: Users, path: `/users` },
    // { title: 'Leaderboard', Icon: Trophy, path: `/leaderboard` },
  ].filter(Boolean) as { title: string; Icon: React.ComponentType<any>; path: string }[]

  const navigateTo = (path: string) => {
    haptics()
    router.push(path)
  }

  return (
    <div className="grid grid-cols-2 gap-4 m-4">
      {links.map(({ title, Icon, path }) => (
        <div key={title} onClick={() => navigateTo(path)}>
          <Section className="cursor-pointer flex flex-col items-center">
            <Icon className="size-10 opacity-50" />
            <div className="text-lg font-semibold text-center mt-3">{title}</div>
          </Section>
        </div>
      ))}
    </div>
  )
}
