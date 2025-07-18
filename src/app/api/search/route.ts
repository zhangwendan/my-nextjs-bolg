import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { keyword, apiKey, pageCount = 10, language = 'zh-cn', country = 'cn' } = await request.json()

    console.log('收到搜索请求:', { keyword, hasApiKey: !!apiKey, pageCount, language, country })

    if (!keyword || !apiKey) {
      return NextResponse.json(
        { success: false, message: '关键词和API密钥不能为空' },
        { status: 400 }
      )
    }

    // 调用 Serper API 进行搜索
    console.log('调用搜索 API...')
    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: keyword,
        gl: country, // 国家/地区代码
        hl: language, // 语言代码
        num: Math.min(Math.max(pageCount, 5), 70) // 限制在5-70之间
      })
    })

    console.log('搜索 API 响应状态:', searchResponse.status)

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('搜索 API 错误:', errorText)
      throw new Error(`搜索 API 错误: ${searchResponse.status} - ${errorText}`)
    }

    const searchData = await searchResponse.json()
    console.log('搜索 API 响应数据:', JSON.stringify(searchData, null, 2))
    
    // 提取搜索结果
    const results = []
    const excludedResults = [] // 收集被排除的结果
    
    // 提取有机搜索结果
    if (searchData.organic) {
      console.log('找到有机搜索结果:', searchData.organic.length)
      let filteredCount = 0
      let processedCount = 0
      
      for (const item of searchData.organic) {
        if (filteredCount >= pageCount) break
        
        processedCount++
        const filterResult = checkUrlWithReason(item.link)
        console.log(`检查 URL (${processedCount}): ${item.link}, 是新闻/博客: ${filterResult.isValid}`)
        
        // 只添加符合条件的URL
        if (filterResult.isValid) {
          results.push({
            title: item.title,
            description: item.snippet || '',
            link: item.link,
            source: extractDomain(item.link),
            date: item.date || null
          })
          filteredCount++
        } else {
          // 收集被排除的结果
          excludedResults.push({
            title: item.title,
            description: item.snippet || '',
            link: item.link,
            source: extractDomain(item.link),
            date: item.date || null,
            excludeReason: filterResult.reason,
            type: 'organic'
          })
        }
      }
      
      console.log(`有机搜索结果筛选完成: 处理了 ${processedCount} 个，筛选出 ${filteredCount} 个符合条件的`)
    }

    // 提取新闻结果
    if (searchData.news && searchData.news.length > 0) {
      console.log('找到新闻结果:', searchData.news.length)
      const newsLimit = Math.max(5, Math.floor(pageCount / 2)) // 新闻结果可以占更多比例
      let newsFilteredCount = 0
      let newsProcessedCount = 0
      
      for (const item of searchData.news) {
        if (newsFilteredCount >= newsLimit) break
        
        newsProcessedCount++
        const filterResult = checkUrlWithReason(item.link)
        console.log(`检查新闻 URL (${newsProcessedCount}): ${item.link}, 是有效新闻: ${filterResult.isValid}`)
        
        // 新闻结果通常都是有效的，但仍然进行筛选
        if (filterResult.isValid) {
          results.push({
            title: item.title,
            description: item.snippet || '',
            link: item.link,
            source: item.source || extractDomain(item.link),
            date: item.date || null
          })
          newsFilteredCount++
        } else {
          // 收集被排除的新闻结果
          excludedResults.push({
            title: item.title,
            description: item.snippet || '',
            link: item.link,
            source: item.source || extractDomain(item.link),
            date: item.date || null,
            excludeReason: filterResult.reason,
            type: 'news'
          })
        }
      }
      
      console.log(`新闻结果筛选完成: 处理了 ${newsProcessedCount} 个，筛选出 ${newsFilteredCount} 个符合条件的`)
    }

    // 提取AI概览（如果有的话）
    let aiOverview = ''
    if (searchData.answerBox) {
      aiOverview = searchData.answerBox.answer || searchData.answerBox.snippet || ''
      console.log('找到 Answer Box:', aiOverview.substring(0, 100) + '...')
    } else if (searchData.knowledgeGraph) {
      aiOverview = searchData.knowledgeGraph.description || ''
      console.log('找到 Knowledge Graph:', aiOverview.substring(0, 100) + '...')
    }

    const finalResults = results.slice(0, pageCount) // 按配置的数量返回结果
    console.log('最终返回结果数量:', finalResults.length)

    // 计算筛选统计
    const totalSourceResults = (searchData.organic?.length || 0) + (searchData.news?.length || 0)
    const filteredResults = results.length
    const filteredOutCount = totalSourceResults - filteredResults

    // 设置返回的排除结果数量限制
    const maxExcludedToShow = 50
    const limitedExcludedResults = excludedResults.slice(0, maxExcludedToShow)

    return NextResponse.json({
      success: true,
      results: finalResults,
      excludedResults: limitedExcludedResults,
      aiOverview,
      debug: {
        totalOrganic: searchData.organic?.length || 0,
        totalNews: searchData.news?.length || 0,
        totalSourceResults,
        filteredResults,
        filteredOutCount,
        finalResultCount: finalResults.length,
        totalExcluded: excludedResults.length,
        excludedShown: limitedExcludedResults.length,
        excludedLimit: maxExcludedToShow,
        hasMoreExcluded: excludedResults.length > maxExcludedToShow,
        hasAnswerBox: !!searchData.answerBox,
        hasKnowledgeGraph: !!searchData.knowledgeGraph,
        requestedCount: pageCount,
        language,
        country,
        filteringEnabled: true
      }
    })

  } catch (error) {
    console.error('搜索错误详情:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '搜索失败，请检查API密钥或网络连接',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 检查URL是否有效，返回验证结果和排除原因
function checkUrlWithReason(url: string): { isValid: boolean; reason?: string } {
  const lowerUrl = url.toLowerCase()
  
  // 排除不想要的URL类型
  const excludePatterns = [
    // 视频网站
    { patterns: ['youtube.com', 'youtu.be', 'vimeo.com', 'bilibili.com', 'tiktok.com', 'douyin.com'], reason: '视频网站' },
    { patterns: ['video.', 'watch.', 'tv.', 'live.', 'stream.'], reason: '视频相关页面' },
    
    // 图片文件
    { patterns: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp'], reason: '图片文件' },
    
    // 文档文件
    { patterns: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'], reason: '文档文件' },
    
    // 产品页面和电商
    { patterns: ['/product/', '/products/', '/shop/', '/store/', '/buy/', '/purchase/', '/cart/', '/checkout/', '/order/', '/orders/', '/payment/', '/shipping/', '/catalog/'], reason: '产品/购物页面' },
    { patterns: ['amazon.', 'taobao.', 'tmall.', '1688.', 'alibaba.', 'jd.', 'pinduoduo.'], reason: '电商平台' },
    
    // 分类和标签页面
    { patterns: ['/category/', '/categories/', '/tag/', '/tags/', '/filter/', '/search/'], reason: '分类/标签页面' },
    
    // 用户和账户页面
    { patterns: ['/user/', '/profile/', '/account/', '/login/', '/register/', '/signup/', '/auth/'], reason: '用户/账户页面' },
    
    // 社交媒体
    { patterns: ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'weibo.', 'zhihu.com/people/', 'reddit.com/user/', 'github.com/users/'], reason: '社交媒体' },
    
    // API和技术页面
    { patterns: ['/api/', '/admin/', '/wp-admin/', '/dashboard/', '/manage/', '/control/'], reason: 'API/管理页面' },
    
    // 论坛帖子（非文章）
    { patterns: ['/thread/', '/topic/', '/discussion/', '/comment/', '/reply/'], reason: '论坛帖子' },
    
    // 其他排除
    { patterns: ['/download/', '/upload/', '/file/', '/image/', '/img/', '/static/'], reason: '静态文件页面' },
    { patterns: ['maps.google.', 'translate.google.', 'play.google.', 'apps.apple.'], reason: '工具应用页面' },
  ]
  
  // 检查是否包含排除的模式
  for (const group of excludePatterns) {
    for (const pattern of group.patterns) {
      if (lowerUrl.includes(pattern)) {
        return { isValid: false, reason: group.reason }
      }
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
  
  const isValid = hasBlogKeyword || hasBlogEnding || isNewsDomain
  
  if (!isValid) {
    return { isValid: false, reason: '非新闻/博客内容' }
  }
  
  return { isValid: true }
}

// 提取域名
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace('www.', '')
  } catch {
    return '未知来源'
  }
} 