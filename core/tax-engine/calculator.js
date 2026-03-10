/**
 * ClawTax - US Tax Calculator
 * Calculates federal tax liability based on filing status and income
 */

const { US_TAX_BRACKETS, STANDARD_DEDUCTIONS } = require('./brackets/2024');

class TaxCalculator {
    constructor(taxYear = 2024) {
        this.taxYear = taxYear;
        this.brackets = US_TAX_BRACKETS[taxYear];
        this.standardDeductions = STANDARD_DEDUCTIONS[taxYear];
    }

    /**
     * Calculate federal income tax using progressive brackets
     */
    calculateTax(income, filingStatus) {
        const brackets = this.brackets[filingStatus];
        if (!brackets) {
            throw new Error(`Invalid filing status: ${filingStatus}`);
        }

        let tax = 0;
        let remainingIncome = income;

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;

            const taxableInBracket = Math.min(
                remainingIncome,
                bracket.max - bracket.min
            );

            tax += taxableInBracket * bracket.rate;
            remainingIncome -= taxableInBracket;
        }

        return Math.round(tax * 100) / 100;
    }

    /**
     * Calculate total income from all sources
     */
    calculateTotalIncome(incomeData) {
        return Object.values(incomeData).reduce((sum, val) => sum + (val || 0), 0);
    }

    /**
     * Calculate deductions
     */
    calculateDeductions(filingStatus, deductionData) {
        const standard = this.standardDeductions[filingStatus];
        
        // If itemizing, calculate total itemized
        let itemized = 0;
        if (!deductionData.standardDeduction) {
            itemized = (deductionData.mortgageInterest || 0) +
                      (deductionData.stateLocalTax || 0) +
                      (deductionData.medicalExpenses || 0) +
                      (deductionData.charitableDonations || 0) +
                      (deductionData.studentLoanInterest || 0);
        }

        // Use greater of standard or itemized
        return {
            type: itemized > standard ? 'itemized' : 'standard',
            amount: Math.max(standard, itemized)
        };
    }

    /**
     * Calculate tax credits (simplified)
     */
    calculateCredits(creditData, taxLiability) {
        let totalCredits = 0;
        let creditBreakdown = {};

        // Child tax credit (simplified - $2000 per child)
        if (creditData.childTaxCredit) {
            const childCredit = Math.min(creditData.childTaxCredit * 2000, taxLiability);
            totalCredits += childCredit;
            creditBreakdown.childTaxCredit = childCredit;
        }

        // Earned income credit (simplified)
        if (creditData.earnedIncomeCredit) {
            const eic = Math.min(creditData.earnedIncomeCredit, taxLiability - totalCredits);
            totalCredits += eic;
            creditBreakdown.earnedIncomeCredit = eic;
        }

        // Education credits
        if (creditData.educationCredits) {
            const eduCredit = Math.min(creditData.educationCredits, taxLiability - totalCredits);
            totalCredits += eduCredit;
            creditBreakdown.educationCredits = eduCredit;
        }

        return {
            total: totalCredits,
            breakdown: creditBreakdown
        };
    }

    /**
     * Main tax calculation
     */
    calculate(taxData) {
        const { personal, income, deductions, credits } = taxData;
        
        // 1. Calculate gross income
        const grossIncome = this.calculateTotalIncome(income);
        
        // 2. Calculate deductions
        const deductionResult = this.calculateDeductions(personal.filingStatus, deductions);
        const taxableIncome = Math.max(0, grossIncome - deductionResult.amount);
        
        // 3. Calculate tax liability
        const grossTax = this.calculateTax(taxableIncome, personal.filingStatus);
        
        // 4. Apply credits
        const creditResult = this.calculateCredits(credits, grossTax);
        const netTax = Math.max(0, grossTax - creditResult.total);
        
        // 5. Determine refund or owed
        const withholding = taxData.withholding || 0;
        const refund = withholding - netTax;

        return {
            summary: {
                grossIncome,
                deductions: deductionResult,
                taxableIncome,
                grossTax,
                credits: creditResult,
                netTax,
                withholding,
                result: refund >= 0 ? 'refund' : 'owed',
                amount: Math.abs(refund)
            },
            breakdown: {
                filingStatus: personal.filingStatus,
                taxYear: this.taxYear,
                income,
                deductions: { ...deductions, ...deductionResult },
                credits: creditResult
            }
        };
    }
}

module.exports = { TaxCalculator };
