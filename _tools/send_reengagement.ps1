# Email Campaign - Iurexia Re-engagement "5 para ganar 15"
# Target: Free users with < 2 queries used (397 users)
# Offer: Use 5 free queries before April 28 → get 15 bonus queries

$uri = "https://www.iurexia.com/api/email-reengagement?key=VF1J8XLQBaO6xJHcjZ1SfOJTk753Mr7uGNK0PeL9Apw"

# ══════════════════════════════════════════════════════════════
# STEP 1: Send test email first
# ══════════════════════════════════════════════════════════════
Write-Host "`n$(Get-Date) - STEP 1: Sending test email to admin..."

$testBody = '{"testEmails": ["jdm.juridico@gmail.com"]}'

try {
    $testResponse = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $testBody -UseBasicParsing -TimeoutSec 30
    $testResult = $testResponse.Content | ConvertFrom-Json
    Write-Host "  Test result: $($testResult | ConvertTo-Json -Compress)"
    
    Write-Host "`n  ✓ Check your inbox (jdm.juridico@gmail.com) to verify the email looks good."
    $confirm1 = Read-Host "`n  Proceed to DRY RUN? (yes/no)"
    if ($confirm1 -ne "yes") { Write-Host "Cancelled."; exit }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
    exit
}

# ══════════════════════════════════════════════════════════════
# STEP 2: Dry run — see who would receive
# ══════════════════════════════════════════════════════════════
Write-Host "`n$(Get-Date) - STEP 2: DRY RUN (first 100 users)..."

$dryBody = '{"dryRun": true, "limit": 100, "offset": 0}'

try {
    $dryResponse = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $dryBody -UseBasicParsing -TimeoutSec 60
    $dryResult = $dryResponse.Content | ConvertFrom-Json
    
    Write-Host "  Total eligible: $($dryResult.totalEligible)"
    Write-Host "  Batch preview: $($dryResult.batchSize) users"
    Write-Host "`n  Sample emails:"
    $dryResult.results | Select-Object -First 10 | ForEach-Object {
        Write-Host "    - $($_.email)"
    }
    
    $confirm2 = Read-Host "`n  Proceed to REAL SEND (batch 1 of 4, 100 users)? (yes/no)"
    if ($confirm2 -ne "yes") { Write-Host "Cancelled."; exit }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
    exit
}

# ══════════════════════════════════════════════════════════════
# STEP 3: Real send — batches of 100
# ══════════════════════════════════════════════════════════════
$batchSize = 100
$totalBatches = 4  # 397 users / 100 per batch

for ($batch = 0; $batch -lt $totalBatches; $batch++) {
    $currentOffset = $batch * $batchSize
    Write-Host "`n$(Get-Date) - BATCH $($batch + 1)/$totalBatches (offset: $currentOffset)..."
    
    $sendBody = "{`"dryRun`": false, `"limit`": $batchSize, `"offset`": $currentOffset}"
    
    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $sendBody -UseBasicParsing -TimeoutSec 120
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "  Sent: $($result.sent) | Errors: $($result.errors) | Total eligible: $($result.totalEligible)"
        
        if ($result.sent -eq 0) {
            Write-Host "  No more users to send. Done!"
            break
        }
        
        # Wait between batches to respect Resend rate limits
        if ($batch -lt ($totalBatches - 1)) {
            Write-Host "  Waiting 30s before next batch..."
            Start-Sleep -Seconds 30
        }
    } catch {
        Write-Host "  ERROR in batch $($batch + 1): $($_.Exception.Message)"
        Write-Host "  You can resume from offset $currentOffset"
        break
    }
}

# Log completion
$logFile = "$PSScriptRoot\reengagement_campaign_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
Write-Host "`n$(Get-Date) - Campaign complete! Log: $logFile"
