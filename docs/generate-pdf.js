/**
 * AIForge Documentation PDF Generator
 * 
 * Usage:
 *   node docs/generate-pdf.js
 * 
 * Requirements:
 *   npm install puppeteer
 * 
 * Output:
 *   docs/AIFORGE_DOCUMENTATION.pdf
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
    console.log('🔧 AIForge Documentation PDF Generator');
    console.log('=====================================\n');

    const htmlPath = path.join(__dirname, 'AIFORGE_DOCUMENTATION.html');
    const pdfPath = path.join(__dirname, 'AIFORGE_DOCUMENTATION.pdf');

    if (!fs.existsSync(htmlPath)) {
        console.error('❌ HTML documentation not found at:', htmlPath);
        process.exit(1);
    }

    console.log('📖 Reading HTML documentation...');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    console.log('🌐 Launching headless browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log('📄 Generating PDF...');
    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
    });

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: `
            <div style="font-size: 10px; color: #666; width: 100%; text-align: center; padding: 10px;">
                AIForge Documentation v1.0
            </div>
        `,
        footerTemplate: `
            <div style="font-size: 10px; color: #666; width: 100%; text-align: center; padding: 10px;">
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
        `
    });

    await browser.close();

    const stats = fs.statSync(pdfPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n✅ PDF generated successfully!');
    console.log(`📁 Output: ${pdfPath}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log('\nYou can now open the PDF file to view the documentation.');
}

generatePDF().catch(err => {
    console.error('❌ Error generating PDF:', err.message);
    console.log('\n💡 Make sure puppeteer is installed:');
    console.log('   npm install puppeteer');
    process.exit(1);
});
