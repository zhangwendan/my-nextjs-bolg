import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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
      debug: {
        searchTerms,
        totalFiles: jsonFiles.length,
        matchedFiles: searchResults.length
      }
    })

  } catch (error) {
    console.error('❌ 知识库搜索错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '搜索失败'
      },
      { status: 500 }
    )
  }
}

// 计算匹配分数（修复中文支持）
function calculateMatchScore(fileInfo: any, searchTerms: string[]): number {
  let score = 0
  const fileName = fileInfo.name.toLowerCase()
  const content = fileInfo.content.toLowerCase()

  console.log(`🔍 正在计算匹配分数 - 文件: ${fileName}`)
  console.log(`📄 内容预览: ${content.substring(0, 200)}...`)

  for (const term of searchTerms) {
    console.log(`🔤 搜索词条: "${term}"`)
    
    // 文件名匹配权重更高
    const nameMatches = (fileName.match(new RegExp(escapeRegExp(term), 'g')) || []).length
    score += nameMatches * 3
    console.log(`📛 文件名匹配: ${nameMatches} 次，得分: ${nameMatches * 3}`)

    // 内容匹配 - 使用简单的字符串包含匹配
    const contentMatches = (content.match(new RegExp(escapeRegExp(term), 'g')) || []).length
    score += contentMatches
    console.log(`📄 内容正则匹配: ${contentMatches} 次，得分: ${contentMatches}`)

    // 简单的包含匹配（适用于中文）
    if (content.includes(term)) {
      score += 2 // 额外奖励分数
      console.log(`🎯 内容包含匹配: +2 分`)
      
      // 显示匹配位置的上下文
      const index = content.indexOf(term)
      const context = content.substring(Math.max(0, index - 20), Math.min(content.length, index + term.length + 20))
      console.log(`📍 匹配上下文: "${context}"`)
    } else {
      console.log(`❌ 内容不包含词条: "${term}"`)
    }

    // 特殊调试：对于"设备"这个词，显示更多信息
    if (term === '设备') {
      console.log(`🔧 特殊调试 - 搜索"设备":`);
      console.log(`   - 原始搜索词: "${term}"`);
      console.log(`   - 搜索词长度: ${term.length}`);
      console.log(`   - 内容是否包含: ${content.includes(term)}`);
      console.log(`   - 内容长度: ${content.length}`);
      
      // 查找所有"设备"出现的位置
      const positions = [];
      let pos = content.indexOf(term);
      while (pos !== -1) {
        positions.push(pos);
        pos = content.indexOf(term, pos + 1);
      }
      console.log(`   - 出现位置: ${positions}`);
      console.log(`   - 出现次数: ${positions.length}`);
      
      if (positions.length > 0) {
        console.log(`   - 第一个匹配上下文: "${content.substring(Math.max(0, positions[0] - 10), Math.min(content.length, positions[0] + 20))}"`);
      }
    }
  }

  console.log(`📊 最终分数: ${score}`)
  return score
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 提取相关片段
function extractRelevantSnippet(content: string, searchTerms: string[], maxLength: number = 300): string {
  const lowerContent = content.toLowerCase()
  
  // 找到第一个匹配的位置
  let firstMatchIndex = -1
  for (const term of searchTerms) {
    const index = lowerContent.indexOf(term)
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index
    }
  }

  if (firstMatchIndex === -1) {
    // 如果没有找到匹配，返回开头部分
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '')
  }

  // 在匹配位置前后提取内容
  const start = Math.max(0, firstMatchIndex - 100)
  const end = Math.min(content.length, firstMatchIndex + maxLength - 100)
  
  let snippet = content.substring(start, end)
  
  // 添加省略号
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'
  
  return snippet
} 