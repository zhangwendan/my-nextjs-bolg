import { type NextRequest, NextResponse } from 'next/server'

// 支持的文件类型
const SUPPORTED_TYPES = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

export async function POST(request: NextRequest) {
  try {
    // 检查是否在Vercel环境中
    if (process.env.VERCEL) {
      return NextResponse.json(
        { success: false, message: '知识库上传功能在Vercel环境中暂不可用，请在本地环境使用' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有上传文件' },
        { status: 400 }
      )
    }

    // 只在本地环境中导入依赖模块
    const { writeFile, mkdir, readFile } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const path = await import('path')
    const mammoth = await import('mammoth')
    const pdfParse = (await import('pdf-parse')).default
    const XLSX = await import('xlsx')

    // 确保知识库目录存在
    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    if (!existsSync(knowledgeDir)) {
      await mkdir(knowledgeDir, { recursive: true })
    }

    const uploadedFiles = []
    const errors = []

    for (const file of files) {
      try {
        console.log(`处理文件: ${file.name}, 类型: ${file.type}, 大小: ${file.size}`)

        // 检查文件类型
        if (!SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES] && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
          errors.push(`不支持的文件类型: ${file.name}`)
          continue
        }

        // 生成文件ID和路径
        const fileId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
        const fileName = `${fileId}-${file.name}`
        const filePath = path.join(knowledgeDir, fileName)

        // 保存原始文件
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)

        // 提取文本内容
        let content = ''
        try {
          content = await extractTextContent(file, buffer, { mammoth, pdfParse, XLSX })
        } catch (extractError) {
          console.error(`提取文本失败 ${file.name}:`, extractError)
          content = `无法提取文本内容: ${extractError instanceof Error ? extractError.message : '未知错误'}`
        }

        // 保存文件信息到JSON
        const fileInfo = {
          id: fileId,
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          content: content,
          uploadTime: new Date().toISOString(),
          path: fileName
        }

        // 保存到JSON文件
        const metaPath = path.join(knowledgeDir, `${fileId}.json`)
        await writeFile(metaPath, JSON.stringify(fileInfo, null, 2))

        uploadedFiles.push(fileInfo)
        console.log(`文件上传成功: ${file.name}`)

      } catch (error) {
        console.error(`处理文件失败 ${file.name}:`, error)
        errors.push(`处理 ${file.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedFiles.length,
      totalCount: files.length,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('文件上传错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '文件上传失败'
      },
      { status: 500 }
    )
  }
}

// 提取文本内容
async function extractTextContent(file: File, buffer: Buffer, libs: any): Promise<string> {
  const { mammoth, pdfParse, XLSX } = libs
  const fileType = file.type || 'text/plain'
  const fileName = file.name.toLowerCase()

  try {
    // 文本文件
    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return buffer.toString('utf-8')
    }

    // CSV文件
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      return buffer.toString('utf-8')
    }

    // PDF文件
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log('开始处理PDF文件:', fileName)
      const data = await pdfParse(buffer)
      const content = data.text.trim()
      console.log('PDF内容提取成功，长度:', content.length)
      return content || '无法提取PDF内容'
    }

    // Word文档 (.docx)
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      console.log('开始处理DOCX文件:', fileName)
      const result = await mammoth.extractRawText({ buffer })
      const content = result.value.trim()
      console.log('DOCX内容提取成功，长度:', content.length)
      return content || '无法提取DOCX内容'
    }

    // Word文档 (.doc) - 老版本格式，mammoth有限支持
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      console.log('开始处理DOC文件:', fileName)
      try {
        const result = await mammoth.extractRawText({ buffer })
        const content = result.value.trim()
        console.log('DOC内容提取成功，长度:', content.length)
        return content || 'DOC格式提取有限，建议转换为DOCX格式'
      } catch (docError) {
        console.error('DOC提取失败:', docError)
        return 'DOC格式提取失败，建议转换为DOCX格式'
      }
    }

    // Excel文件
    if (fileType.includes('sheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      console.log('开始处理Excel文件:', fileName)
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let content = ''
      
      // 遍历所有工作表
      workbook.SheetNames.forEach((sheetName: string, index: number) => {
        const worksheet = workbook.Sheets[sheetName]
        if (worksheet) {
          const sheetData = XLSX.utils.sheet_to_csv(worksheet)
          
          if (sheetData.trim()) {
            content += `=== 工作表: ${sheetName} ===\n`
            content += sheetData + '\n\n'
          }
        }
      })
      
      console.log('Excel内容提取成功，长度:', content.length)
      return content.trim() || '无法提取Excel内容'
    }

    // 默认处理
    return `文件: ${file.name}\n类型: ${fileType}\n大小: ${file.size} 字节\n上传时间: ${new Date().toLocaleString('zh-CN')}\n\n注意：此文件格式暂不支持内容提取`
  } catch (error) {
    console.error('文档内容提取失败:', error)
    return `文件: ${file.name}\n内容提取失败: ${error instanceof Error ? error.message : '未知错误'}`
  }
} 