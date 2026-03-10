/**
 * ClawTax Engine - Core Tax Calculation Engine
 * Version: 1.0.0
 * 
 * Modular tax engine that calculates federal taxes using
 * bracket-based progressive taxation.
 */

const ClawTaxEngine = (function() {
    // Default US 2024 brackets (can be overridden)
    let config = {
        year: 2024,
        jurisdiction: 'US',
        currency: 'USD'
    };

    // Default tax brackets (2024)
    const defaultBrackets = {
        single: [
            { min: 0, max: 11600, rate: 0.10 },
            { min: 11600, max: 47150, rate: 0.12 },
            { min: 47150, max: 100525, rate: 0.22 },
            { min: 100525, max: 191950, rate: 0.24 },
            { min: 191950, max: 243725, rate: 0.32 },
            { min: 243725, max: 609350, rate: 0.35 },
            { min: 609350, max: Infinity, rate: 0.37 }
        ],
        married_jointly: [
            { min: 0, max: 23200, rate: 0.10 },
            { min: 23200, max: 94300, rate: 0.12 },
            { min: 94300, max: 201050, rate: 0.22 },
            { min: 201050, max: 383900, rate: 0.24 },
            { min: 383900, max: 487450, rate: 0.32 },
            { min: 487450, max: 731200, rate: 0.35 },
            { min: 731200, max: Infinity, rate: 0.37 }
        ],
        married_separately: [
            { min: 0, max: 11600, rate: 0.10 },
            { min: 11600, max: 47150, rate: 0.12 },
            { min: 47150, max: 100525, rate: 0.22 },
            { min: 100525, max: 191950, rate: 0.24 },
            { min: 191950, max: 243725, rate: 0.32 },
            { min: 243725, max: 365600, rate: 0.35 },
            { min: 365600, max: Infinity, rate: 0.37 }
        ],
        head_household: [
            { min: 0, max: 16550, rate: 0.10 },
            { min: 16550, max: 63100, rate: 0.12 },
            { min: 63100, max: 100500, rate: 0.22 },
            { min: 100500, max: 191950, rate: 0.24 },
            { min: 191950, max: 243700, rate: 0.32 },
            { min: 243700, max: 609350, rate: 0.35 },
            { min: 609350, max: Infinity, rate: 0.37 }
        ],
        qualifying_surviving_spouse: [
            { min: 0, max: 23200, rate: 0.10 },
            { min: 23200, max: 94300, rate: 0.12 },
            { min: 94300, max: 201050, rate: 0.22 },
            { min: 201050, max: 383900, rate: 0.24 },
            { min: 383900, max: 487450, rate: 0.32 },
            { min: 487450, max: 731200, rate: 0.35 },
            { min: 731200, max: Infinity, rate: 0.37 }
        ]
    };

    // Standard deductions
    const standardDeductions = {
        single: 14600,
        married_jointly: 29200,
        married_separately: 14600,
        head_household: 21900,
        qualifying_surviving_spouse: 29200
    };

    /**
     * Calculate tax using progressive brackets
     */
    function calculateBracketTax(taxableIncome, brackets) {
        if (taxableIncome <= 0) return 0;
        
        let tax = 0;
        let remaining = taxableIncome;

        for (const bracket of brackets) {
            if (remaining <= 0) break;
            
            const bracketSize = bracket.max === Infinity ? remaining + 1 : bracket.max - bracket.min;
            const taxableInBracket = Math.min(remaining, bracketSize);
            
            tax += taxableInBracket * bracket.rate;
            remaining -= taxableInBracket;
        }

        return Math.round(tax * 100) / 100;
    }

    /**
     * Calculate total income from all sources
     */
    function calculateGrossIncome(income) {
        return (
            (income.w2 || 0) +
            (income.w2_wages || 0) +
            (income.self_employed || 0) +
            (income.self_employment || 0) +
            (income.interest || 0) +
            (income.dividends || 0) +
            (income.capital_gains || 0) +
            (income.rental || 0) +
            (income.rental_income || 0) +
            (income.other || 0)
        );
    }

    /**
     * Calculate deductions
     */
    function calculateDeductions(filingStatus, deductions) {
        const standardAmount = standardDeductions[filingStatus] || 14600;
        
        // Check if using standard deduction
        if (!deductions || deductions.standard !== false) {
            return {
                type: 'standard',
                amount: standardAmount,
                details: { standard: standardAmount }
            };
        }

        // Calculate itemized deductions
        const itemized = 
            (deductions.mortgage_interest || 0) +
            (deductions.mortgageInterest || 0) +
            (deductions.salt || 0) +
            (deductions.state_local_taxes || 0) +
            (deductions.stateLocalTax || 0) +
            (deductions.medical || 0) +
            (deductions.medical_expenses || 0) +
            (deductions.medicalExpenses || 0) +
            (deductions.charitable || 0) +
            (deductions.charitable_donations || 0) +
            (deductions.charitableDonations || 0);

        // Use whichever is greater
        if (itemized >= standardAmount) {
            return {
                type: 'itemized',
                amount: itemized,
                details: deductions
            };
        }

        return {
            type: 'standard',
            amount: standardAmount,
            details: { standard: standardAmount }
        };
    }

    /**
     * Calculate tax credits
     */
    function calculateCredits(credits, grossIncome, filingStatus, taxLiability) {
        if (!credits) return { total: 0, breakdown: {} };

        let totalCredits = 0;
        const breakdown = {};

        // Child tax credit (simplified - $2000 per child, $1700 refundable)
        const numChildren = credits.child || credits.child_tax_credit || credits.children || 0;
        if (numChildren > 0) {
            const childCredit = numChildren * 2000;
            breakdown.child_tax_credit = childCredit;
            totalCredits += childCredit;
        }

        // Education credits
        const education = credits.education || credits.education_credits || 0;
        if (education > 0) {
            breakdown.education_credits = education;
            totalCredits += education;
        }

        // Energy credits
        const energy = credits.energy || credits.energy_credits || 0;
        if (energy > 0) {
            breakdown.energy_credits = energy;
            totalCredits += energy;
        }

        // Other credits
        const other = credits.other || 0;
        if (other > 0) {
            breakdown.other = other;
            totalCredits += other;
        }

        return {
            total: totalCredits,
            breakdown: breakdown
        };
    }

    /**
     * Main calculation function
     */
    function calculate(data) {
        const {
            filing_status,
            filingStatus,
            income,
            deductions,
            credits,
            tax_year,
            withholding
        } = data;

        // Normalize filing status
        const filingStatus = filing_status || filingStatus || 'single';
        
        // Get brackets for filing status
        const brackets = defaultBrackets[filingStatus] || defaultBrackets.single;

        // Step 1: Calculate gross income
        const grossIncome = calculateGrossIncome(income);

        // Step 2: Calculate deductions
        const deductionResult = calculateDeductions(filingStatus, deductions);

        // Step 3: Calculate taxable income
        const taxableIncome = Math.max(0, grossIncome - deductionResult.amount);

        // Step 4: Calculate federal tax using brackets
        const federalTax = calculateBracketTax(taxableIncome, brackets);

        // Step 5: Calculate credits
        const creditResult = calculateCredits(credits, grossIncome, filingStatus, federalTax);

        // Step 6: Calculate net tax
        const netTax = Math.max(0, federalTax - creditResult.total);

        // Step 7: Calculate refund or amount owed
        const withholdingAmount = withholding || income.withholding || 0;
        const diff = withholdingAmount - netTax;

        return {
            success: true,
            input: {
                filing_status: filingStatus,
                tax_year: tax_year || config.year,
                jurisdiction: config.jurisdiction
            },
            results: {
                gross_income: grossIncome,
                deduction: {
                    type: deductionResult.type,
                    amount: deductionResult.amount
                },
                taxable_income: taxableIncome,
                federal_tax: federalTax,
                credits: creditResult,
                net_tax: netTax,
                withholding: withholdingAmount,
                refund_estimate: Math.round(diff * 100) / 100,
                result: diff >= 0 ? 'refund' : 'owed',
                amount: Math.round(Math.abs(diff) * 100) / 100
            }
        };
    }

    /**
     * API handler for external requests
     */
    function handleAPIRequest(data) {
        try {
            // Validate required fields
            if (!data.filing_status && !data.filingStatus) {
                return { success: false, error: 'filing_status is required' };
            }
            if (!data.income) {
                return { success: false, error: 'income object is required' };
            }

            return calculate(data);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        calculate,
        handleAPIRequest,
        config,
        setConfig: (newConfig) => { config = { ...config, ...newConfig }; }
    };

})();

// Export for browser
if (typeof window !== 'undefined') {
    window.ClawTaxEngine = ClawTaxEngine;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClawTaxEngine;
}
