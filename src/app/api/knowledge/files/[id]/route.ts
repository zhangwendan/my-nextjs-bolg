import { NextRequest, NextResponse } from 'next/server'
import { unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, message: '文件ID不能为空' },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '删除文件失败'
      },
      { status: 500 }
    )
  }
} 