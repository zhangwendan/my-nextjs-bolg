'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Settings, FileText, Bot, Copy, ExternalLink, AlertCircle, CheckCircle, Loader2, ChevronUp, ChevronDown, History, Maximize2, Upload, Database, Trash2, Eye, File, Folder, Globe } from 'lucide-react'
import { toast } from 'sonner'

// 临时状态管理（简化版本）
interface SearchResult {
  title: string
  description: string
  link: string
  source: string
  date?: string
}



interface ExcludedResult {
  title: string
  description: string
  link: string
  source: string
  date?: string
  excludeReason: string
  type: 'organic' | 'news'
}

interface PromptHistory {
  id: string
  content: string
  createdAt: string
  title: string
}

interface KnowledgeFile {
  id: string
  name: string
  type: string
  size: number
  content: string
  uploadTime: string
  path?: string
}

interface KnowledgeSearch {
  query: string
  results: KnowledgeFile[]
}

export default function HomePage() {
  // API 配置
  const [apiKey, setApiKey] = useState('')
  const [pageCount, setPageCount] = useState('10')
  const [language, setLanguage] = useState('zh-cn')
  const [country, setCountry] = useState('cn')
  
  // AI 模型配置
  const [aiHubMixApiKey, setAiHubMixApiKey] = useState('')
  const [outlineModel, setOutlineModel] = useState('gpt-4')
  const [contentModel, setContentModel] = useState('gpt-4')
  const [outlinePrompt, setOutlinePrompt] = useState(`作为一个专业的博客内容策划专家，请基于以下关键词和参考资料，为外贸企业创建一个详细的文章大纲。

要求：
1. 大纲应包含引言、3-5个主要部分和结论
2. 每个部分都要有2-3个子要点
3. 重点关注行业洞察、实用建议和专业分析
4. 确保内容有助于提升企业在该领域的专业形象

请生成结构化的大纲：`)
  const [contentPrompt, setContentPrompt] = useState(`作为一个专业的商业内容写作专家，请基于提供的大纲和参考资料，写一篇高质量的商业博客文章。

要求：
1. 文章应该专业、有深度，适合B2B读者
2. 每个段落都要有实质性内容，避免空洞的表述
3. 适当引用数据和案例来支持观点
4. 语言风格专业但易读，符合商业写作标准
5. 文章长度在2000-3000字左右

请生成完整的文章内容：`)
  
  // 提示词历史记录
  const [outlinePromptHistory, setOutlinePromptHistory] = useState<PromptHistory[]>([])
  const [contentPromptHistory, setContentPromptHistory] = useState<PromptHistory[]>([])
  const [showOutlineHistory, setShowOutlineHistory] = useState(false)
  const [showContentHistory, setShowContentHistory] = useState(false)
  const [showOutlinePromptDialog, setShowOutlinePromptDialog] = useState(false)
  const [showContentPromptDialog, setShowContentPromptDialog] = useState(false)
  
  // 新增：保存历史记录时的自定义名称
  const [showOutlineSaveDialog, setShowOutlineSaveDialog] = useState(false)
  const [showContentSaveDialog, setShowContentSaveDialog] = useState(false)
  const [outlineSaveName, setOutlineSaveName] = useState('')
  const [contentSaveName, setContentSaveName] = useState('')
  
  // WordPress配置
  const [wpSiteUrl, setWpSiteUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [wpPassword, setWpPassword] = useState('')
  
  // 模型历史记录
  const [outlineModelHistory, setOutlineModelHistory] = useState<string[]>([])
  const [contentModelHistory, setContentModelHistory] = useState<string[]>([])
  const [showOutlineModelHistory, setShowOutlineModelHistory] = useState(false)
  const [showContentModelHistory, setShowContentModelHistory] = useState(false)
  
  // 知识库状态
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [knowledgeSearch, setKnowledgeSearch] = useState('')
  const [knowledgeSearchResults, setKnowledgeSearchResults] = useState<KnowledgeFile[]>([])
  const [isSearchingKnowledge, setIsSearchingKnowledge] = useState(false)
  const [showKnowledgeDialog, setShowKnowledgeDialog] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [showFullContent, setShowFullContent] = useState<{ [key: string]: boolean }>({})
  
  // 搜索状态
  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [excludedResults, setExcludedResults] = useState<ExcludedResult[]>([])
  const [showExcluded, setShowExcluded] = useState(false)
  const [aiOverview, setAiOverview] = useState('')
  const [hasAiOverview, setHasAiOverview] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  

  
  // AI 生成状态
  const [outline, setOutline] = useState('')
  const [finalContent, setFinalContent] = useState('')
  const [translatedContent, setTranslatedContent] = useState('')
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isUploadingToWP, setIsUploadingToWP] = useState(false)
  
  // 调试状态
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // 加载历史记录
  useEffect(() => {
    const savedOutlineHistory = localStorage.getItem('outlinePromptHistory')
    const savedContentHistory = localStorage.getItem('contentPromptHistory')
    const savedWpConfig = localStorage.getItem('wpConfig')
    const savedOutlineModelHistory = localStorage.getItem('outlineModelHistory')
    const savedContentModelHistory = localStorage.getItem('contentModelHistory')
    
    if (savedOutlineHistory) {
      setOutlinePromptHistory(JSON.parse(savedOutlineHistory))
    }
    if (savedContentHistory) {
      setContentPromptHistory(JSON.parse(savedContentHistory))
    }
    if (savedWpConfig) {
      const config = JSON.parse(savedWpConfig)
      setWpSiteUrl(config.siteUrl || '')
      setWpUsername(config.username || '')
      setWpPassword(config.password || '')
    }
    if (savedOutlineModelHistory) {
      setOutlineModelHistory(JSON.parse(savedOutlineModelHistory))
    }
    if (savedContentModelHistory) {
      setContentModelHistory(JSON.parse(savedContentModelHistory))
    }
    
    // 加载知识库文件
    loadKnowledgeFiles()
  }, [])

  // 加载知识库文件列表
  const loadKnowledgeFiles = async () => {
    try {
      console.log('正在加载知识库文件...')
      const response = await fetch('/api/knowledge/files')
      
      console.log('知识库文件加载响应状态:', response.status)
      console.log('响应头 Content-Type:', response.headers.get('content-type'))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('知识库文件加载失败:', errorText)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('知识库API返回了非JSON响应:', responseText.substring(0, 200))
        toast.error('服务器返回了意外的响应格式')
        return
      }
      
        const data = await response.json()
      console.log('知识库文件数据:', data)
      
        if (data.success) {
          setKnowledgeFiles(data.files || [])
      } else {
        console.error('知识库文件加载失败:', data.message)
      }
    } catch (error) {
      console.error('加载知识库文件失败:', error)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('服务器响应格式错误，请检查开发服务器状态')
      }
    }
  }

  // 保存提示词到历史记录
  const savePromptToHistory = (type: 'outline' | 'content', prompt: string, title?: string) => {
    const history: PromptHistory = {
      id: Date.now().toString(),
      content: prompt,
      createdAt: new Date().toLocaleString('zh-CN'),
      title: title || `${type === 'outline' ? '大纲' : '文章'}提示词 - ${new Date().toLocaleString('zh-CN')}`
    }
    
    if (type === 'outline') {
      const newHistory = [history, ...outlinePromptHistory.slice(0, 9)] // 保留最新10条
      setOutlinePromptHistory(newHistory)
      localStorage.setItem('outlinePromptHistory', JSON.stringify(newHistory))
    } else {
      const newHistory = [history, ...contentPromptHistory.slice(0, 9)] // 保留最新10条
      setContentPromptHistory(newHistory)
      localStorage.setItem('contentPromptHistory', JSON.stringify(newHistory))
    }
    toast.success('提示词已保存到历史记录')
  }

  // 新增：通过对话框保存提示词到历史记录
  const savePromptWithCustomName = (type: 'outline' | 'content') => {
    const prompt = type === 'outline' ? outlinePrompt : contentPrompt
    const customName = type === 'outline' ? outlineSaveName : contentSaveName
    
    if (!prompt.trim()) {
      toast.error('提示词内容不能为空')
      return
    }
    
    if (!customName.trim()) {
      toast.error('请输入保存名称')
      return
    }
    
    savePromptToHistory(type, prompt, customName)
    
    // 重置状态
    if (type === 'outline') {
      setOutlineSaveName('')
      setShowOutlineSaveDialog(false)
    } else {
      setContentSaveName('')
      setShowContentSaveDialog(false)
    }
  }

  // 从历史记录加载提示词
  const loadPromptFromHistory = (type: 'outline' | 'content', prompt: string) => {
    if (type === 'outline') {
      setOutlinePrompt(prompt)
      setShowOutlineHistory(false)
    } else {
      setContentPrompt(prompt)
      setShowContentHistory(false)
    }
    toast.success('提示词已加载')
  }

  // 删除历史记录
  const deletePromptHistory = (type: 'outline' | 'content', id: string) => {
    if (type === 'outline') {
      const newHistory = outlinePromptHistory.filter(h => h.id !== id)
      setOutlinePromptHistory(newHistory)
      localStorage.setItem('outlinePromptHistory', JSON.stringify(newHistory))
    } else {
      const newHistory = contentPromptHistory.filter(h => h.id !== id)
      setContentPromptHistory(newHistory)
      localStorage.setItem('contentPromptHistory', JSON.stringify(newHistory))
    }
    toast.success('历史记录已删除')
  }

  // 保存WordPress配置
  const saveWpConfig = () => {
    const config = {
      siteUrl: wpSiteUrl,
      username: wpUsername,
      password: wpPassword
    }
    localStorage.setItem('wpConfig', JSON.stringify(config))
    toast.success('WordPress配置已保存')
  }

  // 保存模型到历史记录
  const saveModelToHistory = (type: 'outline' | 'content', model: string) => {
    if (!model.trim()) return
    
    if (type === 'outline') {
      const newHistory = [model, ...outlineModelHistory.filter(m => m !== model)].slice(0, 10)
      setOutlineModelHistory(newHistory)
      localStorage.setItem('outlineModelHistory', JSON.stringify(newHistory))
    } else {
      const newHistory = [model, ...contentModelHistory.filter(m => m !== model)].slice(0, 10)
      setContentModelHistory(newHistory)
      localStorage.setItem('contentModelHistory', JSON.stringify(newHistory))
    }
  }

  // 选择模型
  const selectModel = (type: 'outline' | 'content', model: string) => {
    if (type === 'outline') {
      setOutlineModel(model)
      setShowOutlineModelHistory(false)
    } else {
      setContentModel(model)
      setShowContentModelHistory(false)
    }
  }

  // 文件上传处理
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploadingFiles(true)
    setUploadProgress(0)

    try {
      console.log('开始上传文件:', Array.from(files).map(f => f.name))
      
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file) {
          formData.append('files', file)
        }
      }

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('文件上传响应状态:', response.status)
      console.log('响应头 Content-Type:', response.headers.get('content-type'))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('文件上传失败:', errorText)
        throw new Error(`上传失败: HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('上传API返回了非JSON响应:', responseText.substring(0, 200))
        throw new Error('服务器返回了意外的响应格式')
      }

      const data = await response.json()
      console.log('文件上传响应数据:', data)

      if (response.ok && data.success) {
        toast.success(`成功上传 ${data.uploadedCount} 个文件`)
        await loadKnowledgeFiles() // 重新加载文件列表
      } else {
        throw new Error(data.message || '上传失败')
      }
    } catch (error) {
      console.error('文件上传错误:', error)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('服务器响应格式错误，请检查开发服务器状态')
      } else {
      toast.error(error instanceof Error ? error.message : '文件上传失败')
      }
    } finally {
      setIsUploadingFiles(false)
      setUploadProgress(0)
    }
  }

  // 删除知识库文件
  const deleteKnowledgeFile = async (fileId: string) => {
    try {
      console.log('开始删除文件:', fileId)
      
      const response = await fetch(`/api/knowledge/files/${fileId}`, {
        method: 'DELETE',
      })

      console.log('文件删除响应状态:', response.status)
      console.log('响应头 Content-Type:', response.headers.get('content-type'))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('文件删除失败:', errorText)
        throw new Error(`删除失败: HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('删除API返回了非JSON响应:', responseText.substring(0, 200))
        throw new Error('服务器返回了意外的响应格式')
      }

      const data = await response.json()
      console.log('文件删除响应数据:', data)

      if (response.ok && data.success) {
        toast.success('文件删除成功')
        await loadKnowledgeFiles()
      } else {
        throw new Error(data.message || '删除失败')
      }
    } catch (error) {
      console.error('删除文件错误:', error)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('服务器响应格式错误，请检查开发服务器状态')
      } else {
      toast.error(error instanceof Error ? error.message : '删除文件失败')
      }
    }
  }

  // 搜索知识库
  const searchKnowledge = async (query: string) => {
    if (!query.trim()) {
      setKnowledgeSearchResults([])
      return
    }

    setIsSearchingKnowledge(true)

    try {
      console.log('开始搜索知识库:', query)
      
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      console.log('知识库搜索响应状态:', response.status)
      console.log('响应头 Content-Type:', response.headers.get('content-type'))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('知识库搜索失败:', errorText)
        throw new Error(`搜索失败: HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('搜索API返回了非JSON响应:', responseText.substring(0, 200))
        throw new Error('服务器返回了意外的响应格式')
      }

      const data = await response.json()
      console.log('知识库搜索响应数据:', data)

      if (response.ok && data.success) {
        setKnowledgeSearchResults(data.results || [])
      } else {
        throw new Error(data.message || '搜索失败')
      }
    } catch (error) {
      console.error('知识库搜索错误:', error)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('服务器响应格式错误，请检查开发服务器状态')
      } else {
      toast.error(error instanceof Error ? error.message : '搜索失败')
      }
    } finally {
      setIsSearchingKnowledge(false)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取文件图标
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('doc')) return '📝'
    if (type.includes('excel') || type.includes('sheet')) return '📊'
    if (type.includes('text')) return '📋'
    if (type.includes('image')) return '🖼️'
    return '📁'
  }

  // 搜索功能
  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast.error('请输入关键词')
      return
    }
    
    if (!apiKey.trim()) {
      toast.error('请先配置搜索 API Key')
      return
    }

    setIsSearching(true)
    setSearchResults([])
    setExcludedResults([])
    setAiOverview('')
    setDebugInfo(null)
    
    try {
      console.log('开始搜索:', keyword)
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          apiKey,
          pageCount: parseInt(pageCount),
          language,
          country
        })
      })

      const data = await response.json()
      console.log('搜索响应:', data)

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        // 只显示前3个搜索结果
        const limitedResults = (data.results || []).slice(0, 3)
        setSearchResults(limitedResults)
        setExcludedResults(data.excludedResults || [])
        setAiOverview(data.aiOverview || '')
        setHasAiOverview(!!data.aiOverview)
        setDebugInfo(data.debug)
        
        if (limitedResults.length > 0) {
          const excludedInfo = data.excludedResults?.length 
            ? `，排除了${data.excludedResults.length}个不符合条件的结果` 
            : ''
          const filterInfo = data.debug?.filteredOutCount 
            ? `，从${data.debug.totalSourceResults}个原始结果中筛选出前3个高质量博客/新闻页面` 
            : ''
          toast.success(`搜索成功！显示前 ${limitedResults.length} 个高质量结果${filterInfo}${excludedInfo}${data.aiOverview ? '，包含AI概览' : ''}`)
        } else {
          if (data.debug?.totalSourceResults > 0) {
            const excludedInfo = data.excludedResults?.length 
              ? ` 排除了${data.excludedResults.length}个不符合条件的结果，` 
              : ''
            toast.warning(`搜索到${data.debug.totalSourceResults}个结果，${excludedInfo}但经过URL筛选后没有符合条件的博客/新闻页面。请尝试其他关键词。`)
          } else {
            toast.warning('搜索完成，但没有找到相关结果，请尝试其他关键词')
          }
        }
      } else {
        throw new Error(data.message || '搜索失败')
      }
    } catch (error) {
      console.error('搜索错误:', error)
      const errorMessage = error instanceof Error ? error.message : '搜索失败，请检查网络连接'
      toast.error(errorMessage)
      setDebugInfo({ error: errorMessage })
    } finally {
      setIsSearching(false)
    }
  }



  // 生成大纲
  const handleGenerateOutline = async () => {
    if (searchResults.length === 0 && !aiOverview) {
      toast.error('请先进行搜索')
      return
    }

    if (!aiHubMixApiKey.trim()) {
      toast.error('请先配置 AI Hub Mix API Key')
      return
    }

    if (!outlineModel.trim()) {
      toast.error('请选择大纲生成模型')
      return
    }

    setIsGeneratingOutline(true)
    setOutline('')

    try {
      const response = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          searchResults,
          aiOverview,
          aiHubMixApiKey,
          model: outlineModel,
          prompt: outlinePrompt,
          selectedKnowledgeFiles // 传递选中的知识库文件ID
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        setOutline(data.outline)
        toast.success('大纲生成成功！')
      } else {
        throw new Error(data.message || '大纲生成失败')
      }
    } catch (error) {
      console.error('大纲生成错误:', error)
      toast.error(error instanceof Error ? error.message : '大纲生成失败')
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  // 生成最终内容
  const handleGenerateContent = async () => {
    if (!outline.trim()) {
      toast.error('请先生成文章大纲')
      return
    }

    if (!aiHubMixApiKey.trim()) {
      toast.error('请先配置 AI Hub Mix API Key')
      return
    }

    if (!contentModel.trim()) {
      toast.error('请选择文章生成模型')
      return
    }

    setIsGeneratingContent(true)
    setFinalContent('')
    setTranslatedContent('')

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          outline,
          searchResults,
          aiOverview,
          aiHubMixApiKey,
          model: contentModel,
          prompt: contentPrompt,
          selectedKnowledgeFiles // 传递选中的知识库文件ID
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        setFinalContent(data.content)
        toast.success('文章生成成功！')
      } else {
        throw new Error(data.message || '文章生成失败')
      }
    } catch (error) {
      console.error('文章生成错误:', error)
      toast.error(error instanceof Error ? error.message : '文章生成失败')
    } finally {
      setIsGeneratingContent(false)
    }
  }

  // 复制内容
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('已复制到剪贴板')
    } catch (error) {
      // 降级方案：使用旧的复制方法
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        toast.success('已复制到剪贴板')
      } catch (fallbackError) {
        toast.error('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }

  // 翻译为中文
  const translateToChinese = async () => {
    if (!finalContent.trim()) {
      toast.error('没有内容可以翻译')
      return
    }

    if (!aiHubMixApiKey.trim()) {
      toast.error('请先配置 AI Hub Mix API Key')
      return
    }

    setIsTranslating(true)
    setTranslatedContent('')

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalContent,
          aiHubMixApiKey,
          model: contentModel
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        setTranslatedContent(data.translatedContent)
        toast.success('文章翻译成功！')
      } else {
        throw new Error(data.message || '翻译失败')
      }
    } catch (error) {
      console.error('翻译错误:', error)
      toast.error(error instanceof Error ? error.message : '翻译失败')
    } finally {
      setIsTranslating(false)
    }
  }

  // 上传到WordPress
  const uploadToWordPress = async () => {
    if (!finalContent.trim()) {
      toast.error('没有内容可以上传')
      return
    }

    if (!wpSiteUrl.trim() || !wpUsername.trim() || !wpPassword.trim()) {
      toast.error('请先配置WordPress信息')
      return
    }

    setIsUploadingToWP(true)

    try {
      console.log('🚀 开始上传到WordPress...')
      console.log('📋 内容长度:', finalContent.length)
      console.log('🌐 站点URL:', wpSiteUrl)
      console.log('👤 用户名:', wpUsername)
      
      // 清理生成的内容，移除开头的```html标记
      let cleanContent = finalContent
      if (cleanContent.startsWith('```html')) {
        cleanContent = cleanContent.replace(/^```html\s*/, '')
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.replace(/\s*```$/, '')
      }
      
      // 获取当前的主机和端口
      const currentOrigin = window.location.origin
      console.log('🔗 当前应用地址:', currentOrigin)
      
      const response = await fetch(`${currentOrigin}/api/wordpress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: cleanContent,
          title: keyword || '新文章', // 移除"关于...的文章"前缀
          siteUrl: wpSiteUrl,
          username: wpUsername,
          password: wpPassword
        })
      })

      console.log('📡 WordPress API响应状态:', response.status)
      console.log('📄 响应头 Content-Type:', response.headers.get('content-type'))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ WordPress API失败:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('❌ WordPress API返回了非JSON响应:', responseText.substring(0, 200))
        throw new Error('服务器返回了意外的响应格式，请检查WordPress配置')
      }

      const data = await response.json()
      console.log('✅ WordPress API响应数据:', data)

      if (data.success) {
        toast.success('文章已成功上传到WordPress草稿箱！')
        if (data.adminLink) {
          console.log('🔗 编辑链接:', data.adminLink)
        }
      } else {
        throw new Error(data.message || '上传失败')
      }
    } catch (error) {
      console.error('❌ WordPress上传错误:', error)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('服务器响应格式错误，请检查WordPress API是否正常工作')
      } else {
      toast.error(error instanceof Error ? error.message : 'WordPress上传失败')
      }
    } finally {
      setIsUploadingToWP(false)
    }
  }

  // 知识库文件选择状态
  const [selectedKnowledgeFiles, setSelectedKnowledgeFiles] = useState<string[]>([])
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false)
  
  // 站点地图导入状态
  const [sitemapUrl, setSitemapUrl] = useState('')
  const [maxPages, setMaxPages] = useState('10')
  const [includePaths, setIncludePaths] = useState('')
  const [excludePaths, setExcludePaths] = useState('')
  const [isImportingSitemap, setIsImportingSitemap] = useState(false)

  // 站点地图导入函数
  const handleSitemapImport = async () => {
    if (!sitemapUrl.trim()) {
      toast.error('请输入站点地图URL')
      return
    }

    setIsImportingSitemap(true)

    try {
      console.log('🌐 开始导入站点地图:', sitemapUrl)

      const response = await fetch('/api/import-sitemap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sitemapUrl,
          maxPages: parseInt(maxPages) || 10,
          includePaths,
          excludePaths
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        toast.success(data.message)
        console.log('✅ 站点地图导入成功:', data.summary)
        
        // 重新加载知识库文件列表
        await loadKnowledgeFiles()
        
        // 清空表单
        setSitemapUrl('')
        setIncludePaths('')
        setExcludePaths('')
      } else {
        throw new Error(data.message || '站点地图导入失败')
      }
    } catch (error) {
      console.error('❌ 站点地图导入错误:', error)
      toast.error(error instanceof Error ? error.message : '站点地图导入失败')
    } finally {
      setIsImportingSitemap(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🤖 AI 博客自动生成工具
          </h1>
          <p className="text-lg text-gray-600">
            智能内容生成平台，从关键词搜索到博客文章一站式解决方案
          </p>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              搜索分析
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              知识库
            </TabsTrigger>
            <TabsTrigger value="outline" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              大纲生成
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              文章生成
            </TabsTrigger>
          </TabsList>

          {/* 搜索分析页面 */}
          <TabsContent value="search">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 搜索 SERP 配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    搜索 SERP 配置
                  </CardTitle>
                  <CardDescription>
                    配置搜索引擎参数以获取最佳搜索结果
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="api-key">搜索 API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="输入你的搜索 API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      API Key 将保存在本地，不会上传到服务器
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="page-count">页面数量</Label>
                      <Select value={pageCount} onValueChange={setPageCount}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择页面数量" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 个结果</SelectItem>
                          <SelectItem value="10">10 个结果</SelectItem>
                          <SelectItem value="15">15 个结果</SelectItem>
                          <SelectItem value="20">20 个结果</SelectItem>
                          <SelectItem value="30">30 个结果</SelectItem>
                          <SelectItem value="40">40 个结果</SelectItem>
                          <SelectItem value="50">50 个结果</SelectItem>
                          <SelectItem value="60">60 个结果</SelectItem>
                          <SelectItem value="70">70 个结果</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="language">查询语言</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择语言" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh-cn">中文 (简体)</SelectItem>
                          <SelectItem value="zh-tw">中文 (繁体)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="ru">Русский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">查询国家/地区</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择国家/地区" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cn">中国 🇨🇳</SelectItem>
                        <SelectItem value="tw">台湾 🇹🇼</SelectItem>
                        <SelectItem value="hk">香港 🇭🇰</SelectItem>
                        <SelectItem value="sg">新加坡 🇸🇬</SelectItem>
                        <SelectItem value="us">美国 🇺🇸</SelectItem>
                        <SelectItem value="uk">英国 🇬🇧</SelectItem>
                        <SelectItem value="au">澳大利亚 🇦🇺</SelectItem>
                        <SelectItem value="ca">加拿大 🇨🇦</SelectItem>
                        <SelectItem value="jp">日本 🇯🇵</SelectItem>
                        <SelectItem value="kr">韩国 🇰🇷</SelectItem>
                        <SelectItem value="de">德国 🇩🇪</SelectItem>
                        <SelectItem value="fr">法国 🇫🇷</SelectItem>
                        <SelectItem value="in">印度 🇮🇳</SelectItem>
                        <SelectItem value="br">巴西 🇧🇷</SelectItem>
                        <SelectItem value="mx">墨西哥 🇲🇽</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-gray-600 p-3 bg-blue-50 rounded-lg">
                    <p><strong>提示：</strong></p>
                    <p>• 页面数量：控制返回的搜索结果数量，最多70个</p>
                    <p>• 查询语言：影响搜索结果的语言偏好</p>
                    <p>• 查询国家：影响搜索结果的地区相关性</p>
                  </div>
                </CardContent>
              </Card>

              {/* 关键词搜索 */}
              <Card>
                <CardHeader>
                  <CardTitle>关键词搜索</CardTitle>
                  <CardDescription>
                    输入你要写博客的关键词，系统将自动搜索相关内容
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="keyword">关键词</Label>
                    <Input
                      id="keyword"
                      placeholder="例如：机械设备出口贸易"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="w-full"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        搜索中...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        开始搜索
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 调试信息 */}
            {debugInfo && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    搜索统计信息
                  </CardTitle>
                  <CardDescription>
                    URL筛选和结果统计详情
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{debugInfo.totalSourceResults || 0}</div>
                      <div className="text-sm text-gray-500">原始结果</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{debugInfo.filteredResults || 0}</div>
                      <div className="text-sm text-gray-500">筛选通过</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{debugInfo.totalExcluded || 0}</div>
                      <div className="text-sm text-gray-500">可查看排除</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{debugInfo.filteredOutCount || 0}</div>
                      <div className="text-sm text-gray-500">总计排除</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{debugInfo.finalResultCount || 0}</div>
                      <div className="text-sm text-gray-500">最终返回</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>✅ <strong>筛选规则：</strong> 只保留包含 blog|news|article|post|posts|insights|knowledgebase|resources 的URL</p>
                    <p>❌ <strong>排除类型：</strong> 产品页面、视频、图片、社交媒体、文档文件等（可点击下方查看被排除的结果）</p>
                    <p>🌐 <strong>搜索配置：</strong> {debugInfo.language} | {debugInfo.country} | {debugInfo.requestedCount}个结果</p>
                    {debugInfo.hasAnswerBox && <p>🤖 <strong>AI概览：</strong> 已获取Google AI概览</p>}
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">显示详细调试信息</summary>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}

            {/* AI 概览 */}
            {aiOverview && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    AI 概览摘要
                  </CardTitle>
                  <CardDescription>
                    Google搜索提供的AI概览信息，包含对搜索主题的全面分析
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                      {aiOverview}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    搜索结果 ({searchResults.length} 个)
                  </CardTitle>
                  <CardDescription>
                    以下是经过筛选的高质量博客和新闻文章（已排除产品页面、视频、图片等），点击可查看原文
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">
                              {result.title}
                            </h3>
                            <p className="text-gray-600 text-sm mb-3">
                              {result.description}
                            </p>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">{result.source}</Badge>
                              {result.date && (
                                <span className="text-xs text-gray-500">{result.date}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(result.link, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 被排除的结果 */}
            {excludedResults.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowExcluded(!showExcluded)}>
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    被筛选排除的结果 
                    {debugInfo?.hasMoreExcluded ? 
                      <span>（显示 {excludedResults.length} 个，共 {debugInfo.totalExcluded} 个）</span> : 
                      <span>（{excludedResults.length} 个）</span>
                    }
                    {showExcluded ? 
                      <ChevronUp className="w-4 h-4 ml-auto" /> : 
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    }
                  </CardTitle>
                  <CardDescription>
                    查看被筛选系统排除的搜索结果及排除原因，帮助您了解筛选规则
                    {debugInfo?.hasMoreExcluded && (
                      <span className="text-orange-600 font-medium">
                        {" "}（为避免页面过长，只显示前 {debugInfo.excludedLimit} 个排除结果）
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                {showExcluded && (
                  <CardContent>
                    <div className="space-y-4">
                      {excludedResults.map((result, index) => (
                        <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">
                                {result.title}
                              </h3>
                              <p className="text-gray-600 text-sm mb-3">
                                {result.description}
                              </p>
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="secondary">{result.source}</Badge>
                                <Badge variant="outline" className="text-orange-700 border-orange-300">
                                  {result.type === 'organic' ? '有机搜索' : '新闻结果'}
                                </Badge>
                                {result.date && (
                                  <span className="text-xs text-gray-500">{result.date}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-orange-700">排除原因：</span>
                                <Badge variant="destructive" className="text-xs">
                                  {result.excludeReason}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(result.link, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* 如果有更多被排除的结果，显示提示 */}
                      {debugInfo?.hasMoreExcluded && (
                        <div className="border border-orange-300 rounded-lg p-4 bg-orange-100 text-center">
                          <div className="text-orange-700 font-medium">
                            还有 {debugInfo.totalExcluded - excludedResults.length} 个结果被排除
                          </div>
                          <div className="text-xs text-orange-600 mt-1">
                            如需查看全部排除结果，可以调整搜索关键词或联系技术支持
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </TabsContent>

          {/* 知识库页面 */}
          <TabsContent value="knowledge">
            <div className="space-y-6">
              {/* 站点地图导入 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    站点地图导入
                  </CardTitle>
                  <CardDescription>
                    输入网站的站点地图URL，自动抓取网站内容到知识库
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="sitemap-url">站点地图URL</Label>
                      <Input
                        id="sitemap-url"
                        placeholder="https://example.com/sitemap.xml"
                        value={sitemapUrl}
                        onChange={(e) => setSitemapUrl(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="max-pages">最大页面数</Label>
                        <Input
                          id="max-pages"
                          type="number"
                          placeholder="10"
                          value={maxPages}
                          onChange={(e) => setMaxPages(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="include-paths">包含路径</Label>
                        <Input
                          id="include-paths"
                          placeholder="/blog,/news"
                          value={includePaths}
                          onChange={(e) => setIncludePaths(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="exclude-paths">排除路径</Label>
                        <Input
                          id="exclude-paths"
                          placeholder="/admin,/login"
                          value={excludePaths}
                          onChange={(e) => setExcludePaths(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSitemapImport} 
                    disabled={!sitemapUrl.trim() || isImportingSitemap}
                    className="w-full"
                  >
                    {isImportingSitemap ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        导入站点地图
                      </>
                    )}
                  </Button>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>💡 提示：</p>
                    <p>• 输入网站的sitemap.xml URL，如 https://example.com/sitemap.xml</p>
                    <p>• 包含路径：只抓取包含这些路径的页面，用逗号分隔</p>
                    <p>• 排除路径：排除包含这些路径的页面，用逗号分隔</p>
                    <p>• 系统会自动提取页面的主要内容并保存到知识库</p>
                  </div>
                </CardContent>
              </Card>

              {/* 文件上传区域 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    文件上传
                  </CardTitle>
                  <CardDescription>
                    支持上传PDF、Word、Excel、TXT等多种格式文件，AI生成时会自动调用知识库中的相关内容
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Upload className="w-12 h-12 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">拖拽文件到此处或点击上传</p>
                        <p className="text-sm text-gray-500 mt-2">
                          支持 PDF、DOC、DOCX、XLS、XLSX、TXT、MD 等格式
                        </p>
                      </div>
                      <div className="flex justify-center gap-4">
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('file-upload')?.click()}
                          disabled={isUploadingFiles}
                        >
                          {isUploadingFiles ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              上传中...
                            </>
                          ) : (
                            <>
                              <File className="w-4 h-4 mr-2" />
                              选择文件
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('folder-upload')?.click()}
                          disabled={isUploadingFiles}
                        >
                          <Folder className="w-4 h-4 mr-2" />
                          选择文件夹
                        </Button>
                      </div>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <input
                      id="folder-upload"
                      type="file"
                      multiple
                      {...({ webkitdirectory: "" } as any)}
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 知识库搜索 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    知识库搜索
                  </CardTitle>
                  <CardDescription>
                    搜索已上传的文件内容，测试知识库检索效果
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入关键词搜索知识库..."
                      value={knowledgeSearch}
                      onChange={(e) => setKnowledgeSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchKnowledge(knowledgeSearch)}
                    />
                    <Button
                      onClick={() => searchKnowledge(knowledgeSearch)}
                      disabled={isSearchingKnowledge || !knowledgeSearch.trim()}
                    >
                      {isSearchingKnowledge ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {knowledgeSearchResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">搜索结果 ({knowledgeSearchResults.length} 个)</h4>
                      {knowledgeSearchResults.map((file) => (
                        <div key={file.id} className="border rounded-lg p-3 bg-blue-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{getFileIcon(file.type)} {file.name}</h5>
                              <p className="text-xs text-gray-600 mt-1">
                                {file.content.substring(0, 200)}...
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {formatFileSize(file.size)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 文件列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      知识库文件 ({knowledgeFiles.length} 个)
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadKnowledgeFiles}
                    >
                      刷新
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    管理已上传的知识库文件
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {knowledgeFiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>暂无文件，请先上传文件到知识库</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {knowledgeFiles.map((file) => (
                        <div key={file.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{getFileIcon(file.type)}</span>
                                <h4 className="font-medium">{file.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>大小: {formatFileSize(file.size)}</span>
                                <span>上传时间: {new Date(file.uploadTime).toLocaleString('zh-CN')}</span>
                              </div>
                              {expandedFile === file.id && (
                                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                      内容长度: {file.content.length} 字符
                                    </span>
                                    {file.content.length > 3000 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowFullContent(prev => ({
                                          ...prev,
                                          [file.id]: !prev[file.id]
                                        }))}
                                      >
                                        {showFullContent[file.id] ? '显示摘要' : '显示全部'}
                                      </Button>
                                    )}
                                  </div>
                                  <pre className="whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                                    {showFullContent[file.id] || file.content.length <= 3000
                                      ? file.content
                                      : file.content.substring(0, 3000) + '\n\n... 内容已截断，点击"显示全部"查看完整内容'
                                    }
                                  </pre>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                              >
                                <Eye className="w-4 h-4" />
                                {expandedFile === file.id ? '收起' : '查看'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteKnowledgeFile(file.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 大纲生成页面 */}
          <TabsContent value="outline">
            <div className="space-y-6">
              {/* AI模型配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>AI模型配置</CardTitle>
                  <CardDescription>
                    配置大纲生成的AI模型和提示词
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="aihubmix-key">AI Hub Mix API Key</Label>
                    <Input
                      id="aihubmix-key"
                      type="password"
                      placeholder="输入你的 AI Hub Mix API Key"
                      value={aiHubMixApiKey}
                      onChange={(e) => setAiHubMixApiKey(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="outline-model">大纲生成模型</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveModelToHistory('outline', outlineModel)}
                          disabled={!outlineModel.trim()}
                        >
                          保存模型
                        </Button>
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowOutlineModelHistory(!showOutlineModelHistory)}
                          >
                            历史模型
                          </Button>
                          {showOutlineModelHistory && (
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                              {outlineModelHistory.length === 0 ? (
                                <p className="text-gray-500 text-sm p-3">暂无历史记录</p>
                              ) : (
                                outlineModelHistory.map((model, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => selectModel('outline', model)}
                                  >
                                    <span className="text-sm">{model}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-1"
                                    >
                                      选择
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Input
                      id="outline-model"
                      placeholder="例如：gpt-4, claude-3-sonnet, gemini-pro"
                      value={outlineModel}
                      onChange={(e) => setOutlineModel(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="outline-prompt">大纲生成提示词</Label>
                      <div className="flex gap-2">
                        <Dialog open={showOutlineSaveDialog} onOpenChange={setShowOutlineSaveDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!outlinePrompt.trim()}
                            >
                              <History className="w-4 h-4 mr-1" />
                              保存到历史
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>保存大纲提示词</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="outline-save-name">保存名称</Label>
                                <Input
                                  id="outline-save-name"
                                  placeholder="输入自定义名称..."
                                  value={outlineSaveName}
                                  onChange={(e) => setOutlineSaveName(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && savePromptWithCustomName('outline')}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setOutlineSaveName('')
                                    setShowOutlineSaveDialog(false)
                                  }}
                                >
                                  取消
                                </Button>
                                <Button onClick={() => savePromptWithCustomName('outline')}>
                                  保存
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={showOutlineHistory} onOpenChange={setShowOutlineHistory}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <History className="w-4 h-4 mr-1" />
                              历史记录
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>大纲提示词历史记录</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {outlinePromptHistory.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">暂无历史记录</p>
                              ) : (
                                outlinePromptHistory.map((history) => (
                                  <div key={history.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium">{history.title}</h4>
                                      <div className="flex gap-2">
                                        <span className="text-sm text-gray-500">{history.createdAt}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => loadPromptFromHistory('outline', history.content)}
                                        >
                                          使用
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => deletePromptHistory('outline', history.id)}
                                        >
                                          删除
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                                      <pre className="whitespace-pre-wrap font-sans">
                                        {history.content}
                                      </pre>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={showOutlinePromptDialog} onOpenChange={setShowOutlinePromptDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Maximize2 className="w-4 h-4 mr-1" />
                              放大查看
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>大纲生成提示词</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                rows={20}
                                className="resize-none min-h-[500px] w-full"
                                value={outlinePrompt}
                                onChange={(e) => setOutlinePrompt(e.target.value)}
                              />
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => setShowOutlinePromptDialog(false)}
                                >
                                  保存并关闭
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <Textarea
                      id="outline-prompt"
                      rows={6}
                      className="resize-none min-h-[150px] max-h-[150px]"
                      value={outlinePrompt}
                      onChange={(e) => setOutlinePrompt(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 知识库文件选择 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    知识库文件选择
                  </CardTitle>
                  <CardDescription>
                    选择要在大纲生成中使用的知识库文件（可选）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      已选择 {selectedKnowledgeFiles.length} 个文件
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKnowledgeFiles([])}
                        disabled={selectedKnowledgeFiles.length === 0}
                      >
                        清空选择
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKnowledgeFiles(knowledgeFiles.map(f => f.id))}
                        disabled={knowledgeFiles.length === 0}
                      >
                        全选
                      </Button>
                    </div>
                  </div>
                  
                  {knowledgeFiles.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>暂无知识库文件</p>
                      <p className="text-sm">请先在"知识库"页面上传文件</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {knowledgeFiles.map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`knowledge-${file.id}`}
                            checked={selectedKnowledgeFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedKnowledgeFiles(prev => [...prev, file.id])
                              } else {
                                setSelectedKnowledgeFiles(prev => prev.filter(id => id !== file.id))
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`knowledge-${file.id}`} className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <span>{getFileIcon(file.type)}</span>
                              <span className="font-medium">{file.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {formatFileSize(file.size)}
                              </Badge>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
                    💡 提示：选择相关的知识库文件可以让AI生成更准确、更专业的大纲。如果不选择，将自动搜索相关内容。
                  </div>
                </CardContent>
              </Card>

              {/* 大纲生成 */}
              <Card>
                <CardHeader>
                  <CardTitle>AI 大纲生成</CardTitle>
                  <CardDescription>
                    基于抓取的内容和选中的知识库文件，生成结构化的文章大纲
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button 
                      onClick={handleGenerateOutline} 
                      disabled={isGeneratingOutline || (searchResults.length === 0 && !aiOverview) || !aiHubMixApiKey.trim() || !outlineModel.trim()}
                      className="w-full"
                    >
                      {isGeneratingOutline ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          生成文章大纲
                        </>
                      )}
                    </Button>
                    
                    {knowledgeFiles.length > 0 && (
                      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                        <Database className="w-4 h-4" />
                        <span>将自动调用知识库 ({knowledgeFiles.length} 个文件)</span>
                      </div>
                    )}
                  </div>

                  {outline && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">生成的大纲</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(outline)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          复制
                        </Button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded border">
                        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{outline}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 文章生成页面 */}
          <TabsContent value="content">
            <div className="space-y-6">
              {/* AI模型配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>AI模型配置</CardTitle>
                  <CardDescription>
                    配置文章生成的AI模型和提示词
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="content-model">文章生成模型</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveModelToHistory('content', contentModel)}
                          disabled={!contentModel.trim()}
                        >
                          保存模型
                        </Button>
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowContentModelHistory(!showContentModelHistory)}
                          >
                            历史模型
                          </Button>
                          {showContentModelHistory && (
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                              {contentModelHistory.length === 0 ? (
                                <p className="text-gray-500 text-sm p-3">暂无历史记录</p>
                              ) : (
                                contentModelHistory.map((model, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => selectModel('content', model)}
                                  >
                                    <span className="text-sm">{model}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-1"
                                    >
                                      选择
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Input
                      id="content-model"
                      placeholder="例如：gpt-4, claude-3-sonnet, gemini-pro"
                      value={contentModel}
                      onChange={(e) => setContentModel(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="content-prompt">文章生成提示词</Label>
                      <div className="flex gap-2">
                        <Dialog open={showContentSaveDialog} onOpenChange={setShowContentSaveDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!contentPrompt.trim()}
                            >
                              <History className="w-4 h-4 mr-1" />
                              保存到历史
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>保存文章提示词</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="content-save-name">保存名称</Label>
                                <Input
                                  id="content-save-name"
                                  placeholder="输入自定义名称..."
                                  value={contentSaveName}
                                  onChange={(e) => setContentSaveName(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && savePromptWithCustomName('content')}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setContentSaveName('')
                                    setShowContentSaveDialog(false)
                                  }}
                                >
                                  取消
                                </Button>
                                <Button onClick={() => savePromptWithCustomName('content')}>
                                  保存
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={showContentHistory} onOpenChange={setShowContentHistory}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <History className="w-4 h-4 mr-1" />
                              历史记录
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>文章提示词历史记录</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {contentPromptHistory.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">暂无历史记录</p>
                              ) : (
                                contentPromptHistory.map((history) => (
                                  <div key={history.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium">{history.title}</h4>
                                      <div className="flex gap-2">
                                        <span className="text-sm text-gray-500">{history.createdAt}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => loadPromptFromHistory('content', history.content)}
                                        >
                                          使用
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => deletePromptHistory('content', history.id)}
                                        >
                                          删除
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                                      <pre className="whitespace-pre-wrap font-sans">
                                        {history.content}
                                      </pre>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={showContentPromptDialog} onOpenChange={setShowContentPromptDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Maximize2 className="w-4 h-4 mr-1" />
                              放大查看
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>文章生成提示词</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                rows={20}
                                className="resize-none min-h-[500px] w-full"
                                value={contentPrompt}
                                onChange={(e) => setContentPrompt(e.target.value)}
                              />
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => setShowContentPromptDialog(false)}
                                >
                                  保存并关闭
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <Textarea
                      id="content-prompt"
                      rows={6}
                      className="resize-none min-h-[150px] max-h-[150px]"
                      value={contentPrompt}
                      onChange={(e) => setContentPrompt(e.target.value)}
                    />
                  </div>

                  {/* WordPress配置 */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">WordPress 配置</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveWpConfig}
                      >
                        保存配置
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="wp-site-url">WordPress 站点URL</Label>
                        <Input
                          id="wp-site-url"
                          placeholder="https://yoursite.com"
                          value={wpSiteUrl}
                          onChange={(e) => setWpSiteUrl(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="wp-username">用户名</Label>
                          <Input
                            id="wp-username"
                            placeholder="WordPress用户名"
                            value={wpUsername}
                            onChange={(e) => setWpUsername(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="wp-password">应用密码</Label>
                          <Input
                            id="wp-password"
                            type="password"
                            placeholder="WordPress应用密码"
                            value={wpPassword}
                            onChange={(e) => setWpPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 知识库文件选择 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    知识库文件选择（文章生成）
                  </CardTitle>
                  <CardDescription>
                    选择要在文章生成中使用的知识库文件（可选）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      已选择 {selectedKnowledgeFiles.length} 个文件
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKnowledgeFiles([])}
                        disabled={selectedKnowledgeFiles.length === 0}
                      >
                        清空选择
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKnowledgeFiles(knowledgeFiles.map(f => f.id))}
                        disabled={knowledgeFiles.length === 0}
                      >
                        全选
                      </Button>
                    </div>
                  </div>
                  
                  {knowledgeFiles.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>暂无知识库文件</p>
                      <p className="text-sm">请先在"知识库"页面上传文件</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {knowledgeFiles.map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`content-knowledge-${file.id}`}
                            checked={selectedKnowledgeFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedKnowledgeFiles(prev => [...prev, file.id])
                              } else {
                                setSelectedKnowledgeFiles(prev => prev.filter(id => id !== file.id))
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`content-knowledge-${file.id}`} className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <span>{getFileIcon(file.type)}</span>
                              <span className="font-medium">{file.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {formatFileSize(file.size)}
                              </Badge>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
                    💡 提示：选择相关的知识库文件可以让AI生成更准确、更专业的文章内容。如果不选择，将自动搜索相关内容。
                  </div>
                </CardContent>
              </Card>

              {/* 文章生成 */}
              <Card>
                <CardHeader>
                  <CardTitle>AI 文章生成</CardTitle>
                  <CardDescription>
                    基于大纲、参考内容和选中的知识库文件，生成完整的文章内容
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button 
                      onClick={handleGenerateContent} 
                      disabled={isGeneratingContent || !outline.trim() || !aiHubMixApiKey.trim() || !contentModel.trim()}
                      className="w-full"
                    >
                      {isGeneratingContent ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          生成完整文章
                        </>
                      )}
                    </Button>
                    
                    {knowledgeFiles.length > 0 && (
                      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                        <Database className="w-4 h-4" />
                        <span>将自动调用知识库 ({knowledgeFiles.length} 个文件)</span>
                      </div>
                    )}
                  </div>

                  {finalContent && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">生成的文章</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={translateToChinese}
                            disabled={isTranslating || !finalContent.trim()}
                          >
                            {isTranslating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                翻译中...
                              </>
                            ) : (
                              '翻译中文'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={uploadToWordPress}
                            disabled={isUploadingToWP || !finalContent.trim()}
                          >
                            {isUploadingToWP ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                上传中...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                导入WordPress
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(finalContent)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            复制
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{finalContent}</pre>
                      </div>
                    </div>
                  )}

                  {translatedContent && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">中文翻译</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(translatedContent)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          复制翻译
                        </Button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{translatedContent}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
