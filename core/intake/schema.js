/**
 * ClawTax - Universal Financial Intake Schema
 * Defines the standard format for tax data across all countries
 */

const INTAKE_SCHEMA = {
    // Personal Information
    personal: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        ssn: { type: 'string', encrypted: true }, // Will be encrypted
        dateOfBirth: { type: 'date', required: true },
        filingStatus: { 
            type: 'enum', 
            options: ['single', 'married_jointly', 'married_separately', 'head_household', 'qualifying_surviving_spouse'],
            required: true 
        },
        state: { type: 'string' },
        country: { type: 'string', required: true },
        zipCode: { type: 'string' }
    },

    // Income Sources
    income: {
        w2Wages: { type: 'number', min: 0, label: 'W-2 Wages' },
        selfEmployment: { type: 'number', min: 0, label: 'Self-Employment Income' },
        interest: { type: 'number', min: 0, label: 'Interest Income' },
        dividends: { type: 'number', min: 0, label: 'Dividend Income' },
        capitalGains: { type: 'number', label: 'Capital Gains' },
        rentalIncome: { type: 'number', label: 'Rental Income' },
        otherIncome: { type: 'number', label: 'Other Income' }
    },

    // Deductions
    deductions: {
        standardDeduction: { type: 'boolean', default: true },
        mortgageInterest: { type: 'number', min: 0 },
        stateLocalTax: { type: 'number', min: 0 },
        medicalExpenses: { type: 'number', min: 0 },
        charitableDonations: { type: 'number', min: 0 },
        studentLoanInterest: { type: 'number', min: 0 }
    },

    // Tax Credits
    credits: {
        childTaxCredit: { type: 'number', min: 0 },
        earnedIncomeCredit: { type: 'number', min: 0 },
        educationCredits: { type: 'number', min: 0 },
        energyCredits: { type: 'number', min: 0 }
    },

    // Metadata
    metadata: {
        taxYear: { type: 'number', required: true },
        createdAt: { type: 'timestamp' },
        lastModified: { type: 'timestamp' },
        version: { type: 'string', default: '1.0' }
    }
};

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { INTAKE_SCHEMA };
}
