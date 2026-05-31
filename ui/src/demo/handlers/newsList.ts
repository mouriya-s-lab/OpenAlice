import { http, HttpResponse } from 'msw'

/**
 * News demo handler — seeded articles for the showcase.
 *
 * (Previously also mocked the legacy /api/notifications/history feed; the
 * NotificationsStore surface was removed, so only the news list remains.
 * The `/api/news/collector` config endpoint is mocked separately in
 * news.ts.)
 */

const DEMO_ARTICLES = [
  {
    id: 'demo-news-1',
    title: 'Fed holds rates steady; dot plot signals one cut in 2025',
    source: 'Reuters',
    url: 'https://example.com/news/fed-holds',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    summary: 'The Federal Reserve kept its benchmark rate unchanged...',
    tickers: ['SPY', 'TLT'],
  },
  {
    id: 'demo-news-2',
    title: 'NVIDIA unveils next-gen Blackwell Ultra accelerators',
    source: 'Bloomberg',
    url: 'https://example.com/news/nvidia-blackwell',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    summary: 'NVIDIA announced its Blackwell Ultra line...',
    tickers: ['NVDA'],
  },
]

export const newsListHandlers = [
  http.get('/api/news', () => {
    return HttpResponse.json({ articles: DEMO_ARTICLES, hasMore: false })
  }),
]
