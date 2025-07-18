import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { keyword, searchResults, aiOverview, aiHubMixApiKey, model, prompt } = await request.json()

    if (!keyword || (!searchResults?.length && !aiOverview)) {
      return NextResponse.json(
        { success: false, message: '缺少必要的数据：关键词和搜索结果' },
        { status: 400 }
      )
    }

    if (!aiHubMixApiKey || !model || !prompt) {
      return NextResponse.json(
        { success: false, message: '缺少AI配置：API Key、模型或提示词' },
        { status: 400 }
      )
    }

    // 搜索知识库相关内容
    let knowledgeContent = ''
    try {
      const knowledgeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/knowledge/search`, {
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
            knowledgeContent += `${index + 1}. ${file.name}\n内容摘要：${file.content.substring(0, 500)}...\n\n`
          })
        }
      }
    } catch (error) {
      console.error('搜索知识库失败:', error)
      // 继续生成，不因为知识库搜索失败而中断
    }

    // 准备输入内容
    let inputContent = `关键词：${keyword}\n\n`
    
    if (aiOverview) {
      inputContent += `AI 概览：\n${aiOverview}\n\n`
    }
    
    if (searchResults?.length > 0) {
      inputContent += '搜索结果参考：\n'
      searchResults.forEach((result: any, index: number) => {
        inputContent += `${index + 1}. ${result.title}\n来源：${result.source}\n描述：${result.description}\n链接：${result.link}\n\n`
      })
    }

    // 添加知识库内容
    if (knowledgeContent) {
      inputContent += knowledgeContent
    }

    // 构建完整提示词
    const fullPrompt = `${prompt}\n\n输入信息：\n${inputContent}`

    console.log('调用 AIHubMix API 生成大纲...')
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

    const outline = aiData.choices?.[0]?.message?.content || aiData.response || ''

    if (!outline.trim()) {
      throw new Error('AI生成的大纲为空，请检查配置或重试')
    }

    // 清理生成的大纲，移除开头和结尾的代码块标记
    let cleanOutline = outline.trim()
    
    // 移除开头的```markdown或其他代码块标记
    if (cleanOutline.startsWith('```')) {
      cleanOutline = cleanOutline.replace(/^```[a-zA-Z]*\s*/, '')
    }
    
    // 移除结尾的```标记
    if (cleanOutline.endsWith('```')) {
      cleanOutline = cleanOutline.replace(/\s*```$/, '')
    }

    return NextResponse.json({
      success: true,
      outline: cleanOutline.trim()
    })

  } catch (error) {
    console.error('大纲生成错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '大纲生成失败，请检查配置或重试'
      },
      { status: 500 }
    )
  }
} 