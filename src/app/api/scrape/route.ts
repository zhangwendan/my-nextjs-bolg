import { NextRequest, NextResponse } from 'next/server'

// 判断是否为有效的新闻或博客类型的URL（与搜索API保持一致）
function isValidContentUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  
  // 排除不想要的URL类型
  const excludePatterns = [
    'youtube.com', 'youtu.be', 'vimeo.com', 'bilibili.com', // 视频网站
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', // 图片文件
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // 文档文件
    '/product/', '/products/', '/shop/', '/store/', '/buy/', '/purchase/', // 产品页面
    '/category/', '/categories/', '/tag/', '/tags/', // 分类页面
    '/user/', '/profile/', '/account/', '/login/', '/register/', // 用户页面
    'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', // 社交媒体
    '/api/', '/admin/', '/wp-admin/', // API和管理页面
  ]
  
  // 检查是否包含排除的模式
  for (const pattern of excludePatterns) {
    if (lowerUrl.includes(pattern)) {
      return false
    }
  }
  
  // 检查URL路径是否包含博客相关的关键词
  const blogKeywords = [
    '/blog/', '/news/', '/article/', '/post/', '/posts/', 
    '/insights/', '/knowledgebase/', '/resources/', '/stories/',
    '/updates/', '/press/', '/media/', '/editorial/', '/content/',
    '/tips/', '/guides/', '/tutorials/', '/case-studies/', '/research/'
  ]
  
  // 检查URL结尾是否符合博客模式
  const blogEndings = [
    '/blog', '/news', '/article', '/post', '/posts', 
    '/insights', '/knowledgebase', '/resources'
  ]
  
  // 检查是否包含博客关键词或以博客结尾
  const hasBlogKeyword = blogKeywords.some(keyword => lowerUrl.includes(keyword))
  const hasBlogEnding = blogEndings.some(ending => lowerUrl.endsWith(ending))
  
  // 检查域名是否为知名的新闻/博客网站
  const newsDomains = [
    'bbc.com', 'cnn.com', 'reuters.com', 'bloomberg.com', 'forbes.com',
    'techcrunch.com', 'wired.com', 'medium.com', 'substack.com',
    'zhihu.com', 'jianshu.com', 'csdn.net', 'cnblogs.com', 'segmentfault.com',
    'infoq.com', 'oschina.net', '36kr.com', 'pingwest.com'
  ]
  
  const isNewsDomain = newsDomains.some(domain => lowerUrl.includes(domain))
  
  return hasBlogKeyword || hasBlogEnding || isNewsDomain
}

export async function POST(request: NextRequest) {
  try {
    const { searchResults, aiOverview } = await request.json()

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json(
        { success: false, message: '搜索结果数据无效' },
        { status: 400 }
      )
    }

    const scrapedContents = []

    // 如果有AI概览，直接添加
    if (aiOverview && aiOverview.trim()) {
      scrapedContents.push({
        title: 'AI 概览摘要',
        content: aiOverview,
        source: 'Google AI Overview',
        url: 'ai-overview'
      })
    }

    // 筛选并抓取符合条件的URL
    const validUrls = searchResults.filter(result => {
      const isValid = isValidContentUrl(result.link)
      console.log(`URL验证: ${result.link} - ${isValid ? '有效' : '跳过'}`)
      return isValid
    }).slice(0, 3) // 最多抓取3个有效URL

    console.log(`从 ${searchResults.length} 个搜索结果中筛选出 ${validUrls.length} 个有效URL进行抓取`)

    for (const result of validUrls) {
      try {
        console.log(`开始抓取: ${result.link}`)
        const content = await scrapeUrlContent(result.link)
        if (content && content.length > 200) { // 确保内容有足够长度
          scrapedContents.push({
            title: result.title,
            content: content,
            source: result.source,
            url: result.link
          })
          console.log(`成功抓取: ${result.title}, 内容长度: ${content.length}`)
        } else {
          console.log(`跳过内容过短的URL: ${result.link}`)
        }
      } catch (error) {
        console.error(`抓取失败 ${result.link}:`, error)
        // 继续处理下一个URL，不因单个失败而中断
      }
    }

    console.log(`抓取完成，共获得 ${scrapedContents.length} 个有效内容`)

    return NextResponse.json({
      success: true,
      contents: scrapedContents,
      debug: {
        totalSearchResults: searchResults.length,
        validUrls: validUrls.length,
        scrapedContents: scrapedContents.length
      }
    })

  } catch (error) {
    console.error('内容抓取错误:', error)
    return NextResponse.json(
      { success: false, message: '内容抓取失败，请重试' },
      { status: 500 }
    )
  }
}

// 简化的网页内容抓取函数
async function scrapeUrlContent(url: string): Promise<string> {
  try {
    // 设置超时和用户代理
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10秒超时
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    
    // 简单的HTML内容提取（移除HTML标签）
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除script标签
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除style标签
      .replace(/<[^>]*>/g, ' ') // 移除所有HTML标签
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\n\s*\n/g, '\n') // 合并多个换行
      .trim()

    // 限制内容长度，避免过长
    return textContent.length > 5000 ? textContent.substring(0, 5000) + '...' : textContent

  } catch (error) {
    console.error(`抓取URL失败 ${url}:`, error)
    throw error
  }
} 