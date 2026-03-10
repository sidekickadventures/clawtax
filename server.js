/**
 * ClawTax API Server
 * Node.js + Express backend for cloud tax calculations
 */

const express = require('express');
const cors = require('cors');
const ClawTaxEngine = require('./core/tax-engine/taxEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging (without sensitive data)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main calculation endpoint
app.post('/api/calculate', (req, res) => {
    try {
        const input = req.body;
        
        // Validate required fields
        if (!input.filing_status && !input.filingStatus) {
            return res.status(400).json({ 
                success: false, 
                error: 'filing_status is required' 
            });
        }
        
        if (!input.income) {
            return res.status(400).json({ 
                success: false, 
                error: 'income object is required' 
            });
        }
        
        // Calculate using the engine
        const result = ClawTaxEngine.calculate(input);
        
        // Log calculation without sensitive data
        console.log(`Calculation completed: ${input.filing_status || input.filingStatus}, taxable: $${result.results.taxable_income}`);
        
        res.json(result);
        
    } catch (error) {
        console.error('Calculation error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Batch calculation endpoint (for agents)
app.post('/api/batch', (req, res) => {
    try {
        const { calculations } = req.body;
        
        if (!Array.isArray(calculations)) {
            return res.status(400).json({ 
                success: false, 
                error: 'calculations must be an array' 
            });
        }
        
        const results = calculations.map((input, index) => {
            try {
                const result = ClawTaxEngine.calculate(input);
                return { index, success: true, result };
            } catch (error) {
                return { index, success: false, error: error.message };
            }
        });
        
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('Batch calculation error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get supported jurisdictions
app.get('/api/jurisdictions', (req, res) => {
    res.json({
        jurisdictions: [
            { code: 'US', name: 'United States', authority: 'IRS' }
        ],
        years: [2023, 2024, 2025],
        filing_statuses: [
            'single',
            'married_jointly',
            'married_separately',
            'head_household',
            'qualifying_surviving_spouse'
        ]
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🦴 ClawTax API Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Calculate: POST http://localhost:${PORT}/api/calculate`);
});

module.exports = app;
