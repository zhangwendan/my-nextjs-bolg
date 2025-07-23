# 测试Vercel API的PowerShell脚本
$baseUrl = "https://my-nextjs-bolg-n21u.vercel.app"

Write-Host "测试Vercel API..." -ForegroundColor Green

# 测试健康检查API
Write-Host "`n1. 测试健康检查API:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ 健康检查API工作正常" -ForegroundColor Green
    Write-Host "响应: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 健康检查API失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试test API
Write-Host "`n2. 测试test API:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/test" -Method GET -ErrorAction Stop
    Write-Host "✅ Test API工作正常" -ForegroundColor Green
    Write-Host "响应: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Test API失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试主页
Write-Host "`n3. 测试主页:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET -ErrorAction Stop
    Write-Host "✅ 主页工作正常" -ForegroundColor Green
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 主页失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n测试完成!" -ForegroundColor Green 