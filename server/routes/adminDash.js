import { Router } from 'express'
import PDFDocument from 'pdfkit'        //Have to run `npm install pdfkit` to generate a PDF for reports
import { listadminDashItem, getAdminItemById } from '../logic/adminDashLogic.js'
import { generateAdminReport } from '../logic/reportLogic.js'
import { requireAdmin } from '../middleware/auth.js'

// BUG FIX (Justin, 11-06): these had no login check, so anyone could see today's skip revenue.
// requireAdmin makes them staff-only (401 if not logged in, 403 for regular users), like the admin queue routes.
// Also removed POST /: it called createAdminItem, which no longer exists, so it crashed with a 500.
// The stats are worked out by admin_dash_view now, so there's nothing to create or update.

const router = Router()

// GET /api/adminDash
router.get('/', requireAdmin, (req, res) => {
    res.json(listadminDashItem())
})

// GET /api/adminDash/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/report', requireAdmin, (req, res) => {
    const { startDate, endDate } = req.query
    res.json(generateAdminReport({ startDate, endDate }))
})

// GET /api/adminDash/report/pdf?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/report/pdf', requireAdmin, (req, res) => {
    const { startDate, endDate } = req.query
    const report = generateAdminReport({ startDate, endDate })
    const dateStr = new Date().toISOString().slice(0, 10)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="bribesmart-report-${dateStr}.pdf"`)

    const doc = new PDFDocument({ margin: 40 })
    doc.pipe(res)

    const rangeLabel =
        report.filters.startDate || report.filters.endDate
            ? `${report.filters.startDate || 'Beginning'} to ${report.filters.endDate || 'Present'}`
            : 'All Dates'

    doc.fontSize(18).text('BribeSmart — Queue & Revenue Report')
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor('#555555').text(`Date Range: ${rangeLabel}`)
    doc.moveDown(1)

    // Summary block
    doc.fillColor('#000000').fontSize(12).text('Summary', { underline: true })
    doc.moveDown(0.4)
    doc.fontSize(10).text(
        `Total Parties: ${report.summary.totalParties}   |   ` +
        `Served: ${report.summary.servedCount}   |   ` +
        `Cancelled: ${report.summary.cancelledCount}   |   ` +
        `Avg Wait: ${report.summary.avgWaitMinutes != null ? `${report.summary.avgWaitMinutes} min` : 'N/A'}   |   ` +
        `Skip Revenue: $${Number(report.summary.totalBribeRevenue ?? 0).toFixed(2)}`
    )
    doc.moveDown(1.2)

    // Service breakdown
    doc.fontSize(12).text('Service Breakdown', { underline: true })
    doc.moveDown(0.5)

    report.byService.forEach((row) => {
        const waitText = row.avgWaitMinutes != null ? `${row.avgWaitMinutes} min` : 'N/A'
        const revText = `$${Number(row.bribeRevenue ?? 0).toFixed(2)}`
        doc.fontSize(10).text(
            `${row.serviceName} — Parties: ${row.totalParties}, Served: ${row.servedCount}, Cancelled: ${row.cancelledCount}, Avg Wait: ${waitText}, Skip Revenue: ${revText}`
        )
        doc.moveDown(0.3)
    })

    doc.end()
})

// GET /api/adminDash/:id
router.get('/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id)
    if(!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Admin Item id must be a whole number.'})
    }

    const item = getAdminItemById(id)
    if(!item) {
        return res.status(404).json({ error: 'Item not found.'})
    }

    res.json(item)
})

export default router
