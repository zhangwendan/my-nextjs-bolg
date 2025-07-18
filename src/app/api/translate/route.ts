import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content, aiHubMixApiKey, model = 'gpt-4' } = await request.json()

    console.log('收到翻译请求:', { hasContent: !!content, hasApiKey: !!aiHubMixApiKey, model })

    if (!content || !aiHubMixApiKey) {
      return NextResponse.json(
        { success: false, message: '内容和API密钥不能为空' },
        { status: 400 }
      )
    }

    // 调用 AI Hub Mix API 进行翻译
    console.log('调用翻译 API...')
    const response = await fetch('https://api.aihubmix.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiHubMixApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译专家。请将用户提供的英文内容翻译为自然、流畅的中文。保持原文的结构和格式，确保翻译准确且符合中文表达习惯。如果原文已经是中文，请原样返回。'
          },
          {
            role: 'user',
            content: `请将以下内容翻译为中文：\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    })

    console.log('翻译 API 响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('翻译 API 错误:', errorText)
      throw new Error(`翻译 API 错误: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('翻译 API 响应:', data)

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('翻译响应格式无效')
    }

    const translatedContent = data.choices[0].message.content.trim()

    return NextResponse.json({
      success: true,
      translatedContent
    })

  } catch (error) {
    console.error('翻译错误详情:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '翻译失败，请检查API密钥或网络连接',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
} 