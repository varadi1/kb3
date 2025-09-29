/**
 * SOLID Compliance Tests for Parameter Services
 * Verifies adherence to SOLID principles in parameter management implementation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Parameter Services SOLID Compliance', () => {
  let parameterServiceCode: string;
  let parameterStorageCode: string;
  let parameterServicePath: string;
  let parameterStoragePath: string;

  beforeAll(() => {
    // Load service source code for analysis
    parameterServicePath = path.join(
      __dirname,
      '../../../packages/backend/src/services/parameterService.ts'
    );
    parameterStoragePath = path.join(
      __dirname,
      '../../../packages/backend/src/services/parameterStorageService.ts'
    );

    if (fs.existsSync(parameterServicePath)) {
      parameterServiceCode = fs.readFileSync(parameterServicePath, 'utf-8');
    }
    if (fs.existsSync(parameterStoragePath)) {
      parameterStorageCode = fs.readFileSync(parameterStoragePath, 'utf-8');
    }
  });

  describe('Single Responsibility Principle (SRP)', () => {
    it('ParameterService should have a single responsibility', () => {
      // Check that ParameterService only handles parameter logic
      expect(parameterServiceCode).toContain('class ParameterService implements IParameterService');

      // Should NOT contain database operations directly
      expect(parameterServiceCode).not.toContain('sqlite3');
      expect(parameterServiceCode).not.toContain('CREATE TABLE');
      expect(parameterServiceCode).not.toContain('INSERT INTO');

      // Should NOT contain HTTP handling
      expect(parameterServiceCode).not.toContain('express');
      expect(parameterServiceCode).not.toContain('req.params');
      expect(parameterServiceCode).not.toContain('res.json');
    });

    it('ParameterStorageService should have a single responsibility', () => {
      // Check that ParameterStorageService only handles storage
      expect(parameterStorageCode).toContain('class ParameterStorageService implements IParameterStorageService');

      // Should contain database operations
      expect(parameterStorageCode).toContain('sqlite3');
      expect(parameterStorageCode).toContain('CREATE TABLE');

      // Should NOT contain validation logic
      expect(parameterStorageCode).not.toContain('validateParameters');
      expect(parameterStorageCode).not.toContain('getDefaultParameters');

      // Should NOT contain schema definitions
      expect(parameterStorageCode).not.toContain('ParameterSchema');
      expect(parameterStorageCode).not.toContain('ScraperParameterSchema');
    });

    it('Validators should have single responsibilities', () => {
      // Each validator handles only one scraper type
      expect(parameterServiceCode).toContain('class PlaywrightParameterValidator');
      expect(parameterServiceCode).toContain('class Crawl4AIParameterValidator');
      expect(parameterServiceCode).toContain('class DoclingParameterValidator');

      // Each extends from a base validator
      expect(parameterServiceCode).toContain('extends BaseParameterValidator');
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    it('Services should be open for extension, closed for modification', () => {
      // Check for extensibility through interfaces
      expect(parameterServiceCode).toContain('implements IParameterService');
      expect(parameterStorageCode).toContain('implements IParameterStorageService');

      // Check for validator registration mechanism
      expect(parameterServiceCode).toContain('registerValidator');
      expect(parameterServiceCode).toContain('validators: Map<string, IParameterValidator>');
    });

    it('New validators can be added without modifying existing code', () => {
      // Abstract base class for validators
      expect(parameterServiceCode).toContain('abstract class BaseParameterValidator');
      expect(parameterServiceCode).toContain('abstract validate');
      expect(parameterServiceCode).toContain('abstract getDefaultParameters');
      expect(parameterServiceCode).toContain('abstract getSupportedParameters');
    });

    it('Schema system should be extensible', () => {
      // Schemas stored in a Map for easy extension
      expect(parameterServiceCode).toContain('schemas: Map<string, ScraperParameterSchema>');
      expect(parameterServiceCode).toContain('initializeSchemas');

      // New schemas can be added to the Map
      expect(parameterServiceCode).toContain('this.schemas.set');
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    it('All validators should be substitutable', () => {
      // All validators implement the same interface methods
      const validatorMethods = [
        'validate(',
        'getDefaultParameters(',
        'getSupportedParameters(',
        'normalize('
      ];

      validatorMethods.forEach(method => {
        const escapedMethod = method.replace(/[()]/g, '\\$&');
        expect(parameterServiceCode).toMatch(new RegExp(`PlaywrightParameterValidator.*${escapedMethod}`, 's'));
        expect(parameterServiceCode).toMatch(new RegExp(`Crawl4AIParameterValidator.*${escapedMethod}`, 's'));
        expect(parameterServiceCode).toMatch(new RegExp(`DoclingParameterValidator.*${escapedMethod}`, 's'));
      });
    });

    it('All validators should return consistent result types', () => {
      // Check return types are consistent
      expect(parameterServiceCode).toContain('ParameterValidationResult');
      expect(parameterServiceCode).toContain('ScraperSpecificParameters');

      // All validate methods return the same type
      const validateRegex = /validate\([^)]+\):\s*ParameterValidationResult/g;
      const validateMatches = parameterServiceCode.match(validateRegex);
      expect(validateMatches).toBeTruthy();
      expect(validateMatches!.length).toBeGreaterThan(3); // At least 4 validators
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    it('Interfaces should be small and focused', () => {
      // Check IParameterService interface
      expect(parameterServiceCode).toContain('interface IParameterService');

      // Should have focused methods
      const paramServiceMethods = [
        'getParameterSchema',
        'validateParameters',
        'getDefaultParameters',
        'getSupportedParameters',
        'setUrlParameters',
        'getUrlParameters',
        'setBatchParameters'
      ];

      paramServiceMethods.forEach(method => {
        expect(parameterServiceCode).toContain(`${method}(`);
      });
    });

    it('Storage interface should be separate from service interface', () => {
      // Check IParameterStorageService interface
      expect(parameterStorageCode).toContain('interface IParameterStorageService');

      // Storage-specific methods
      const storageMethods = [
        'initialize',
        'saveParameters',
        'getParameters',
        'deleteParameters',
        'getAllParameters'
      ];

      storageMethods.forEach(method => {
        expect(parameterStorageCode).toContain(`${method}(`);
      });
    });

    it('Validator interface should be minimal', () => {
      // IParameterValidator should have minimal methods
      const validatorInterface = parameterServiceCode.match(
        /interface IParameterValidator\s*{[^}]+}/s
      );

      if (validatorInterface) {
        const interfaceContent = validatorInterface[0];
        expect(interfaceContent).toContain('validate');
        expect(interfaceContent).toContain('normalize');
        expect(interfaceContent).toContain('getDefaultParameters');
        expect(interfaceContent).toContain('getSupportedParameters');

        // Should not contain unrelated methods
        expect(interfaceContent).not.toContain('save');
        expect(interfaceContent).not.toContain('load');
        expect(interfaceContent).not.toContain('delete');
      }
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    it('Services should depend on abstractions, not concretions', () => {
      // ParameterService depends on abstractions
      expect(parameterServiceCode).toContain('IParameterValidator');
      expect(parameterServiceCode).toContain('ScraperParameterManager'); // From core KB3

      // Should not directly instantiate concrete implementations
      expect(parameterServiceCode).not.toContain('new sqlite3');
      expect(parameterServiceCode).not.toContain('new Database');
    });

    it('Storage service should use dependency injection', () => {
      // Constructor accepts dependencies
      expect(parameterStorageCode).toContain('constructor(dbPath?: string)');

      // Uses injected path rather than hardcoding
      expect(parameterStorageCode).toContain('this.dbPath = dbPath ||');
    });

    it('Services should use interfaces for dependencies', () => {
      // Check for interface definitions (can be local instead of imported)
      expect(parameterServiceCode).toContain('interface ScraperConfiguration');
      expect(parameterServiceCode).toContain('interface ParameterValidationResult');
      expect(parameterServiceCode).toContain('type ScraperSpecificParameters');

      // Check for interface definitions and usage
      expect(parameterServiceCode).toContain('interface IParameterValidator');
      expect(parameterServiceCode).toContain('interface IParameterService');
    });
  });

  describe('Additional Architecture Checks', () => {
    it('Services should follow error handling patterns', () => {
      // Proper error handling
      expect(parameterServiceCode).toContain('try {');
      expect(parameterServiceCode).toContain('catch');
      expect(parameterServiceCode).toContain('throw new Error');

      expect(parameterStorageCode).toContain('try {');
      expect(parameterStorageCode).toContain('catch');
      expect(parameterStorageCode).toContain('reject(');
    });

    it('Services should use TypeScript types properly', () => {
      // Strong typing throughout
      expect(parameterServiceCode).toContain(': ScraperParameterSchema');
      expect(parameterServiceCode).toContain(': ParameterValidationResult');
      expect(parameterServiceCode).toContain(': ScraperSpecificParameters');

      expect(parameterStorageCode).toContain(': Promise<void>');
      expect(parameterStorageCode).toContain(': Promise<ScraperConfiguration | null>');
      expect(parameterStorageCode).toContain(': Map<string, ScraperConfiguration>');
    });

    it('Services should follow naming conventions', () => {
      // Class names
      expect(parameterServiceCode).toMatch(/class \w+Service/);
      expect(parameterStorageCode).toMatch(/class \w+Service/);

      // Interface names with I prefix
      expect(parameterServiceCode).toContain('IParameterService');
      expect(parameterStorageCode).toContain('IParameterStorageService');

      // Private methods with underscore or private keyword
      expect(parameterServiceCode).toMatch(/private \w+/);
      expect(parameterStorageCode).toMatch(/private \w+/);
    });
  });

  describe('Service Cohesion', () => {
    it('ParameterService methods should be cohesive', () => {
      // All methods relate to parameter management
      const methods = [
        'getParameterSchema',
        'validateParameters',
        'getDefaultParameters',
        'setUrlParameters',
        'getUrlParameters'
      ];

      methods.forEach(method => {
        expect(parameterServiceCode).toContain(method);
      });

      // No unrelated methods
      expect(parameterServiceCode).not.toContain('sendEmail');
      expect(parameterServiceCode).not.toContain('generateReport');
      expect(parameterServiceCode).not.toContain('authenticateUser');
    });

    it('Storage service methods should be cohesive', () => {
      // All methods relate to storage operations
      const methods = [
        'saveParameters',
        'getParameters',
        'deleteParameters',
        'getAllParameters'
      ];

      methods.forEach(method => {
        expect(parameterStorageCode).toContain(method);
      });

      // No business logic in storage
      expect(parameterStorageCode).not.toContain('validateBusinessRules');
      expect(parameterStorageCode).not.toContain('calculatePrice');
      expect(parameterStorageCode).not.toContain('sendNotification');
    });
  });
});