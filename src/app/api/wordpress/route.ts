import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content, title, siteUrl, username, password } = await request.json()

    console.log('收到WordPress上传请求:', { 
      hasContent: !!content, 
      title, 
      siteUrl, 
      username, 
      hasPassword: !!password 
    })

    if (!content || !siteUrl || !username || !password) {
      return NextResponse.json(
        { success: false, message: '内容、站点URL、用户名和密码都不能为空' },
        { status: 400 }
      )
    }

    // 正确处理站点URL，提取根域名
    let wpSiteUrl = siteUrl.trim()
    
    // 确保有协议
    if (!wpSiteUrl.startsWith('http://') && !wpSiteUrl.startsWith('https://')) {
      wpSiteUrl = 'https://' + wpSiteUrl
    }
    
    // 移除末尾的斜杠
    if (wpSiteUrl.endsWith('/')) {
      wpSiteUrl = wpSiteUrl.slice(0, -1)
    }
    
    // 提取根域名，移除具体页面路径
    try {
      const url = new URL(wpSiteUrl)
      wpSiteUrl = `${url.protocol}//${url.host}`
    } catch (urlError) {
      console.error('URL解析错误:', urlError)
      return NextResponse.json(
        { success: false, message: '站点URL格式不正确，请输入完整的网站地址' },
        { status: 400 }
      )
    }

    const wpApiUrl = `${wpSiteUrl}/wp-json/wp/v2/posts`

    console.log('原始输入URL:', siteUrl)
    console.log('处理后的站点URL:', wpSiteUrl)
    console.log('WordPress API URL:', wpApiUrl)

    // 准备认证信息
    const auth = Buffer.from(`${username}:${password}`).toString('base64')

    // 准备文章数据
    const postData = {
      title: title || '新文章',
      content: content,
      status: 'draft', // 设置为草稿
      author: 1 // 默认作者ID，通常是1
    }

    console.log('上传文章数据:', { ...postData, content: '[内容已隐藏]' })

    // 调用 WordPress REST API
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData)
    })

    console.log('WordPress API 响应状态:', response.status)
    console.log('WordPress API 响应头:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WordPress API 错误响应:', errorText)
      
      let errorMessage = `WordPress API 错误: ${response.status}`
      
      // 检查是否返回了HTML（登录页面等）
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        errorMessage = 'WordPress API路径可能不正确，返回了网页而不是API响应。请检查：1) 站点是否支持REST API 2) URL是否正确 3) 用户权限是否足够'
      } else {
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.code) {
            errorMessage = `错误代码: ${errorData.code}`
          }
        } catch {
          errorMessage = errorText || errorMessage
        }
      }
      
      throw new Error(errorMessage)
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text()
      console.error('WordPress API 返回非JSON响应:', responseText.substring(0, 200))
      throw new Error('WordPress API返回了意外的响应格式，可能是HTML页面而不是API响应')
    }

    const data = await response.json()
    console.log('WordPress API 响应:', { id: data.id, status: data.status, link: data.link })

    return NextResponse.json({
      success: true,
      postId: data.id,
      status: data.status,
      editLink: data.link ? data.link.replace(/\?.*$/, '') + '?preview=true' : undefined,
      adminLink: `${wpSiteUrl}/wp-admin/post.php?post=${data.id}&action=edit`,
      message: '文章已成功创建为草稿'
    })

  } catch (error) {
    console.error('WordPress上传错误详情:', error)
    
    let errorMessage = '上传失败'
    
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到WordPress站点，请检查站点URL是否正确'
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = '认证失败，请检查用户名和应用密码是否正确'
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = '权限不足，请确保用户具有发布文章的权限'
      } else if (error.message.includes('404')) {
        errorMessage = 'WordPress REST API未找到，请确保站点支持REST API'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
} 