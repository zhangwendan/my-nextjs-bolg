import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { sitemapUrl, maxPages = 10, includePaths = '', excludePaths = '' } = await request.json()

    if (!sitemapUrl) {
      return NextResponse.json(
        { success: false, message: '请提供站点地图URL' },
        { status: 400 }
      )
    }

    console.log('🌐 开始导入站点地图:', sitemapUrl)

    // 确保知识库目录存在
    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    if (!existsSync(knowledgeDir)) {
      mkdirSync(knowledgeDir, { recursive: true })
    }

    // 获取站点地图
    const sitemapResponse = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!sitemapResponse.ok) {
      throw new Error(`无法获取站点地图: ${sitemapResponse.status}`)
    }

    const sitemapContent = await sitemapResponse.text()
    console.log('📄 站点地图获取成功，大小:', sitemapContent.length)

    // 简单的XML解析 - 提取URL
    const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g)
    let urls: string[] = []
    
    if (urlMatches) {
      urls = urlMatches.map(match => match.replace(/<\/?loc>/g, '').trim())
    }

    console.log('🔗 找到URL数量:', urls.length)

    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, message: '站点地图中没有找到有效的URL' },
        { status: 400 }
      )
    }

    // 过滤URL
    let filteredUrls = urls
    
    if (includePaths) {
      const includePatterns = includePaths.split(',').map((p: string) => p.trim()).filter(Boolean)
      filteredUrls = filteredUrls.filter(url => 
        includePatterns.some((pattern: string) => url.includes(pattern))
      )
    }

    if (excludePaths) {
      const excludePatterns = excludePaths.split(',').map((p: string) => p.trim()).filter(Boolean)
      filteredUrls = filteredUrls.filter(url => 
        !excludePatterns.some((pattern: string) => url.includes(pattern))
      )
    }

    // 限制页面数量
    const urlsToProcess = filteredUrls.slice(0, maxPages)
    console.log('📋 将要处理的URL数量:', urlsToProcess.length)

    const results = []
    const failed = []

    // 抓取每个页面的内容
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i]
      if (!url) continue
      
      console.log(`📖 正在处理 ${i + 1}/${urlsToProcess.length}: ${url}`)
      
      try {
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })

        if (!pageResponse.ok) {
          throw new Error(`HTTP ${pageResponse.status}`)
        }

        const pageContent = await pageResponse.text()

        // 简单的HTML内容提取
        let title = ''
        let content = ''
        
        // 提取标题
        const titleMatch = pageContent.match(/<title>(.*?)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim()
        }
        
        // 移除HTML标签，提取文本内容
        content = pageContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (content.length < 100) {
          throw new Error('内容太少')
        }

        // 截取合适长度的内容
        if (content.length > 5000) {
          content = content.substring(0, 5000) + '...'
        }

        // 生成文件ID
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 15)
        const fileId = `${timestamp}-${randomId}`

        // 创建文件信息
        const fileInfo = {
          id: fileId,
          name: title || `页面内容 (来自站点地图)`,
          type: 'website',
          size: content.length,
          content: content,
          uploadTime: new Date().toISOString(),
          sourceUrl: url,
          sourceSitemap: sitemapUrl
        }

        // 保存到知识库
        const metaPath = path.join(knowledgeDir, `${fileId}.json`)
        await writeFile(metaPath, JSON.stringify(fileInfo, null, 2), 'utf-8')

        results.push({
          url,
          title: title || '无标题',
          contentLength: content.length,
          fileId
        })

        console.log(`✅ 成功处理: ${title || '无标题'} (${content.length} 字符)`)

        // 延迟以避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ 处理失败 ${url}:`, error)
        failed.push({
          url,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    console.log('🎉 站点地图导入完成')
    console.log(`✅ 成功: ${results.length} 个页面`)
    console.log(`❌ 失败: ${failed.length} 个页面`)

    return NextResponse.json({
      success: true,
      message: `站点地图导入完成！成功导入 ${results.length} 个页面`,
      summary: {
        totalUrls: urls.length,
        filteredUrls: filteredUrls.length,
        processedUrls: urlsToProcess.length,
        successCount: results.length,
        failedCount: failed.length
      },
      results,
      failed: failed.slice(0, 5) // 只返回前5个失败记录
    })

  } catch (error) {
    console.error('站点地图导入错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '站点地图导入失败'
      },
      { status: 500 }
    )
  }
} 