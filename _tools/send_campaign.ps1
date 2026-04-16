# Email Campaign - Iurexia Conversion
# Scheduled to run at 9:00 AM CST on April 15, 2026
# Sends personalized emails to free users who exhausted their 5 queries

$uri = "https://www.iurexia.com/api/email-campaign?key=VF1J8XLQBaO6xJHcjZ1SfOJTk753Mr7uGNK0PeL9Apw"
$body = '{"dryRun": false, "limit": 200}'

Write-Host "$(Get-Date) - Starting Iurexia email campaign..."

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 120
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "$(Get-Date) - Campaign complete!"
    Write-Host "Total: $($result.total)"
    Write-Host "Sent: $($result.sent)"
    Write-Host "Errors: $($result.errors)"
    
    # Log results
    $logFile = "$PSScriptRoot\campaign_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $response.Content | Out-File -FilePath $logFile -Encoding utf8
    Write-Host "Log saved to: $logFile"
} catch {
    Write-Host "$(Get-Date) - ERROR: $($_.Exception.Message)"
    $_.Exception.Message | Out-File -FilePath "$PSScriptRoot\campaign_error.log" -Encoding utf8
}
