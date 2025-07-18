import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SearchResult {
  title: string
  description: string
  link: string
  source: string
  date?: string
}

export interface ScrapedContent {
  title: string
  content: string
  source: string
  url: string
}

export interface BlogState {
  // API 密钥配置
  serperApiKey: string
  aiHubMixApiKey: string
  
  // 搜索和抓取状态
  keyword: string
  searchResults: SearchResult[]
  aiOverview: string
  scrapedContents: ScrapedContent[]
  
  // AI 生成内容
  outline: string
  finalContent: string
  
  // 加载状态
  isSearching: boolean
  isScraping: boolean
  isGeneratingOutline: boolean
  isGeneratingContent: boolean
  
  // 动作
  setSerperApiKey: (key: string) => void
  setAiHubMixApiKey: (key: string) => void
  setKeyword: (keyword: string) => void
  setSearchResults: (results: SearchResult[]) => void
  setAiOverview: (overview: string) => void
  setScrapedContents: (contents: ScrapedContent[]) => void
  setOutline: (outline: string) => void
  setFinalContent: (content: string) => void
  setIsSearching: (loading: boolean) => void
  setIsScraping: (loading: boolean) => void
  setIsGeneratingOutline: (loading: boolean) => void
  setIsGeneratingContent: (loading: boolean) => void
  clearResults: () => void
}

export const useBlogStore = create<BlogState>()(
  persist(
    (set) => ({
      // 初始状态
      serperApiKey: '',
      aiHubMixApiKey: '',
      keyword: '',
      searchResults: [],
      aiOverview: '',
      scrapedContents: [],
      outline: '',
      finalContent: '',
      isSearching: false,
      isScraping: false,
      isGeneratingOutline: false,
      isGeneratingContent: false,
      
      // 动作实现
      setSerperApiKey: (key) => set({ serperApiKey: key }),
      setAiHubMixApiKey: (key) => set({ aiHubMixApiKey: key }),
      setKeyword: (keyword) => set({ keyword }),
      setSearchResults: (results) => set({ searchResults: results }),
      setAiOverview: (overview) => set({ aiOverview: overview }),
      setScrapedContents: (contents) => set({ scrapedContents: contents }),
      setOutline: (outline) => set({ outline }),
      setFinalContent: (content) => set({ finalContent: content }),
      setIsSearching: (loading) => set({ isSearching: loading }),
      setIsScraping: (loading) => set({ isScraping: loading }),
      setIsGeneratingOutline: (loading) => set({ isGeneratingOutline: loading }),
      setIsGeneratingContent: (loading) => set({ isGeneratingContent: loading }),
      clearResults: () => set({
        searchResults: [],
        aiOverview: '',
        scrapedContents: [],
        outline: '',
        finalContent: ''
      })
    }),
    {
      name: 'blog-automation-storage',
      partialize: (state) => ({
        serperApiKey: state.serperApiKey,
        aiHubMixApiKey: state.aiHubMixApiKey
      })
    }
  )
) 