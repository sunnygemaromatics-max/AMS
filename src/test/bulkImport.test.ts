import { describe, it, expect, vi } from 'vitest';
import { parseExcelFile, parseCsvFile, classifySheet, normalizeRow, pick } from '@/lib/bulkImport';
import ExcelJS from 'exceljs';

// Mock ExcelJS
vi.mock('exceljs', () => {
  return {
    default: {
      Workbook: vi.fn().mockImplementation(() => ({
        xlsx: {
          load: vi.fn().mockResolvedValue(true),
        },
        worksheets: [
          {
            name: 'Test Sheet',
            eachRow: vi.fn((callback) => {
              callback({ eachCell: vi.fn((cellCallback) => {
                cellCallback({ value: 'Name' }, 1);
                cellCallback({ value: 'Email' }, 2);
              }) }, 1);
              callback({ eachCell: vi.fn((cellCallback) => {
                cellCallback({ value: 'John Doe' }, 1);
                cellCallback({ value: 'john@example.com' }, 2);
              }) }, 2);
            }),
          },
        ],
      })),
    },
  };
});

describe('Bulk Import Functions', () => {
  describe('parseExcelFile', () => {
    it('should parse Excel file correctly', async () => {
      const mockFile = new Blob(['test data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await parseExcelFile(mockFile, 'test.xlsx');

      expect(result.filename).toBe('test.xlsx');
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].name).toBe('Test Sheet');
      expect(result.sheets[0].rows).toHaveLength(1);
      expect(result.sheets[0].rows[0]).toEqual({
        Name: 'John Doe',
        Email: 'john@example.com',
      });
    });

    it('should handle empty Excel file', async () => {
      const mockWorkbook = new ExcelJS.Workbook();
      mockWorkbook.worksheets = [];
      
      const mockFile = new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await parseExcelFile(mockFile, 'empty.xlsx');

      expect(result.filename).toBe('empty.xlsx');
      expect(result.sheets).toHaveLength(0);
    });
  });

  describe('parseCsvFile', () => {
    it('should parse CSV file correctly', async () => {
      const csvContent = 'Name,Email\nJohn Doe,john@example.com\nJane Smith,jane@example.com';
      const mockFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCsvFile(mockFile, 'test.csv');

      expect(result.filename).toBe('test.csv');
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].name).toBe('Sheet1');
      expect(result.sheets[0].rows).toHaveLength(2);
      expect(result.sheets[0].rows[0]).toEqual({
        Name: 'John Doe',
        Email: 'john@example.com',
      });
    });

    it('should handle empty CSV file', async () => {
      const mockFile = new File([''], 'empty.csv', { type: 'text/csv' });
      
      const result = await parseCsvFile(mockFile, 'empty.csv');

      expect(result.filename).toBe('empty.csv');
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].rows).toHaveLength(0);
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent = 'Name,Description\n"John Doe","Developer, Senior"\n"Jane Smith","Designer"';
      const mockFile = new File([csvContent], 'quoted.csv', { type: 'text/csv' });
      
      const result = await parseCsvFile(mockFile, 'quoted.csv');

      expect(result.sheets[0].rows[0]).toEqual({
        Name: 'John Doe',
        Description: 'Developer, Senior',
      });
    });
  });

  describe('classifySheet', () => {
    it('should classify asset sheet correctly', () => {
      const assetRows = [
        { sap_code: '123', bin_card_no: 'BC001', name: 'Laptop' },
        { sap_code: '124', bin_card_no: 'BC002', name: 'Desktop' },
      ];
      
      expect(classifySheet(assetRows)).toBe('asset');
    });

    it('should classify employee sheet correctly', () => {
      const employeeRows = [
        { employee_code: 'E001', name: 'John Doe', designation: 'Developer' },
        { employee_code: 'E002', name: 'Jane Smith', designation: 'Designer' },
      ];
      
      expect(classifySheet(employeeRows)).toBe('employee');
    });

    it('should classify license sheet correctly', () => {
      const licenseRows = [
        { license_type: 'Software', validity: '2024-12-31', email_id: 'test@example.com' },
        { license_type: 'Antivirus', validity: '2024-06-30', email_id: 'test2@example.com' },
      ];
      
      expect(classifySheet(licenseRows)).toBe('license');
    });

    it('should classify transfer sheet correctly', () => {
      const transferRows = [
        { from_location: 'Office A', to_location: 'Office B', asset_id: '123' },
        { from_location: 'Office B', to_location: 'Office C', asset_id: '124' },
      ];
      
      expect(classifySheet(transferRows)).toBe('transfer');
    });

    it('should return unknown for unrecognized sheets', () => {
      const unknownRows = [
        { random_field: 'value1', another_field: 'value2' },
      ];
      
      expect(classifySheet(unknownRows)).toBe('unknown');
    });

    it('should return unknown for empty sheets', () => {
      expect(classifySheet([])).toBe('unknown');
    });
  });

  describe('normalizeRow', () => {
    it('should normalize row keys correctly', () => {
      const row = {
        'First Name': 'John',
        'Last Name': 'Doe',
        '  Email Address  ': 'john@example.com',
      };
      
      const normalized = normalizeRow(row);
      
      expect(normalized).toEqual({
        'first_name': 'John',
        'last_name': 'Doe',
        'email_address': 'john@example.com',
      });
    });

    it('should preserve non-string values', () => {
      const row = {
        'Name': 'John',
        'Age': 30,
        'Active': true,
      };
      
      const normalized = normalizeRow(row);
      
      expect(normalized).toEqual({
        'name': 'John',
        'age': 30,
        'active': true,
      });
    });
  });

  describe('pick', () => {
    it('should pick value from normalized row', () => {
      const row = {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john@example.com',
      };
      
      expect(pick(row, ['First Name'])).toBe('John');
      expect(pick(row, ['Email'])).toBe('john@example.com');
    });

    it('should try multiple keys and return first match', () => {
      const row = {
        'first_name': 'John',
        'name': 'John Doe',
      };
      
      expect(pick(row, ['Full Name', 'Name'])).toBe('John Doe');
    });

    it('should return null if no key matches', () => {
      const row = {
        'first_name': 'John',
      };
      
      expect(pick(row, ['Last Name'])).toBeNull();
    });

    it('should handle empty and null values correctly', () => {
      const row = {
        'name': '',
        'email': null,
        'phone': undefined,
        'address': '123 Main St',
      };
      
      expect(pick(row, ['Name'])).toBeNull();
      expect(pick(row, ['Email'])).toBeNull();
      expect(pick(row, ['Phone'])).toBeNull();
      expect(pick(row, ['Address'])).toBe('123 Main St');
    });
  });
});
