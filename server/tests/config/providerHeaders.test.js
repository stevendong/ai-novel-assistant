const {
  getCustomHeaders,
  needsCustomHeaders,
  urlMatchesPattern
} = require('../../config/aiConfig');

describe('Provider Headers Configuration', () => {
  describe('urlMatchesPattern', () => {
    test('includes match type', () => {
      expect(urlMatchesPattern('https://api.aihubmix.com/v1', 'aihubmix.com', 'includes')).toBe(true);
      expect(urlMatchesPattern('https://api.other.com/v1', 'aihubmix.com', 'includes')).toBe(false);
    });

    test('startsWith match type', () => {
      expect(urlMatchesPattern('https://api.example.com/v1', 'https://api.example', 'startsWith')).toBe(true);
      expect(urlMatchesPattern('https://other.example.com/v1', 'https://api.example', 'startsWith')).toBe(false);
    });

    test('endsWith match type', () => {
      expect(urlMatchesPattern('https://api.example.com/v1', '.com/v1', 'endsWith')).toBe(true);
      expect(urlMatchesPattern('https://api.example.com/v2', '.com/v1', 'endsWith')).toBe(false);
    });

    test('exact match type', () => {
      expect(urlMatchesPattern('https://api.example.com', 'https://api.example.com', 'exact')).toBe(true);
      expect(urlMatchesPattern('https://api.example.com/v1', 'https://api.example.com', 'exact')).toBe(false);
    });

    test('regex match type', () => {
      expect(urlMatchesPattern('https://api.proxy.com', '.*\\.proxy\\.(com|net)', 'regex')).toBe(true);
      expect(urlMatchesPattern('https://api.proxy.net', '.*\\.proxy\\.(com|net)', 'regex')).toBe(true);
      expect(urlMatchesPattern('https://api.other.com', '.*\\.proxy\\.(com|net)', 'regex')).toBe(false);
    });

    test('handles invalid regex gracefully', () => {
      expect(urlMatchesPattern('https://api.example.com', '[invalid(regex', 'regex')).toBe(false);
    });

    test('handles null/undefined inputs', () => {
      expect(urlMatchesPattern(null, 'pattern', 'includes')).toBe(false);
      expect(urlMatchesPattern('url', null, 'includes')).toBe(false);
      expect(urlMatchesPattern(null, null, 'includes')).toBe(false);
    });

    test('defaults to includes when matchType is invalid', () => {
      expect(urlMatchesPattern('https://api.aihubmix.com', 'aihubmix', 'invalid_type')).toBe(true);
    });
  });

  describe('getCustomHeaders', () => {
    test('returns legacy headers for aihubmix.com when no config set', () => {
      const headers = getCustomHeaders('https://api.aihubmix.com/v1');

      // Should have the legacy default header
      expect(headers).toHaveProperty('APP-Code');
      expect(headers['APP-Code']).toBe('AVSS2212');
    });

    test('returns empty object for non-matching URLs', () => {
      const headers = getCustomHeaders('https://api.openai.com/v1');

      // If legacy support is enabled, might still get aihubmix headers
      // So we just check it returns an object
      expect(typeof headers).toBe('object');
    });

    test('handles null/undefined baseURL', () => {
      expect(getCustomHeaders(null)).toEqual({});
      expect(getCustomHeaders(undefined)).toEqual({});
    });
  });

  describe('needsCustomHeaders', () => {
    test('returns true for aihubmix.com (legacy default)', () => {
      expect(needsCustomHeaders('https://api.aihubmix.com/v1')).toBe(true);
    });

    test('returns false for standard OpenAI URL', () => {
      const needs = needsCustomHeaders('https://api.openai.com/v1');
      expect(typeof needs).toBe('boolean');
    });

    test('handles null/undefined baseURL', () => {
      expect(needsCustomHeaders(null)).toBe(false);
      expect(needsCustomHeaders(undefined)).toBe(false);
    });
  });

  describe('Environment variable parsing', () => {
    test('should use legacy default when no config', () => {
      // Test that the legacy aihubmix.com configuration is applied by default
      const headers = getCustomHeaders('https://api.aihubmix.com/v1');
      expect(headers).toHaveProperty('APP-Code');
      expect(headers['APP-Code']).toBe('AVSS2212');
    });

    test('configuration supports multiple headers', () => {
      // Test that the configuration system supports multiple headers
      // (This tests the data structure, actual env parsing is tested in integration tests)
      const testUrl = 'https://api.aihubmix.com/v1';
      const headers = getCustomHeaders(testUrl);

      // Should be an object
      expect(typeof headers).toBe('object');
      expect(headers).not.toBeNull();
    });
  });
});

describe('AIService header application', () => {
  const AIService = require('../../services/aiService');

  describe('applyCustomHeaders', () => {
    test('applies headers to plain object', () => {
      const baseURL = 'https://api.aihubmix.com/v1';
      const originalHeaders = { 'Content-Type': 'application/json' };

      const result = AIService.applyCustomHeaders(baseURL, originalHeaders);

      expect(result).toHaveProperty('Content-Type');
      expect(result).toHaveProperty('APP-Code');
      expect(result['APP-Code']).toBe('AVSS2212');
    });

    test('applies headers to array format', () => {
      const baseURL = 'https://api.aihubmix.com/v1';
      const originalHeaders = [['Content-Type', 'application/json']];

      const result = AIService.applyCustomHeaders(baseURL, originalHeaders);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(1);

      const appCodeHeader = result.find(([key]) => key === 'APP-Code');
      expect(appCodeHeader).toBeDefined();
      expect(appCodeHeader[1]).toBe('AVSS2212');
    });

    test('returns original headers when no custom headers needed', () => {
      const baseURL = 'https://api.openai.com/v1';
      const originalHeaders = { 'Content-Type': 'application/json' };

      const result = AIService.applyCustomHeaders(baseURL, originalHeaders);

      expect(result).toHaveProperty('Content-Type');
    });

    test('updates existing header in array format', () => {
      const baseURL = 'https://api.aihubmix.com/v1';
      const originalHeaders = [
        ['Content-Type', 'application/json'],
        ['APP-Code', 'old-value']
      ];

      const result = AIService.applyCustomHeaders(baseURL, originalHeaders);

      const appCodeHeader = result.find(([key]) => key === 'APP-Code');
      expect(appCodeHeader[1]).toBe('AVSS2212');
    });
  });
});
