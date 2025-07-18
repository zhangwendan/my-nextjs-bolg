import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    console.log('🔍 开始知识库搜索，关键词:', query)

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, message: '搜索关键词不能为空' },
        { status: 400 }
      )
    }

    // 检查是否在Vercel环境中
    if (process.env.VERCEL) {
      console.log('❌ 在Vercel环境中，知识库功能不可用')
      return NextResponse.json({
        success: true,
        results: [],
        query,
        message: '知识库功能在Vercel环境中暂不可用，请在本地环境使用'
      })
    }

    // 只在本地环境中导入fs模块
    const { readdir, readFile } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')

    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    console.log('📁 搜索目录:', knowledgeDir)
    
    // 检查知识库目录是否存在
    if (!existsSync(knowledgeDir)) {
      console.log('❌ 知识库目录不存在')
      return NextResponse.json({
        success: true,
        results: [],
        query
      })
    }

    // 读取所有文件
    const files = await readdir(knowledgeDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    console.log('📄 找到JSON文件数量:', jsonFiles.length, '文件名:', jsonFiles)

    const searchResults = []
    const searchTerms = query.toLowerCase().split(/\s+/).filter((term: string) => term.length > 0)
    console.log('🔤 搜索词条:', searchTerms)

    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(knowledgeDir, jsonFile)
        const fileContent = await readFile(filePath, 'utf-8')
        const fileInfo = JSON.parse(fileContent)
        
        console.log(`📋 处理文件: ${jsonFile}, 文件名: ${fileInfo.name}, 内容长度: ${fileInfo.content?.length || 0}`)
        
        // 验证文件信息结构
        if (!fileInfo.id || !fileInfo.name || fileInfo.content === undefined) {
          console.log('⚠️ 跳过无效文件:', jsonFile)
          continue
        }

        // 计算匹配分数
        const score = calculateMatchScore(fileInfo, searchTerms)
        console.log(`📊 文件 ${fileInfo.name} 匹配分数: ${score}`)
        
        if (score > 0) {
          searchResults.push({
            ...fileInfo,
            matchScore: score,
            // 截取相关片段
            relevantSnippet: extractRelevantSnippet(fileInfo.content, searchTerms)
          })
        }

      } catch (error) {
        console.error(`❌ 处理搜索文件失败 ${jsonFile}:`, error)
        // 跳过损坏的文件
      }
    }

    // 按匹配分数降序排列
    searchResults.sort((a, b) => b.matchScore - a.matchScore)

    // 限制返回结果数量
    const limitedResults = searchResults.slice(0, 20)

    console.log(`✅ 搜索完成，找到 ${limitedResults.length} 个匹配结果`)

    return NextResponse.json({
      success: true,
      results: limitedResults,
      totalCount: searchResults.length,
      query,
    })

  } catch (error) {
    console.error('知识库搜索错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '搜索失败，请检查网络连接'
      },
      { status: 500 }
    )
  }
}

// 计算匹配分数
function calculateMatchScore(fileInfo: any, searchTerms: string[]): number {
  let score = 0
  const fileName = fileInfo.name.toLowerCase()
  const fileContent = fileInfo.content.toLowerCase()

  console.log(`🔍 正在计算匹配分数 - 文件: ${fileInfo.name}`)
  console.log(`📄 内容预览: ${fileInfo.content.substring(0, 200)}...`)

  for (const term of searchTerms) {
    console.log(`🔤 搜索词条: "${term}"`)
    
    // 文件名匹配（权重更高）
    const fileNameMatches = (fileName.match(new RegExp(term, 'g')) || []).length
    console.log(`📛 文件名匹配: ${fileNameMatches} 次，得分: ${fileNameMatches * 10}`)
    score += fileNameMatches * 10

    // 内容匹配
    const contentMatches = (fileContent.match(new RegExp(term, 'g')) || []).length
    console.log(`📄 内容正则匹配: ${contentMatches} 次，得分: ${contentMatches}`)
    score += contentMatches

    // 额外加分：如果内容包含完整词条
    if (fileContent.includes(term)) {
      console.log(`🎯 内容包含匹配: +2 分`)
      score += 2
      
      // 显示匹配上下文
      const index = fileContent.indexOf(term)
      const start = Math.max(0, index - 20)
      const end = Math.min(fileContent.length, index + 20)
      const context = fileContent.substring(start, end)
      console.log(`📍 匹配上下文: "${context}"`)
    } else {
      console.log(`❌ 内容不包含词条: "${term}"`)
    }
  }

  console.log(`📊 最终分数: ${score}`)
  return score
}

// 提取相关片段
function extractRelevantSnippet(content: string, searchTerms: string[]): string {
  const maxSnippetLength = 200
  let bestSnippet = ''
  let maxMatches = 0

  // 将内容分段
  const segments = content.split(/[.!?。！？]/)

  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase()
    let matches = 0

    // 计算该段落中包含的搜索词条数量
    for (const term of searchTerms) {
      if (lowerSegment.includes(term)) {
        matches++
      }
    }

    // 如果这个段落匹配更多词条，就选择它
    if (matches > maxMatches) {
      maxMatches = matches
      bestSnippet = segment.trim()
    }
  }

  // 如果没找到特别相关的段落，返回开头
  if (!bestSnippet) {
    bestSnippet = content.substring(0, maxSnippetLength)
  }

  // 确保片段不超过最大长度
  if (bestSnippet.length > maxSnippetLength) {
    bestSnippet = bestSnippet.substring(0, maxSnippetLength) + '...'
  }

  return bestSnippet
} 