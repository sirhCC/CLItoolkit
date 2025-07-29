# PowerShell Test Script - Check for Hanging Issues
Write-Host "🧪 Testing CLI Toolkit for Hanging Issues" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to run tests with timeout
function Test-WithTimeout {
    param(
        [string]$Command,
        [int]$TimeoutSeconds = 60
    )
    
    Write-Host "`n⏱️ Running: $Command (timeout: ${TimeoutSeconds}s)" -ForegroundColor Yellow
    
    $job = Start-Job -ScriptBlock {
        param($cmd)
        Invoke-Expression $cmd
    } -ArgumentList $Command
    
    $completed = Wait-Job $job -Timeout $TimeoutSeconds
    
    if ($completed) {
        $result = Receive-Job $job
        Remove-Job $job
        Write-Host "✅ Command completed successfully" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "❌ Command timed out after ${TimeoutSeconds} seconds - HANGING DETECTED!" -ForegroundColor Red
        Stop-Job $job
        Remove-Job $job
        return $false
    }
}

# Test 1: Quick build test
Write-Host "`n📦 Test 1: Build Test" -ForegroundColor Magenta
$buildResult = Test-WithTimeout "npm run build" 30

# Test 2: Run a single quick test
Write-Host "`n🧪 Test 2: Single Test File" -ForegroundColor Magenta  
$singleTestResult = Test-WithTimeout "npx jest tests/types/command.test.ts --verbose=false" 30

# Test 3: Our safe AI test
Write-Host "`n🤖 Test 3: Safe AI Test" -ForegroundColor Magenta
$aiTestResult = Test-WithTimeout "node scripts/safe-ai-test.js" 15

# Test 4: Performance test
Write-Host "`n🚀 Test 4: Performance Test" -ForegroundColor Magenta
$perfTestResult = Test-WithTimeout "node scripts/simple-perf-test-new.js" 15

# Results Summary
Write-Host "`n📊 HANGING TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

if ($buildResult) {
    Write-Host "✅ Build Test: PASSED (no hanging)" -ForegroundColor Green
}
else {
    Write-Host "❌ Build Test: FAILED (hanging detected)" -ForegroundColor Red
}

if ($singleTestResult) {
    Write-Host "✅ Single Test: PASSED (no hanging)" -ForegroundColor Green  
}
else {
    Write-Host "❌ Single Test: FAILED (hanging detected)" -ForegroundColor Red
}

if ($aiTestResult) {
    Write-Host "✅ AI Test: PASSED (no hanging)" -ForegroundColor Green
}
else {
    Write-Host "❌ AI Test: FAILED (hanging detected)" -ForegroundColor Red
}

if ($perfTestResult) {
    Write-Host "✅ Performance Test: PASSED (no hanging)" -ForegroundColor Green
}
else {
    Write-Host "❌ Performance Test: FAILED (hanging detected)" -ForegroundColor Red
}

$totalPassed = @($buildResult, $singleTestResult, $aiTestResult, $perfTestResult) | Where-Object { $_ -eq $true } | Measure-Object | Select-Object -ExpandProperty Count

Write-Host "`n🎯 FINAL RESULT: $totalPassed/4 tests passed" -ForegroundColor $(if ($totalPassed -eq 4) { "Green" } else { "Yellow" })

if ($totalPassed -eq 4) {
    Write-Host "🎉 NO HANGING ISSUES DETECTED - Fix was successful!" -ForegroundColor Green
}
else {
    Write-Host "⚠️ Some tests may still have hanging issues" -ForegroundColor Yellow
}

Write-Host "`nTest completed. Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
