# Email Campaign - Iurexia Conversion (BATCH 2)
# Sends to users who were skipped due to Resend daily limit on April 15
# Targets positions 101-162 (62 users who didn't receive the email)

$uri = "https://www.iurexia.com/api/email-campaign?key=VF1J8XLQBaO6xJHcjZ1SfOJTk753Mr7uGNK0PeL9Apw"

# First: DRY RUN to verify we're targeting the right 62 users
$dryBody = '{"dryRun": true, "limit": 62, "offset": 100}'

Write-Host "$(Get-Date) - [DRY RUN] Checking remaining 62 users (offset 100)..."

try {
    $dryResponse = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $dryBody -UseBasicParsing -TimeoutSec 120
    $dryResult = $dryResponse.Content | ConvertFrom-Json
    
    Write-Host "$(Get-Date) - DRY RUN Results:"
    Write-Host "  Total users found: $($dryResult.total)"
    Write-Host "  Would send to: $($dryResult.skipped) users"
    
    # Show the emails that would receive
    if ($dryResult.results) {
        Write-Host "`nUsers who will receive the email:"
        foreach ($r in $dryResult.results) {
            Write-Host "  - $($r.email)"
        }
    }
    
    Write-Host "`n---"
    $confirm = Read-Host "Proceed with REAL send? (yes/no)"
    
    if ($confirm -eq "yes") {
        # REAL SEND
        $realBody = '{"dryRun": false, "limit": 62, "offset": 100}'
        
        Write-Host "`n$(Get-Date) - Sending emails to remaining 62 users..."
        
        $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $realBody -UseBasicParsing -TimeoutSec 120
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "$(Get-Date) - Campaign Batch 2 complete!"
        Write-Host "Total: $($result.total)"
        Write-Host "Sent: $($result.sent)"
        Write-Host "Errors: $($result.errors)"
        
        # Log results
        $logFile = "$PSScriptRoot\campaign_batch2_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
        $response.Content | Out-File -FilePath $logFile -Encoding utf8
        Write-Host "Log saved to: $logFile"
    } else {
        Write-Host "Cancelled."
    }
} catch {
    Write-Host "$(Get-Date) - ERROR: $($_.Exception.Message)"
}
