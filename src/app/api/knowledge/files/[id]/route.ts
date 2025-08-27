import { type NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少文件ID' },
        { status: 400 }
      )
    }

    // 移除Vercel环境限制，让功能在生产环境也能使用
    // if (process.env.VERCEL) {
    //   return NextResponse.json(
    //     { success: false, message: '知识库功能在Vercel环境中暂不可用，请在本地环境使用' },
    //     { status: 400 }
    //   )
    // }

    // 只在本地环境中导入fs模块
    const { unlink, readFile } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')

    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    const metaPath = path.join(knowledgeDir, `${id}.json`)

    // 检查元数据文件是否存在
    if (!existsSync(metaPath)) {
      return NextResponse.json(
        { success: false, message: '文件不存在' },
        { status: 404 }
      )
    }

    // 读取文件信息
    const fileContent = await readFile(metaPath, 'utf-8')
    const fileInfo = JSON.parse(fileContent)

    // 删除原始文件
    if (fileInfo.path) {
      const originalFilePath = path.join(knowledgeDir, fileInfo.path)
      if (existsSync(originalFilePath)) {
        try {
          await unlink(originalFilePath)
          console.log(`删除原始文件: ${originalFilePath}`)
        } catch (error) {
          console.error(`删除原始文件失败: ${originalFilePath}`, error)
          // 继续删除元数据文件，即使原始文件删除失败
        }
      }
    }

    // 删除元数据文件
    await unlink(metaPath)
    console.log(`删除元数据文件: ${metaPath}`)

    return NextResponse.json({
      success: true,
      message: '文件删除成功',
      deletedFile: {
        id: fileInfo.id,
        name: fileInfo.name
      }
    })

  } catch (error) {
    console.error('删除文件错误:', error)
    return NextResponse.json({ success: false, message: '删除文件错误' }, { status: 500 })
  }
} 