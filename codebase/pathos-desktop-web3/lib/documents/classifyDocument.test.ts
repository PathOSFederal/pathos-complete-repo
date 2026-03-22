/**
 * ============================================================================
 * DOCUMENT CLASSIFICATION TESTS (Day 22 - Universal Document Import v1)
 * ============================================================================
 *
 * FILE PURPOSE:
 * Unit tests for the document classification heuristics.
 * Tests both filename-based and content-based classification.
 *
 * TEST COVERAGE:
 * 1. Filename pattern matching
 * 2. Content keyword matching
 * 3. Sensitivity label assignment
 * 4. Default behavior for unclassifiable documents
 *
 * @version Day 22 - Universal Document Import v1
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  classifyDocument,
  CATEGORY_LABELS,
  SENSITIVITY_LABELS,
  ALL_CATEGORIES,
  ALL_SENSITIVITY_LABELS,
} from './classifyDocument';

// ============================================================================
// FILENAME CLASSIFICATION TESTS
// ============================================================================

describe('classifyDocument - filename patterns', function () {
  describe('Resume detection', function () {
    it('should classify "resume.pdf" as Resume', function () {
      const result = classifyDocument('resume.pdf', null);
      expect(result.category).toBe('Resume');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify "John_Resume_2025.docx" as Resume', function () {
      const result = classifyDocument('John_Resume_2025.docx', null);
      expect(result.category).toBe('Resume');
    });

    it('should classify "curriculum-vitae.pdf" as Resume', function () {
      const result = classifyDocument('curriculum-vitae.pdf', null);
      expect(result.category).toBe('Resume');
    });

    it('should classify "CV 2025.docx" as Resume', function () {
      const result = classifyDocument('CV 2025.docx', null);
      expect(result.category).toBe('Resume');
    });
  });

  describe('Job Posting detection', function () {
    it('should classify "job-posting-GS13.pdf" as JobPosting', function () {
      const result = classifyDocument('job-posting-GS13.pdf', null);
      expect(result.category).toBe('JobPosting');
    });

    it('should classify "vacancy_announcement.pdf" as JobPosting', function () {
      const result = classifyDocument('vacancy_announcement.pdf', null);
      expect(result.category).toBe('JobPosting');
    });

    it('should classify "USAJOBS-IT-Specialist.pdf" as JobPosting', function () {
      const result = classifyDocument('USAJOBS-IT-Specialist.pdf', null);
      expect(result.category).toBe('JobPosting');
    });
  });

  describe('Offer Letter detection', function () {
    it('should classify "offer_letter.pdf" as OfferLetter', function () {
      const result = classifyDocument('offer_letter.pdf', null);
      expect(result.category).toBe('OfferLetter');
    });

    it('should classify "tentative-offer-agency.pdf" as OfferLetter', function () {
      const result = classifyDocument('tentative-offer-agency.pdf', null);
      expect(result.category).toBe('OfferLetter');
    });

    it('should classify "Final Offer DOD.pdf" as OfferLetter', function () {
      const result = classifyDocument('Final Offer DOD.pdf', null);
      expect(result.category).toBe('OfferLetter');
    });
  });

  describe('Pay Stub detection', function () {
    it('should classify "pay_stub_dec2025.pdf" as PayStub', function () {
      const result = classifyDocument('pay_stub_dec2025.pdf', null);
      expect(result.category).toBe('PayStub');
    });

    it('should classify "LES 2025-12.pdf" as PayStub', function () {
      const result = classifyDocument('LES 2025-12.pdf', null);
      expect(result.category).toBe('PayStub');
    });

    it('should classify "earnings-statement.pdf" as PayStub', function () {
      const result = classifyDocument('earnings-statement.pdf', null);
      expect(result.category).toBe('PayStub');
    });
  });

  describe('Tax Doc detection', function () {
    it('should classify "W-2-2024.pdf" as TaxDoc', function () {
      const result = classifyDocument('W-2-2024.pdf', null);
      expect(result.category).toBe('TaxDoc');
    });

    it('should classify "1099-2024.pdf" as TaxDoc', function () {
      const result = classifyDocument('1099-2024.pdf', null);
      expect(result.category).toBe('TaxDoc');
    });

    it('should classify "tax_form_2024.pdf" as TaxDoc', function () {
      const result = classifyDocument('tax_form_2024.pdf', null);
      expect(result.category).toBe('TaxDoc');
    });
  });

  describe('Benefits Doc detection', function () {
    it('should classify "FEHB_Benefits_Guide.pdf" as BenefitsDoc', function () {
      const result = classifyDocument('FEHB_Benefits_Guide.pdf', null);
      expect(result.category).toBe('BenefitsDoc');
    });

    it('should classify "benefits-guide-2025.pdf" as BenefitsDoc', function () {
      const result = classifyDocument('benefits-guide-2025.pdf', null);
      expect(result.category).toBe('BenefitsDoc');
    });
  });

  describe('Other (unclassifiable)', function () {
    it('should classify "random_document.pdf" as Other', function () {
      const result = classifyDocument('random_document.pdf', null);
      expect(result.category).toBe('Other');
      expect(result.confidence).toBe(0);
    });

    it('should classify empty filename as Other', function () {
      const result = classifyDocument('', null);
      expect(result.category).toBe('Other');
    });
  });
});

// ============================================================================
// CONTENT CLASSIFICATION TESTS
// ============================================================================

describe('classifyDocument - content keywords', function () {
  describe('Job Posting content', function () {
    it('should classify content with job posting keywords', function () {
      const content = `
        Job Announcement: IT Specialist GS-13
        
        Duties include managing network infrastructure.
        Qualifications required: Bachelor's degree, 5 years experience.
        How to apply: Submit resume through USAJOBS.
        Closing date: January 15, 2025.
      `;
      const result = classifyDocument('document.txt', content);
      expect(result.category).toBe('JobPosting');
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should detect USAJOBS references', function () {
      const content = 'Apply through USAJOBS for this position. Pay range: $80,000 - $100,000.';
      const result = classifyDocument('job.txt', content);
      expect(result.category).toBe('JobPosting');
    });
  });

  describe('Resume content', function () {
    it('should classify content with resume keywords', function () {
      const content = `
        JOHN DOE
        Professional Experience
        
        Work Experience:
        - Senior Developer at Tech Corp (2020-2024)
        - Developer at StartUp Inc (2018-2020)
        
        Education Background:
        - BS Computer Science, State University
        
        Skills and Abilities:
        - Python, JavaScript, AWS
      `;
      const result = classifyDocument('document.txt', content);
      expect(result.category).toBe('Resume');
    });

    it('should detect employment history', function () {
      const content = 'Employment History: 10 years in federal service. Career objective: GS-15 management.';
      const result = classifyDocument('doc.txt', content);
      expect(result.category).toBe('Resume');
    });
  });

  describe('Offer Letter content', function () {
    it('should classify content with offer letter keywords', function () {
      const content = `
        Official Job Offer
        
        We are pleased to offer you the position of IT Specialist, GS-13.
        Your start date is February 1, 2025.
        This offer is contingent upon successful background check.
        Please report to duty at the address below.
      `;
      const result = classifyDocument('letter.txt', content);
      expect(result.category).toBe('OfferLetter');
    });

    it('should detect entrance on duty references', function () {
      const content = 'Your EOD date is March 1, 2025. Please complete the following forms.';
      const result = classifyDocument('offer.txt', content);
      expect(result.category).toBe('OfferLetter');
    });
  });

  describe('Pay Stub content', function () {
    it('should classify content with pay stub keywords', function () {
      const content = `
        Leave and Earnings Statement
        Pay Period: 2025-24
        
        Gross Pay: $5,432.10
        Net Pay: $3,876.54
        
        Deductions:
        - Federal Tax: $800
        - State Tax: $300
        - TSP: $456
      `;
      const result = classifyDocument('statement.txt', content);
      expect(result.category).toBe('PayStub');
    });
  });

  describe('Tax Document content', function () {
    it('should classify content with W-2 keywords', function () {
      const content = `
        Form W-2 Wage and Tax Statement
        Tax Year: 2024
        
        Employer Identification Number (EIN): 12-3456789
        Employee wages: $95,000
      `;
      const result = classifyDocument('tax.txt', content);
      expect(result.category).toBe('TaxDoc');
    });
  });

  describe('Benefits Document content', function () {
    it('should classify content with benefits keywords', function () {
      const content = `
        Federal Employees Health Benefits (FEHB) Guide
        
        Health Benefits Options:
        - Blue Cross Blue Shield
        - Aetna
        
        Life Insurance (FEGLI):
        - Basic coverage included
        
        Thrift Savings Plan (TSP):
        - Agency matching up to 5%
      `;
      const result = classifyDocument('benefits.txt', content);
      expect(result.category).toBe('BenefitsDoc');
    });

    it('should detect retirement plan references', function () {
      const content = 'FERS retirement benefits include TSP matching and annuity calculation.';
      const result = classifyDocument('retirement.txt', content);
      expect(result.category).toBe('BenefitsDoc');
    });
  });
});

// ============================================================================
// SENSITIVITY LABEL TESTS
// ============================================================================

describe('classifyDocument - sensitivity labels', function () {
  it('should assign Public sensitivity to JobPosting', function () {
    const result = classifyDocument('job_posting.pdf', null);
    expect(result.sensitivity).toBe('Public');
  });

  it('should assign Personal sensitivity to Resume', function () {
    const result = classifyDocument('resume.pdf', null);
    expect(result.sensitivity).toBe('Personal');
  });

  it('should assign Personal sensitivity to OfferLetter', function () {
    const result = classifyDocument('offer_letter.pdf', null);
    expect(result.sensitivity).toBe('Personal');
  });

  it('should assign Sensitive sensitivity to PayStub', function () {
    const result = classifyDocument('pay_stub.pdf', null);
    expect(result.sensitivity).toBe('Sensitive');
  });

  it('should assign Sensitive sensitivity to TaxDoc', function () {
    const result = classifyDocument('W-2.pdf', null);
    expect(result.sensitivity).toBe('Sensitive');
  });

  it('should assign Unknown sensitivity to Other', function () {
    const result = classifyDocument('random.pdf', null);
    expect(result.sensitivity).toBe('Unknown');
  });
});

// ============================================================================
// COMBINED FILENAME + CONTENT TESTS
// ============================================================================

describe('classifyDocument - combined signals', function () {
  it('should boost confidence when filename and content match', function () {
    const content = 'This is my resume. Professional experience includes 5 years at agency.';
    const result = classifyDocument('resume.pdf', content);
    
    expect(result.category).toBe('Resume');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should prefer content when filename is generic', function () {
    const content = `
      Job Announcement
      This position is open to all US citizens.
      Duties include: Software development
      How to apply: USAJOBS
    `;
    const result = classifyDocument('document.pdf', content);
    
    expect(result.category).toBe('JobPosting');
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// HELPER EXPORTS TESTS
// ============================================================================

describe('classification helpers', function () {
  it('CATEGORY_LABELS should have entries for all categories', function () {
    for (let i = 0; i < ALL_CATEGORIES.length; i++) {
      const cat = ALL_CATEGORIES[i];
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe('string');
    }
  });

  it('SENSITIVITY_LABELS should have entries for all sensitivity levels', function () {
    for (let i = 0; i < ALL_SENSITIVITY_LABELS.length; i++) {
      const sens = ALL_SENSITIVITY_LABELS[i];
      expect(SENSITIVITY_LABELS[sens]).toBeDefined();
      expect(typeof SENSITIVITY_LABELS[sens]).toBe('string');
    }
  });

  it('ALL_CATEGORIES should contain expected categories', function () {
    expect(ALL_CATEGORIES).toContain('JobPosting');
    expect(ALL_CATEGORIES).toContain('Resume');
    expect(ALL_CATEGORIES).toContain('OfferLetter');
    expect(ALL_CATEGORIES).toContain('BenefitsDoc');
    expect(ALL_CATEGORIES).toContain('PayStub');
    expect(ALL_CATEGORIES).toContain('TaxDoc');
    expect(ALL_CATEGORIES).toContain('Other');
  });

  it('ALL_SENSITIVITY_LABELS should contain expected labels', function () {
    expect(ALL_SENSITIVITY_LABELS).toContain('Public');
    expect(ALL_SENSITIVITY_LABELS).toContain('Personal');
    expect(ALL_SENSITIVITY_LABELS).toContain('Sensitive');
    expect(ALL_SENSITIVITY_LABELS).toContain('Unknown');
  });
});
