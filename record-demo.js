/**
 * Jurexia Demo Recording Script - V2
 * Records a full-screen demo video of the Jurexia workflow
 */

const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');

const DEMO_OUTPUT = path.join(__dirname, 'public', 'demo', 'jurexia-demo.mp4');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeSlowly(page, selector, text, delayMs = 80) {
    await page.click(selector);
    for (const char of text) {
        await page.keyboard.type(char);
        await delay(delayMs);
    }
}

async function recordDemo() {
    console.log('🎬 Starting Jurexia Demo Recording V2...\n');

    // Launch browser with LARGER viewport
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null, // Use full window size
        args: [
            '--start-maximized',
            '--window-size=1920,1080',
            '--no-sandbox'
        ]
    });

    const page = await browser.newPage();

    // Set viewport explicitly to full HD
    await page.setViewport({ width: 1920, height: 1080 });

    // Setup recorder with larger dimensions
    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: false,
        fps: 30,
        videoFrame: { width: 1920, height: 1080 },
        aspectRatio: '16:9'
    });

    try {
        // Start recording
        await recorder.start(DEMO_OUTPUT);
        console.log('📹 Recording started at 1920x1080...');

        // 1. Go directly to chat page (skip homepage for cleaner demo)
        console.log('1️⃣ Opening chat page...');
        await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });
        await delay(2500);

        // 2. Wait for chat page to load
        console.log('2️⃣ Waiting for chat components...');
        await page.waitForSelector('textarea', { timeout: 10000 });
        await delay(2000);

        // 3. Click jurisdiction selector
        console.log('3️⃣ Looking for jurisdiction selector...');
        const clicked = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('Todos') || btn.textContent.includes('estados') || btn.textContent.includes('Federal')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (clicked) {
            console.log('   ✓ Opened jurisdiction selector');
            await delay(1500);

            // 4. Select Querétaro
            console.log('4️⃣ Selecting Querétaro...');
            const selected = await page.evaluate(() => {
                const items = document.querySelectorAll('button, div[role="option"], li, span');
                for (const item of items) {
                    if (item.textContent && item.textContent.includes('Querétaro')) {
                        item.click();
                        return true;
                    }
                }
                return false;
            });

            if (selected) {
                console.log('   ✓ Selected Querétaro');
            }
            await delay(1500);
        }

        // 5. Type query slowly
        console.log('5️⃣ Typing legal query...');
        await typeSlowly(page, 'textarea', '¿Qué dice el Código Civil sobre el usufructo?', 60);
        await delay(1500);

        // 6. Submit query
        console.log('6️⃣ Submitting query...');
        await page.keyboard.press('Enter');

        // 7. Wait for response - longer wait for full streaming
        console.log('7️⃣ Waiting for AI response (25 seconds)...');
        await delay(25000);

        // 8. Look for and click document links
        console.log('8️⃣ Looking for document links...');
        const docClicked = await page.evaluate(() => {
            // Look for clickable elements with Doc ID
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent && el.textContent.includes('[Doc ID:') && el.onclick || el.style.cursor === 'pointer') {
                    el.click();
                    return true;
                }
            }
            // Try span/a elements
            const links = document.querySelectorAll('span.cursor-pointer, a, button');
            for (const link of links) {
                if (link.textContent && link.textContent.includes('Doc ID')) {
                    link.click();
                    return true;
                }
            }
            return false;
        });

        if (docClicked) {
            console.log('   ✓ Clicked document link');
            await delay(4000);

            // Close modal
            await page.evaluate(() => {
                const closeBtn = document.querySelector('button svg.lucide-x')?.closest('button');
                if (closeBtn) closeBtn.click();
            });
            await delay(2000);
        }

        // Final pause
        await delay(3000);

        console.log('\n✅ Demo recording complete!');

    } catch (error) {
        console.error('❌ Error during recording:', error.message);
    } finally {
        await recorder.stop();
        console.log(`\n📁 Video saved to: ${DEMO_OUTPUT}`);
        await browser.close();
    }
}

// Create demo directory
const fs = require('fs');
const demoDir = path.join(__dirname, 'public', 'demo');
if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
}

recordDemo().catch(console.error);
