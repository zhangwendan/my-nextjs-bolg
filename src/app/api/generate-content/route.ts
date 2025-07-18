import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { keyword, outline, searchResults, aiOverview, aiHubMixApiKey, model, prompt, selectedKnowledgeFiles } = await request.json()

    if (!keyword || !outline) {
      return NextResponse.json(
        { success: false, message: '缺少必要的数据：关键词和大纲' },
        { status: 400 }
      )
    }

    if (!aiHubMixApiKey || !model || !prompt) {
      return NextResponse.json(
        { success: false, message: '缺少AI配置：API Key、模型或提示词' },
        { status: 400 }
      )
    }

    // 获取知识库内容
    let knowledgeContent = ''
    try {
      if (selectedKnowledgeFiles && selectedKnowledgeFiles.length > 0) {
        // 使用指定的知识库文件
        console.log('使用指定的知识库文件:', selectedKnowledgeFiles)
        knowledgeContent = await getSelectedKnowledgeContent(selectedKnowledgeFiles)
      } else {
        // 自动搜索相关知识库内容
        console.log('自动搜索知识库内容:', keyword)
        const knowledgeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/knowledge/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: keyword })
        })
        
        if (knowledgeResponse.ok) {
          const knowledgeData = await knowledgeResponse.json()
          if (knowledgeData.success && knowledgeData.results?.length > 0) {
            knowledgeContent = '\n知识库相关内容：\n'
            knowledgeData.results.slice(0, 5).forEach((file: any, index: number) => {
              knowledgeContent += `${index + 1}. ${file.name}\n内容：${file.content.substring(0, 800)}...\n\n`
            })
          }
        }
      }
    } catch (error) {
      console.error('获取知识库内容失败:', error)
      // 继续生成，不因为知识库获取失败而中断
    }

    // 准备参考内容
    let referenceContent = ''
    
    if (aiOverview) {
      referenceContent += `AI 概览：\n${aiOverview}\n\n`
    }
    
    if (searchResults?.length > 0) {
      referenceContent += '搜索结果参考：\n'
      searchResults.forEach((result: any, index: number) => {
        referenceContent += `${index + 1}. ${result.title} (${result.source})\n描述：${result.description}\n链接：${result.link}\n\n`
      })
    }

    // 添加知识库内容
    if (knowledgeContent) {
      referenceContent += knowledgeContent
    }

    // 构建完整提示词
    const fullPrompt = `${prompt}\n\n关键词：${keyword}\n\n文章大纲：\n${outline}\n\n参考内容：\n${referenceContent}`

    console.log('调用 AIHubMix API 生成文章...')
    console.log('使用模型:', model)

    // 调用 AIHubMix API
    const aiResponse = await fetch('https://api.aihubmix.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiHubMixApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('AIHubMix API 错误:', errorText)
      throw new Error(`AIHubMix API 错误: ${aiResponse.status} - ${errorText}`)
    }

    const aiData = await aiResponse.json()
    console.log('AIHubMix API 响应:', aiData)

    const content = aiData.choices?.[0]?.message?.content || aiData.response || ''

    if (!content.trim()) {
      throw new Error('AI生成的文章为空，请检查配置或重试')
    }

    // 清理生成的内容，移除开头和结尾的代码块标记
    let cleanContent = content.trim()
    
    // 移除开头的```html标记
    if (cleanContent.startsWith('```html')) {
      cleanContent = cleanContent.replace(/^```html\s*/, '')
    }
    
    // 移除结尾的```标记
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/\s*```$/, '')
    }
    
    // 移除其他常见的代码块标记
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```[a-zA-Z]*\s*/, '')
    }

    return NextResponse.json({
      success: true,
      content: cleanContent.trim()
    })

  } catch (error) {
    console.error('文章生成错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '文章生成失败，请检查配置或重试'
      },
      { status: 500 }
    )
  }
}

// 获取选中的知识库内容
async function getSelectedKnowledgeContent(selectedFiles: string[]): Promise<string> {
  // 检查是否在Vercel环境中
  if (process.env.VERCEL) {
    console.log('Vercel环境中跳过知识库文件读取')
    return ''
  }

  try {
    // 动态导入fs模块
    const { readFile } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')

    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    let content = '\n选中的知识库文件内容：\n'
    
    for (const fileId of selectedFiles) {
      try {
        const metaPath = path.join(knowledgeDir, `${fileId}.json`)
        
        if (existsSync(metaPath)) {
          const fileContent = await readFile(metaPath, 'utf-8')
          const fileInfo = JSON.parse(fileContent)
          
          content += `\n文件: ${fileInfo.name}\n`
          content += `内容: ${fileInfo.content.substring(0, 1000)}...\n\n`
        }
      } catch (error) {
        console.error(`读取知识库文件失败 ${fileId}:`, error)
      }
    }
    
    return content
  } catch (error) {
    console.error('获取知识库内容失败:', error)
    return ''
  }
} 