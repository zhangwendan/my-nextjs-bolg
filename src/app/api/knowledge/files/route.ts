import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 检查是否在Vercel环境中
    if (process.env.VERCEL) {
      // 在Vercel环境中，返回模拟的知识库文件数据
      return NextResponse.json({
        success: true,
        files: [],
        count: 0,
        message: '知识库功能在Vercel环境中暂不可用，请在本地环境使用'
      })
    }

    // 只在本地环境中导入fs模块
    const { readdir, readFile } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')

    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    
    // 检查知识库目录是否存在
    if (!existsSync(knowledgeDir)) {
      return NextResponse.json({
        success: true,
        files: []
      })
    }

    // 读取目录中的所有JSON文件（元数据文件）
    const files = await readdir(knowledgeDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    const knowledgeFiles = []

    for (const jsonFile of jsonFiles) {
      try {
        const filePath = path.join(knowledgeDir, jsonFile)
        const fileContent = await readFile(filePath, 'utf-8')
        const fileInfo = JSON.parse(fileContent)
        
        // 验证文件信息结构
        if (fileInfo.id && fileInfo.name && fileInfo.content !== undefined) {
          knowledgeFiles.push(fileInfo)
        }
      } catch (error) {
        console.error(`读取文件元数据失败 ${jsonFile}:`, error)
        // 跳过损坏的文件，继续处理其他文件
      }
    }

    // 按上传时间倒序排列
    knowledgeFiles.sort((a, b) => 
      new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime()
    )

    return NextResponse.json({
      success: true,
      files: knowledgeFiles,
      count: knowledgeFiles.length
    })

  } catch (error) {
    console.error('获取文件列表错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '获取文件列表失败'
      },
      { status: 500 }
    )
  }
} 