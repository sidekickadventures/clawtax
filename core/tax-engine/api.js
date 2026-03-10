/**
 * ClawTax JSON API
 * Accepts POST requests with tax data, returns calculated results
 */

const TAX_BRACKETS = {
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
    ]
};

const STANDARD_DEDUCTIONS = {
    single: 14600,
    married_jointly: 29200,
    married_separately: 14600,
    head_household: 21900
};

/**
 * Calculate federal tax using progressive brackets
 */
function calculateTax(income, filingStatus) {
    const brackets = TAX_BRACKETS[filingStatus];
    if (!brackets) {
        throw new Error(`Invalid filing status: ${filingStatus}`);
    }

    let tax = 0;
    let remaining = income;

    for (const bracket of brackets) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, bracket.max - bracket.min);
        tax += taxable * bracket.rate;
        remaining -= taxable;
    }

    return Math.round(tax * 100) / 100;
}

/**
 * Main calculation function
 */
function calculate(data) {
    const { filing_status, income, deductions, credits, tax_year = 2024 } = data;
    
    // Calculate total income
    const totalIncome = 
        (income.w2 || 0) +
        (income.self_employed || 0) +
        (income.interest || 0) +
        (income.dividends || 0) +
        (income.capital_gains || 0) +
        (income.rental || 0) +
        (income.other || 0);

    // Calculate deduction
    let deduction = 0;
    if (deductions && deductions.standard) {
        deduction = STANDARD_DEDUCTIONS[filing_status] || 14600;
    } else if (deductions) {
        deduction = 
            (deductions.mortgage_interest || 0) +
            (deductions.salt || 0) +
            (deductions.medical || 0) +
            (deductions.charitable || 0);
    } else {
        // Default to standard
        deduction = STANDARD_DEDUCTIONS[filing_status] || 14600;
    }

    // Calculate taxable income
    const taxableIncome = Math.max(0, totalIncome - deduction);

    // Calculate tax
    const federalTax = calculateTax(taxableIncome, filing_status);

    // Apply credits
    let totalCredits = 0;
    if (credits) {
        totalCredits += credits.child_tax_credit || 0;
        totalCredits += credits.earned_income || 0;
        totalCredits += credits.education || 0;
        totalCredits += credits.energy || 0;
    }

    const netTax = Math.max(0, federalTax - totalCredits);

    // Calculate refund/owed
    const withholding = income.withholding || 0;
    const refundEstimate = withholding - netTax;

    return {
        success: true,
        tax_year,
        filing_status,
        results: {
            gross_income: totalIncome,
            deduction,
            taxable_income: taxableIncome,
            federal_tax: federalTax,
            tax_credits: totalCredits,
            net_tax: netTax,
            withholding,
            refund_estimate: refundEstimate,
            result: refundEstimate >= 0 ? 'refund' : 'owed',
            amount: Math.abs(refundEstimate)
        }
    };
}

/**
 * Handle API request
 */
async function handleRequest(data) {
    try {
        // Validate required fields
        if (!data.filing_status) {
            return { success: false, error: 'filing_status is required' };
        }
        if (!data.income) {
            return { success: false, error: 'income object is required' };
        }

        const result = calculate(data);
        return result;

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculate, handleRequest, TAX_BRACKETS, STANDARD_DEDUCTIONS };
}
