import { type NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

    // 确保知识库目录存在
    const knowledgeDir = path.join(process.cwd(), 'knowledge')
    if (!existsSync(knowledgeDir)) {
      await mkdir(knowledgeDir, { recursive: true })
    }

    const uploadedFiles: any[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        console.log(`处理文件: ${file.name}, 类型: ${file.type}, 大小: ${file.size}`)

        // 检查文件类型
        const fileExtension = path.extname(file.name).toLowerCase()
        const supportedExtensions = ['.txt', '.md', '.csv', '.pdf', '.doc', '.docx', '.xls', '.xlsx']
        
        if (!SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES] && !supportedExtensions.includes(fileExtension)) {
          errors.push(`不支持的文件类型: ${file.name}`)
          continue
        }

        // 生成安全的文件名
        const baseName = path.basename(file.name)
        const safeBaseName = baseName
          .replace(/[\\/]+/g, '_')
          .replace(/[^a-zA-Z0-9._-\u4e00-\u9fa5]/g, '_')

        // 生成文件ID和保存路径
        const fileId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
        const storedFileName = `${fileId}-${safeBaseName}`
        const filePath = path.join(knowledgeDir, storedFileName)

        // 保存原始文件
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)

        // 提取文本内容
        let content = ''
        try {
          content = await extractTextContent(fileExtension, buffer)
        } catch (extractError) {
          console.error(`提取文本失败 ${file.name}:`, extractError)
          content = `无法提取文本内容: ${extractError instanceof Error ? extractError.message : '未知错误'}`
        }

        // 保存文件信息到JSON
        const fileInfo = {
          id: fileId,
          name: baseName,
          type: file.type || 'text/plain',
          size: file.size,
          content: content,
          uploadTime: new Date().toISOString(),
          path: storedFileName
        }

        // 保存到JSON文件
        const metaPath = path.join(knowledgeDir, `${fileId}.json`)
        await writeFile(metaPath, JSON.stringify(fileInfo, null, 2))

        uploadedFiles.push(fileInfo)
        console.log(`文件上传成功: ${fileInfo.name}`)

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
async function extractTextContent(fileExtension: string, buffer: Buffer): Promise<string> {
  try {
    // 文本/Markdown/CSV
    if (['.txt', '.md', '.csv'].includes(fileExtension)) {
      return buffer.toString('utf-8')
    }

    // PDF
    if (fileExtension === '.pdf') {
      console.log('开始处理PDF文件')
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        const content = data.text.trim()
        console.log('PDF内容提取成功，长度:', content.length)
        return content || '无法提取PDF内容'
      } catch (pdfError) {
        console.error('PDF处理失败:', pdfError)
        return 'PDF文件处理失败，请确认文件未损坏'
      }
    }

    // DOCX
    if (fileExtension === '.docx') {
      console.log('开始处理DOCX文件')
      try {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        const content = result.value.trim()
        console.log('DOCX内容提取成功，长度:', content.length)
        return content || '无法提取DOCX内容'
      } catch (docxError) {
        console.error('DOCX处理失败:', docxError)
        return 'DOCX文件处理失败，请确认文件未损坏'
      }
    }

    // DOC（尽力）
    if (fileExtension === '.doc') {
      console.log('开始处理DOC文件')
      try {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        const content = result.value.trim()
        console.log('DOC内容提取成功，长度:', content.length)
        return content || 'DOC格式提取有限，建议转换为DOCX格式'
      } catch (docError) {
        console.error('DOC提取失败:', docError)
        return 'DOC格式提取失败，建议转换为DOCX格式'
      }
    }

    // Excel
    if (['.xls', '.xlsx'].includes(fileExtension)) {
      console.log('开始处理Excel文件')
      try {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        let content = ''
        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName]
          if (worksheet) {
            const sheetData = XLSX.utils.sheet_to_csv(worksheet)
            if (sheetData.trim()) {
              content += `=== 工作表: ${sheetName} ===\n` + sheetData + '\n\n'
            }
          }
        })
        console.log('Excel内容提取成功，长度:', content.length)
        return content.trim() || '无法提取Excel内容'
      } catch (xlsError) {
        console.error('Excel处理失败:', xlsError)
        return 'Excel文件处理失败，请确认文件未损坏'
      }
    }

    // 默认
    return `文件: ${fileExtension}\n类型: 未知\n上传时间: ${new Date().toLocaleString('zh-CN')}\n\n注意：此文件格式暂不支持内容提取`
  } catch (error) {
    console.error('文档内容提取失败:', error)
    return `文件内容提取失败: ${error instanceof Error ? error.message : '未知错误'}`
  }
} 